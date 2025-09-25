import { z } from "zod";


export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .min(1, { message: "Workspace name cannot be empty" }), 
  profilePic:z.string().optional()
});


export const updateWorkspaceSchema = z.object({
  name: z.string().min(1, { message: "Workspace name cannot be empty" }).optional(),
  profilePic:z.string().optional()
});


export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
