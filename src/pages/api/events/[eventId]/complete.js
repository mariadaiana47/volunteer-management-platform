import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";
import jwt from "jsonwebtoken";

const JWT_SECRET = "super_secret_key"; // Make sure this matches your auth secret

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: "Method not allowed" 
    });
  }

  try {
    await dbConnection();
    
    // Get eventId from query
    const { eventId } = req.query;
    console.log("Attempting to complete event:", eventId);

    // Verify token
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authorization token provided"
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("User attempting completion:", decoded.id);

    // Find and update event
    const event = await Event.findById(eventId);
    
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: "Event not found" 
      });
    }

    if (event.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: "Event is already completed" 
      });
    }

    // Update event status
    event.status = 'completed';
    event.completedAt = new Date();

    // Complete all actions
    if (event.actions && event.actions.length > 0) {
      event.actions = event.actions.map(action => ({
        ...action,
        status: 'completed',
        completedAt: new Date()
      }));
    }

    console.log("Saving event with status:", event.status);
    await event.save();
    console.log("Event saved successfully");

    return res.status(200).json({ 
      success: true, 
      message: "Event completed successfully",
      event
    });

  } catch (error) {
    console.error('Error completing event:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to complete event",
      error: error.message 
    });
  }
}