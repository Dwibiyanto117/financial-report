/**
 * Category Rule Routes
 */

import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import * as categoryRuleController from "../controllers/categoryRule.controller.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", categoryRuleController.getCategoryRules);
router.post("/", categoryRuleController.createCategoryRule);
router.put("/:id", categoryRuleController.updateCategoryRule);
router.delete("/:id", categoryRuleController.deleteCategoryRule);

export default router;
