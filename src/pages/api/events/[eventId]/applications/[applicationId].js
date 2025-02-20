import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

export default async function handler(req, res) {
  // Set the header first
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== "PATCH") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed"
    });
  }

  const { eventId, applicationId } = req.query;
  const { status } = req.body;

  try {
    await dbConnection();

    // Verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized"
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "super_secret_key");

    // Find the event and update the specific request
    const event = await Event.findOneAndUpdate(
      {
        _id: eventId,
        "requests._id": applicationId
      },
      {
        $set: {
          "requests.$.status": status,
          "requests.$.processedAt": new Date(),
          "requests.$.processedBy": decoded.id
        }
      },
      { new: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event or application not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Application status updated successfully"
    });

  } catch (error) {
    console.error("Application update error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to update application",
      error: error.message
    });
  }
}