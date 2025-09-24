import { Router } from "express";
import AuthController from "../controllers/auth.controller";

const router = Router();

const { login, signup } = new AuthController();

router.route("/login").post(login);
router.route("/signup").post(signup);

export default router;
