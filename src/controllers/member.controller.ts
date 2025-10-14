import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { PrismaClient, User } from "@prisma/client";
import { ZodError } from "zod";

// Extend Express Request interface to include user property

const prisma = new PrismaClient();
class MemberController {
  //****************************************  Invite Create  *****************************************/
  public Invite = expressAsyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user;
      const { workspaceId, projectId } = req.params;

      if (!user) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      if (!workspaceId && !projectId) {
        res.status(400).json({ error: "workspaceId or projectId is required" });
        return;
      }

      const isAuthorizedMember = async () => {
        if (workspaceId) {
          const workspace = await prisma.workspace.findUnique({
            where: { id: workspaceId },
            include: { members: true },
          });

          if (!workspace) return false;

          const member = workspace.members.find((m) => m.userId === user.id);
          return (
            workspace.ownerId === user.id ||
            (member && ["ADMIN", "MANAGER"].includes(member.role))
          );
        }

        if (projectId) {
          const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { members: true },
          });

          if (!project) return false;

          const member = project.members.find((m) => m.userId === user.id);
          return member && ["ADMIN", "MANAGER"].includes(member.role);
        }

        return false;
      };

      const authorized = await isAuthorizedMember();
      if (!authorized) {
        res.status(403).json({ error: "Not authorized to create invites" });
        return;
      }

      const token = require("crypto").randomBytes(32).toString("hex");

      const invite = await prisma.invite.create({
        data: {
          workspaceId: workspaceId || null,
          projectId: projectId || null,
          createdById: user.id,
          token,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      const inviteUrl = `${process.env.FRONTEND_URL}/join/${token}`;

      res.status(201).json({
        data: { inviteUrl, token },
        message: "Invite created successfully",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  //****************************************  Invite Join  *****************************************/
  public join = expressAsyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user;
      const { token } = req.params;

      if (!user) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      const invite = await prisma.invite.findUnique({
        where: { token },
      });

      if (!invite) {
        res.status(404).json({ error: "Invalid invite token" });
        return;
      }

      if (invite.expiresAt < new Date()) {
        await prisma.invite.delete({ where: { token } });
        res.status(400).json({ error: "Invite link expired" });
        return;
      }

      const existingMember = await prisma.member.findFirst({
        where: {
          workspaceId: invite.workspaceId,
          userId: user.id,
        },
      });

      if (existingMember) {
        res.status(200).json({
          message: "Already a member of this workspace",
        });
        return;
      }

      await prisma.member.create({
        data: {
          userId: user.id,
          workspaceId: invite.workspaceId,
          role: "CONTRIBUTOR",
        },
      });

      // Optionally delete invite after use
      await prisma.invite.delete({ where: { token } });

      res.status(200).json({
        message: "Successfully joined the workspace",
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
}
export default MemberController;
