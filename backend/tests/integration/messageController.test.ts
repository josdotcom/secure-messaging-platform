import request from "supertest";
import express from "express";
import messageRoutes from "../../src/routes/messageRoutes";
import { createTestUser, createTestUsers, generateTestToken } from "../utils/testHelpers";
import authService from "../../src/services/authService";

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
    });
});