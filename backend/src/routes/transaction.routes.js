import { Router } from "express";
import * as transactionController from "../controllers/transaction.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateToken); // Proteksi seluruh rute transaksi

router.get("/", transactionController.getTransactions);
router.post("/", transactionController.createTransaction);
router.get("/:id", transactionController.getTransactionById);
router.put("/:id", transactionController.updateTransaction);
router.delete("/:id", transactionController.deleteTransaction);

export default router;