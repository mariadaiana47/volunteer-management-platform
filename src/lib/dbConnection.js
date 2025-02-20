import mongoose from "mongoose";

const connectionUrl = "mongodb://127.0.0.1:27017/";
const dbName = "voluntariat";

const dbConnection = async () => {
  try {
    if (mongoose.connections[0].readyState) {
      return;
    }
    await mongoose.connect(connectionUrl + dbName, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("✅ Database connected successfully!");
  } catch (error) {
    console.error("❌ Database connection failed!", error);
    throw error;
  }
};

export default dbConnection;  