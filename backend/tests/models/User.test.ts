import { User } from "../../src/models/User";
import { generateUserData } from "../utils/testHelpers";

describe("User Model", () => {
    describe("User Creation", () => {
        it("should create a user successfully", async () => {
            const userData = generateUserData();

            const user = new User({
                ...userData,
                passwordHash: userData.password
            });

            const savedUser = await user.save();

            expect(savedUser._id).toBeDefined();
            expect(savedUser.email).toBe(userData.email.toLowerCase());
            expect(savedUser.username).toBe(userData.username);
            expect(savedUser.role).toBe('user');
            expect(savedUser.isOnline).toBe(false);
        });

        it("should hash the user's password before saving", async () => {
            const userData = generateUserData();
            const plainPassword = userData.password;

            const user = new User({
                ...userData,
                passwordHash: plainPassword
            });
            const savedUser = await user.save();

            expect(savedUser.passwordHash).not.toBe(plainPassword);
            expect(savedUser.passwordHash.length).toBeGreaterThan(20);
        });

        it("should enforce unique email addresses", async () => {
            const userData = generateUserData();
            const user1 = new User({
                ...userData,
                passwordHash: userData.password
            });
            await user1.save(); 
            const user2 = new User({
                ...userData,
                passwordHash: userData.password
            });
            await expect(user2.save()).rejects.toThrow();
        });

        it("should enforce unique usernames", async () => {
            const userData = generateUserData();
            const user1 = new User({
                ...userData,
                passwordHash: userData.password
            });
            await user1.save(); 
            const user2 = new User({
                ...userData,
                email: 'different@example.com',
                passwordHash: userData.password
            });
            await expect(user2.save()).rejects.toThrow();
        });
    });

    describe("User Validation", () => {
        it("should require email", async () => {
            const user = new User({
                username: "testuser",
                passwordHash: "Password123!"
            });

            await expect(user.save()).rejects.toThrow();
        });

        it ("should require valid email format", async () => {
            const user = new User({
                email: "invalid-email",
                username: "testuser",
                passwordHash: "Password123!"
            });
            await expect(user.save()).rejects.toThrow();
        });

        it ("should require username to be at least 3 characters", async () => {
            const user = new User({
                email: "test@example.com",
                username: "ab",
                passwordHash: "Password123!"
            });
            await expect(user.save()).rejects.toThrow();
        });

        it("should require password to be at least 8 characters", async () => {
            const user = new User({
                email: "test@example.com",
                username: "testuser",
                passwordHash: "short"
            }); 
            await expect(user.save()).rejects.toThrow();
        });

        it ("should enforce bio length limit", async () => {
            const user = new User({
                email: "test@example.com",
                username: "testuser",
                passwordHash: "Password123!",
                bio: "a".repeat(501)
            });
            await expect(user.save()).rejects.toThrow();
        });
    });

    describe("User Methods", () => {
        it("should validate correct password", async () => {
            const plainPassword = "Password123!";
            const user = new User({
                email: "test@example.com",
                username: "testuser",
                passwordHash: plainPassword
            });
            const savedUser = await user.save();
            const isMatch = await savedUser.comparePassword(plainPassword);

            expect(isMatch).toBe(true);
        });

        it("should reject incorrect password", async () => {
            const plainPassword = "Password123!";
            const user = new User({
                email: "test@example.com",
                username: "testuser",
                passwordHash: plainPassword
            });
            const savedUser = await user.save();
            const isMatch = await savedUser.comparePassword("WrongPassword!");
            expect(isMatch).toBe(false);
        });

        it ("should set default values", async () => {
            const user = new User({
                email: "test@example.com",
                username: "testuser",
                passwordHash: "Password123!"
            });
            const savedUser = await user.save();

            expect(savedUser.role).toBe('user');
            expect(savedUser.isOnline).toBe(false);
            expect(savedUser.lastActiveAt).toBeDefined();
            expect(savedUser.createdAt).toBeDefined();
            expect(savedUser.updatedAt).toBeDefined();
        });
    });

    describe("User Indexing", () => {
        it ("should have indexes on email", async () => {
            const indexes = await User.collection.getIndexes();
            expect(indexes).toHaveProperty("email_1");
        });
        
        it ("should have indexes on username", async () => {
            const indexes = await User.collection.getIndexes();
            expect(indexes).toHaveProperty("username_1");
        });
    });
});