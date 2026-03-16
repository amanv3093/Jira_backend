import { Router } from "express";
import UserController from "../controllers/user.controller";
import { AuthMiddleware } from "../middleware/auth";
import { upload } from "../lib/upload";

const router = Router();

const { getProfile, updateProfile, changePassword } = new UserController();

router.route("/profile").get(AuthMiddleware, getProfile);
router.route("/profile").put(AuthMiddleware, upload.single("avatarUrl"), updateProfile);
router.route("/change-password").put(AuthMiddleware, changePassword);

export default router;
