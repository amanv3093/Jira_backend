import { Router } from "express";
import ProjectController from "../controllers/project.controller";
import { AuthMiddleware } from "../middleware/auth";

const router = Router();

const {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
  getProjectByWorkspaceId
} = new ProjectController();

router
  .route("/")
  .post(AuthMiddleware, createProject)
  .get(AuthMiddleware, getAllProjects);

router
  .route("/:id")
  .get(AuthMiddleware, getProjectById)
  .put(AuthMiddleware, updateProject)
  .delete(AuthMiddleware, deleteProject);

router.route("/workspace/:id").get(AuthMiddleware, getProjectByWorkspaceId);

export default router;
