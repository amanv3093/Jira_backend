import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { HfInference } from "@huggingface/inference";

const prisma = new PrismaClient();

const hf = new HfInference(process.env.HUGGINGFACE_API_KEY || "");
const MODEL_ID = "Qwen/QwQ-32B";

const tools: any[] = [
  {
    type: "function",
    function: {
      name: "create_task",
      description:
        "Create a new task in a project. Use this when the user wants to create a task.",
      parameters: {
        type: "object",
        properties: {
          task_name: {
            type: "string",
            description: "The name/title of the task",
          },
          projectId: {
            type: "string",
            description: "The project ID to create the task in",
          },
          status: {
            type: "string",
            description:
              "Task status: BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, or DONE. Defaults to BACKLOG",
          },
          priority: {
            type: "string",
            description:
              "Task priority: LOW, MEDIUM, HIGH, or CRITICAL. Defaults to MEDIUM",
          },
          dueDate: {
            type: "string",
            description:
              "Due date in ISO format. Defaults to 7 days from now",
          },
          assigneeNames: {
            type: "array",
            items: { type: "string" },
            description:
              "Array of member names to assign. Match against workspace members.",
          },
        },
        required: ["task_name", "projectId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_project",
      description:
        "Create a new project in the workspace. Use this when the user wants to create a project.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "The project name",
          },
          description: {
            type: "string",
            description: "Optional project description",
          },
        },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_tasks",
      description:
        "Get tasks from the workspace with optional filters. Use this to answer questions about tasks.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            description:
              "Filter by status (comma-separated): BACKLOG,TODO,IN_PROGRESS,IN_REVIEW,DONE",
          },
          priority: {
            type: "string",
            description:
              "Filter by priority (comma-separated): LOW,MEDIUM,HIGH,CRITICAL",
          },
          projectId: {
            type: "string",
            description: "Filter by project ID",
          },
          search: {
            type: "string",
            description: "Search by task name",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_task",
      description:
        "Update an existing task. Use this when the user wants to change a task's status, priority, name, or assignees.",
      parameters: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "The task ID to update",
          },
          task_name: {
            type: "string",
            description: "New task name",
          },
          status: {
            type: "string",
            description: "New status",
          },
          priority: {
            type: "string",
            description: "New priority",
          },
          dueDate: {
            type: "string",
            description: "New due date in ISO format",
          },
          assigneeNames: {
            type: "array",
            items: { type: "string" },
            description: "New assignee names (replaces current)",
          },
        },
        required: ["taskId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "delete_task",
      description: "Delete a task by ID.",
      parameters: {
        type: "object",
        properties: {
          taskId: {
            type: "string",
            description: "The task ID to delete",
          },
        },
        required: ["taskId"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_workspace_stats",
      description:
        "Get workspace dashboard statistics including project counts, task counts, overdue tasks, member stats, etc.",
      parameters: {
        type: "object",
        properties: {},
      },
    },
  },
];

// ── Helper: build workspace context for system prompt ──
async function buildContext(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    include: {
      projects: { select: { id: true, name: true, description: true } },
      members: {
        include: {
          user: { select: { id: true, full_name: true, email: true } },
        },
      },
    },
  });

  if (!workspace) return null;

  // Deduplicate members
  const seen = new Set<string>();
  const members = workspace.members.filter((m) => {
    if (seen.has(m.userId)) return false;
    seen.add(m.userId);
    return true;
  });

  const recentTasks = await prisma.task.findMany({
    where: { project: { workspaceId } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      project: { select: { name: true } },
      assignments: {
        include: { member: { include: { user: { select: { full_name: true } } } } },
      },
    },
  });

  return {
    workspace: { id: workspace.id, name: workspace.name, plan: workspace.plan },
    projects: workspace.projects,
    members: members.map((m) => ({
      userId: m.userId,
      name: m.user.full_name,
      email: m.user.email,
      role: m.role,
    })),
    recentTasks: recentTasks.map((t) => ({
      id: t.id,
      name: t.task_name,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate,
      project: t.project?.name,
      assignees: t.assignments.map((a) => a.member?.user?.full_name).filter(Boolean),
    })),
  };
}

