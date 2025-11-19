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
    });
});