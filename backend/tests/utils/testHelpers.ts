import { faker } from "@faker-js/faker";
import jwt from "jsonwebtoken";
import { User } from "../../src/models/User";
import type { IUser } from "../../src/models/User";

export const generateUserData = () => ({
    email: faker.internet.email(),
    username: faker.internet.username(),
    password: 'Password123!',
    role: 'user' as const
});

export const createTestUser = async (data?: Partial<IUser>) => {
    const userData = {
        email: faker.internet.email(),
        username: faker.internet.username(),
        passwordHash: 'Password123!',
        role: 'user' as const,
        ...data
    };

    const user = new User(userData);
    await user.save();
    return user;
};

export const generateTestToken = (userId: string, email: string, role: string) => {
    return jwt.sign(
        { userId, email: 'test@example.com', role },
        process.env.JWT_SECRET || 'test-secret',
        {
            expiresIn: '1h'
        }
    );
};

export const createTestUsers = async (count: number) => {
    const users = [];
    for (let i = 0; i < count; i++) {
        const user = await createTestUser();
        users.push(user);
    }
    return users;
};


export const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));