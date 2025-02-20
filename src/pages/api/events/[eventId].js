import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";
import jwt from "jsonwebtoken";

const JWT_SECRET = "super_secret_key";

export default async function handler(req, res) {
  console.log("Delete request received:", {
    method: req.method,
    query: req.query,
  });

  if (req.method !== "DELETE") {
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
        message: "Authentication token required",
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const { eventId } = req.query;

    console.log("Processing delete request for event:", eventId);

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Missing eventId",
      });
    }

    const event = await Event.findById(eventId);
    console.log("Found event:", event ? "yes" : "no");

    if (!event) {
      return res.status(404).json({
        success: false,
        message: "Event not found",
      });
    }

    if (event.createdBy.toString() !== decoded.id) {
      return res.status(403).json({
        success: false,
        message: "Nu aveți permisiunea de a șterge acest eveniment",
      });
    }

    await Event.findByIdAndDelete(eventId);
    console.log("Event deleted successfully");

    return res.status(200).json({
      success: true,
      message: "Eveniment șters cu succes",
    });
  } catch (error) {
    console.error("Server error:", error);
    return res.status(500).json({
      success: false,
      message: "Nu s-a putut șterge evenimentul",
      error: error.message,
    });
  }
}
