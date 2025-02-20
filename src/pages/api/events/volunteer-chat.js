import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "super_secret_key"
    );
    const volunteerId = decoded.id;

    console.log("Fetching events for volunteer:", volunteerId);

    const events = await Event.find({
      requests: {
        $elemMatch: {
          volunteerId: new mongoose.Types.ObjectId(volunteerId),
          status: "approved",
        },
      },
    })
      .sort({ date: 1 })
      .lean();

    console.log("Found events:", events.length);

    return res.status(200).json({
      success: true,
      events,
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
