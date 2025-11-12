import { TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";

export const TaskSchema = z.object({
  task_name: z.string().min(1, "Task name is required"),
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.BACKLOG),
  priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
  dueDate: z
    .preprocess((val) => {
      if (typeof val === "string" && val.trim() !== "") {
        return new Date(val).toISOString();
      }
      return val;
    }, z.string().datetime({ offset: true }))
    .refine((val) => !!val, { message: "Due date is required" }),
  projectId: z.string(),
  assignments: z.array(
    z.object({
      userId: z.string(),
      assignedAt: z.string().datetime().optional(),
    })
  ),
});

export const TaskEditSchema = z.object({
  task_name: z.string().optional(),
  status: z.nativeEnum(TaskStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  dueDate: z
    .preprocess((val) => {
      if (typeof val === "string" && val.trim() !== "") {
        return new Date(val).toISOString();
      }

      return undefined;
    }, z.string().datetime({ offset: true }).optional())
    .optional(),

  assignments: z
    .array(
      z.object({
        userId: z.string(),
        assignedAt: z.string().datetime().optional(),
      })
    )
    .optional(),
});

export type Task = z.infer<typeof TaskSchema>;
