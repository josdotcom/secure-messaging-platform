import authService from "../../../src/services/authService";
import { generateUserData, createTestUser } from "../../utils/testHelpers";
import { User } from "../../../src/models/User";

describe("Auth Service", () => {
    describe("User Registration", () => {
        it("should register a new user successfully", async () => {
            const userData = generateUserData();

            const result = await authService.register(userData.email, userData.username, userData.password);

            expect(result.user).toBeDefined();
            expect(result.user.email).toBe(userData.email.toLowerCase());
            expect(result.user.username).toBe(userData.username);
            expect(result.tokens.accessToken).toBeDefined();
            expect(result.tokens.refreshToken).toBeDefined();
        });

        it("should not allow registration with an existing email", async () => {
            const userData = generateUserData();
            await createTestUser({ email: userData.email });
            await expect(
                authService.register(userData.email, userData.username, userData.password)
            ).rejects.toThrow('Email or username already in use');
        });

        it("should not allow registration with an existing username", async () => {
            const userData = generateUserData();
            await createTestUser({ username: userData.username });
            await expect(
                authService.register(userData.email, userData.username, userData.password)
            ).rejects.toThrow('Email or username already in use');
        });

        it("should hash the user's password upon registration", async () => {
            const userData = generateUserData();
            await authService.register(userData.email, userData.username, userData.password);
            
            const savedUser = await User.findOne({ email: userData.email.toLowerCase() });
            expect(savedUser).toBeDefined();
            expect(savedUser!.passwordHash).not.toBe(userData.password);
        });            
    });

    describe("login", () => {
        it ("should login user with correct credentials", async () => {
            const userData = generateUserData();
            
            await authService.register(userData.email, userData.username, userData.password);
            const result = await authService.login(userData.email, userData.password);

            expect(result.user).toBeDefined();
            expect(result.user.email).toBe(userData.email.toLowerCase());
            expect(result.user.username).toBe(userData.username);
            expect(result.tokens.accessToken).toBeDefined();
            expect(result.tokens.refreshToken).toBeDefined();
        });

        it ("should not login user with incorrect email", async () => {
            await expect(
                authService.login("nonexistent@example.com", "password123!")
            ).rejects.toThrow('Invalid email or password');
        });

        it('should throw error with incorrect password', async () => {
            const user = await createTestUser();

            await expect(
                authService.login(user.email, 'WrongPassword123!')
            ).rejects.toThrow('Invalid credentials');
        });

        it ("should update user online status on successful login", async () => {
            const userData = generateUserData();
            const registerResult = await authService.register(userData.email, userData.username, userData.password);
            await authService.login(userData.email, userData.password);
            const user = await User.findOne({ email: userData.email });
            expect(user?.isOnline).toBe(true);
        });
    });

    describe("Token Management", () => {
        it("should generate valid access token upon registration", async () => {
            const token = authService.generateAccessToken("userId123", "test@example,com", "user");
            expect(token).toBeDefined();
            expect(typeof token).toBe("string");
        });

        it("should generate valid refresh token upon registration", async () => {
            const token = authService.generateRefreshToken("userId123");
            expect(token).toBeDefined();
            expect(typeof token).toBe("string");
        });

        it ("should verify a valid access token", async () => {
            const token = authService.generateAccessToken("userId123", "test@example,com", "user");
            const payload = authService.verifyAccessToken(token);
            expect(payload).toBeDefined();
            expect(payload!.userId).toBe("userId123");
            expect(payload!.email).toBe("test@example,com");
            expect(payload!.role).toBe("user");
        });

        it ("should throw error for invalid access token", async () => {
            expect(() => {
                authService.verifyAccessToken("invalid.token.here");
            }).toThrow("Invalid or expired access token");
        });

        it ("should refresh access token", async () => {
            const user = await createTestUser();
            const refreshToken = authService.generateRefreshToken(user._id.toString());
            const newAccessToken = await authService.refreshAccessToken(refreshToken);
            expect(newAccessToken).toBeDefined();
            expect(typeof newAccessToken).toBe("string");
        });

        it ("should throw error for invalid refresh token", async () => {
            await expect(
                authService.refreshAccessToken('invalid-token')
            ).rejects.toThrow('Invalid or expired refresh token');
        });
    });

    describe("logout", () => {
        it ("should logout user and update online status", async () => {
            const user = await createTestUser({ isOnline: true });
            await authService.logout(user._id.toString());
            const updatedUser = await User.findById(user._id);
            expect(updatedUser?.isOnline).toBe(false);
            expect(updatedUser?.lastActiveAt).toBeDefined();
        });
    });
});