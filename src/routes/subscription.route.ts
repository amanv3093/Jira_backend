import { Router } from "express";
import SubscriptionController from "../controllers/subscription.controller";
import { AuthMiddleware } from "../middleware/auth";

const router = Router();

const {
  createCheckoutSession,
  getSubscriptionStatus,
  createPortalSession,
  verifyCheckoutSession,
} = new SubscriptionController();

router.post("/checkout", AuthMiddleware, createCheckoutSession);
router.post("/verify-session", AuthMiddleware, verifyCheckoutSession);
router.get("/status/:workspaceId", AuthMiddleware, getSubscriptionStatus);
router.post("/portal", AuthMiddleware, createPortalSession);

export default router;
