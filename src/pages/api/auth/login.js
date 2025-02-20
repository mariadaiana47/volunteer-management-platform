import User from "@/lib/models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dbConnection from "@/lib/dbConnection";


const JWT_SECRET = 'super_secret_key';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }

  const { email, password } = req.body;

  try {
    await dbConnection();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User does not exist!",
        code: "USER_NOT_FOUND",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Incorrect password!",
        code: "INCORRECT_PASSWORD",
      });
    }

    const token = jwt.sign(
      { 
        id: user._id.toString(), 
        email: user.email,
        name: `${user.nume} ${user.prenume}`,
        role: user.role 
      }, 
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('Generated token:', token);
    
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: `${user.nume} ${user.prenume}`
      }
    });
  } catch (error) {
    console.error("Login Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      code: "SERVER_ERROR",
      error: error.message,
    });
  }
}