import { Router } from "express";
import AuthController from "../controllers/auth.controller";

const router = Router();

const { login, signup, googleAuth, forgotPassword, resetPassword } = new AuthController();

router.route("/login").post(login);
router.route("/signup").post(signup);
router.route("/google").post(googleAuth);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password").post(resetPassword);

export default router;
