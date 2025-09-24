import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email({ message: "Email is required and must be valid" }),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
