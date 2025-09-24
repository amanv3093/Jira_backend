import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { prisma } from "../lib/prisma";
import { signAccessToken, signRefreshToken } from "../lib/jwt";
import bcrypt from "bcrypt";
import { loginSchema, signupSchema } from "../lib/validation";
import { sendResponse } from "../utils/api-response";

class AuthController {
  //****************************************  Login  *****************************************/
  public login = asyncHandler(async (req: Request, res: Response) => {
    if (req.method !== "POST") {
      res.status(405).end();
      return;
    }
    const { email, password } = loginSchema.parse(req.body);

    if (!email || !password) {
      res.status(400).json({ error: "Email and password required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const accessToken = signAccessToken({
      user_id: user.id,
      role: user.role,
      email: user.email,
      full_name: user.full_name,
    });
    const refreshToken = signRefreshToken({ user_id: user.id });

    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    });

    res.status(200).json({
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
      },
    });
  });

  //****************************************  signup  *****************************************/
  public signup = asyncHandler(async (req: Request, res: Response) => {
    if (req.method !== "POST") {
      res.status(405).end();
      return;
    }
    console.log("signup");
    const { email, password, first_name, last_name } = signupSchema.parse(
      req.body
    );

    const existing = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (existing) {
      res.status(409).json({ error: "User already exists" });
      return;
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await prisma.user.create({
      data: {
        email,
        first_name,
        last_name,
        full_name: `${first_name} ${last_name}`,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
        refreshTokens: true,
      },
    });

    res.status(201).json({ user });
  });
}
export default AuthController;
