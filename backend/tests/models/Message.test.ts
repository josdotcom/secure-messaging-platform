import { Message } from "../../src/models/Message";
import { createTestUser } from "../utils/testHelpers";

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
});