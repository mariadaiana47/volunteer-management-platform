import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";
import User from "@/lib/models/User";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    await dbConnection();

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing or invalid",
      });
    }

    const token = authHeader.split(" ")[1].trim();

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    const { eventId } = req.body;

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required",
      });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (!Array.isArray(event.requests)) {
      event.requests = [];
    }

    const existingRequest = event.requests.find(
      (request) => request.volunteerId?.toString() === userId.toString()
    );

    if (existingRequest) {
      return res.status(409).json({
        success: false,
        message: "You have already applied to this event",
        existingRequest,
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const newRequest = {
      _id: new Types.ObjectId(),
      volunteerId: new Types.ObjectId(userId),
      volunteerName: `${user.nume || ""} ${user.prenume || ""}`.trim(),
      status: "pending",
      appliedAt: new Date(),
    };

    event.requests.push(newRequest);

    if (typeof event.remainingSlots === "number" && event.remainingSlots > 0) {
      event.remainingSlots -= 1;
    }

    const savedEvent = await event.save();

    return res.status(200).json({
      success: true,
      message: "Application submitted successfully",
      request: newRequest,
      event: savedEvent,
    });
  } catch (error) {
    console.error("Request handler error:", {
      message: error.message,
      stack: error.stack,
    });

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to submit application",
      error: error.message,
    });
  }
}
