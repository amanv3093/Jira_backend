import { Router } from "express";
import WorkspaceController from "../controllers/workspace.controller";
import { AuthMiddleware } from "../middleware/auth";

const router = Router();

const { createWorkspace, getWorkspaces, getWorkspaceById } =
  new WorkspaceController();

router.route("/").post(AuthMiddleware, createWorkspace);
router.route("/").get(AuthMiddleware, getWorkspaces);
router.route("/:id").get(AuthMiddleware, getWorkspaceById);

export default router;
