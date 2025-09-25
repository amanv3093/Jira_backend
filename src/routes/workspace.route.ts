import { Router } from "express";
import WorkspaceController from "../controllers/workspace.controller";
import { AuthMiddleware } from "../middleware/auth";

const router = Router();

const { createWorkspace } = new WorkspaceController();

router.route("/").post(AuthMiddleware, createWorkspace);


export default router;
