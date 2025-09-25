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
}
export default WorkspaceController;
