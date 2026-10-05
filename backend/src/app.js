import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.routes.js";
import accountRoutes from "./routes/account.routes.js";
import transferRoutes from "./routes/transfer.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import transactionRoutes from "./routes/transaction.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import reportRoutes from "./routes/report.routes.js";
import importRoutes from "./routes/import.routes.js";
import categoryRuleRoutes from "./routes/categoryRule.routes.js";

dotenv.config();

const app = express();

// Security & Parsing Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "FinReport Backend API is active",
    timestamp: new Date().toISOString()
  });
});

// Mount Routes
app.use("/api/auth", authRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/api/transfers", transferRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/imports", importRoutes);
app.use("/api/category-rules", categoryRuleRoutes);

// Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  const isPrismaValidationError = err.name === "PrismaClientValidationError";
  const isPrismaKnownError = err.name === "PrismaClientKnownRequestError";

  // Kesalahan input dari klien (tanggal/argumen tidak valid) tidak boleh
  // diteruskan sebagai kegagalan internal beserta detail query database.
  let statusCode = err.statusCode || 500;
  if (!err.statusCode && (isPrismaValidationError || isPrismaKnownError)) {
    statusCode = 400;
  }

  if (statusCode >= 500) {
    console.error("[error]", req.method, req.originalUrl, "-", err.message);
  }

  const message = statusCode >= 500 && !err.statusCode
    ? "Terjadi kesalahan internal pada server"
    : err.message;

  res.status(statusCode).json({
    success: false,
    message: message || "Terjadi kesalahan internal pada server",
    errors: err.errors || []
  });
});

export default app;