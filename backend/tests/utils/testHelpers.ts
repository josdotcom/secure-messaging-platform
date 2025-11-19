import { faker } from '@faker-js/faker';
import { IUser, User } from '../../src/models/User';
import jwt from 'jsonwebtoken';

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

export const createTestUsers = async (count: number) => {
  const users = [];
  for (let i = 0; i < count; i++) {
    const user = await createTestUser();
    users.push(user);
  }
  return users;
};

export const generateTestToken = (userId: string, email: string, role: string = 'user') => {
  return jwt.sign(
    { userId, email, role },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};