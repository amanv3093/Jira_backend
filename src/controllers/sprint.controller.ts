import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class SprintController {
  //****************************************  Create Sprint  *****************************************/
  public createSprint = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "User not authenticated", status: 401 });
        return;
      }

      try {
        const { name, description, startDate, endDate, projectId } = req.body;

        if (!name || !startDate || !endDate || !projectId) {
          res.status(400).json({
            error: "name, startDate, endDate, and projectId are required",
            status: 400,
          });
          return;
        }

        const project = await prisma.project.findUnique({
          where: { id: projectId },
        });

        if (!project) {
          res.status(404).json({ error: "Project not found", status: 404 });
          return;
        }

        const sprint = await prisma.sprint.create({
          data: {
            name,
            description: description || null,
            startDate: new Date(startDate),
            endDate: new Date(endDate),
            projectId,
          },
        });

        res.status(201).json({
          data: sprint,
          message: "Sprint created successfully",
          status: 201,
        });
      } catch (err) {
        console.error("Create sprint error:", err);
        res.status(500).json({ error: "Internal server error", status: 500 });
      }
    }
  );

  //****************************************  Get Sprints By Project Id  *****************************************/
  public getSprintsByProjectId = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "User not authenticated", status: 401 });
        return;
      }

      try {
        const { projectId } = req.params;

        if (!projectId) {
          res
            .status(400)
            .json({ error: "projectId is required", status: 400 });
          return;
        }

        const sprints = await prisma.sprint.findMany({
          where: { projectId },
          orderBy: { createdAt: "desc" },
          include: {
            tasks: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        });

        const sprintsWithCounts = sprints.map((sprint) => {
          const taskCount = sprint.tasks.length;
          const statusBreakdown = sprint.tasks.reduce(
            (acc: Record<string, number>, task) => {
              acc[task.status] = (acc[task.status] || 0) + 1;
              return acc;
            },
            {}
          );

          const { tasks, ...sprintData } = sprint;
          return {
            ...sprintData,
            taskCount,
            statusBreakdown,
          };
        });

        res.status(200).json({
          data: sprintsWithCounts,
          message: "Fetched sprints successfully",
          status: 200,
        });
      } catch (err) {
        console.error("Get sprints by project error:", err);
        res.status(500).json({ error: "Internal server error", status: 500 });
      }
    }
  );

  //****************************************  Get Sprints By Workspace Id  *****************************************/
  public getSprintsByWorkspaceId = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "User not authenticated", status: 401 });
        return;
      }

      try {
        const { workspaceId } = req.params;

        if (!workspaceId) {
          res
            .status(400)
            .json({ error: "workspaceId is required", status: 400 });
          return;
        }

        const sprints = await prisma.sprint.findMany({
          where: {
            project: {
              workspaceId,
            },
          },
          orderBy: { startDate: "desc" },
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            tasks: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        });

        const sprintsWithCounts = sprints.map((sprint) => {
          const taskCount = sprint.tasks.length;
          const statusBreakdown = sprint.tasks.reduce(
            (acc: Record<string, number>, task) => {
              acc[task.status] = (acc[task.status] || 0) + 1;
              return acc;
            },
            {}
          );

          const { tasks, ...sprintData } = sprint;
          return {
            ...sprintData,
            taskCount,
            statusBreakdown,
          };
        });

        res.status(200).json({
          data: sprintsWithCounts,
          message: "Fetched sprints successfully",
          status: 200,
        });
      } catch (err) {
        console.error("Get sprints by workspace error:", err);
        res.status(500).json({ error: "Internal server error", status: 500 });
      }
    }
  );

  //****************************************  Get Sprint By Id  *****************************************/
  public getSprintById = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "User not authenticated", status: 401 });
        return;
      }

      try {
        const { id } = req.params;

        if (!id) {
          res
            .status(400)
            .json({ error: "Sprint ID is required", status: 400 });
          return;
        }

        const sprint = await prisma.sprint.findUnique({
          where: { id },
          include: {
            project: true,
            tasks: {
              include: {
                assignments: {
                  include: {
                    member: {
                      include: {
                        user: true,
                      },
                    },
                  },
                },
                project: true,
              },
            },
          },
        });

        if (!sprint) {
          res.status(404).json({ error: "Sprint not found", status: 404 });
          return;
        }

        res.status(200).json({
          data: sprint,
          message: "Fetched sprint successfully",
          status: 200,
        });
      } catch (err) {
        console.error("Get sprint by id error:", err);
        res.status(500).json({ error: "Internal server error", status: 500 });
      }
    }
  );

  //****************************************  Update Sprint  *****************************************/
  public updateSprint = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "User not authenticated", status: 401 });
        return;
      }

      try {
        const { id } = req.params;

        if (!id) {
          res
            .status(400)
            .json({ error: "Sprint ID is required", status: 400 });
          return;
        }

        const existingSprint = await prisma.sprint.findUnique({
          where: { id },
        });

        if (!existingSprint) {
          res.status(404).json({ error: "Sprint not found", status: 404 });
          return;
        }

        const { name, description, startDate, endDate, status } = req.body;

        const updateData: Record<string, any> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (startDate !== undefined) updateData.startDate = new Date(startDate);
        if (endDate !== undefined) updateData.endDate = new Date(endDate);
        if (status !== undefined) updateData.status = status;

        const updatedSprint = await prisma.sprint.update({
          where: { id },
          data: updateData,
        });

        res.status(200).json({
          data: updatedSprint,
          message: "Sprint updated successfully",
          status: 200,
        });
      } catch (err) {
        console.error("Update sprint error:", err);
        res.status(500).json({ error: "Internal server error", status: 500 });
      }
    }
  );

  //****************************************  Delete Sprint  *****************************************/
  public deleteSprint = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "User not authenticated", status: 401 });
        return;
      }

      try {
        const { id } = req.params;

        if (!id) {
          res
            .status(400)
            .json({ error: "Sprint ID is required", status: 400 });
          return;
        }

        const existingSprint = await prisma.sprint.findUnique({
          where: { id },
        });

        if (!existingSprint) {
          res.status(404).json({ error: "Sprint not found", status: 404 });
          return;
        }

        // Unlink all tasks from this sprint before deleting
        await prisma.task.updateMany({
          where: { sprintId: id },
          data: { sprintId: null },
        });

        await prisma.sprint.delete({ where: { id } });

        res.status(200).json({
          message: "Sprint deleted successfully",
          status: 200,
        });
      } catch (err) {
        console.error("Delete sprint error:", err);
        res.status(500).json({ error: "Internal server error", status: 500 });
      }
    }
  );

  //****************************************  Add Tasks To Sprint  *****************************************/
  public addTasksToSprint = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "User not authenticated", status: 401 });
        return;
      }

      try {
        const { id } = req.params;
        const { taskIds } = req.body;

        if (!id) {
          res
            .status(400)
            .json({ error: "Sprint ID is required", status: 400 });
          return;
        }

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
          res
            .status(400)
            .json({ error: "taskIds array is required", status: 400 });
          return;
        }

        const existingSprint = await prisma.sprint.findUnique({
          where: { id },
        });

        if (!existingSprint) {
          res.status(404).json({ error: "Sprint not found", status: 404 });
          return;
        }

        await prisma.task.updateMany({
          where: { id: { in: taskIds } },
          data: { sprintId: id },
        });

        res.status(200).json({
          message: "Tasks added to sprint successfully",
          status: 200,
        });
      } catch (err) {
        console.error("Add tasks to sprint error:", err);
        res.status(500).json({ error: "Internal server error", status: 500 });
      }
    }
  );

  //****************************************  Remove Task From Sprint  *****************************************/
  public removeTaskFromSprint = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "User not authenticated", status: 401 });
        return;
      }

      try {
        const { id } = req.params;
        const { taskIds } = req.body;

        if (!id) {
          res
            .status(400)
            .json({ error: "Sprint ID is required", status: 400 });
          return;
        }

        if (!taskIds || !Array.isArray(taskIds) || taskIds.length === 0) {
          res
            .status(400)
            .json({ error: "taskIds array is required", status: 400 });
          return;
        }

        const existingSprint = await prisma.sprint.findUnique({
          where: { id },
        });

        if (!existingSprint) {
          res.status(404).json({ error: "Sprint not found", status: 404 });
          return;
        }

        await prisma.task.updateMany({
          where: {
            id: { in: taskIds },
            sprintId: id,
          },
          data: { sprintId: null },
        });

        res.status(200).json({
          message: "Tasks removed from sprint successfully",
          status: 200,
        });
      } catch (err) {
        console.error("Remove task from sprint error:", err);
        res.status(500).json({ error: "Internal server error", status: 500 });
      }
    }
  );

  //****************************************  Start Sprint  *****************************************/
  public startSprint = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "User not authenticated", status: 401 });
        return;
      }

      try {
        const { id } = req.params;

        if (!id) {
          res
            .status(400)
            .json({ error: "Sprint ID is required", status: 400 });
          return;
        }

        const existingSprint = await prisma.sprint.findUnique({
          where: { id },
        });

        if (!existingSprint) {
          res.status(404).json({ error: "Sprint not found", status: 404 });
          return;
        }

        if (existingSprint.status === "ACTIVE") {
          res
            .status(400)
            .json({ error: "Sprint is already active", status: 400 });
          return;
        }

        if (existingSprint.status === "COMPLETED") {
          res.status(400).json({
            error: "Cannot start a completed sprint",
            status: 400,
          });
          return;
        }

        const updateData: Record<string, any> = {
          status: "ACTIVE",
        };

        // Set startDate to now if not already set
        if (!existingSprint.startDate) {
          updateData.startDate = new Date();
        }

        const updatedSprint = await prisma.sprint.update({
          where: { id },
          data: updateData,
        });

        res.status(200).json({
          data: updatedSprint,
          message: "Sprint started successfully",
          status: 200,
        });
      } catch (err) {
        console.error("Start sprint error:", err);
        res.status(500).json({ error: "Internal server error", status: 500 });
      }
    }
  );

  //****************************************  Complete Sprint  *****************************************/
  public completeSprint = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "User not authenticated", status: 401 });
        return;
      }

      try {
        const { id } = req.params;

        if (!id) {
          res
            .status(400)
            .json({ error: "Sprint ID is required", status: 400 });
          return;
        }

        const existingSprint = await prisma.sprint.findUnique({
          where: { id },
        });

        if (!existingSprint) {
          res.status(404).json({ error: "Sprint not found", status: 404 });
          return;
        }

        if (existingSprint.status === "COMPLETED") {
          res
            .status(400)
            .json({ error: "Sprint is already completed", status: 400 });
          return;
        }

        // Set sprint status to COMPLETED
        const updatedSprint = await prisma.sprint.update({
          where: { id },
          data: { status: "COMPLETED" },
        });

        // Move incomplete tasks to backlog (set status to BACKLOG and sprintId to null)
        await prisma.task.updateMany({
          where: {
            sprintId: id,
            status: { not: "DONE" },
          },
          data: {
            status: "BACKLOG",
            sprintId: null,
          },
        });

        res.status(200).json({
          data: updatedSprint,
          message: "Sprint completed successfully. Incomplete tasks moved to backlog.",
          status: 200,
        });
      } catch (err) {
        console.error("Complete sprint error:", err);
        res.status(500).json({ error: "Internal server error", status: 500 });
      }
    }
  );
}

export default SprintController;
