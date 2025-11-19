import messageService from "../../../src/services/messageService";
import { createTestUser, createTestUsers } from "../../utils/testHelpers";
import { Message } from "../../../src/models/Message";

describe("Message Service", () => {
    describe("createMessage", () => {
        it("should create and save a private message", async () => {
            const sender = await createTestUser();
            const recipient = await createTestUser();

            const messageData = await messageService.createMessage({
                senderId: sender._id,
                recipientId: recipient._id,
                content: "Hello, this is a private message.",
                type: "private"
            });

            expect(messageData).toBeDefined();
            expect(messageData.senderId.toString()).toBe(sender._id.toString());
            expect(messageData.recipientId?.toString()).toBe(recipient._id.toString());
            expect(messageData.content).toBe("Hello, this is a private message.");
            expect(messageData.type).toBe("private");
        });

        it ("should create and save a group message", async () => {
            const sender = await createTestUser();

            const messageData = await messageService.createMessage({
                senderId: sender._id,
                groupId: "64b7f8f8f8f8f8f8f8f8f8f8",
                content: "Hello, this is a group message.",
                type: "group"
            });

            expect(messageData).toBeDefined();
            expect(messageData.type).toBe("group");
            expect(messageData.groupId).toBeDefined();
        });

        it ("should store attachments", async() => {
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
                        Size: 1024000
                    }
                ]
            });

            expect(message.attachments).toHaveLength(1);
            expect(message.attachments![0].filename).toBe('document.pdf');
        });
    });

    describe("getConversationHistory", () => {
        it("should retrieve conversation between two users", async () => {
            const users = await createTestUsers(2);
            const [sender, recipient] = users;

            await messageService.createMessage({
                senderId: sender._id.toString(),
                recipientId: recipient._id.toString(),
                content: "First message",
                type: "private"
            });

            await messageService.createMessage({
                senderId: recipient._id.toString(),
                recipientId: sender._id.toString(),
                content: "Second message",
                type: "private"
            });

            const messages = await messageService.getConversationHistory(
                sender._id.toString(),
                recipient._id.toString()
            );

            expect(messages.length).toBe(2);
            expect(messages[0].content).toBe("First message");
            expect(messages[1].content).toBe("Second message");
        });

        it ("should support pagination", async () => {
            const users = await createTestUsers(2);
            const [sender, recipient] = users;

            for (let i = 1; i <= 50; i++) {
                await messageService.createMessage({
                    senderId: sender._id.toString(),
                    recipientId: recipient._id.toString(),
                    content: `Message ${i}`,
                    type: "private"
                });
            }

            const page1 = await messageService.getConversationHistory(
                sender._id.toString(),
                recipient._id.toString(),
                1,
                30
            );

            const page2 = await messageService.getConversationHistory(
                sender._id.toString(),
                recipient._id.toString(),
                2,
                30
            );
            expect(page1.length).toBe(30);
            expect(page2.length).toBe(20);
        });

        it ("should not retrieve deleted messages", async () => {
            const users = await createTestUsers(2);
            const [sender, recipient] = users;

            const msg1 = await messageService.createMessage({
                senderId: sender._id.toString(),
                recipientId: recipient._id.toString(),
                content: "Visible message",
                type: "private"
            });

            const msg2 = await messageService.createMessage({
                senderId: sender._id.toString(),
                recipientId: recipient._id.toString(),
                content: "Deleted message",
                type: "private"
            });

            await messageService.deleteMessage(msg2._id.toString(), sender._id.toString());

            const messages = await messageService.getConversationHistory(
                sender._id.toString(),
                recipient._id.toString()
            );
            expect(messages.length).toBe(1);
        });
    });

    describe("markMessageAsRead", () => {
        it("should mark message as read", async () => {
            const users = await createTestUsers(2);
            const [sender, recipient] = users;

            const message = await messageService.createMessage({
                senderId: sender._id.toString(),
                recipientId: recipient._id.toString(),
                content: "Please read me",
                type: "private"
            });

            const updatedMessage = await messageService.markMessageAsRead(
                message._id.toString(),
                recipient._id.toString()
            );
            expect(updatedMessage.isRead).toBe(true);
            expect(updatedMessage.readAt).toBeDefined();
        });
    });

    describe("deleteMessage", () => {
        it("should soft delete a message", async () => {
            const users = await createTestUsers(2);
            const [sender, recipient] = users;

            const message = await messageService.createMessage({
                senderId: sender._id.toString(),
                recipientId: recipient._id.toString(),
                content: "This message will be deleted",
                type: "private"
            });

            const deletedMessage = await messageService.deleteMessage(
                message._id.toString(),
                sender._id.toString()
            );
            expect(deletedMessage.deletedAt).toBeDefined();
        });

        it("should not allow non-senders to delete message", async () => {
            const users = await createTestUsers(2);
            const [sender, recipient] = users;

            const message = await messageService.createMessage({
                senderId: sender._id.toString(),
                recipientId: recipient._id.toString(),
                content: "You cannot delete this",
                type: "private"
            });

            await expect(
                messageService.deleteMessage(
                    message._id.toString(),
                    recipient._id.toString()
                )
            ).rejects.toThrow('Message not found or access denied');
        });
    });

    describe("editMessage", () => {
        it("should edit message content", async () => {
            const users = await createTestUsers(2);
            const [sender, recipient] = users;

            const message = await messageService.createMessage({
                senderId: sender._id.toString(),
                recipientId: recipient._id.toString(),
                content: "Original content",
                type: "private"
            });

            const editedMessage = await messageService.editMessage(
                message._id.toString(),
                sender._id.toString(),
                "Edited content"
            );
            expect(editedMessage.content).toBe("Edited content");
            expect(editedMessage.editedAt).toBeDefined();
        });

        it ("should not allow editing deleted messages", async () => {
            const users = await createTestUsers(2);
            const [sender, recipient] = users;
            const message = await messageService.createMessage({
                senderId: sender._id.toString(),
                recipientId: recipient._id.toString(),
                content: "This will be deleted",
                type: "private"
            });
            await messageService.deleteMessage(
                message._id.toString(),
                sender._id.toString()
            );
            await expect(
                messageService.editMessage(
                    message._id.toString(),
                    sender._id.toString(),
                    "Trying to edit"
                )
            ).rejects.toThrow('Message not found or access denied');
        });

        it ("should not allow non-senders to edit message", async () => {
            const users = await createTestUsers(2);
            const [sender, recipient] = users;
            const message = await messageService.createMessage({
                senderId: sender._id.toString(),
                recipientId: recipient._id.toString(),
                content: "You cannot edit this",
                type: "private"
            });
            await expect(
                messageService.editMessage(
                    message._id.toString(),
                    recipient._id.toString(),
                    "Trying to edit"
                )
            ).rejects.toThrow('Message not found or access denied');
        });
    });

    describe("searchMessages", () => {
        it("should search messages by content", async () => {
            const users = await createTestUsers(2);
            const [sender, recipient] = users;

            await messageService.createMessage({
                senderId: sender._id.toString(),
                recipientId: recipient._id.toString(),
                content: "Meeting tomorrow at 10am",
                type: "private"
            });

            await messageService.createMessage({
                senderId: sender._id.toString(),
                recipientId: recipient._id.toString(),
                content: "Lunch plans?",
                type: "private"
            });

            const results = await messageService.searchMessages(
                sender._id.toString(),
                "meeting"
            );
            expect(results.length).toBe(1);
            expect(results[0].content).toContain('Meeting');
        });
    });
});