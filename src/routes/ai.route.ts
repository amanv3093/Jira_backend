import { Router } from "express";
import AIController from "../controllers/ai.controller";
import { AuthMiddleware } from "../middleware/auth";

const router = Router();
const { chat } = new AIController();

router.post("/chat", AuthMiddleware, chat);

export default router;
