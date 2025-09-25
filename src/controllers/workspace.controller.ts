import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
// import { prisma } from "../lib/prisma";
import { createWorkspaceSchema } from "../type/workspace.type";
import { PrismaClient, User } from "@prisma/client";
import { ZodError } from "zod";

// Extend Express Request interface to include user property

const prisma = new PrismaClient();
class WorkspaceController {
  //****************************************  Create  *****************************************/
  public createWorkspace = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const { name, profilePic } = createWorkspaceSchema.parse(req.body);
        const user = req.user;

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }

        const workspace = await prisma.workspace.create({
          data: {
            name,
            ownerId: user.id,
            ...(profilePic && { profilePic }),
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
          workspace,
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

        const workspaces = await prisma.workspace.findMany({
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
}
export default WorkspaceController;
