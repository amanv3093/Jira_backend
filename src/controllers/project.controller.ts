import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ZodError } from "zod";
import { createProjectSchema, updateProjectSchema } from "../type/project.zod";
import { uploadFile } from "../utils/helper";
// import { MulterRequest } from "@/types/multer";

const prisma = new PrismaClient();

class ProjectController {
  //****************************************  Create  *****************************************/
  public createProject = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const { name, description, workspaceId } = createProjectSchema.parse(
          req.body
        );
        const user = req.user;

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }
        //  const profilePicUrl = await uploadFile(req.file);

        const project = await prisma.project.create({
          data: {
            name,
            description,
            workspaceId,
            ownerId: user.id,
            // profilePic,
          },
        });

        
        await prisma.member.create({
          data: {
            userId: user.id,
            workspaceId,
            projectId: project.id,
            role: "OWNER",
          },
        });

        res.status(201).json({
          data: project,
          message: "Project created successfully",
        });
      } catch (err) {
        if (err instanceof ZodError) {
          res.status(400).json({
            errors: err.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          });
          return;
        }
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  //****************************************  Get All  *****************************************/
  public getAllProjects = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const projects = await prisma.project.findMany({
          include: {
            owner: true,
            workspace: true,
            members: true,
            tasks: true,
          },
          orderBy: { createdAt: "desc" },
        });
        res.status(201).json({
          data: projects,
          message: "Fetched Project successfully",
        });
      } catch {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  //****************************************  Get By Id  *****************************************/
  public getProjectById = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const project = await prisma.project.findUnique({
          where: { id: req.params.id },
          include: {
            owner: true,
            workspace: true,
            members: { include: { user: true } },
            tasks: true,
          },
        });

        if (!project) {
          res.status(404).json({ error: "Project not found" });
          return;
        }

        res.status(201).json({
          data: project,
          message: "Fetched Project successfully",
        });
      } catch {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  //****************************************  Update  *****************************************/
  public updateProject = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const { name, description, profilePic } = updateProjectSchema.parse(
          req.body
        );

        const project = await prisma.project.update({
          where: { id: req.params.id },
          data: { name, description, profilePic },
        });

        res.json({ data:project, message: "Project updated successfully" });
      } catch (err) {
        if (err instanceof ZodError) {
          res.status(400).json({
            errors: err.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          });
          return;
        }
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  //****************************************  Delete  *****************************************/
  public deleteProject = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        await prisma.project.delete({
          where: { id: req.params.id },
        });
        res.json({ message: "Project deleted successfully" });
      } catch {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  //****************************************  Get By Workspace Id  *****************************************/
  public getProjectByWorkspaceId = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const project = await prisma.project.findMany({
          where: { workspaceId: req.params.id },
          include: {
            owner: true,
            workspace: true,
            members: { include: { user: true } },
            tasks: true,
          },
        });

        if (!project) {
          res.status(404).json({ error: "Project not found" });
          return;
        }

        res.status(201).json({
          data: project,
          message: "Fetched Project successfully",
        });
      } catch {
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

export default ProjectController;
