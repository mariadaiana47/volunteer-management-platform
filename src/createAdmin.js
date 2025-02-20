import mongoose from 'mongoose';
import User from './lib/models/User.js';
import bcrypt from 'bcrypt';

const MONGODB_URI = "mongodb://127.0.0.1:27017/voluntariat";

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const existingAdmin = await User.findOne({ role: "admin" });
    if (existingAdmin) {
      console.log("Admin already exists");
      return;
    }

    const hashedPassword = await bcrypt.hash("admin123", 10);
    const admin = new User({
      nume: "Admin",
      prenume: "User", 
      email: "admin@voluntariat.com",
      password: hashedPassword,
      dataNastere: new Date(),
      role: "admin"
    });

    await admin.save();
    console.log("Admin created successfully:", admin);
  } catch (error) {
    console.error("Error creating admin:", error);
  } finally {
    await mongoose.connection.close();
  }
}

createAdmin();