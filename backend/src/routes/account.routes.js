import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import * as accountController from "../controllers/account.controller.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/", accountController.getAccounts);
router.post("/", accountController.createAccount);
router.get("/:id", accountController.getAccountById);
router.put("/:id", accountController.updateAccount);
router.delete("/:id", accountController.deleteAccount);

export default router;
