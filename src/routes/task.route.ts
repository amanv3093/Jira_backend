import { Router } from "express";
import WorkspaceController from "../controllers/workspace.controller";
import { AuthMiddleware } from "../middleware/auth";
import TaskController from "../controllers/task.controller";

const router = Router();

const { createTask ,getTaskByWorkspaceId,getTaskByProjectId,updateTask,deleteTask} =
  new TaskController();

router.route("/").post(AuthMiddleware, createTask);
router.route("/workspace/:id").get(AuthMiddleware, getTaskByWorkspaceId);
router.route("/project/:id").get(AuthMiddleware, getTaskByProjectId);
router.route("/:id").put(AuthMiddleware, updateTask);
router.route("/:id").delete(AuthMiddleware, deleteTask);


export default router;
