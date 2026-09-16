import { Router } from "express";
import * as dashboardController from "../controllers/dashboard.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateToken); // Proteksi seluruh rute dashboard

router.get("/summary", dashboardController.getSummary);
router.get("/category-breakdown", dashboardController.getCategoryBreakdown);
router.get("/monthly-trend", dashboardController.getMonthlyTrend);

export default router;