import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "./jwt";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });

  const token = authHeader.split(" ")[1]; 
  if (!token) return res.status(401).json({ error: "Token missing" });

  try {
    const payload = verifyAccessToken(token);
    (req as any).user = payload; 
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}
