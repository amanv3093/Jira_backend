import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { prisma } from "../lib/prisma";
import { signAccessToken, signRefreshToken } from "../lib/jwt";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { loginSchema, signupSchema } from "../lib/validation";
import { sendResponse } from "../utils/api-response";
import { sendEmail } from "../utils/sendEmail";
import { welcomeEmail, passwordResetEmail } from "../utils/emailTemplates";

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

    // Send welcome email (non-blocking)
    const loginUrl = `${process.env.CLIENT_URL}/sign-in`;
    sendEmail({
      to: user.email,
      subject: "Welcome to TaskFlow!",
      html: welcomeEmail(first_name, loginUrl),
    }).catch((err) => console.error("Welcome email failed:", err));

    res.status(201).json({ user });
  });
  //****************************************  Forgot Password  *****************************************/
  public forgotPassword = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      // Don't reveal if user exists or not
      res.status(200).json({
        success: true,
        message: "If an account exists with this email, a reset link has been sent.",
      });
      return;
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiresAt },
    });

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    await sendEmail({
      to: email,
      subject: "Reset your password - TaskFlow",
      html: passwordResetEmail(user.first_name, resetUrl),
    });

    res.status(200).json({
      success: true,
      message: "If an account exists with this email, a reset link has been sent.",
    });
  });

  //****************************************  Reset Password  *****************************************/
  public resetPassword = asyncHandler(async (req: Request, res: Response) => {
    const { token, password, email } = req.body;

    if (!token || !password || !email) {
      res.status(400).json({ error: "Token, password, and email are required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || user.resetToken !== token) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      res.status(400).json({ error: "Reset token has expired" });
      return;
    }

    const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetToken: null,
        resetTokenExpiresAt: null,
      },
    });

    res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  });

  //****************************************  Google Auth  *****************************************/
  public googleAuth = asyncHandler(async (req: Request, res: Response) => {
    const { email, first_name, last_name, avatarUrl } = req.body;

    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          first_name: first_name || email.split("@")[0],
          last_name: last_name || "",
          full_name: `${first_name || email.split("@")[0]} ${last_name || ""}`.trim(),
          passwordHash: "",
          avatarUrl: avatarUrl || null,
          isEmailVerified: true,
        },
      });

      // Send welcome email for new Google users (non-blocking)
      const loginUrl = `${process.env.CLIENT_URL}/sign-in`;
      sendEmail({
        to: user.email,
        subject: "Welcome to TaskFlow!",
        html: welcomeEmail(user.first_name, loginUrl),
      }).catch((err) => console.error("Welcome email failed:", err));
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
}
export default AuthController;
