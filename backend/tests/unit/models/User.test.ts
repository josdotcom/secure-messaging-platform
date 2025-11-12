import { User } from "../../../src/models/User";
import { generateUserData } from "../../utils/testHelpers";

describe('User Model', () => {
    describe('User Creation', () => {
        it('should create a user with valid data', async () => {
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

        it('should hash the password before saving', async () => {
            const userData = generateUserData();
            const plainPassword = userData.password;

            const user = new User({
                ...userData,
                passwordHash: plainPassword
            });

            await user.save();

            expect(user.passwordHash).not.toBe(plainPassword);
            expect(user.passwordHash).toHaveLength(60);
        });

        it('should not allow duplicate email addresses', async () => {
            const userData = generateUserData();

            const user1 = new User({
                ...userData,
                passwordHash: userData.password
            });
            await user1.save();

            const user2 = new User({
                ...userData,
                username: 'john_doe2',
                passwordHash: userData.password
            });

            await expect(user2.save()).rejects.toThrow();
        });

        it('should not allow duplicate usernames', async () => {
            const userData = generateUserData();
            const user1 = new User({
                ...userData,
                passwordHash: userData.password
            });
            await user1.save();

            const user2 = new User({
                ...userData,
                email: 'different@ecample.com',
                passwordHash: userData.password
            });

            await expect(user2.save()).rejects.toThrow();
        });
    });

    describe('User Validation', () => {
        it('should require an email address', async () => {
            const user = new User({
                username: 'johndoe',
                passwordHash: 'Password123!'
            });
            await expect(user.save()).rejects.toThrow();
        });

        it('should require a valid email format', async () => {
            const user = new User({
                email: 'invalid-email',
                username: 'johndoe',
                passwordHash: 'Password123!'
            });
            await expect(user.save()).rejects.toThrow();
        });

        it('should require a username to be atleast 8 letters', async () => {
            const user = new User({
                email: 'test@example.com',
                username: 'jd',
                passwordHash: 'Password123!'
            });
            await expect(user.save()).rejects.toThrow();
        });

        it('should validate bio length', async () => {
            const user = new User({
                email: 'test@example.com',
                username: 'johndoe',
                passwordHash: 'Password123!',
                bio: 'a'.repeat(501)

            });
            await expect(user.save()).rejects.toThrow();
        });
    });

    describe('user Methods', () => {
        it('should compare passwords correctly', async () => {
            const plainPassword = 'Password123!';

            const user = new User({
                email: 'test@example.com',
                username: 'johndoe',
                passwordHash: plainPassword
            });
            await user.save();
            const isMatch = await user.comparePassword(plainPassword);
            expect(isMatch).toBe(true);
        });

        it('should reject incorrect passwords', async () => {
            const user = new User({
                email: 'test@examp;e.com',
                username: 'johndoe',
                passwordHash: 'Password123!'
            });

            await user.save();

            const isMatch = await user.comparePassword('WrongPassword!');
            expect(isMatch).toBe(false);
        });

        it('should set default values correctly', async () => {
            const user = new User({
                email: 'test@example.com',
                username: 'johndoe',
                passwordHash: 'Password123!'
            });
            const savedUser = await user.save();

            expect(savedUser.role).toBe('user');
            expect(savedUser.isOnline).toBe(false);
            expect(savedUser.lastActiveAt).toBeDefined();
            expect(savedUser.createdAt).toBeDefined();
            expect(savedUser.updatedAt).toBeDefined();
        });
    });

    describe('User Indexing', () => {
        it('should have unique index on email', async () => {
            const indexes = await User.collection.getIndexes();
            expect(indexes).toHaveProperty('email_1');
        });

        it('should have unique index on username', async () => {
            const indexes = await User.collection.getIndexes();
            expect(indexes).toHaveProperty('username_1');
        });
    });
});
