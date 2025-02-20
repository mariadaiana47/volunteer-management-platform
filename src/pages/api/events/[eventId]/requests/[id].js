// pages/api/events/[eventId]/requests/[id].js
import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";
import User from "@/lib/models/User";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const JWT_SECRET = "super_secret_key";

export default async function handler(req, res) {
  console.log("Request received:", {
    method: req.method,
    query: req.query,
    body: req.body,
  });

  if (req.method !== "PATCH") {
    return res.status(405).json({
      success: false,
      message: "Method not allowed",
    });
  }

  try {
    await dbConnection();

    // Verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token required",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (tokenError) {
      console.error("Token verification error:", tokenError);
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const { eventId, id } = req.query;
    const { status, actionId } = req.body;

    console.log("Processing request:", { eventId, id, status, actionId });

    // Input validation
    if (!eventId || !id) {
      return res.status(400).json({
        success: false,
        message: "Missing eventId or requestId",
      });
    }

    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    // Find event and validate
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    // Check permissions
    const user = await User.findById(decoded.id);
    if (!user || (event.createdBy.toString() !== user._id.toString() && user.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to process this request",
      });
    }

    // Find the request
    const requestIndex = event.requests.findIndex(
      (req) => req._id.toString() === id
    );

    if (requestIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Request not found",
      });
    }

    const request = event.requests[requestIndex];

    // Check if request can be processed
    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Request has already been ${request.status}`,
      });
    }

    // Handle approval logic
    if (status === 'approved') {
      // Check remaining slots
      if (event.maxParticipants > 0 && event.remainingSlots <= 0) {
        return res.status(400).json({
          success: false,
          message: "Event has no remaining slots",
        });
      }

      // Update remaining slots
      if (event.maxParticipants > 0) {
        event.remainingSlots = Math.max(0, event.remainingSlots - 1);
      }

      // Handle action assignment if provided
      if (actionId) {
        const action = event.actions.find(a => a._id.toString() === actionId);
        if (action) {
          // Check if volunteer isn't already assigned
          const existingAssignment = action.assignedVolunteers.find(
            vol => vol.volunteerId.toString() === request.volunteerId.toString()
          );

          if (!existingAssignment) {
            action.assignedVolunteers.push({
              volunteerId: request.volunteerId,
              volunteerName: request.volunteerName,
              assignedAt: new Date()
            });
            action.currentVolunteers = (action.currentVolunteers || 0) + 1;
          }
        }
      }
    }

    // Update request status
    request.status = status;
    request.processedAt = new Date();
    request.processedBy = user._id;

    // Save changes
    try {
      await event.save();
      console.log("Event updated successfully");

      return res.status(200).json({
        success: true,
        message: `Request ${status} successfully`,
        event: event
      });
    } catch (saveError) {
      console.error("Error saving event:", saveError);
      return res.status(500).json({
        success: false,
        message: "Failed to save changes",
        error: saveError.message
      });
    }

  } catch (error) {
    console.error("Server error:", {
      message: error.message,
      stack: error.stack
    });

    return res.status(500).json({
      success: false,
      message: "Failed to process request",
      error: error.message
    });
  }
}