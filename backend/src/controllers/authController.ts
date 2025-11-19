import type { Request, Response } from "express";
import authService from "../services/authService.js";
import type { AuthRequest } from "../middleware/authMiddleware.js";

class AuthController {
    async register(req: Request, res: Response) {
        try {
            const { email, username, password } = req.body;
            const result = await authService.register(email, username, password);

            res.status(201).json({
                success: true,
                data: result
            });
        } catch (err) {
            res.status(400).json({
                success: false,
                message: (err as Error).message
            });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({
                    success: false,
                    message: "Email and password are required"
                });
            }
            const result = await authService.login(email, password);

            res.status(200).json({
                success: true,
                data: result
            });
        } catch (err) {
            res.status(401).json({
                success: false,
                message: (err as Error).message
            });
        }
    }

    async refreshToken(req: AuthRequest, res: Response) {
        try {
            const { refreshToken } = req.body;
            const newAccessTOken = await authService.refreshAccessToken(refreshToken);

            res.status(200).json({
                success: true,
                data: {
                    accessToken: newAccessTOken
                }
            });
        }
        catch (err) {
            res.status(401).json({
                success: false,
                message: (err as Error).message
            });
        }
    }

    async logout(req: AuthRequest, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ 
                    success: false, 
                    message: "Unauthorized" 
                });
            }

            await authService.logout(req.user.userId);

            res.status(200).json({
                success: true,
                message: "Logged out successfully"
            });
        }
        catch (err) {
            res.status(401).json({
                success: false,
                message: (err as Error).message
            });
        }
    }
}

export default new AuthController();