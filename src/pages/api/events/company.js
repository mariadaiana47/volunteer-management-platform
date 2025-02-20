import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";
import User from "@/lib/models/User";
import jwt from "jsonwebtoken";

const JWT_SECRET = "super_secret_key";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    await dbConnection();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized",
      });
    }

    let processedToken = token;
    try {
      if (token.startsWith('"') && token.endsWith('"')) {
        processedToken = token.slice(1, -1);
      }
    } catch (e) {
      console.error("Token processing error:", e);
    }

    let decoded;
    try {
      decoded = jwt.verify(processedToken, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const events = await Event.find({ createdBy: decoded.id })
      .populate("createdBy", "nume prenume role")
      .sort({ date: 1 })
      .lean()
      .exec();

    return res.status(200).json({
      success: true,
      events: events || [],
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch events",
      error: error.message,
    });
  }
}
