import { faker } from '@faker-js/faker';
import { IUser, User } from '../../src/models/User';

export const generateUserData = () => ({
    email: faker.internet.email(),
    username: faker.internet.username(),
    password: 'Password123!',
    role: 'user' as const
});

export const createTestUser = async (data?: Partial<IUser>) => {
    const userData = generateUserData();
    const user = new User({
        email: userData.email,
        username: userData.username,
        passwordHash: userData.password,
        role: userData.role,
        ...data
    });
    await user.save();
    return user;
};