// ── Helper: execute function calls ──
async function executeFunction(
  name: string,
  args: any,
  workspaceId: string,
  userId: string
) {
  switch (name) {
    case "create_task": {
      const project = await prisma.project.findUnique({
        where: { id: args.projectId },
      });
      if (!project) return { error: "Project not found" };

      // Resolve assignee names to user IDs
      let assignmentData: { taskId: string; memberId: string }[] = [];
      let resolvedAssignees: string[] = [];

      if (args.assigneeNames?.length) {
        const members = await prisma.member.findMany({
          where: { workspaceId },
          include: { user: { select: { id: true, full_name: true } } },
        });
        const seen = new Set<string>();
        const unique = members.filter((m) => {
          if (seen.has(m.userId)) return false;
          seen.add(m.userId);
          return true;
        });

        for (const nameStr of args.assigneeNames) {
          const match = unique.find((m) =>
            m.user.full_name.toLowerCase().includes(nameStr.toLowerCase())
          );
          if (match) {
            resolvedAssignees.push(match.user.full_name);
            assignmentData.push({ taskId: "", memberId: match.id });
          }
        }
      }

      const task = await prisma.task.create({
        data: {
          task_name: args.task_name,
          status: args.status || "BACKLOG",
          priority: args.priority || "MEDIUM",
          dueDate: args.dueDate
            ? new Date(args.dueDate)
            : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          projectId: args.projectId,
          createdById: userId,
        },
      });

      for (const a of assignmentData) {
        await prisma.taskAssignment.create({
          data: { taskId: task.id, memberId: a.memberId },
        });
      }

      return {
        success: true,
        task: {
          id: task.id,
          name: task.task_name,
          status: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          project: project.name,
          assignees: resolvedAssignees,
        },
      };
    }

    case "create_project": {
      const project = await prisma.project.create({
        data: {
          name: args.name,
          description: args.description || null,
          workspaceId,
          ownerId: userId,
        },
      });

      // Add all workspace members to project
      const wsMembers = await prisma.member.findMany({
        where: { workspaceId, projectId: null },
      });
      for (const m of wsMembers) {
        await prisma.member.create({
          data: {
            userId: m.userId,
            role: m.userId === userId ? "OWNER" : "CONTRIBUTOR",
            workspaceId,
            projectId: project.id,
          },
        });
      }

      return {
        success: true,
        project: { id: project.id, name: project.name, description: project.description },
      };
    }

    case "get_tasks": {
      const where: any = { project: { workspaceId } };
      if (args.status) where.status = { in: args.status.split(",") };
      if (args.priority) where.priority = { in: args.priority.split(",") };
      if (args.projectId) where.projectId = args.projectId;
      if (args.search)
        where.task_name = { contains: args.search, mode: "insensitive" };

      const tasks = await prisma.task.findMany({
        where,
        take: 30,
        orderBy: { createdAt: "desc" },
        include: {
          project: { select: { name: true } },
          assignments: {
            include: {
              member: {
                include: { user: { select: { full_name: true } } },
              },
            },
          },
        },
      });

      return {
        count: tasks.length,
        tasks: tasks.map((t) => ({
          id: t.id,
          name: t.task_name,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate,
          project: t.project?.name,
          assignees: t.assignments
            .map((a) => a.member?.user?.full_name)
            .filter(Boolean),
        })),
      };
    }

    case "update_task": {
      const task = await prisma.task.findUnique({
        where: { id: args.taskId },
      });
      if (!task) return { error: "Task not found" };

      const data: any = {};
      if (args.task_name) data.task_name = args.task_name;
      if (args.status) data.status = args.status;
      if (args.priority) data.priority = args.priority;
      if (args.dueDate) data.dueDate = new Date(args.dueDate);

      const updated = await prisma.task.update({
        where: { id: args.taskId },
        data,
      });

      if (args.assigneeNames?.length) {
        await prisma.taskAssignment.deleteMany({
          where: { taskId: args.taskId },
        });
        const members = await prisma.member.findMany({
          where: { workspaceId },
          include: { user: { select: { full_name: true } } },
        });
        const seen = new Set<string>();
        const unique = members.filter((m) => {
          if (seen.has(m.userId)) return false;
          seen.add(m.userId);
          return true;
        });

        for (const nameStr of args.assigneeNames) {
          const match = unique.find((m) =>
            m.user.full_name.toLowerCase().includes(nameStr.toLowerCase())
          );
          if (match) {
            await prisma.taskAssignment.create({
              data: { taskId: args.taskId, memberId: match.id },
            });
          }
        }
      }

      return {
        success: true,
        task: {
          id: updated.id,
          name: updated.task_name,
          status: updated.status,
          priority: updated.priority,
        },
      };
    }

    case "delete_task": {
      await prisma.taskAssignment.deleteMany({
        where: { taskId: args.taskId },
      });
      await prisma.task.delete({ where: { id: args.taskId } });
      return { success: true, message: "Task deleted" };
    }

    case "get_workspace_stats": {
      const projects = await prisma.project.findMany({
        where: { workspaceId },
      });
      const tasks = await prisma.task.findMany({
        where: { project: { workspaceId } },
      });

      const statusCounts: Record<string, number> = {};
      const priorityCounts: Record<string, number> = {};
      let overdue = 0;

      for (const t of tasks) {
        statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
        if (t.priority)
          priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
        if (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "DONE")
          overdue++;
      }

      return {
        totalProjects: projects.length,
        totalTasks: tasks.length,
        completedTasks: statusCounts["DONE"] || 0,
        overdueTasks: overdue,
        statusCounts,
        priorityCounts,
      };
    }

    default:
      return { error: `Unknown function: ${name}` };
  }
}

