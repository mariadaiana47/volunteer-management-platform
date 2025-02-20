import jwt from "jsonwebtoken";

const JWT_SECRET = "super_secret_key";

export const verifyToken = (token) => {
  try {
    if (!token) {
      console.log("No token provided");
      return null;
    }

    const cleanToken = token.replace(/^["']|["']$/g, "");

    const decoded = jwt.verify(cleanToken, JWT_SECRET);

    console.log("Decoded Token:", {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role,
      exp: decoded.exp ? new Date(decoded.exp * 1000) : "No expiration",
    });

    const currentTime = Date.now() / 1000;
    if (decoded.exp && decoded.exp < currentTime) {
      console.log("Token has expired", {
        expiredAt: new Date(decoded.exp * 1000),
        currentTime: new Date(),
      });
      return null;
    }

    if (!decoded.id) {
      console.error("Token missing id", decoded);
      return null;
    }

    return decoded;
  } catch (error) {
    console.error("Complete Token Verification Error:", {
      name: error.name,
      message: error.message,
      stack: error.stack,
    });

    if (error.name === "JsonWebTokenError") {
      console.error("Invalid token structure");
    } else if (error.name === "TokenExpiredError") {
      console.error("Token has expired");
    }

    return null;
  }
};

export const generateToken = (userData) => {
  try {
    const payload = {
      id: userData._id || userData.id,
      email: userData.email,
      name: `${userData.nume} ${userData.prenume}`,
      role: userData.role,
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  } catch (error) {
    console.error("Token generation error:", error);
    return null;
  }
};
