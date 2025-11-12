import { Router } from "express";
import WorkspaceController from "../controllers/workspace.controller";
import { AuthMiddleware } from "../middleware/auth";
import TaskController from "../controllers/task.controller";

const router = Router();

const { createTask ,getTaskByWorkspaceId,getTaskByProjectId,updateTask} =
  new TaskController();
console.log("Run1")
router.route("/").post(AuthMiddleware, createTask);
router.route("/workspace/:id").get(AuthMiddleware, getTaskByWorkspaceId);
router.route("/project/:id").get(AuthMiddleware, getTaskByProjectId);
router.route("/:id").put(AuthMiddleware, updateTask);


export default router;
