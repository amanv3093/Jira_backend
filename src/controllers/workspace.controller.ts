import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
// import { prisma } from "../lib/prisma";
import { createWorkspaceSchema, updateWorkspaceSchema } from "../type/workspace.type";
import { PrismaClient, User } from "@prisma/client";
import { ZodError } from "zod";
import { uploadFile } from "../lib/cloudinary";

// Extend Express Request interface to include user property
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}
const prisma = new PrismaClient();
class WorkspaceController {
  //****************************************  Create  *****************************************/
  public createWorkspace = expressAsyncHandler(
    async (req: MulterRequest, res: Response) => {
      try {
        const { name } = createWorkspaceSchema.parse(req.body);
        const user = req.user;

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }
        let profilePicUrl: string | null = null;
        if (req.file) {
          profilePicUrl = await uploadFile(req.file);
        }

        const workspace = await prisma.workspace.create({
          data: {
            name,
            ownerId: user.id,
            ...(profilePicUrl && { profilePic: profilePicUrl }),
          },
        });

        await prisma.member.create({
          data: {
            userId: user.id,
            workspaceId: workspace.id,
            role: "OWNER",
          },
        });

        res.status(201).json({
          data: workspace,
          message: "Workspace created successfully",
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

  //****************************************  Get Workspaces  *****************************************/
  public getWorkspaces = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const user = req.user;

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }

        const workspaces = await prisma.workspace.findMany({
          where: {
            OR: [
              { ownerId: user.id },
              { members: { some: { userId: user.id } } },
            ],
          },
          include: {
            owner: true,
            members: { include: { user: true } },
            projects: true,
          },
        });

        res.status(200).json({
          data: workspaces,
          message: "Workspaces fetched successfully",
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  //****************************************  Get Workspace By ID  *****************************************/
  public getWorkspaceById = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const user = req.user;

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }

        const workspaceId = req.params.id;

        const workspaces = await prisma.workspace.findUnique({
          where: {
            id: workspaceId,
            OR: [
              { ownerId: user.id },
              { members: { some: { userId: user.id } } },
            ],
          },
          include: {
            owner: true,
            members: { include: { user: true } },
            projects: true,
          },
        });

        // Deduplicate: keep only the first member record per user
        if (workspaces && workspaces.members) {
          const seen = new Set<string>();
          workspaces.members = workspaces.members.filter((member) => {
            if (seen.has(member.userId)) return false;
            seen.add(member.userId);
            return true;
          });
        }

        res.status(200).json({
          data: workspaces,
          message: "Workspaces fetched successfully",
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
  //****************************************  Update Workspace  *****************************************/
  public updateWorkspace = expressAsyncHandler(
    async (req: MulterRequest, res: Response) => {
      try {
        const user = req.user;
        const workspaceId = req.params.id;

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }

        // Only owner can update
        const workspace = await prisma.workspace.findFirst({
          where: {
            id: workspaceId,
            ownerId: user.id,
          },
        });

        if (!workspace) {
          res.status(403).json({ error: "Not authorized to update this workspace" });
          return;
        }

        const parsed = updateWorkspaceSchema.parse(req.body);

        let profilePicUrl: string | undefined;
        if (req.file) {
          profilePicUrl = await uploadFile(req.file);
        }

        const updated = await prisma.workspace.update({
          where: { id: workspaceId },
          data: {
            ...(parsed.name && { name: parsed.name }),
            ...(profilePicUrl && { profilePic: profilePicUrl }),
          },
        });

        res.status(200).json({
          data: updated,
          message: "Workspace updated successfully",
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
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  //****************************************  Delete Workspace  *****************************************/
  public deleteWorkspace = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const workspaceId = req.params.id;

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }

        // Only owner can delete
        const workspace = await prisma.workspace.findFirst({
          where: {
            id: workspaceId,
            ownerId: user.id,
          },
        });

        if (!workspace) {
          res.status(403).json({ error: "Not authorized to delete this workspace" });
          return;
        }

        // Delete all related data in order
        const projects = await prisma.project.findMany({
          where: { workspaceId },
          select: { id: true },
        });
        const projectIds = projects.map((p) => p.id);

        // Delete task assignments for tasks in this workspace's projects
        await prisma.taskAssignment.deleteMany({
          where: { task: { projectId: { in: projectIds } } },
        });

        // Delete tasks
        await prisma.task.deleteMany({
          where: { projectId: { in: projectIds } },
        });

        // Delete invites
        await prisma.invite.deleteMany({
          where: { OR: [{ workspaceId }, { projectId: { in: projectIds } }] },
        });

        // Delete members
        await prisma.member.deleteMany({
          where: { OR: [{ workspaceId }, { projectId: { in: projectIds } }] },
        });

        // Delete projects
        await prisma.project.deleteMany({
          where: { workspaceId },
        });

        // Delete workspace
        await prisma.workspace.delete({
          where: { id: workspaceId },
        });

        res.status(200).json({
          message: "Workspace deleted successfully",
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}
export default WorkspaceController;
