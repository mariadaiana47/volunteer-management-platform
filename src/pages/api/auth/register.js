import dbConnection from "@/lib/dbConnection";
import User from "@/lib/models/User";
import bcrypt from "bcrypt";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, message: "Method Not Allowed" });
  }

  console.log("📩 Received data:", req.body);

  const { nume, prenume, email, password, dataNastere, adresa, interese, role } =
    req.body || {};

  if (!nume || !prenume || !email || !password || !dataNastere || !role) {
    return res
      .status(400)
      .json({ success: false, message: "Toate câmpurile sunt obligatorii!" });
  }

  if (!["volunteer", "company"].includes(role)) {
    return res.status(400).json({ success: false, message: "Rol invalid!" });
  }

  try {
    await dbConnection();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email-ul este deja folosit!" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      nume,
      prenume,
      email,
      password: hashedPassword,
      dataNastere,
      adresa,
      interese,
      role,
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: "User registered successfully!",
      data: { nume, prenume, email, role },
    });
  } catch (error) {
    console.error("❌ Registration Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error. Please contact support.",
      error: error.message,
    });
  }
}
