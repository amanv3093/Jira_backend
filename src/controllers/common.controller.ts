import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ZodError } from "zod";
import { createProjectSchema, updateProjectSchema } from "../type/project.zod";
import { uploadFile } from "../utils/helper";
// import { MulterRequest } from "@/types/multer";

const prisma = new PrismaClient();

class CommonController {
  //****************************************  Get Details By Workspace Id  *****************************************/
  public getHomeDetailsByWorkspaceId = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const { id: workspaceId } = req.params;
        const userId = req.user?.id;

        if (!workspaceId) {
          res.status(400).json({ error: "Workspace Id missing" });
          return;
        }

        if (!userId) {
          res.status(401).json({ error: "Unauthorized" });
          return;
        }

        // pagination
        const projectLimit = Number(req.query.projectLimit) || 5;
        const projectOffset = Number(req.query.projectOffset) || 0;

        const taskLimit = Number(req.query.taskLimit) || 5;

        // ✅ Task counts by status
        const [todoCount, inProgressCount, completedCount] = await Promise.all([
          prisma.task.count({
            where: {
              project: { workspaceId, members: { some: { userId } } },
              status: "TODO",
            },
          }),
          prisma.task.count({
            where: {
              project: { workspaceId, members: { some: { userId } } },
              status: "IN_PROGRESS",
            },
          }),
          prisma.task.count({
            where: {
              project: { workspaceId, members: { some: { userId } } },
              status: "DONE",
            },
          }),
        ]);

        // ✅ Fetch Projects + limited tasks on each project
        const projects = await prisma.project.findMany({
          where: {
            workspaceId,
            members: { some: { userId } },
          },
          include: {
            owner: true,
            workspace: true,
            members: {
              include: { user: true },
            },
            tasks: {
              take: taskLimit,
              orderBy: { createdAt: "desc" },
            },
          },
          skip: projectOffset,
          take: projectLimit,
          orderBy: { createdAt: "desc" },
        });

        
        res.status(200).json({
          message: "Workspace data fetched successfully",
          data: {
            taskStats: {
              todo: todoCount,
              inProgress: inProgressCount,
              completed: completedCount,
            },
            projects,
            pagination: {
              project: {
                limit: projectLimit,
                offset: projectOffset,
                returned: projects.length,
              },
              tasksPerProject: taskLimit,
            },
          },
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

export default CommonController;
