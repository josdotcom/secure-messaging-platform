import request from 'supertest';
import express from 'express';
import messageRoutes from '../../../src/routes/messageRoutes';
import authService from '../../../src/services/authService';
import { createTestUser, createTestUsers, generateTestToken } from '../../utils/testHelpers';

const app = express();
app.use(express.json());
app.use('/api/messages', messageRoutes);

describe('Message Controller Integration Tests', () => {
  describe('POST /api/messages', () => {
    it('should create a private message', async () => {
      const [sender, recipient] = await createTestUsers(2);
      const token = generateTestToken(sender._id.toString(), sender.email, sender.role);

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientId: recipient._id.toString(),
          content: 'Hello!',
          type: 'private'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.content).toBe('Hello!');
      expect(response.body.data.senderId).toBe(sender._id.toString());
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .post('/api/messages')
        .send({
          recipientId: 'user123',
          content: 'Test',
          type: 'private'
        })
        .expect(401);
    });

    it('should return 400 for empty content', async () => {
      const sender = await createTestUser();
      const token = generateTestToken(sender._id.toString(), sender.email, sender.role);

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientId: 'user123',
          content: '',
          type: 'private'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for content exceeding max length', async () => {
      const sender = await createTestUser();
      const token = generateTestToken(sender._id.toString(), sender.email, sender.role);

      const response = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientId: 'user123',
          content: 'a'.repeat(5001),
          type: 'private'
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/messages/conversation/:partnerId', () => {
    it('should retrieve conversation history', async () => {
      const [user1, user2] = await createTestUsers(2);
      const token = generateTestToken(user1._id.toString(), user1.email, user1.role);

      // Create messages
      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientId: user2._id.toString(),
          content: 'Message 1',
          type: 'private'
        });

      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientId: user2._id.toString(),
          content: 'Message 2',
          type: 'private'
        });

      // Get conversation
      const response = await request(app)
        .get(`/api/messages/conversation/${user2._id.toString()}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    });

    it('should support pagination', async () => {
      const [user1, user2] = await createTestUsers(2);
      const token = generateTestToken(user1._id.toString(), user1.email, user1.role);

      // Create 50 messages
      for (let i = 0; i < 50; i++) {
        await request(app)
          .post('/api/messages')
          .set('Authorization', `Bearer ${token}`)
          .send({
            recipientId: user2._id.toString(),
            content: `Message ${i}`,
            type: 'private'
          });
      }

      // Get page 1
      const page1 = await request(app)
        .get(`/api/messages/conversation/${user2._id.toString()}?page=1&limit=30`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(page1.body.data).toHaveLength(30);

      // Get page 2
      const page2 = await request(app)
        .get(`/api/messages/conversation/${user2._id.toString()}?page=2&limit=30`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(page2.body.data).toHaveLength(20);
    });
  });

  describe('PUT /api/messages/:messageId/read', () => {
    it('should mark message as read', async () => {
      const [sender, recipient] = await createTestUsers(2);
      const senderToken = generateTestToken(sender._id.toString(), sender.email, sender.role);
      const recipientToken = generateTestToken(recipient._id.toString(), recipient.email, recipient.role);

      // Send message
      const messageResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          recipientId: recipient._id.toString(),
          content: 'Unread message',
          type: 'private'
        });

      const messageId = messageResponse.body.data._id;

      // Mark as read
      const response = await request(app)
        .put(`/api/messages/${messageId}/read`)
        .set('Authorization', `Bearer ${recipientToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.isRead).toBe(true);
    });
  });

  describe('DELETE /api/messages/:messageId', () => {
    it('should delete own message', async () => {
      const [sender, recipient] = await createTestUsers(2);
      const token = generateTestToken(sender._id.toString(), sender.email, sender.role);

      // Send message
      const messageResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientId: recipient._id.toString(),
          content: 'To delete',
          type: 'private'
        });

      const messageId = messageResponse.body.data._id;

      // Delete message
      const response = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should not delete other user messages', async () => {
      const [sender, recipient, other] = await createTestUsers(3);
      const senderToken = generateTestToken(sender._id.toString(), sender.email, sender.role);
      const otherToken = generateTestToken(other._id.toString(), other.email, other.role);

      // Send message
      const messageResponse = await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${senderToken}`)
        .send({
          recipientId: recipient._id.toString(),
          content: 'Test',
          type: 'private'
        });

      const messageId = messageResponse.body.data._id;

      // Try to delete with different user
      const response = await request(app)
        .delete(`/api/messages/${messageId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/messages/search', () => {
    it('should search messages by query', async () => {
      const [user1, user2] = await createTestUsers(2);
      const token = generateTestToken(user1._id.toString(), user1.email, user1.role);

      // Create messages
      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientId: user2._id.toString(),
          content: 'Meeting tomorrow at 10am',
          type: 'private'
        });

      await request(app)
        .post('/api/messages')
        .set('Authorization', `Bearer ${token}`)
        .send({
          recipientId: user2._id.toString(),
          content: 'Lunch plans?',
          type: 'private'
        });

      // Search for "meeting"
      const response = await request(app)
        .get('/api/messages/search?q=meeting')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should return 400 without query', async () => {
      const user = await createTestUser();
      const token = generateTestToken(user._id.toString(), user.email, user.role);

      const response = await request(app)
        .get('/api/messages/search')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });
});
