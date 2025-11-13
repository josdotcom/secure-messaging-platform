import { Message } from '../../../src/models/Message';
import { createTestUser } from '../../utils/testHelpers';

describe('Message Model', () => {
    describe('Message Creation', () => {
        it('should create private message successfully', async () => {
            const sender = await createTestUser();
            const recipient = await createTestUser();

            const message = new Message({
                senderId: sender._id,
                recipientId: recipient._id,
                content: 'Hello, World!',
                type: 'private'
            });

            const savedMessage = await message.save();

            expect(savedMessage._id).toBeDefined();
            expect(savedMessage.senderId.toString()).toBe(sender._id.toString());
            expect(savedMessage.recipientId!.toString()).toBe(recipient._id.toString());
            expect(savedMessage.content).toBe('Hello, World!');
            expect(savedMessage.type).toBe('private');
            expect(savedMessage.isRead).toBe(false);
            expect(savedMessage.isSpam).toBe(false);
            expect(savedMessage.isPinned).toBe(false);
        });
        it('should create group message successfully', async () => {
            const sender = await createTestUser();

            const message = new Message({
                senderId: sender._id,
                groupId: 'group123',
                content: 'Hello, Group!',
                type: 'group'
            });

            const savedMessage = await message.save();

            expect(savedMessage.type).toBe('group');
            expect(savedMessage.groupId).toBeDefined();
        });
    });

    describe('Message Validation', () => {
        it('should require senderId', async () => {
            const message = new Message({
                content: 'No senderId',
                type: 'private'
            });

            await expect(message.save()).rejects.toThrow();
        });

        it('should require content', async () => {
            const sender = await createTestUser();

            const message = new Message({
                senderId: sender._id,
                recipientId: 'recipient123',
                type: 'private'
            });

            await expect(message.save()).rejects.toThrow();
        });

        it('should enforce content length limit', async () => {
            const sender = await createTestUser();
            
            const message = new Message({
                senderId: sender._id,
                recipientId: 'recipient123',
                content: 'a'.repeat(5001),
                type: 'private'
            });

            await expect(message.save()).rejects.toThrow();
        });

        it ('should validate message type', async () => {
            const sender = await createTestUser();

            const message = new Message({
                senderId: sender._id,
                recipientId: 'recipient123',
                content: 'Invalid type',
                type: 'invalid' as any
            });
            await expect(message.save()).rejects.toThrow();
        });
    });

    describe('Message Attachments', () => {
        it('should store attachments', async () => {
            const sender = await createTestUser();
            const message = new Message({
                senderId: sender._id,
                recipientId: 'recipient123',
                content: 'Message with attachment',
                type: 'private',
                attachments: [
                    {
                        url: 'http://example.com/file.png',
                        filename: 'file.png',
                        type: 'image/png',
                        Size: 2048
                    }
                ]
            });

            const savedMessage = await message.save();
            expect(savedMessage.attachments).toHaveLength(1);
            expect(savedMessage.attachments![0].filename).toBe('file.png');
        });
    });

    describe('Message States', () => {
        it('should mark message as read', async () => {
            const sender = await createTestUser();

            const message = new Message({
                senderId: sender._id,
                recipientId: 'recipient123',
                content: 'Read this message',
                type: 'private'
            });

            await message.save();

            message.isRead = true;
            message.readAt = new Date();
            await message.save();

            expect(message.isRead).toBe(true);
            expect(message.readAt).toBeDefined();
        });

        it('should soft delete message', async () => {
            const sender = await createTestUser();

            const message = new Message({
                senderId: sender._id,
                recipientId: 'recipient123',
                content: 'This message will be deleted',
                type: 'private'
            });

            await message.save();

            message.deletedAt = new Date();
            await message.save();

            expect(message.deletedAt).toBeDefined();
        });

        it('should track message edits', async () => {
            const sender = await createTestUser();

            const message = new Message({
                senderId: sender._id,
                recipientId: 'recipient123',
                content: 'Original content',
                type: 'private'
            });

            await message.save();

            message.content = 'Edited content';
            message.editedAt = new Date();
            await message.save();

            expect(message.content).toBe('Edited content');
            expect(message.editedAt).toBeDefined();
        });
    });
});