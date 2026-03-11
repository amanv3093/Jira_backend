import { Router } from "express";
import DashboardController from "../controllers/dashboard.controller";
import { AuthMiddleware } from "../middleware/auth";

const router = Router();

const { getDashboardDetails } = new DashboardController();

router.route("/:id").get(AuthMiddleware, getDashboardDetails);

export default router;
