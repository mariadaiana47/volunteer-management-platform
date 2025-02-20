import formidable from "formidable";
import path from "path";
import fs from "fs/promises";
import dbConnection from "@/lib/dbConnection";
import User from "@/lib/models/User";
import jwt from "jsonwebtoken";

export const config = {
  api: {
    bodyParser: false,
  },
};

const JWT_SECRET = "super_secret_key";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    await dbConnection();

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "Authorization required" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(uploadDir, { recursive: true });

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024,
    });

    const [fields, files] = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        resolve([fields, files]);
      });
    });

    const avatarFile = files.avatar && files.avatar[0];
    if (!avatarFile) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const uniqueFilename = `avatar-${decoded.id}-${Date.now()}${path.extname(
      avatarFile.originalFilename
    )}`;
    const finalPath = path.join(uploadDir, uniqueFilename);

    await fs.rename(avatarFile.filepath, finalPath);

    const avatarUrl = `/uploads/${uniqueFilename}`;

    const user = await User.findByIdAndUpdate(
      decoded.id,
      { avatar: avatarUrl },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({
      success: true,
      avatarUrl,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return res
      .status(500)
      .json({ error: error.message || "Error uploading avatar" });
  }
}
