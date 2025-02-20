// src/pages/api/events/[eventId]/messages.js
import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";
import Message from "@/lib/models/message";
import User from "@/lib/models/User";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const JWT_SECRET = "super_secret_key";

export default async function handler(req, res) {
  console.log("Messages API hit:", {
    method: req.method,
    eventId: req.query.eventId,
    path: req.url,
  });

  // CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  try {
    await dbConnection();

    const { eventId } = req.query;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID format"
      });
    }

    // Token validation
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : authHeader?.replace(/^["'](.+)["']$/, "$1");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token.trim(), JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Verify event exists
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Handle GET request
    if (req.method === "GET") {
      const messages = await Message.find({ eventId })
        .sort({ timestamp: 1 })
        .populate('senderId', 'nume prenume avatar')
        .lean();

      return res.status(200).json({
        success: true,
        messages: messages.map(msg => ({
          _id: msg._id.toString(),
          content: msg.content,
          senderId: msg.senderId._id.toString(),
          senderName: msg.senderName,
          senderAvatar: msg.senderAvatar || "/default-avatar.png",
          timestamp: msg.timestamp
        }))
      });
    }

    // Handle POST request
    if (req.method === "POST") {
      const { content } = req.body;
      if (!content?.trim()) {
        return res.status(400).json({
          success: false,
          message: "Message content is required",
        });
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Create new message
      const newMessage = new Message({
        eventId,
        content: content.trim(),
        senderId: user._id,
        senderName: `${user.nume} ${user.prenume}`,
        senderAvatar: user.avatar || "/default-avatar.png",
        timestamp: new Date()
      });

      await newMessage.save();

      return res.status(201).json({
        success: true,
        message: {
          _id: newMessage._id.toString(),
          content: newMessage.content,
          senderId: newMessage.senderId.toString(),
          senderName: newMessage.senderName,
          senderAvatar: newMessage.senderAvatar,
          timestamp: newMessage.timestamp
        }
      });
    }

    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });

  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message
    });
  }
}