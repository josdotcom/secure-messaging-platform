import type { Response } from "express";
import messageService from "../services/messageService";
import type { AuthRequest } from "../middleware/authMiddleware";

class MessageController {
    async createMessage(req: AuthRequest, res: Response) {
        try {
            const {recipientId, groupId, content, type, attachments} = req.body;
            const senderId = req.user!.userId;

            const message = await messageService.createMessage({
                senderId,
                recipientId,
                groupId,
                content,
                type,
                attachments
            });

            res.status(201).json({
                success: true,
                data: message
            });
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: (err as Error).message
            });
        }
    }

    async getConversation(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.userId;
            const { partnerId } = req.params;
            
            if (!partnerId) {
                res.status(400).json({
                    success: false,
                    message: "partnerId is required"
                });
                return;
            }
            
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 30;

            const messages = await messageService.getConversationHistory(userId, partnerId, page, limit);

            res.status(200).json({
                success: true,
                data: messages
            });
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: (err as Error).message
            });
        }
    }

    async markAsRead(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.userId;
            const { messageId } = req.params;

            if (!messageId) {
                res.status(400).json({
                    success: false, 
                    message: "messageId is required"
                });
                return;
            }

            const message = await messageService.markMessageAsRead(messageId, userId);
            res.status(200).json({
                success: true,
                data: message
            });
        }
        catch (err) {
            res.status(400).json({
                success: false,
                message: (err as Error).message
            });
        }
    }

    async deleteMessage(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.userId;
            const { messageId } = req.params;
            if (!messageId) {
                res.status(400).json({
                    success: false,
                    message: "messageId is required"
                });
                return;
            }
            const message = await messageService.deleteMessage(messageId, userId);
            res.status(200).json({
                success: true,
                data: message
            });
        }
        catch (err) {
            res.status(400).json({
                success: false, 
                message: (err as Error).message
            });
        }

    }

    async searchMessages(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.userId;
            const {q: query} = req.query;
            if (!query || typeof query !== 'string') {
                res.status(400).json({
                    success: false,
                    message: "Query parameter 'q' is required"
                });
                return;
            }
            const page = parseInt(req.query.page as string) || 1;

            const messages = await messageService.searchMessages(userId, query as string, page);

            res.status(200).json({
                success: true,
                data: messages
            });
        }
        catch (err) {
            res.status(400).json({
                success: false, 
                message: (err as Error).message
            });
        }
    }
}

export default new MessageController();