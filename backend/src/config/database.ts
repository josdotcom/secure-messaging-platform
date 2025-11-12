import mongoose from "mongoose";

export const connectToDatabase = async () => {
    try {
        const conn =  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/messaging-app");
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        process.exit(1);
    }
};