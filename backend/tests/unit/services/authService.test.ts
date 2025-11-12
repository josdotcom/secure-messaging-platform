import authService from '../../../src/services/authService';
import {User} from '../../../src/models/User';
import {generateUserData, createTestUser} from '../../utils/testHelpers';

describe('AuthService', () => {
    describe('Register', () => {
        it('should register a new user successfully', async () => {
            const userData = generateUserData();
            const result = await authService.register(
                userData.email,
                userData.username,
                userData.password
            );
            
            expect(result.user).toBeDefined();
            expect(result.user.email).toBe(userData.email.toLowerCase());
            expect(result.user.username).toBe(userData.username);
            expect(result.tokens.accessToken).toBeDefined();
            expect(result.tokens.refreshToken).toBeDefined();
        });

        it('should throw an error if email is already in use', async () => {
            const user = await createTestUser();

            await expect(authService.register(user.email, 'newusername', 'password123'))
                .rejects.toThrow('Email already Exists');
        });

        it('should throw an error if username is already in use', async () => {
            const user = await createTestUser();
            await expect(authService.register('new@example.com', user.username, 'password123'))
                .rejects.toThrow('username already Exists');
        });

        it('should hash the password during registration', async () => {
            const userData = generateUserData();

            await authService.register(
                userData.email,
                userData.username,
                userData.password
            );

            const user = await User.findOne({ email: userData.email });
            expect(user?.passwordHash).not.toBe(userData.password);
        });
    });

    describe('Login', () => {
        it('should login user with correct credentials', async () => {
            const userData = generateUserData();

            await authService.register(
                userData.email,
                userData.username,
                userData.password
            );

            const result = await authService.login(userData.email, userData.password);

            expect(result.user).toBeDefined();
            expect(result.user.email).toBe(userData.email.toLowerCase());
            expect(result.tokens.accessToken).toBeDefined();
            expect(result.tokens.refreshToken).toBeDefined();
        });

        it('should throw error with incorrect email', async() => {
            await expect(
                authService.login('wrong@example.com', 'password123!')
            ).rejects.toThrow('Invalid Credentials');
        });

        it('should throw error with incorrect password', async() => {
            const user = await createTestUser();

            await expect(
                authService.login(user.email, 'WrongPassword123!')
            ).rejects.toThrow('Invalid Credentials');
        });

        it('should update user online status on login', async() => {
            const userData = generateUserData();

            await authService.register(
                userData.email,
                userData.username,
                userData.password
            );

            await authService.login(userData.email, userData.password);

            const user = await User.findOne({ email: userData.email });
            expect(user?.isOnline).toBe(true);
        });
    });

    describe('Token Management', () => {
    it('should generate valid access token', () => {
      const token = authService.generateAccessToken('user123', 'test@example.com', 'user');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should generate valid refresh token', () => {
      const token = authService.generateRefreshToken('user123');
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    it('should verify valid access token', () => {
      const token = authService.generateAccessToken('user123', 'test@example.com', 'user');
      const decoded = authService.verifyAccessToken(token);

      expect(decoded.userId).toBe('user123');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe('user');
    });

    it('should throw error for invalid token', () => {
      expect(() => {
        authService.verifyAccessToken('invalid-token');
      }).toThrow('Invalid or expired token');
    });

    it('should refresh access token', async () => {
      const user = await createTestUser();
      const refreshToken = authService.generateRefreshToken(user._id.toString());

      const newAccessToken = await authService.refreshAccessToken(refreshToken);

      expect(newAccessToken).toBeDefined();
      expect(typeof newAccessToken).toBe('string');
    });

    it('should throw error for invalid refresh token', async () => {
      await expect(
        authService.refreshAccessToken('invalid-refresh-token')
      ).rejects.toThrow('Invalid refresh token');
    });
  });

  describe('logout', () => {
    it('should update user online status on logout', async () => {
      const user = await createTestUser({ isOnline: true });

      await authService.logout(user._id.toString());

      const updatedUser = await User.findById(user._id);
      expect(updatedUser?.isOnline).toBe(false);
      expect(updatedUser?.lastActiveAt).toBeDefined();
    });
  });
});   


