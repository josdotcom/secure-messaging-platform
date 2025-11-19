import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Message } from '../models/Message.js';

interface SocketUser{
    userId: string;
    socketId: string;
    email: string;
    username: string;
}

class SocketService {
    private io: Server
    private userSockets: Map<string, string[]> = new Map(); // userId -> socketId
    private socketUsers: Map<string, SocketUser> = new Map(); // socketId -> User Info

    constructor(httpServer: HttpServer) {
        this.io = new Server(httpServer, {
            cors: {
                origin: process.env.FRONTEND_URL || 'http://localhost:3001',
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingTimeout: 60000,
            pingInterval: 25000,
        });

        this.setupMiddleware();
        this.setupEventHandlers();
    }

    private setupMiddleware() {
        this.io.use(async (socket: Socket, next) => {
            try {
            const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'secret') as {userId: string; email: string; role: string};
            const user = await User.findById(decoded.userId);

            if (!user) {
                return next(new Error('Authentication error: User not found'));
            }

            socket.data.userId = user._id.toString();
            socket.data.email = user.email;
            socket.data.username = user.username;

            next();
        } catch (error) {
            next(new Error('Authentication error: Invalid token'));
        }
        });
    }

    private setupEventHandlers() {
        this.io.on('connection', (socket: Socket) => {
            this.handleConnection(socket);
            this.handlePrivateMessage(socket);
            this.handleGroupMessage(socket);
            this.handleTyping(socket);
            this.handleStopTyping(socket);
            this.handleMessageRead(socket);
            this.handleJoinGroup(socket);
            this.handleLeaveGroup(socket);
            this.handleDisconnect(socket);
        });
    }

    private handleConnection(socket: Socket) {
        const userId = socket.data.userId;
        const username = socket.data.username;

        console.log(`User connected: ${username} (${userId})`);

        // store user socket mapping
        this.userSockets.set(userId, socket.id ? [socket.id] : []);
        this.socketUsers.set(socket.id, {
            userId,
            socketId: socket.id,
            email: socket.data.email,
            username
        });

        this.updateUserOnlineStatus(userId, true);

        socket.broadcast.emit('userOnline', { userId, username, timestamp: new Date() });

        this.sendOnlineUsers(socket);
    }

    private async handlePrivateMessage(socket: Socket) {
        socket.on('privateMessage', async (data: { 
            recipientId: string;
            content: string;
            attachments?: any[];
         }) => {
            try{
                const senderId = socket.data.userId;

                if (!data.content || data.content.trim().length === 0) {
                    socket.emit('error', { message: 'Message content cannot be empty' });
                    return;
                }

                if(data.content.length > 2000) {
                    socket.emit('error', { message: 'Message content exceeds length limit' });
                    return;
                }

                const message = new Message({
                    senderId,
                    recipientId: data.recipientId,
                    content: data.content,
                    type: 'private',
                    attachments: data.attachments || [],
                    isRead: false,
                });

                await message.save();

                await message.populate('senderId', 'username profilePicture');

                const recipientSocketId = this.userSockets.get(data.recipientId);

                if (recipientSocketId) {
                    this.io.to(recipientSocketId).emit('receive_message', {
                        ...message.toObject(),
                        sender: {
                            id: senderId,
                            username: socket.data.username
                        }
                    });
                }

                socket.emit('message_sent', {
                    messageId: message._id,
                    timestamp: message.createdAt,
                    delivered: !!recipientSocketId
                });

                console.log(`Private message sent ${senderId} -> ${data.recipientId}`);
            } catch (error) {
                console.error('Error sending private message:', error);
                socket.emit('error', { message: 'Failed to send message', error: (error as Error).message });
            }
        });
    }

    private handleGroupMessage(socket: Socket) {
        socket.on('groupMessage', async (data: {
            groupId: string;
            content: string;
            attachments?: any[];
        }) => {
            try {
                const senderId = socket.data.userId;
                if (!data.content || data.content.trim().length === 0) {
                    socket.emit('error', { message: 'Message content cannot be empty' });
                    return;
                }

                const message = new Message({
                    senderId,
                    groupId: data.groupId,
                    content: data.content,
                    type: 'group',
                    attachments: data.attachments || [],
                });

                await message.save();
                await message.populate('senderId', 'username profilePicture');

                this.io.to(`group_${data.groupId}`).emit('group_message_received', {
                    ...message.toObject(),
                    sender: {
                        id: senderId,
                        username: socket.data.username
                    }
                });

                socket.emit('message_sent', {
                    messageId: message._id,
                    timestamp: message.createdAt
                });

                console.log(`Group message sent ${senderId} -> group_${data.groupId}`);
            } catch (error) {
                console.error('Error sending group message:', error);
                socket.emit('error', { message: 'Failed to send group message', error: (error as Error).message });
            }
        });
    }

