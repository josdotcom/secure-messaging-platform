import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import { User } from '../models/User.js';

interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}

class AuthService {
    private jwtSecret = process.env.JWT_SECRET || 'secret';
    private refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET || 'refreshSecret';

    async register(email: string, username: string, password: string) {
        const existingUser = await User.findOne({ $or: [{ email }, { username }] });

        if (existingUser) {
            throw new Error('Email or username already in use');
        }

        const user = new User({ email, username, passwordHash: password });
        await user.save();

        const accessToken = this.generateAccessToken(
            user._id.toString(),
            user.email,
            user.role
        );

        const refreshToken = this.generateRefreshToken(user._id.toString());

        return {
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role
            },
            tokens: {
                accessToken,
                refreshToken
            }
        };
    }

    async login(email: string, password: string) {
        const user = await User.findOne({ email });
        if (!user) {
            throw new Error('Invalid email or password');
        }

        user.isOnline = true;
        user.lastActiveAt = new Date();
        await user.save();

        const accessToken = this.generateAccessToken(
            user._id.toString(),
            user.email,
            user.role
        );
        const refreshToken = this.generateRefreshToken(user._id.toString());

        return {
            user: {
                id: user._id,
                email: user.email,
                username: user.username,
                role: user.role,
                isOnline: user.isOnline
            },
            tokens: {
                accessToken,
                refreshToken
            }
        };
    }

    generateAccessToken(userId: string, email: string, role: string): string {
        return jwt.sign(
            { userId, email, role } as TokenPayload,
            this.jwtSecret,
            { expiresIn: process.env.JWT_EXPIRES_IN || '24h' } as SignOptions
        );
    }

    generateRefreshToken(userId: string): string {
        return jwt.sign(
            { userId },
            this.refreshTokenSecret,
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' } as SignOptions
        );
    }

    verifyAccessToken(token: string): TokenPayload {
        try {
            return jwt.verify(token, this.jwtSecret) as TokenPayload;
        } catch (err) {
            throw new Error('Invalid or expired access token');
        }
    }

    async refreshAccessToken(refreshToken: string): Promise<string>{
        try {
            const decoded = jwt.verify(refreshToken, this.refreshTokenSecret) as { userId: string };
            const user = await User.findById(decoded.userId);
            if (!user) {
                throw new Error('User not found');
            }
            return this.generateAccessToken(
                user._id.toString(),
                user.email,
                user.role
            );
        }
        catch (err) {
            throw new Error('Invalid or expired refresh token');
        }
    }

    async logout(userId: string) {
        await User.findByIdAndUpdate(userId, { isOnline: false, lastActiveAt: new Date() });
    }
}
    
export default new AuthService();