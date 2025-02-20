import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  await dbConnection();

  if (req.method !== "POST") {
    return res.status(405).json({ 
      success: false, 
      message: "Method not allowed" 
    });
  }

  try {
    // Verify token
    const token = req.headers.authorization?.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { eventId, actionId } = req.query;

    // Find event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    // Find specific action
    const action = event.actions.find(a => a._id.toString() === actionId);
    if (!action) {
      return res.status(404).json({ 
        success: false, 
        message: 'Action not found' 
      });
    }

    // Checks before applying
    if (action.status !== 'open') {
      return res.status(400).json({ 
        success: false, 
        message: 'This action is not currently accepting volunteers' 
      });
    }

    if (action.currentVolunteers >= action.requiredVolunteers) {
      action.status = 'full';
      await event.save();
      return res.status(400).json({ 
        success: false, 
        message: 'This action has reached its maximum number of volunteers' 
      });
    }

    // Check if volunteer is already applied
    const alreadyApplied = action.assignedVolunteers.some(
      vol => vol.volunteerId.toString() === decoded.id
    );

    if (alreadyApplied) {
      return res.status(400).json({ 
        success: false, 
        message: 'You are already applied to this action' 
      });
    }

    // Add volunteer
    action.assignedVolunteers.push({
      volunteerId: decoded.id,
      volunteerName: `${decoded.nume} ${decoded.prenume}`
    });

    // Update current volunteers count
    action.currentVolunteers += 1;

    // Update action status if full
    if (action.currentVolunteers >= action.requiredVolunteers) {
      action.status = 'full';
    }

    // Save event
    await event.save();

    return res.status(200).json({ 
      success: true, 
      message: 'Successfully applied to the action',
      action: action
    });

  } catch (error) {
    console.error('Error applying to action:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: error.message 
    });
  }
}