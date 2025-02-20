// pages/api/events/[eventId]/claim-credits.js
import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";
import User from "@/lib/models/User";
import { verifyToken } from "@/lib/auth";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed' 
    });
  }

  try {
    await dbConnection();

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authorization token provided' 
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid authorization token' 
      });
    }

    const { eventId } = req.query;

    // Find the event
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        message: 'Event not found' 
      });
    }

    // Check if event is completed
    if (event.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Cannot claim credits for an event that is not completed'
      });
    }

    // Find the user
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user was a participant
    const participantRequest = event.requests.find(
      request => request.volunteerId.toString() === decoded.id && 
                 request.status === 'approved'
    );

    if (!participantRequest) {
      return res.status(403).json({
        success: false,
        message: 'You were not an approved participant in this event'
      });
    }

    // Check if credits were already claimed
    if (event.creditsHaveBeenClaimed) {
      return res.status(400).json({
        success: false,
        message: 'Credits have already been claimed for this event'
      });
    }

    // Calculate credits to award
    const creditsToAward = event.credits || 0;

    // Update user's credits
    user.credits.total += creditsToAward;
    user.credits.history.push({
      eventId: event._id,
      eventTitle: event.title,
      actionTitle: 'Event Completion',
      creditsEarned: creditsToAward,
      earnedAt: new Date()
    });

    // Mark credits as claimed
    event.creditsHaveBeenClaimed = true;

    // Save both documents
    await Promise.all([
      user.save(),
      event.save()
    ]);

    return res.status(200).json({
      success: true,
      message: 'Credits claimed successfully',
      credits: creditsToAward,
      totalCredits: user.credits.total
    });

  } catch (error) {
    console.error('Credit claiming error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during credit claiming',
      error: error.message
    });
  }
}