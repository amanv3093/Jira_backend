import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
// import { prisma } from "../lib/prisma";
import { createWorkspaceSchema } from "../type/workspace.type";
import { PrismaClient, User } from "@prisma/client";
import { ZodError } from "zod";
import { TaskSchema } from "../type/task.zod";

// Extend Express Request interface to include user property

const prisma = new PrismaClient();
class TaskController {
  //****************************************  Create  *****************************************/
  public createTask = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const { task_name, status, dueDate, projectId, assignments } =
          TaskSchema.parse(req.body);
        const user = req.user;

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }

        
        const member = await prisma.member.create({
          data: {
            userId: user.id,
            // workspaceId: workspace.id,
            projectId: projectId, 
            role: "OWNER",
          },
        });

       
        // const task = await prisma.task.create({
        //   data: {
        //     task_name,
        //     status,
        //     dueDate,
        //     createdById: user.id,
        //     projectId: projectId,
        //   },
        // });

       
        // await prisma.taskAssignment.create({
        //   data: {
        //     taskId: task.id,
        //     memberId: member.id,
        //   },
        // });

        // res.status(201).json({
        //   task,
        //   message: "Task created successfully",
        // });
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
export default TaskController;
