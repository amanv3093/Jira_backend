import { Router } from "express";
import WorkspaceController from "../controllers/workspace.controller";
import { AuthMiddleware } from "../middleware/auth";
import TaskController from "../controllers/task.controller";

const router = Router();

const { createTask } =
  new TaskController();

router.route("/").post(AuthMiddleware, createTask);


export default router;
