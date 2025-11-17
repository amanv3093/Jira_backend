import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ZodError } from "zod";

// Extend Express Request interface to include user property

const prisma = new PrismaClient();
class MemberController {
  //****************************************  Invite Create  *****************************************/
  public Invite = expressAsyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user;
      const { workspaceId, projectId, invites } = req.body;

      if (!user) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      if (!workspaceId && !projectId) {
        res.status(400).json({ error: "workspaceId or projectId is required" });
        return;
      }

      if (!Array.isArray(invites) || invites.length === 0) {
        res.status(400).json({ error: "Invites list is required" });
        return;
      }

      const workspaceAuth = await prisma.workspace.findFirst({
        where: {
          id: workspaceId!,
          members: {
            some: { userId: user.id, role: { in: ["OWNER"] } },
          },
        },
      });

      if (!workspaceAuth) {
        res.status(403).json({ error: "Not authorized to invite users" });
        return;
      }

      const createdInvites = [];

      for (const invite of invites) {
        const token = require("crypto").randomBytes(32).toString("hex");

        const newInvite = await prisma.invite.create({
          data: {
            workspaceId: workspaceId || null,
            projectId: projectId || null,
            createdById: user.id,
            email: invite.email,
            role: invite.role.toUpperCase(),
            token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        createdInvites.push({
          email: invite.email,
          inviteUrl: `${process.env.FRONTEND_URL}/join/${token}`,
        });
      }

      res.status(201).json({
        message: "Invites created successfully",
        data: createdInvites,
      });
    } catch (err) {
      console.error("Invite Error:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  //****************************************  Invite Join  *****************************************/
  public join = expressAsyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user;
      const { token } = req.body;

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
          projectId: invite.projectId,
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
          projectId: invite.projectId,
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

  public verifyInvite = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const { token } = req.params;

        if (!token) {
          res.status(400).json({ error: "Token is required" });
          return;
        }

        const invite = await prisma.invite.findUnique({
          where: { token },
          include: {
            workspace: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
          },
        });

        if (!invite) {
          res.status(404).json({ error: "Invalid invite token" });
          return;
        }

        if (invite.expiresAt && invite.expiresAt < new Date()) {
          // Option 1: Delete expired invite
          await prisma.invite.delete({ where: { token } });

          // Option 2 (optional): mark it expired instead
          // await prisma.invite.update({ where: { token }, data: { status: "EXPIRED" } });

          res.status(400).json({ error: "Invite link has expired" });
          return;
        }

        res.status(200).json({
          message: "Invite verified successfully",
          data: {
            workspace: invite.workspace,
            project: invite.project,
            // invitedBy: invite.invitedBy,
          },
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );

  //****************************************  Get Member By WorkspaceId  *****************************************/
  public getMemberByWorkspaceId = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const user = req.user;

        if (!req.params.id) {
          res.status(404).json({ error: "Workspace ID not found" });
          return;
        }

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }

        const workspaceId = req.params.id;

        const members = await prisma.member.findMany({
          where: {
            workspaceId,
          },
          include: {
            user: {
              select: {
                id: true,
                full_name: true,
                email: true,
                avatarUrl: true,
              },
            },
            assignments: {
              include: {
                task: {
                  include: {
                    project: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                    createdBy: {
                      select: {
                        id: true,
                        full_name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // Add task counts for each member
        const enrichedMembers = members.map((member) => {
          const tasks = member.assignments.map((a) => a.task);

          const totalTasks = tasks.length;

          const completedTasks = tasks.filter(
            (t) => t.status === "DONE"
          ).length;

          const overdueTasks = tasks.filter(
            (t) =>
              t.dueDate &&
              new Date(t.dueDate) < new Date() &&
              t.status !== "DONE"
          ).length;

          return {
            ...member,
            stats: {
              totalTasks,
              completedTasks,
              overdueTasks,
            },
          };
        });

        res.status(200).json({
          data: enrichedMembers,
          message: "Members with assigned tasks and stats fetched successfully",
        });
      } catch (err) {
        console.error("❌ Error fetching members:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    }
  );
}
export default MemberController;
