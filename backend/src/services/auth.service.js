import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const JWT_SECRET = process.env.JWT_SECRET || "finreport_super_secure_jwt_secret_dev_key_2026";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export const register = async ({ name, email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (existing) {
    const error = new Error("Email sudah terdaftar dalam sistem");
    error.statusCode = 409;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const newUser = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      accounts: {
        create: {
          name: "Kas Utama",
          institution: "CASH",
          type: "CASH",
          openingBalance: 0,
          color: "#10B981"
        }
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true
    }
  });

  const token = generateToken(newUser.id);

  return {
    user: newUser,
    token
  };
};

export const login = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!user) {
    const error = new Error("Email atau password yang Anda masukkan salah");
    error.statusCode = 401;
    throw error;
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error("Email atau password yang Anda masukkan salah");
    error.statusCode = 401;
    throw error;
  }

  const token = generateToken(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    },
    token
  };
};

export const forgotPassword = async ({ email }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!user) {
    const error = new Error("Akun dengan email tersebut tidak ditemukan");
    error.statusCode = 404;
    throw error;
  }

  // Generate 6 digit recovery PIN
  const randomPin = Math.floor(100000 + Math.random() * 900000);
  const recoveryToken = `REC-${randomPin}`;
  const recoveryTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

  await prisma.user.update({
    where: { id: user.id },
    data: {
      recoveryToken,
      recoveryTokenExpiresAt
    }
  });

  return {
    email: user.email,
    recoveryToken,
    expiresAt: recoveryTokenExpiresAt,
    instruction: "Gunakan kode pemulihan ini pada form reset password Anda."
  };
};

export const resetPassword = async ({ email, recoveryToken, newPassword }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail }
  });

  if (!user || !user.recoveryToken) {
    const error = new Error("Permintaan reset password tidak valid atau tidak ditemukan");
    error.statusCode = 400;
    throw error;
  }

  if (user.recoveryToken !== recoveryToken.trim()) {
    const error = new Error("Kode pemulihan yang Anda masukkan salah");
    error.statusCode = 400;
    throw error;
  }

  if (user.recoveryTokenExpiresAt && new Date() > user.recoveryTokenExpiresAt) {
    const error = new Error("Kode pemulihan telah kedaluwarsa. Silakan ajukan ulang");
    error.statusCode = 400;
    throw error;
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      recoveryToken: null,
      recoveryTokenExpiresAt: null
    }
  });

  return {
    success: true,
    message: "Password berhasil diperbarui. Silakan login kembali dengan password baru Anda."
  };
};

export const getProfile = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true
    }
  });

  if (!user) {
    const error = new Error("Pengguna tidak ditemukan");
    error.statusCode = 404;
    throw error;
  }

  return user;
};