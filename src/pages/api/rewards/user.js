import dbConnection from "@/lib/dbConnection";
import User from "@/lib/models/User";
import jwt from "jsonwebtoken";

const JWT_SECRET = "super_secret_key";

export default async function handler(req, res) {
  await dbConnection();

  try {
    const token = req.headers.authorization?.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id);

    return res.status(200).json({
      success: true,
      rewards: user.redeemedRewards
    });

  } catch (error) {
    console.error("User rewards error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
}