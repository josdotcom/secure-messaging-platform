import authService from "../../../src/services/authService";
import { generateUserData, createTestUser } from "../../utils/testHelpers";

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
    });
});