// lib/jwt.ts
import jwt, { JwtPayload, SignOptions } from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;


export function signAccessToken(payload: JwtPayload | string): string {
  const options: SignOptions = { expiresIn: 30 * 24 * 60 * 60 }; 
  return jwt.sign(payload, ACCESS_SECRET, options);
}

export function signRefreshToken(payload: JwtPayload | string): string {
  const options: SignOptions = { expiresIn: 30 * 24 * 60 * 60 }; 
  return jwt.sign(payload, REFRESH_SECRET, options);
}

export function verifyAccessToken(token: string): JwtPayload | string {
  return jwt.verify(token, ACCESS_SECRET);
}

export function verifyRefreshToken(token: string): JwtPayload | string {
  return jwt.verify(token, REFRESH_SECRET);
}
