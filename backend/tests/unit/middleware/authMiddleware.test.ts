import { Request, Response, NextFunction } from "express";
import { authenticate, authorize, AuthRequest } from "../../../src/middleware/authMiddleware.js";
import { generateTestToken } from "../../utils/testHelpers.js";

describe("Auth Middleware", () => {
    describe("authenticate", () => {
        let mockReq: Partial<AuthRequest>;
        let mockRes: Partial<Response>;
        let mockNext: NextFunction;

        beforeEach(() => {
            mockReq = {
                headers: {}
            };
            mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            mockNext = jest.fn();
        });

        it("should authenticate valid token", () => {
            const token = generateTestToken('userId123', 'user');
            mockReq.headers = {
                authorization: `Bearer ${token}`
            };

            authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);
            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.user).toBeDefined();
            expect(mockReq.user!.userId).toBe('userId123');
        });

        it("should reject missing token", () => {
            authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: "Unauthorized"
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it("should reject invalid token format", () => {
            mockReq.headers = {
                authorization: `Bearer InvalidTokenFormat`
            };

            authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: "Invalid or expired token"
            });
        });
    });

    describe("authorize", () => {
        let mockReq: Partial<AuthRequest>;
        let mockRes: Partial<Response>;
        let mockNext: NextFunction;

        beforeEach(() => {
            mockReq = {};
            mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            mockNext = jest.fn();
        });

        it("should authorize user with correct role", () => {
            mockReq.user = {
                userId: 'userId123',
                email: 'test@example.com',
                role: 'admin'
            };

            const middleware = authorize('admin', 'moderator');
            middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it("should reject user with incorrect role", () => {
            mockReq.user = {
                userId: 'userId123',
                email: 'test@example.com',
                role: 'user'
            };

            const middleware = authorize('admin', 'moderator');
            middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({ message: "Forbidden" });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it("should reject unauthenticated user", () => {
            const middleware = authorize('admin', 'moderator');
            middleware(mockReq as AuthRequest, mockRes as Response, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                success: false,
                message: "Unauthorized"
            });
            expect(mockNext).not.toHaveBeenCalled();
        });
    });
});