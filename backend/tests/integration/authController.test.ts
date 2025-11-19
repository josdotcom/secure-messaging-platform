import request from "supertest";
import express from "express";
import authRoutes from "../../src/routes/authRoutes";
import { User } from "../../src/models/User";
import { generateUserData } from "../utils/testHelpers";

const app = express();
app.use(express.json());
app.use("/auth", authRoutes);

describe("Auth Controller Integration Tests", () => {
    describe("POST /auth/register", () => {
        it("should register a new user successfully", async () => {
            const userData = generateUserData();

            const response = await request(app)
                .post("/auth/register")
                .send(userData)
                .expect(201);
            
            expect(response.body.success).toBe(true);
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.user.email).toBeDefined();
            expect(response.body.data.user.email).toMatch(/@/); // Valid email format
            expect(response.body.data.tokens.accessToken).toBeDefined();
            expect(response.body.data.tokens.refreshToken).toBeDefined();
        });

        it ("should return 400 for invalid email", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send({ email: "invalidemail", username: "testuser", password: "Password123!" })
                .expect(400);

            expect(response.body.success).toBe(false);
            expect(response.body.errors).toBeDefined();
        });

        it ("should return 400 for short username", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send({ email: "test@example,com", username: "ab", password: "Password123!" })
                .expect(400);
            expect(response.body.success).toBe(false);
        });

        it ("should return 400 for weak password", async () => {
            const response = await request(app)
                .post("/auth/register")
                .send({ email: "test@example.com", username: "testuser", password: "weak" })
                .expect(400);
            expect(response.body.success).toBe(false);
        });

        it("should return 400 if user already exists", async () => {
            const userData = generateUserData();
            
            await request(app)
                .post("/auth/register")
                .send(userData)

            const response = await request(app)
                .post("/auth/register")
                .send(userData)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe("POST /auth/login", () => {
        it ("should login user with correct credentials", async () => {
            const userData = generateUserData();
            await request(app)
                .post("/auth/register")
                .send(userData);

            const response = await request(app)
                .post("/auth/login")
                .send({ email: userData.email, password: userData.password })
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.user).toBeDefined();
            expect(response.body.data.tokens.accessToken).toBeDefined();
        });

        it ("should return 401 for incorrect email", async () => {
            const response = await request(app)
                .post("/auth/login")
                .send({ email: "wrong@example.com", password: "Password123!" })
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it ("should return 401 for incorrect password", async () => {
            const userData = generateUserData();
            await request(app)
                .post("/auth/register")
                .send(userData);
            const response = await request(app)
                .post("/auth/login")
                .send({ email: userData.email, password: "WrongPassword!" })
                .expect(401);
            expect(response.body.success).toBe(false);
        });

        it ("should return 400 for missing fields", async () => {
            const response = await request(app)
                .post("/auth/login")
                .send({ email: "" })
                .expect(400);
            expect(response.body.success).toBe(false);
        });
    });

    describe("POST /auth/refresh-token", () => {
        it ("should refresh access token with valid refresh token", async () => {
            const userData = generateUserData();
            const registerResponse = await request(app)
                .post("/auth/register")
                .send(userData)
                .expect(201);
            const refreshToken = registerResponse.body.data.tokens.refreshToken;

            const response = await request(app)
                .post("/auth/refresh-token")
                .send({ refreshToken })
                .expect(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.accessToken).toBeDefined();
        });

        it("should return 401 for invalid refresh token", async () => {
            const response = await request(app)
                .post("/auth/refresh-token")
                .send({ refreshToken: "invalidtoken" })
                .expect(401);
            expect(response.body.success).toBe(false);
        });
    });

    describe("POST /auth/logout", () => {
        it ("should logout user successfully", async () => {
            const userData = generateUserData();
            const registerResponse = await request(app)
                .post("/auth/register")
                .send(userData);
            const accessToken = registerResponse.body.data.tokens.accessToken;
            const response = await request(app)
                .post("/auth/logout")
                .set("Authorization", `Bearer ${accessToken}`)
                .expect(200);
            expect(response.body.success).toBe(true);

            const user = await User.findOne({ email: userData.email });
            expect(user?.isOnline).toBe(false);
        });

        it ("should return 401 if no token provided", async () => {
            const response = await request(app)
                .post("/auth/logout")
                .expect(401);
            expect(response.body.success).toBe(false);
        });

        it ("should return 401 for invalid token", async () => {
            const response = await request(app)
                .post("/auth/logout")
                .set("Authorization", `Bearer invalidtoken`)
                .expect(401);
            expect(response.body.success).toBe(false);
        });
    });
});