import { Request, Response, NextFunction } from "express";
import { PrismaClient, User } from "@prisma/client";
import { verifyAccessToken } from "../lib/jwt";

const prisma = new PrismaClient();

// Add `user` to Express Request globally
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const AuthMiddleware = async (
  req: Request, 
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];
  console.log("token", token);
  try {
    const payload = verifyAccessToken(token) as { user_id: string };
    // console.log("payload", payload);

    const user = await prisma.user.findUnique({
      where: { id: payload.user_id },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = user; 
    next();
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
