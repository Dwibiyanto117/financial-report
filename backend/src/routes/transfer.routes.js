import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import * as transferController from "../controllers/transfer.controller.js";

const router = express.Router();

router.use(authenticateToken);

router.post("/", transferController.executeTransfer);
router.get("/:groupId", transferController.getTransferByGroupId);
router.delete("/:groupId", transferController.deleteTransfer);

export default router;
