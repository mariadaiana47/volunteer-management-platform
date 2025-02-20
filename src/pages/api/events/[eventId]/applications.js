import dbConnection from "@/lib/dbConnection";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  const { eventId } = req.query;
  const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";

  if (!eventId) {
    return res.status(400).json({
      success: false,
      message: "Event ID is required",
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

    const decoded = jwt.verify(token, JWT_SECRET);

    const Event = mongoose.models.Event || mongoose.model("Event");
    const User = mongoose.models.User || mongoose.model("User");

    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    switch (req.method) {
      case "GET":
        const applications = event.requests.map((request) => ({
          _id: request._id,
          volunteerId: request.volunteerId,
          volunteerName: request.volunteerName,
          status: request.status,
          appliedAt: request.appliedAt,
          email: request.email,
          motivation: request.motivation,
          phone: request.phone,
        }));

        return res.status(200).json({
          success: true,
          applications,
        });

      case "PATCH":
        const { applicationId, status } = req.body;

        if (!applicationId || !status) {
          return res.status(400).json({
            success: false,
            message: "Application ID and status are required",
          });
        }

        if (event.createdBy.toString() !== decoded.id) {
          return res.status(403).json({
            success: false,
            message: "Not authorized to update applications",
          });
        }

        const applicationIndex = event.requests.findIndex(
          (req) => req._id.toString() === applicationId
        );

        if (applicationIndex === -1) {
          return res.status(404).json({
            success: false,
            message: "Application not found",
          });
        }

        event.requests[applicationIndex].status = status;
        event.requests[applicationIndex].processedAt = new Date();
        event.requests[applicationIndex].processedBy = decoded.id;

        await event.save();

        return res.status(200).json({
          success: true,
          message: "Application status updated successfully",
        });

      default:
        return res.status(405).json({
          success: false,
          message: "Method not allowed",
        });
    }
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}
