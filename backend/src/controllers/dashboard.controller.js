import * as dashboardService from "../services/dashboard.service.js";

export const getSummary = async (req, res, next) => {
  try {
    const data = await dashboardService.getSummary(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryBreakdown = async (req, res, next) => {
  try {
    const data = await dashboardService.getCategoryBreakdown(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

export const getMonthlyTrend = async (req, res, next) => {
  try {
    const data = await dashboardService.getMonthlyTrend(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};