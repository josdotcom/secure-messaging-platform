import { Message } from "../../../src/models/Message";
import { createTestUser } from "../../utils/testHelpers";

describe("Message Model", () => {
    describe("Message Creation", () => {
        it("should create a private message successfully", async () => {
            const sender = await createTestUser();
            const recipient = await createTestUser();

            const message = new Message({
                senderId: sender._id,
                recipientId: recipient._id,
                content: "Hello, this is a private message.",
                type: "private"
            });

            const savedMessage = await message.save();  

            expect(savedMessage._id).toBeDefined();
            expect(savedMessage.senderId.toString()).toBe(sender._id.toString());
            expect(savedMessage.recipientId).toBeDefined();
            expect(savedMessage.recipientId?.toString()).toBe(recipient._id.toString());
            expect(savedMessage.content).toBe("Hello, this is a private message.");
            expect(savedMessage.type).toBe("private");
            expect(savedMessage.isRead).toBe(false);
            expect(savedMessage.isSpam).toBe(false);
            expect(savedMessage.isPinned).toBe(false);
        });

        it("should create a group message successfully", async () => {
            const sender = await createTestUser();

            const message = new Message({
                senderId: sender._id,
                groupId: "64b7f8f8f8f8f8f8f8f8f8f8",
                content: "Hello, this is a group message.",
                type: "group"
            });

            const savedMessage = await message.save();

            expect(savedMessage.type).toBe("group");
            expect(savedMessage._id).toBeDefined();
        });
    });

    describe("Message Validations", () => {
        it ("should require senderId", async () => {
            const message = new Message({
                content: "Missing senderId",
                type: "private"
            });

            await expect(message.save()).rejects.toThrow();
        });

        it ("should require content", async () => {
            const sender = await createTestUser();
            const message = new Message({
                senderId: sender._id,
                recipientId: "64b7f8f8f8f8f8f8f8f8f8f8",
                type: "private"
            });

            await expect(message.save()).rejects.toThrow();
        });

        it ("should enforce content length limit", async () => {
            const sender = await createTestUser();

            const message = new Message({
                senderId: sender._id,
                recipientId: "64b7f8f8f8f8f8f8f8f8f8f8",
                content: "a".repeat(2001),
                type: "private"
            });

            await expect(message.save()).rejects.toThrow();
        });

        it ("should validate message type", async () => {
            const sender = await createTestUser();

            const message = new Message({
                senderId: sender._id,
                recipientId: "64b7f8f8f8f8f8f8f8f8f8f8",
                content: "Invalid type",
                type: "invalidType" as any
            });

            await expect(message.save()).rejects.toThrow();
        });
    });

    describe("Message Attachments", () => {
        it('should store attachments', async () => {
            const sender = await createTestUser();
            const recipient = await createTestUser();

            const message = new Message({
                senderId: sender._id,
                recipientId: recipient._id,
                content: 'Message with file',
                type: 'private',
                attachments: [
                    {
                        filename: 'image.png',
                        url: 'http://example.com/image.png',
                        type: 'image/png',
                        Size: 1024
                    }
                ]
            });

            const savedMessage = await message.save();

            expect(savedMessage).toBeDefined();
            expect(savedMessage.attachments).toHaveLength(1);
            expect(savedMessage.attachments[0].filename).toBe('image.png');
            expect(savedMessage.attachments[0].url).toBe('http://example.com/image.png');
            expect(savedMessage.attachments[0].type).toBe('image/png');
            expect(savedMessage.attachments[0].Size).toBe(1024);
        });

        it('should create a message with multiple attachments', async () => {
            const sender = await createTestUser();
            const recipient = await createTestUser();

            const messageData = new Message({
                senderId: sender._id,
                recipientId: recipient._id,
                content: 'Multiple files',
                messageType: 'file',
                type: 'private',
                attachments: [
                    {
                        filename: 'doc.pdf',
                        url: 'http://example.com/doc.pdf',
                        type: 'application/pdf',
                        Size: 2048
                    },
                    {
                        filename: 'photo.jpg',
                        url: 'http://example.com/photo.jpg',
                        type: 'image/jpeg',
                        Size: 4096
                    }
                ]
            });

            const message = await Message.create(messageData);

            expect(message.attachments).toHaveLength(2);
            expect(message.attachments[0].filename).toBe('doc.pdf');
            expect(message.attachments[1].filename).toBe('photo.jpg');
        });
    });

    describe("Message States", () => {
        it("should mark message as read", async () => {
            const sender = await createTestUser();
            const recipient = await createTestUser();
            const message = new Message({
                senderId: sender._id,
                recipientId: recipient._id,
                content: "Please read me",
                type: "private"
            });
            await message.save();

            message.isRead = true;
            message.readAt = new Date();
            const updatedMessage = await message.save();
            expect(updatedMessage.isRead).toBe(true);
            expect(updatedMessage.readAt).toBeDefined();
        });

        it("should soft delete a message", async () => {
            const sender = await createTestUser();
            const recipient = await createTestUser();
            const message = new Message({
                senderId: sender._id,
                recipientId: recipient._id,
                content: "This message will be deleted",
                type: "private"
            });
            await message.save();

            message.deletedAt = new Date();
            const deletedMessage = await message.save();

            expect(deletedMessage.deletedAt).toBeDefined();
        });

        it("should track message edits", async () => {
            const sender = await createTestUser();
            const recipient = await createTestUser();
            const message = new Message({
                senderId: sender._id,
                recipientId: recipient._id,
                content: "Original content",
                type: "private"
            });
            await message.save();

            message.content = "Edited content";
            message.editedAt = new Date();
            const editedMessage = await message.save();
            expect(editedMessage.content).toBe("Edited content");
            expect(editedMessage.editedAt).toBeDefined();
        });
    });
});