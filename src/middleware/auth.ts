import { Request, Response, NextFunction } from "express";
import { PrismaClient, User } from "@prisma/client";
import { verifyAccessToken } from "../lib/jwt";

const prisma = new PrismaClient();

export interface AuthRequest extends Request {
  user?: User; // typed as Prisma User
}

export const AuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = verifyAccessToken(token) as { userId: string };

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    req.user = user; // attach user to request
    next(); // pass control to next middleware or route handler
  } catch (err) {
    console.error(err);
    res.status(401).json({ error: "Invalid or expired token" });
  }
};
