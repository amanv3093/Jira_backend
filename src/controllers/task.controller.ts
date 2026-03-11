import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
// import { prisma } from "../lib/prisma";
import { createWorkspaceSchema } from "../type/workspace.type";
import { PrismaClient, User } from "@prisma/client";
import { ZodError } from "zod";
import { TaskEditSchema, TaskSchema } from "../type/task.zod";

// Extend Express Request interface to include user property

const prisma = new PrismaClient();
class TaskController {
  //****************************************  Create  *****************************************/
  public createTask = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const { task_name, status, dueDate, projectId, assignments, priority } =
          TaskSchema.parse(req.body);
        const user = req.user;

        if (!user) {
          res
            .status(401)
            .json({ error: "User not authenticated", status: 401 });
          return;
        }
        console.log("assignments", assignments);
        const memberRecords = await prisma.member.findMany({
          where: {
            userId: { in: assignments.map((a) => a.userId) },
            // projectId,
          },
        });

        if (memberRecords.length === 0) {
          res.status(401).json({ error: "Member not found", status: 401 });
          return;
        }

        const task = await prisma.task.create({
          data: {
            task_name,
            status,
            priority,
            dueDate: new Date(dueDate),
            createdById: user.id,
            projectId,
          },
        });

        console.log("memberRecords", memberRecords);
        if (memberRecords.length > 0) {
          for (const m of memberRecords) {
            await prisma.taskAssignment.create({
              data: {
                taskId: task.id,
                memberId: m.id,
              },
            });
          }
        }

