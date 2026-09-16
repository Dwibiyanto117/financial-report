import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Akses ditolak: Token autentikasi tidak ditemukan"
      });
    }

    const secret = process.env.JWT_SECRET || "finreport_super_secure_jwt_secret_dev_key_2026";
    const decoded = jwt.verify(token, secret);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, createdAt: true }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Akses ditolak: Pengguna tidak ditemukan atau sesi telah berakhir"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Sesi Anda telah kedaluwarsa, silakan login kembali"
      });
    }
    return res.status(403).json({
      success: false,
      message: "Token autentikasi tidak valid"
    });
  }
};