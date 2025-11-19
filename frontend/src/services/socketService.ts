import { io, Socket} from "socket.io-client";

class SocketService {
    private socket: Socket | null = null;

    connect(token: string): void {

        this.socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:3000', {
            auth: { token },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            reconnectionAttempts: 5
        });

        this.setupListeners();
    }

    private setupListeners(): void {
        if (!this.socket) return;

        this.socket.on("connect", () => {
            console.log("Socket.io connected:", this.socket?.id);
        });

        this.socket.on("disconnect", (reason: any) => {
            console.log("Socket.io disconnected:", reason);
        });

        this.socket.on("connect_error", (error: any) => {
            console.error("Socket.io Connection error:", error);
        });

        this.socket.on("error", (error: any) => {
            console.error("Socket.io error:", error);
        });
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    sendPrivateMessage(recipientId: string, content: string, tempId?: string, attachments?: any[]): void {
        if (!this.socket) {
            console.error("Socket is not connected.");
            return;
        }

        this.socket.emit("private_message", { 
            recipientId, 
            content, 
            ...(tempId && { tempId }),
            ...(attachments && attachments.length > 0 && { attachments })
        });
    }

    sendGroupMessage(groupId: string, content: string, tempId?: string, attachments?: any[]): void {
        if (!this.socket) {
            console.error("Socket is not connected.");
            return;
        }

        this.socket.emit("group_message", { 
            groupId, 
            content, 
            ...(tempId && { tempId }),
            ...(attachments && attachments.length > 0 && { attachments })
        });

    }

    startTyping(recipientId: string, isGroup: boolean = false): void {
        if (!this.socket) return;
        this.socket.emit("typing", { recipientId, isGroup });

    }

    stopTyping(recipientId: string, isGroup: boolean = false): void {
        if (!this.socket) return;
        this.socket.emit("stop_typing", { recipientId, isGroup });
    }

    markMessagesAsRead(messageId: string): void {
        if (!this.socket) return;
        this.socket.emit("message_read", {messageId});
    }

    joinGroup(groupId: string): void {
        if (!this.socket) return;
        this.socket.emit("join_group", { groupId });
    }

    leaveGroup(groupId: string): void {
        if (!this.socket) return;
        this.socket.emit("leave_group", { groupId });
    }

    onReceiveMessage(callback: (message: any) => void): void {
        if (!this.socket) return;
        this.socket.on("receive_message", callback);
    }

    onGroupMessage(callback: (message: any) => void): void {
        if (!this.socket) return;
        this.socket.on("group_message_received", callback);
    }

    onMessageSent(callback: (data: any) => void): void {
        if (!this.socket) return;
        this.socket.on("message_sent", callback);
    }

    onUserTyping(callback: (data: any) => void): void {
        if (!this.socket) return;
        this.socket.on("user_typing", callback);
    }

    onUserStopTyping(callback: (data: any) => void): void {
        if (!this.socket) return;
        this.socket.on("user_stop_typing", callback);
    }

    onUserOnline(callback: (data: any) => void): void {
        if (!this.socket) return;
        this.socket.on("user_online", callback);
    }

    onUserOffline(callback: (data: any) => void): void {
        if (!this.socket) return;
        this.socket.on("user_offline", callback);
    }

    onOnlineUsers(callback: (data: any) => void): void {
        if (!this.socket) return;
        this.socket.on("online_users", callback);
    }

    removeAllListeners(): void {
        if (!this.socket) return;
        this.socket.removeAllListeners();
    }

    isConnected(): boolean {
        return this.socket?.connected || false;
    }
}

export default new SocketService();