        res.status(201).json({
          task,
          message: "Task created successfully",
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
  //****************************************  Get By Workspace Id  *****************************************/
  public getTaskByWorkspaceId = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const user = req.user;

      if (!user) {
        res.status(401).json({ error: "User not authenticated", status: 401 });
        return;
      }
      try {
        const id = req.params.id;

        if (!id) {
          res
            .status(401)
            .json({ error: "workspaceId  are required", status: 401 });
          return;
        }

        const { status, priority, project, assignee, search } = req.query;
        const statusArray = typeof status === "string" ? status.split(",") : [];
        const priorityArray =
          typeof priority === "string" ? priority.split(",") : [];
        const projectArray =
          typeof project === "string" ? project.split(",") : [];
        const assigneeArray =
          typeof assignee === "string" ? assignee.split(",") : [];

        const whereClause: any = {
          project: {
            workspaceId: id as string,
          },
        };
        if (statusArray.length > 0) {
          whereClause.status = { in: statusArray };
        }

        if (priorityArray.length > 0) {
          whereClause.priority = { in: priorityArray };
        }

        if (projectArray.length > 0) {
          whereClause.projectId = { in: projectArray };
        }

        if (assigneeArray.length > 0) {
          whereClause.assignments = {
            some: {
              memberId: { in: assigneeArray },
            },
          };
        }

        if (search && typeof search === "string" && search.trim() !== "") {
          whereClause.OR = [
            { task_name: { contains: search, mode: "insensitive" } },
          ];
        }
        const tasks = await prisma.task.findMany({
          where: whereClause,
          include: {
            project: true,
            createdBy: true,
            assignments: {
              include: {
                member: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        });
        // assignments: {
        //   some: {
        //     member: {
        //       userId: user?.id as string,
        //     },
        //   },
        // },
        if (!tasks) {
          res.status(404).json({ error: "Task not found", status: 404 });
          return;
        }

        res.status(201).json({
          data: tasks,
          message: "Fetched Task successfully",
          status: 201,
        });
      } catch {
        res.status(500).json({ error: "Internal server error", status: 500 });
      }
    }
  );

  //****************************************  Get By Workspace Id  *****************************************/
  public getTaskByProjectId = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const user = req.user;

      if (!user) {
        res.status(401).json({ error: "User not authenticated", status: 401 });
        return;
      }
      try {
        const id = req.params.id;

        if (!id) {
          res
            .status(401)
            .json({ error: "workspaceId  are required", status: 401 });
          return;
        }
        console.log(id);

        const { status, priority, project, assignee, search } = req.query;
        const statusArray = typeof status === "string" ? status.split(",") : [];
        const priorityArray =
          typeof priority === "string" ? priority.split(",") : [];
        const projectArray =
          typeof project === "string" ? project.split(",") : [];
        const assigneeArray =
          typeof assignee === "string" ? assignee.split(",") : [];

        const whereClause: any = {
          projectId: id as string,
        };
        if (statusArray.length > 0) {
          whereClause.status = { in: statusArray };
        }

        if (priorityArray.length > 0) {
          whereClause.priority = { in: priorityArray };
        }

        if (projectArray.length > 0) {
          whereClause.projectId = { in: projectArray };
        }

        if (assigneeArray.length > 0) {
          whereClause.assignments = {
            some: {
              memberId: { in: assigneeArray },
            },
          };
        }

        if (search && typeof search === "string" && search.trim() !== "") {
          whereClause.OR = [
            { task_name: { contains: search, mode: "insensitive" } },
          ];
        }
        console.log(whereClause);
        const tasks = await prisma.task.findMany({
          where: whereClause,
          include: {
            project: true,
            createdBy: true,
            assignments: {
              include: {
                member: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        });
        console.log(tasks);
        // assignments: {
        //   some: {
        //     member: {
        //       userId: user?.id as string,
        //     },
        //   },
        // },
        if (!tasks) {
          res.status(404).json({ error: "Task not found", status: 404 });
          return;
        }

        res.status(201).json({
          data: tasks,
          message: "Fetched Task successfully",
          status: 201,
        });
      } catch {
        res.status(500).json({ error: "Internal server error", status: 500 });
      }
    }
  );

  //****************************************  Update Task  *****************************************/
  public updateTask = expressAsyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "User not authenticated", status: 401 });
      return;
    }
    console.log("Runnnnnnnnnnn")
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "Task ID is required", status: 400 });
        return;
      }

      // Allow partial updates
      const updateData = TaskEditSchema.partial().parse(req.body);

      const existingTask = await prisma.task.findUnique({
        where: { id },
        include: { assignments: true },
      });

      if (!existingTask) {
        res.status(404).json({ error: "Task not found", status: 404 });
        return;
      }

      // Update task info
      const updatedTask = await prisma.task.update({
        where: { id },
        data: {
          task_name: updateData.task_name ?? existingTask.task_name,
          status: updateData.status ?? existingTask.status,
          priority: updateData.priority ?? existingTask.priority,
          dueDate: updateData.dueDate
            ? new Date(updateData.dueDate)
            : existingTask.dueDate,
        },
      });

      // Update task assignments if provided
      if (updateData.assignments && Array.isArray(updateData.assignments)) {
        // Delete old assignments
        await prisma.taskAssignment.deleteMany({ where: { taskId: id } });

        // Add new ones
        const memberRecords = await prisma.member.findMany({
          where: {
            userId: { in: updateData.assignments.map((a) => a.userId) },
          },
        });

        for (const m of memberRecords) {
          await prisma.taskAssignment.create({
            data: { taskId: id, memberId: m.id },
          });
        }
      }

      res.status(200).json({
        message: "Task updated successfully",
        task: updatedTask,
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

      console.error("Update error:", err);
      res.status(500).json({ error: "Internal server error", status: 500 });
    }
  });
  //****************************************  Delete Task  *****************************************/
  public deleteTask = expressAsyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "User not authenticated", status: 401 });
      return;
    }

    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: "Task ID is required", status: 400 });
        return;
      }

      const existingTask = await prisma.task.findUnique({ where: { id } });
      if (!existingTask) {
        res.status(404).json({ error: "Task not found", status: 404 });
        return;
      }

      await prisma.taskAssignment.deleteMany({ where: { taskId: id } });
      await prisma.task.delete({ where: { id } });

      res.status(200).json({ message: "Task deleted successfully" });
    } catch (err) {
      console.error("Delete error:", err);
      res.status(500).json({ error: "Internal server error", status: 500 });
    }
  });
}
export default TaskController;
