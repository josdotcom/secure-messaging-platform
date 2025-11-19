import request from "supertest";
import express from "express";
import messageRoutes from "../../src/routes/messageRoutes.js";
import { createTestUser, createTestUsers, generateTestToken } from "../utils/testHelpers";

const app = express();
app.use(express.json());
app.use("/messages", messageRoutes);

describe("Message Controller Integration Tests", () => {
    describe("POST /messages", () => {
        it ("should create a private message successfully", async () => {
            const users = await createTestUsers(2);
            const sender = users[0];
            const recipient = users[1];
            const token = generateTestToken(sender._id.toString(), sender.email);

            const response = await request(app)
                .post("/messages")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    recipientId: recipient._id,
                    content: "Hello, this is a private message.",
                    type: "private"
                })
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data).toBeDefined();
            expect(response.body.data.content).toBe("Hello, this is a private message.");
            expect(response.body.data.senderId).toBe(sender._id.toString());
        });

        it ("should return 401 without authentication", async () => {
            const response = await request(app)
                .post("/messages")
                .send({
                    recipientId: "64b7f8f8f8f8f8f8f8f8f8f8",
                    content: "Hello, this is a private message.",
                    type: "private"
                })
                .expect(401);
        });

        it ("should return 400 for missing content", async () => {
            const users = await createTestUsers(2);
            const sender = users[0];
            const recipient = users[1];
            const token = generateTestToken(sender._id.toString(), sender.email);
            const response = await request(app)
                .post("/messages")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    recipientId: recipient._id,
                    type: "private"
                })
                .expect(400);
            expect(response.body.success).toBe(false);
        });

        it("should return 400 for content exceeding max length", async () => {
            const users = await createTestUsers(2);
            const sender = users[0];
            const recipient = users[1];
            const token = generateTestToken(sender._id.toString(), sender.email);
           
            const response = await request(app)
                .post("/messages")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    recipientId: recipient._id,
                    content: "A".repeat(5001), // Assuming max length is 5000
                    type: "private"
                })
                .expect(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("GET /messages/conversation/:partnerId", () => {
        it ("should retrieve conversation history successfully", async () => {
            const users = await createTestUsers(2);
            const sender = users[0];
            const recipient = users[1];
            const token = generateTestToken(sender._id.toString(), sender.email);
            
            await request(app)
                .post("/messages")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    recipientId: recipient._id,
                    content: "Hello, this is a private message.",
                    type: "private"
                });

            await request(app)
            .post("/messages")
            .set("Authorization", `Bearer ${generateTestToken(recipient._id.toString(), sender.email)}`)
            .send({
                recipientId: sender._id,
                content: "Hi! Got your message.",
                type: "private"
            });

            const response = await request(app)
                .get(`/messages/conversation/${recipient._id}`)
                .set("Authorization", `Bearer ${token}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveLength(2);
        });

        it ("should support pagination", async () => {
            const users = await createTestUsers(2);
            const sender = users[0];
            const recipient = users[1];
            const token = generateTestToken(sender._id.toString(), sender.email);

            for (let i = 0; i < 75; i++) {
                await request(app)
                    .post("/messages")
                    .set("Authorization", `Bearer ${token}`)
                    .send({
                        recipientId: recipient._id,
                        content: `Message number ${i + 1}`,
                        type: "private"
                    });
            }
            
            const page1 = await request(app)
                .get(`/messages/conversation/${recipient._id}?page=1&limit=30`)
                .set("Authorization", `Bearer ${token}`)
                .expect(200);
            
            expect(page1.body.data).toHaveLength(30);

            const page2 = await request(app)
                .get(`/messages/conversation/${recipient._id}?page=2&limit=30`)
                .set("Authorization", `Bearer ${token}`)
                .expect(200);

            expect(page2.body.data).toHaveLength(30);

            const page3 = await request(app)
                .get(`/messages/conversation/${recipient._id}?page=3&limit=30`)
                .set("Authorization", `Bearer ${token}`)
                .expect(200);
            expect(page3.body.data).toHaveLength(15);
        });
    });

    describe('PUT /messages/:messageId/read', () => {
        it('should mark a message as read', async () => {
            const users = await createTestUsers(2);
            const sender = users[0];
            const recipient = users[1];
            const senderToken = generateTestToken(sender._id.toString(), sender.email);
            const recipientToken = generateTestToken(recipient._id.toString(), recipient.email);
            const messageResponse = await request(app)
                .post("/messages")
                .set("Authorization", `Bearer ${senderToken}`)
                .send({
                    recipientId: recipient._id,
                    content: "Please read this message.",
                    type: "private"
                });

            const messageId = messageResponse.body.data._id;

            const response = await request(app)
                .put(`/messages/${messageId}/read`)
                .set("Authorization", `Bearer ${recipientToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.isRead).toBe(true);
        });
    });

    describe('DELETE /messages/:messageId', () => {
        it('should delete own message', async () => {
            const users = await createTestUsers(2);
            const sender = users[0];
            const recipient = users[1];
            const senderToken = generateTestToken(sender._id.toString(), sender.email);
            const messageResponse = await request(app)
                .post("/messages")
                .set("Authorization", `Bearer ${senderToken}`)
                .send({
                    recipientId: recipient._id,
                    content: "This message will be deleted.",
                    type: "private"
                });
            const messageId = messageResponse.body.data._id;

            const response = await request(app)
                .delete(`/messages/${messageId}`)
                .set("Authorization", `Bearer ${senderToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);
        });

        it('should not allow deleting others\' messages', async () => {
            const users = await createTestUsers(2);
            const sender = users[0];
            const recipient = users[1];
            const senderToken = generateTestToken(sender._id.toString(), sender.email);
            const recipientToken = generateTestToken(recipient._id.toString(), recipient.email);
            const messageResponse = await request(app)
                .post("/messages")
                .set("Authorization", `Bearer ${senderToken}`)
                .send({
                    recipientId: recipient._id,
                    content: "You cannot delete this message.",
                    type: "private"
                });
            const messageId = messageResponse.body.data._id;

            const response = await request(app)
                .delete(`/messages/${messageId}`)
                .set("Authorization", `Bearer ${recipientToken}`)
                .expect(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /messages/search', () => {
        it('should search messages by query', async () => {
            const users = await createTestUsers(2);
            const sender = users[0];
            const recipient = users[1];
            const token = generateTestToken(sender._id.toString(), sender.email);

            await request(app)
                .post("/messages")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    recipientId: recipient._id,
                    content: "This is a unique search term message.",
                    type: "private"
                });

            await request(app)
                .post("/messages")
                .set("Authorization", `Bearer ${token}`)
                .send({
                    recipientId: recipient._id,
                    content: "Another message without the term.",
                    type: "private"
                });

            const response = await request(app)
                .get(`/messages/search?q=unique search term`)
                .set("Authorization", `Bearer ${token}`)
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
            expect(response.body.data[0].content).toContain("unique search term");
        });

        it('should return 400 without query parameter', async () => {
            const users = await createTestUsers(2);
            const sender = users[0];
            const token = generateTestToken(sender._id.toString(), sender.email);
            const response = await request(app)
                .get(`/messages/search`)
                .set("Authorization", `Bearer ${token}`)
                .expect(400);
            expect(response.body.success).toBe(false);
        });
    });
});