class AIController {
  public chat = expressAsyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      const { message, workspaceId, history } = req.body;

      if (!message || !workspaceId) {
        res.status(400).json({ error: "message and workspaceId are required" });
        return;
      }

      if (!process.env.HUGGINGFACE_API_KEY) {
        res.status(500).json({ error: "HUGGINGFACE_API_KEY is not configured" });
        return;
      }

      // Build workspace context
      const context = await buildContext(workspaceId);
      if (!context) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const systemPrompt = `You are an AI assistant for a project management app (like Jira). You help users manage their workspace by creating tasks, projects, answering questions about their work, and providing insights.

CURRENT WORKSPACE CONTEXT:
- Workspace: "${context.workspace.name}" (ID: ${context.workspace.id}, Plan: ${context.workspace.plan})
- Projects: ${JSON.stringify(context.projects)}
- Members: ${JSON.stringify(context.members)}
- Recent Tasks: ${JSON.stringify(context.recentTasks)}

IMPORTANT RULES:
1. When creating tasks, use the exact projectId from the projects list above.
2. When users mention a project by name, find the matching projectId from the list.
3. When users mention a member by name, match against the members list.
4. If a project or member name is ambiguous, ask for clarification.
5. Always confirm actions you've taken with details.
6. For status questions, use get_tasks or get_workspace_stats.
7. Be concise and helpful. Use bullet points for lists.
8. Current user: ${user.full_name} (${user.email})
9. Today's date: ${new Date().toISOString().split("T")[0]}`;

      // Build messages array in OpenAI-compatible format
      const messages: any[] = [
        { role: "system", content: systemPrompt },
        ...(history || []).map((msg: any) => ({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.content,
        })),
        { role: "user", content: message },
      ];

      // Process function calls in a loop
      const actionsPerformed: any[] = [];
      let maxIterations = 5;

      while (maxIterations-- >= 0) {
        const completion = await hf.chatCompletion({
          model: MODEL_ID,
          messages,
          tools,
          max_tokens: 2048,
        });

        const choice = completion.choices[0];
        const assistantMessage = choice.message;

        // Add assistant message to conversation
        messages.push(assistantMessage);

        // If no tool calls, return the text response
        if (!assistantMessage.tool_calls?.length) {
          const text = assistantMessage.content || "";
          res.status(200).json({
            data: {
              reply: text,
              actions: actionsPerformed,
            },
            message: "AI response generated",
          });
          return;
        }

        // Execute each tool call and add results to messages
        for (const toolCall of assistantMessage.tool_calls) {
          const fnName = toolCall.function.name;
          const fnArgs = JSON.parse(toolCall.function.arguments || "{}");

          const fnResult = await executeFunction(
            fnName,
            fnArgs,
            workspaceId,
            user.id
          );

          actionsPerformed.push({
            function: fnName,
            args: fnArgs,
            result: fnResult,
          });

          // Send tool result back for the next iteration
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(fnResult),
          });
        }
      }

      // If we exhausted iterations, return what we have
      res.status(200).json({
        data: {
          reply: "I performed several actions but reached my processing limit. Please check the results.",
          actions: actionsPerformed,
        },
        message: "AI response generated",
      });
    } catch (err: any) {
      console.error("AI chat error:", err);
      res.status(500).json({
        error: err.message || "Failed to process AI request",
      });
    }
  });
}

export default AIController;
