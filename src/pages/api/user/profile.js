import dbConnection from "@/lib/dbConnection";
import User from "@/lib/models/User";
import jwt from "jsonwebtoken";

const JWT_SECRET = "super_secret_key";

export default async function handler(req, res) {
  if (!["GET", "PATCH"].includes(req.method)) {
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

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (req.method === "GET") {
      return res.status(200).json({
        success: true,
        user,
      });
    }

    if (req.method === "PATCH") {
      const { nume, prenume, email, dataNastere, adresa, interese } = req.body;

      if (nume) user.nume = nume;
      if (prenume) user.prenume = prenume;
      if (email) user.email = email;
      if (dataNastere) user.dataNastere = dataNastere;
      if (adresa) user.adresa = adresa;
      if (interese) user.interese = interese;

      await user.save();

      return res.status(200).json({
        success: true,
        user,
      });
    }
  } catch (error) {
    console.error("Profile error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
}
