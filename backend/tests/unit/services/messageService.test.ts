import messageService from '../../../src/services/messageService';
import { Message } from '../../../src/models/Message';
import { createTestUser, createTestUsers } from '../../utils/testHelpers';

describe('MessageService', () => {
  describe('createMessage', () => {
    it('should create a private message', async () => {
      const sender = await createTestUser();
      const recipient = await createTestUser();

      const message = await messageService.createMessage({
        senderId: sender._id.toString(),
        recipientId: recipient._id.toString(),
        content: 'Hello!',
        type: 'private'
      });

      expect(message._id).toBeDefined();
      expect(message.senderId.toString()).toBe(sender._id.toString());
      expect(message.recipientId?.toString()).toBe(recipient._id.toString());
      expect(message.content).toBe('Hello!');
    });

    it('should create a group message', async () => {
      const sender = await createTestUser();

      const message = await messageService.createMessage({
        senderId: sender._id.toString(),
        groupId: 'group123',
        content: 'Group message',
        type: 'group'
      });

      expect(message.type).toBe('group');
      expect(message.groupId).toBeDefined();
    });

    it('should store attachments', async () => {
      const sender = await createTestUser();
      const recipient = await createTestUser();

      const message = await messageService.createMessage({
        senderId: sender._id.toString(),
        recipientId: recipient._id.toString(),
        content: 'File attached',
        type: 'private',
        attachments: [
          {
            url: 'https://example.com/file.pdf',
            filename: 'document.pdf',
            type: 'application/pdf',
            size: 1024000
          }
        ]
      });

      expect(message.attachments).toHaveLength(1);
      expect(message.attachments![0].filename).toBe('document.pdf');
    });
  });

  describe('getConversationHistory', () => {
    it('should retrieve conversation between two users', async () => {
      const [user1, user2] = await createTestUsers(2);

      // Create messages
      await messageService.createMessage({
        senderId: user1._id.toString(),
        recipientId: user2._id.toString(),
        content: 'Message 1',
        type: 'private'
      });

      await messageService.createMessage({
        senderId: user2._id.toString(),
        recipientId: user1._id.toString(),
        content: 'Message 2',
        type: 'private'
      });

      const messages = await messageService.getConversationHistory(
        user1._id.toString(),
        user2._id.toString()
      );

      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Message 1');
      expect(messages[1].content).toBe('Message 2');
    });

    it('should support pagination', async () => {
      const [user1, user2] = await createTestUsers(2);

      // Create 50 messages
      for (let i = 0; i < 50; i++) {
        await messageService.createMessage({
          senderId: user1._id.toString(),
          recipientId: user2._id.toString(),
          content: `Message ${i}`,
          type: 'private'
        });
      }

      const page1 = await messageService.getConversationHistory(
        user1._id.toString(),
        user2._id.toString(),
        1,
        30
      );

      const page2 = await messageService.getConversationHistory(
        user1._id.toString(),
        user2._id.toString(),
        2,
        30
      );

      expect(page1).toHaveLength(30);
      expect(page2).toHaveLength(20);
    });

    it('should not return deleted messages', async () => {
      const [user1, user2] = await createTestUsers(2);

      const message = await messageService.createMessage({
        senderId: user1._id.toString(),
        recipientId: user2._id.toString(),
        content: 'To be deleted',
        type: 'private'
      });

      // Delete message
      await messageService.deleteMessage(message._id.toString(), user1._id.toString());

      const messages = await messageService.getConversationHistory(
        user1._id.toString(),
        user2._id.toString()
      );

      expect(messages).toHaveLength(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read', async () => {
      const [sender, recipient] = await createTestUsers(2);

      const message = await messageService.createMessage({
        senderId: sender._id.toString(),
        recipientId: recipient._id.toString(),
        content: 'Unread message',
        type: 'private'
      });

      const updatedMessage = await messageService.markMessageAsRead(
        message._id.toString(),
        recipient._id.toString()
      );

      expect(updatedMessage.isRead).toBe(true);
      expect(updatedMessage.readAt).toBeDefined();
    });

    it('should throw error if message not found', async () => {
      const user = await createTestUser();

      await expect(
        messageService.markMessageAsRead('invalid-id', user._id.toString())
      ).rejects.toThrow();
    });
  });

  describe('deleteMessage', () => {
    it('should soft delete message', async () => {
      const sender = await createTestUser();
      const recipient = await createTestUser();

      const message = await messageService.createMessage({
        senderId: sender._id.toString(),
        recipientId: recipient._id.toString(),
        content: 'To delete',
        type: 'private'
      });

      await messageService.deleteMessage(message._id.toString(), sender._id.toString());

      const deletedMessage = await Message.findById(message._id);
      expect(deletedMessage?.deletedAt).toBeDefined();
    });

    it('should throw error if user is not sender', async () => {
      const [sender, recipient, other] = await createTestUsers(3);

      const message = await messageService.createMessage({
        senderId: sender._id.toString(),
        recipientId: recipient._id.toString(),
        content: 'Test',
        type: 'private'
      });

      await expect(
        messageService.deleteMessage(message._id.toString(), other._id.toString())
      ).rejects.toThrow('Message not found or unauthorized');
    });
  });

  describe('editMessage', () => {
    it('should edit message content', async () => {
      const sender = await createTestUser();
      const recipient = await createTestUser();

      const message = await messageService.createMessage({
        senderId: sender._id.toString(),
        recipientId: recipient._id.toString(),
        content: 'Original',
        type: 'private'
      });

      const edited = await messageService.editMessage(
        message._id.toString(),
        sender._id.toString(),
        'Edited content'
      );

      expect(edited.content).toBe('Edited content');
      expect(edited.editedAt).toBeDefined();
    });

    it('should not allow editing deleted messages', async () => {
      const sender = await createTestUser();
      const recipient = await createTestUser();

      const message = await messageService.createMessage({
        senderId: sender._id.toString(),
        recipientId: recipient._id.toString(),
        content: 'Test',
        type: 'private'
      });

      await messageService.deleteMessage(message._id.toString(), sender._id.toString());

      await expect(
        messageService.editMessage(message._id.toString(), sender._id.toString(), 'Edit')
      ).rejects.toThrow('Message not found or unauthorized');
    });
  });

  describe('searchMessages', () => {
    it('should search messages by content', async () => {
      const [user1, user2] = await createTestUsers(2);

      await messageService.createMessage({
        senderId: user1._id.toString(),
        recipientId: user2._id.toString(),
        content: 'Meeting tomorrow at 10am',
        type: 'private'
      });

      await messageService.createMessage({
        senderId: user1._id.toString(),
        recipientId: user2._id.toString(),
        content: 'Lunch plans?',
        type: 'private'
      });

      const results = await messageService.searchMessages(
        user1._id.toString(),
        'meeting'
      );

      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('Meeting');
    });
  });
});
