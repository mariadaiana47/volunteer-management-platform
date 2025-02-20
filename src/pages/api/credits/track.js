
import dbConnection from "@/lib/dbConnection";
import User from "@/lib/models/User";
import Event from "@/lib/models/event";
import CreditTransaction from "@/lib/models/CreditTransaction";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await dbConnection();
    
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { eventId, actionId } = req.body;
    
    
    const event = await Event.findById(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    
    const request = event.requests.find(
      req => req.volunteerId.toString() === decoded.id && req.status === "approved"
    );

    if (!request) {
      return res.status(400).json({
        success: false,
        message: 'You must be an approved participant to earn credits'
      });
    }

    
    let creditsEarned = event.credits || 0;
    if (actionId) {
      const action = event.actions.find(a => a._id.toString() === actionId);
      if (action) {
        creditsEarned += action.credits || 0;
      }
    }

    
    const transaction = new CreditTransaction({
      userId: decoded.id,
      eventId: event._id,
      actionId: actionId || null,
      type: 'earned',
      amount: creditsEarned,
      description: `Credits earned for ${event.title}`,
      status: 'completed'
    });

    await transaction.save();

    
    const user = await User.findById(decoded.id);
    user.credits.total += creditsEarned;
    user.credits.history.push({
      eventId: event._id,
      eventTitle: event.title,
      creditsEarned,
      actionId: actionId || null,
      date: new Date()
    });

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Credits awarded successfully',
      creditsEarned,
      totalCredits: user.credits.total
    });

  } catch (error) {
    console.error('Error tracking credits:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to track credits'
    });
  }
}


export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    await dbConnection();
    
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { rewardId } = req.body;
    
    const reward = await Reward.findById(rewardId);
    if (!reward) {
      return res.status(404).json({ success: false, message: 'Reward not found' });
    }

    const user = await User.findById(decoded.id);
    
    
    if (user.credits.total < reward.requiredCredits) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient credits'
      });
    }

    
    const redemptionCode = generateRedemptionCode();

    
    const transaction = new CreditTransaction({
      userId: decoded.id,
      type: 'redeemed',
      amount: reward.requiredCredits,
      description: `Redeemed for ${reward.title}`,
      status: 'completed'
    });

    await transaction.save();

    
    user.credits.total -= reward.requiredCredits;
    user.redeemedRewards.push({
      rewardId: reward._id,
      rewardTitle: reward.title,
      redemptionCode,
      redeemedAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
    });

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Reward redeemed successfully',
      redemptionCode,
      remainingCredits: user.credits.total
    });

  } catch (error) {
    console.error('Error redeeming credits:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to redeem credits'
    });
  }
}