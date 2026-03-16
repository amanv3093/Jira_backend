import { Router } from "express";
import { AuthMiddleware } from "../middleware/auth";
import SprintController from "../controllers/sprint.controller";

const router = Router();

const {
  createSprint,
  getSprintsByProjectId,
  getSprintsByWorkspaceId,
  getSprintById,
  updateSprint,
  deleteSprint,
  addTasksToSprint,
  removeTaskFromSprint,
  startSprint,
  completeSprint,
} = new SprintController();

router.route("/").post(AuthMiddleware, createSprint);
router.route("/project/:projectId").get(AuthMiddleware, getSprintsByProjectId);
router.route("/workspace/:workspaceId").get(AuthMiddleware, getSprintsByWorkspaceId);
router.route("/detail/:id").get(AuthMiddleware, getSprintById);
router.route("/:id").put(AuthMiddleware, updateSprint);
router.route("/:id").delete(AuthMiddleware, deleteSprint);
router.route("/:id/tasks").put(AuthMiddleware, addTasksToSprint);
router.route("/:id/tasks/remove").put(AuthMiddleware, removeTaskFromSprint);
router.route("/:id/start").put(AuthMiddleware, startSprint);
router.route("/:id/complete").put(AuthMiddleware, completeSprint);

export default router;
