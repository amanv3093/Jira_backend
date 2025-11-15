import { Router } from "express";
import WorkspaceController from "../controllers/workspace.controller";
import { AuthMiddleware } from "../middleware/auth";
import { upload } from "../lib/upload";

const router = Router();

const { createWorkspace, getWorkspaces, getWorkspaceById } =
  new WorkspaceController();

router.route("/").post(AuthMiddleware,upload.single("profilePic"), createWorkspace);
router.route("/").get(AuthMiddleware, getWorkspaces);
router.route("/:id").get(AuthMiddleware, getWorkspaceById);

export default router;
