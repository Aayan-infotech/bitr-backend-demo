import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

try {
  const mongoURI = process.env.MONGO_URI;
  if (!mongoURI) throw new Error("MONGO_URI not found in environment variables");

  await mongoose.connect(mongoURI);  

  console.log("✅ MongoDB connected successfully");
} catch (err) {
  console.error("❌ MongoDB connection error:", err.message);
  process.exit(1);
}

export default mongoose;
