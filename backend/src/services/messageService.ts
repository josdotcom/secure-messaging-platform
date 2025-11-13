import { Message } from "../models/Message";
import type { IMessage } from "../models/Message";
import mongoose from "mongoose";

class MessageService {
    async createMessage(data: {
        senderId: string;
        recipientId?: string;
        groupId?: string;
        content: string;
        type: 'private' | 'group' | 'team';
        attachments?: any[];
    }): Promise<IMessage> {
        const message = new Message(data);
        await message.save();
        return message;
    }

    async getConversationHistory(userId:string, partnerId:string, page: number = 1, limit: number = 30) {
        const skip = (page - 1) * limit;
        const messages = await Message.find({
            $or: [
                { senderId: userId, recipientId: partnerId },
                { senderId: partnerId, recipientId: userId }
            ],
            type: 'private',
            deletedAt: null
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'username profilePictureUrl')
        .lean();

        return messages.reverse();
    }

    async getGroupMessages(groupId: string, page: number = 1, limit: number = 50) {
        const skip = (page - 1) * limit;
        return await Message.find({
            GroupId: groupId,
            deletedAt: null
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'username profilePictureUrl')
        .lean();
    }

    async markMessageAsRead(messageId: string, userId: string) {
        const message = await Message.findOne({
            _id: messageId,
            recipientId: userId
        });

        if (!message) {
            throw new Error('Message not found or access denied');
        }

        message.isRead = true;
        message.readAt = new Date();
        await message.save();

        return message;
    }

    async deleteMessage(messageId: string, userId: string) {
        const message = await Message.findOne({
            _id: messageId,
            senderId: userId
        });

        if (!message) {
            throw new Error('Message not found or access denied');
        }

        message.deletedAt = new Date();
        await message.save();
        return message;
    }

    async editMessage(messageId: string, userId: string, newContent: string) {
        const message = await Message.findOne({
            _id: messageId,
            senderId: userId,
            deletedAt: null
        });

        if (!message) {
            throw new Error('Message not found or access denied');
        }

        message.content = newContent;
        message.editedAt = new Date();
        await message.save();

        return message;
    }

    async searchMessages(userId: string, query: string, page: number = 1, limit: number = 30) {
        const skip = (page - 1) * limit;

        return await Message.find({
            $text: { $search: query },
            $or: [
                { senderId: userId },
                { recipientId: userId }
            ],
            deletedAt: null
        })
        .sort({ score: { $meta: "textScore" } })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'username profilePictureUrl')
        .lean();
    }
}

export default new MessageService();
