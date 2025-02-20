import dbConnection from "@/lib/dbConnection";
import Reward from "@/lib/models/Reward";
import User from "@/lib/models/User";
import jwt from "jsonwebtoken";

const JWT_SECRET = "super_secret_key";

export default async function handler(req, res) {
  await dbConnection();

  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (req.method === "GET") {
      const rewards = await Reward.find({
        isActive: true,
        expirationDate: { $gt: new Date() },
      });
      return res.status(200).json({ success: true, rewards });
    }

    if (req.method === "POST") {
      const { rewardId } = req.body;
      const user = await User.findById(decoded.id);
      const reward = await Reward.findById(rewardId);

      if (!reward) {
        return res.status(404).json({
          success: false,
          message: "Reward not found",
        });
      }

      if (user.credits.total < reward.requiredCredits) {
        return res.status(400).json({
          success: false,
          message: "Insufficient credits",
        });
      }

      user.credits.total -= reward.requiredCredits;
      user.redeemedRewards.push({
        rewardId: reward._id,
        rewardTitle: reward.title,
      });

      await user.save();

      return res.status(200).json({
        success: true,
        message: "Reward redeemed successfully",
        remainingCredits: user.credits.total,
      });
    }
  } catch (error) {
    console.error("Rewards error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
}
