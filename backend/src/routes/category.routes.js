import { Router } from "express";
import * as categoryController from "../controllers/category.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateToken); // Proteksi seluruh rute kategori

router.get("/", categoryController.getCategories);
router.post("/", categoryController.createCategory);
router.put("/:id", categoryController.updateCategory);
router.delete("/:id", categoryController.deleteCategory);

export default router;