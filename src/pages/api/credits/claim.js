import dbConnection from "@/lib/dbConnection";
import Event from "@/lib/models/event";
import User from "@/lib/models/User";
import CreditTransaction from "@/lib/models/CreditTransaction";
import jwt from "jsonwebtoken";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method not allowed" });
  }

  try {
    await dbConnection();

    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { eventId } = req.body;

    const event = await Event.findById(eventId);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    if (event.status !== "completed") {
      return res.status(400).json({
        success: false,
        message: "Event must be completed to claim credits",
      });
    }

    const request = event.requests.find(
      (req) =>
        req.volunteerId.toString() === decoded.id && req.status === "approved"
    );

    if (!request) {
      return res.status(400).json({
        success: false,
        message: "You must be an approved participant to claim credits",
      });
    }

    const existingTransaction = await CreditTransaction.findOne({
      userId: decoded.id,
      eventId: event._id,
      type: "earned",
    });

    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        message: "Credits for this event have already been claimed",
      });
    }

    const creditsEarned = event.credits || 0;

    const transaction = new CreditTransaction({
      userId: decoded.id,
      eventId: event._id,
      type: "earned",
      amount: creditsEarned,
      description: `Credits earned for ${event.title}`,
      status: "completed",
    });

    await transaction.save();

    const user = await User.findById(decoded.id);
    if (!user.credits) {
      user.credits = { total: 0, history: [] };
    }

    user.credits.total += creditsEarned;
    user.credits.history.push({
      eventId: event._id,
      eventTitle: event.title,
      creditsEarned,
      date: new Date(),
    });

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Credits claimed successfully",
      creditsEarned,
      totalCredits: user.credits.total,
    });
  } catch (error) {
    console.error("Error claiming credits:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to claim credits",
    });
  }
}
