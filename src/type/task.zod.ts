import { TaskPriority, TaskStatus } from "@prisma/client";
import { z } from "zod";


export const TaskSchema = z.object({
  task_name: z.string().min(1, "Task name is required"),
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.BACKLOG),
  priority: z.nativeEnum(TaskPriority).optional().default(TaskPriority.MEDIUM),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string(),
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
