import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

class DashboardController {
  //****************************************  Get Dashboard Details  *****************************************/
  public getDashboardDetails = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const workspaceId = req.params.id;

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }

        if (!workspaceId) {
          res.status(400).json({ error: "Workspace ID is required" });
          return;
        }

        // Verify user has access to this workspace
        const workspace = await prisma.workspace.findFirst({
          where: {
            id: workspaceId,
            OR: [
              { ownerId: user.id },
              { members: { some: { userId: user.id } } },
            ],
          },
        });

        if (!workspace) {
          res.status(403).json({ error: "Access denied to this workspace" });
          return;
        }

        // Fetch all projects in this workspace
        const projects = await prisma.project.findMany({
          where: { workspaceId },
          include: {
            tasks: {
              select: { id: true, status: true, priority: true, dueDate: true },
            },
            members: {
              include: {
                user: {
                  select: { id: true, full_name: true, avatarUrl: true },
                },
              },
            },
            owner: {
              select: { id: true, full_name: true, avatarUrl: true },
            },
          },
        });

        // Fetch all tasks in this workspace (through projects)
        const tasks = await prisma.task.findMany({
          where: {
            project: { workspaceId },
          },
          include: {
            project: {
              select: { id: true, name: true, profilePic: true },
            },
            assignments: {
              include: {
                member: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        full_name: true,
                        email: true,
                        avatarUrl: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        // Fetch members of this workspace
        const members = await prisma.member.findMany({
          where: { workspaceId },
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                email: true,
                avatarUrl: true,
              },
            },
            assignments: {
              include: {
                task: {
                  select: {
                    id: true,
                    status: true,
                    dueDate: true,
                  },
                },
              },
            },
          },
        });

        // --- Compute project stats ---
        const totalProjects = projects.length;

        // A project is "completed" if ALL tasks are DONE (and it has tasks)
        const completedProjects = projects.filter(
          (p) => p.tasks.length > 0 && p.tasks.every((t) => t.status === "DONE")
        ).length;

        // A project is "in progress" if it has at least one IN_PROGRESS or IN_REVIEW task
        const inProgressProjects = projects.filter((p) =>
          p.tasks.some(
            (t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW"
          )
        ).length;

        // Pending = projects with no tasks or only BACKLOG/TODO tasks
        const pendingProjects =
          totalProjects - completedProjects - inProgressProjects;

        // --- Compute task stats ---
        const totalTasks = tasks.length;

        const taskStatusCounts = {
          BACKLOG: 0,
          TODO: 0,
          IN_PROGRESS: 0,
          IN_REVIEW: 0,
          DONE: 0,
        };

        const taskPriorityCounts = {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          CRITICAL: 0,
        };

        const now = new Date();
        let overdueTasks = 0;
        let completedTasks = 0;

        tasks.forEach((task) => {
          taskStatusCounts[task.status]++;
          taskPriorityCounts[task.priority]++;

          if (task.status === "DONE") {
            completedTasks++;
          }

          if (
            task.dueDate &&
            new Date(task.dueDate) < now &&
            task.status !== "DONE"
          ) {
            overdueTasks++;
          }
        });

        const completionPercentage =
          totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        // --- Recent tasks (last 5) ---
        const recentTasks = tasks.slice(0, 5).map((task) => ({
          id: task.id,
          task_name: task.task_name,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          createdAt: task.createdAt,
          project: task.project,
          assignees: task.assignments.map((a) => ({
            id: a.member.user.id,
            name: a.member.user.full_name,
            avatarUrl: a.member.user.avatarUrl,
          })),
        }));

        // --- Member stats ---
        const memberStats = members.map((member) => {
          const memberTasks = member.assignments.map((a) => a.task);
          const total = memberTasks.length;
          const completed = memberTasks.filter(
            (t) => t.status === "DONE"
          ).length;
          const overdue = memberTasks.filter(
            (t) =>
              t.dueDate &&
              new Date(t.dueDate) < now &&
              t.status !== "DONE"
          ).length;

          return {
            id: member.id,
            userId: member.user.id,
            name: member.user.full_name,
            email: member.user.email,
            avatarUrl: member.user.avatarUrl,
            role: member.role,
            joinedAt: member.joinedAt,
            stats: {
              totalTasks: total,
              completedTasks: completed,
              overdueTasks: overdue,
            },
          };
        });

        // --- Project details ---
        const projectDetails = projects.map((project) => {
          const total = project.tasks.length;
          const completed = project.tasks.filter((t) => t.status === "DONE").length;
          const overdue = project.tasks.filter(
            (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== "DONE"
          ).length;

          let status: "completed" | "in_progress" | "pending" = "pending";
          if (total > 0 && completed === total) {
            status = "completed";
          } else if (
            project.tasks.some(
              (t) => t.status === "IN_PROGRESS" || t.status === "IN_REVIEW"
            )
          ) {
            status = "in_progress";
          }

          // Deduplicate members by userId
          const seen = new Set<string>();
          const uniqueMembers = project.members.filter((m) => {
            if (seen.has(m.userId)) return false;
            seen.add(m.userId);
            return true;
          });

          return {
            id: project.id,
            name: project.name,
            description: project.description,
            profilePic: project.profilePic,
            createdAt: project.createdAt,
            status,
            owner: project.owner,
            members: uniqueMembers.map((m) => ({
              id: m.user.id,
              name: m.user.full_name,
              avatarUrl: m.user.avatarUrl,
            })),
            taskStats: {
              total,
              completed,
              overdue,
              completionPercentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            },
          };
        });

        // --- Task status chart data ---
        const taskStatusChart = Object.entries(taskStatusCounts).map(
          ([status, count]) => ({
            status: status.replace("_", " "),
            count,
          })
        );

        // --- Task priority chart data ---
        const taskPriorityChart = Object.entries(taskPriorityCounts).map(
          ([priority, count]) => ({
            priority,
            count,
          })
        );

        res.status(200).json({
          data: {
            projectStats: {
              total: totalProjects,
              completed: completedProjects,
              inProgress: inProgressProjects,
              pending: pendingProjects,
            },
            taskStats: {
              total: totalTasks,
              completed: completedTasks,
              overdue: overdueTasks,
              completionPercentage,
              statusCounts: taskStatusCounts,
              priorityCounts: taskPriorityCounts,
            },
            projects: projectDetails,
            taskStatusChart,
            taskPriorityChart,
            recentTasks,
            memberStats,
          },
          message: "Dashboard details fetched successfully",
        });
      } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}

export default DashboardController;
