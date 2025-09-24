import { Router } from "express";
import AuthController from "../controllers/auth.controller";
import WorkspaceController from "../controllers/workspace.controller";
import { AuthMiddleware } from "../middleware/auth";

const router = Router();

const { createWorkspace } = new WorkspaceController();

router.route("/workspace").post(AuthMiddleware, createWorkspace);


export default router;