    private handleTyping(socket: Socket) {
        socket.on('typing', (data: { recipientId?: string; groupId?: string }) => {
            const userId = socket.data.userId;
            const username = socket.data.username;

            if (data.recipientId) {
                const recipientSocketId = this.userSockets.get(data.recipientId);
                if (recipientSocketId) {
                    this.io.to(recipientSocketId).emit('typing', {
                        userId,
                        username,
                        conversationType: 'private'
                    });
                }
            } else if (data.groupId) {
                socket.to(`group_${data.groupId}`).emit('typing', {
                    userId,
                    username,
                    groupId: data.groupId,
                    conversationType: 'group'
                });
            }
        });
    }

    private handleStopTyping(socket: Socket) {
        socket.on('stopTyping', (data: { recipientId?: string; groupId?: string }) => {
            const userId = socket.data.userId;

            if (data.recipientId) {
                const recipientSocketId = this.userSockets.get(data.recipientId);
                if (recipientSocketId) {
                    this.io.to(recipientSocketId).emit('user_stop_typing', { userId });
                }
            } else if (data.groupId) {
                socket.to(`group_${data.groupId}`).emit('user_stop_typing', { userId, groupId: data.groupId });
            }
        });
    }

    private handleMessageRead(socket: Socket) {
        socket.on('message_read', async (data: { messageId: string }) => {
            try {
                const userId = socket.data.userId;

                const message = await Message.findOneAndUpdate(
                    { _id: data.messageId, recipientId: userId },
                    { isRead: true, readAt: new Date() },
                    { new: true }
                );

                if (message) {
                    const senderSocketId = this.userSockets.get(message.senderId.toString());
                    if (senderSocketId) {
                        this.io.to(senderSocketId).emit('message_read_receipt', {
                            messageId: message._id,
                            readerId: userId,
                            readAt: message.readAt
                        });
                    }
                }
            } catch (error) {
                console.error('Error marking message as read:', error);
            }
        });
    }

    private handleJoinGroup(socket: Socket) {
        socket.on('joinGroup', (data: { groupId: string }) => {
            socket.join(`group_${data.groupId}`);
            console.log(`User ${socket.data.username} joined group_${data.groupId}`);

            socket.to(`group_${data.groupId}`).emit('user_joined_group', {
                userId: socket.data.userId,
                username: socket.data.username,
                groupId: data.groupId,
            });
        });
    }

    private handleLeaveGroup(socket: Socket) {
        socket.on('leave_group', (data: { groupId: string }) => {
            socket.leave(`group_${data.groupId}`);

            console.log(`User ${socket.data.username} left group_${data.groupId}`);

            socket.to(`group_${data.groupId}`).emit('user_left_group', {
                userId: socket.data.userId,
                username: socket.data.username,
                groupId: data.groupId,
            });
        });
    }

    private handleDisconnect(socket: Socket) {
        socket.on('disconnect', async() => {
            const userId = socket.data.userId;
            const username = socket.data.username;

            console.log(`User disconnected: ${username} (${userId})`);

            this.userSockets.delete(userId);
            this.socketUsers.delete(socket.id);

            this.updateUserOnlineStatus(userId, false);
            socket.broadcast.emit('user_offline', { 
                userId,
                username,
                lastSeen: new Date() 
            });
        });
    }

    private async updateUserOnlineStatus(userId: string, isOnline: boolean) {
        try {
            await User.findByIdAndUpdate(userId, { 
                isOnline,
                lastSeen: new Date()
            });
        } catch (error) {
            console.error('Error updating user online status:', error);
        }
    }

    private async sendOnlineUsers(socket: Socket) {
        const onlineUsers = Array.from(this.socketUsers.values()).map(user => ({
            userId: user.userId,
            username: user.username
        }));

        socket.emit('online_users', onlineUsers);
    }

    public getIO(): Server {
        return this.io;
    }

    public getOnlineUsers(): string[] {
        return Array.from(this.userSockets.keys());
    }

    public isUserOnline(userId: string): boolean {
        return this.userSockets.has(userId);
    }
}

export default SocketService;