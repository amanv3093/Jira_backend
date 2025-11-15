import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  workspaceId: z.string(),
 
});

export const updateProjectSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  // profilePic: z.string().url().optional(),
});
