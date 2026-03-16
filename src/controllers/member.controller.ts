import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { ZodError } from "zod";
import { sendEmail } from "../utils/sendEmail";
import { workspaceInviteEmail } from "../utils/emailTemplates";

// Extend Express Request interface to include user property

const prisma = new PrismaClient();
class MemberController {
  //****************************************  Invite Create  *****************************************/
  public Invite = expressAsyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user;
      const { workspaceId, invites } = req.body;

      if (!user) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      if (!workspaceId) {
        res.status(400).json({ error: "workspaceId is required" });
        return;
      }

      if (!Array.isArray(invites) || invites.length === 0) {
        res.status(400).json({ error: "Invites list is required" });
        return;
      }

      // Only ADMIN, MANAGER, or workspace OWNER can invite
      const isOwner = await prisma.member.findFirst({
        where: { userId: user.id, workspaceId, role: "OWNER" },
      });

      const hasAdminOrManagerRole =
        user.role === "ADMIN" || user.role === "MANAGER";

      if (!isOwner && !hasAdminOrManagerRole) {
        res
          .status(403)
          .json({
            error: "Only admin, manager, or workspace owner can invite users",
          });
        return;
      }

      // Check member limit before inviting
      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { name: true, plan: true, maxMembers: true },
      });

      if (!workspace) {
        res.status(404).json({ error: "Workspace not found" });
        return;
      }

      const allMembers = await prisma.member.findMany({
        where: { workspaceId },
        select: { userId: true },
      });
      const currentMemberCount = new Set(allMembers.map((m) => m.userId)).size;

      if (currentMemberCount + invites.length > (workspace.maxMembers ?? 10)) {
        res.status(403).json({
          error: `Member limit reached. Your ${workspace.plan === "PRO" ? "Pro" : "Free"} plan allows ${workspace.maxMembers} members. Upgrade to add more.`,
          code: "MEMBER_LIMIT_REACHED",
          currentMembers: currentMemberCount,
          maxMembers: workspace.maxMembers,
        });
        return;
      }

      const createdInvites = [];
      const skippedInvites = [];

      for (const invite of invites) {
        // Check if user is already a workspace member
        const existingUser = await prisma.user.findUnique({
          where: { email: invite.email },
        });

        if (existingUser) {
          const existingMember = await prisma.member.findFirst({
            where: { userId: existingUser.id, workspaceId },
          });

          if (existingMember) {
            skippedInvites.push({
              email: invite.email,
              reason: "Already a member",
            });
            continue;
          }
        }

        // Check if there’s already a pending invite
        const existingInvite = await prisma.invite.findFirst({
          where: {
            email: invite.email,
            workspaceId,
            expiresAt: { gt: new Date() },
          },
        });

        if (existingInvite) {
          skippedInvites.push({
            email: invite.email,
            reason: "Invite already pending",
          });
          continue;
        }

        const token = require("crypto").randomBytes(32).toString("hex");

        const newInvite = await prisma.invite.create({
          data: {
            workspaceId,
            createdById: user.id,
            email: invite.email,
            role: "CONTRIBUTOR",
            token,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        });

        const inviteUrl = `${process.env.FRONTEND_URL}/join/${token}`;
        await sendEmail({
          to: invite.email,
          subject: `You’ve been invited to join ${workspace.name} on TaskFlow`,
          html: workspaceInviteEmail(invite.role, inviteUrl, workspace.name),
        });

        createdInvites.push({
          email: invite.email,
          inviteUrl: `${process.env.FRONTEND_URL}/join/${token}`,
        });
      }

      res.status(201).json({
        message: "Invites created successfully",
        data: createdInvites,
        skipped: skippedInvites,
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

      if (!invite.workspaceId) {
        res
          .status(400)
          .json({ error: "Invalid invite: no workspace associated" });
        return;
      }

      const existingMember = await prisma.member.findFirst({
        where: { userId: user.id, workspaceId: invite.workspaceId },
      });

      if (existingMember) {
        await prisma.invite.delete({ where: { token } });
        res.status(200).json({
          message: "Already a member of this workspace",
        });
        return;
      }

      // Check member limit before joining
      const workspace = await prisma.workspace.findUnique({
        where: { id: invite.workspaceId },
        select: { plan: true, maxMembers: true },
      });

      const allWsMembers = await prisma.member.findMany({
        where: { workspaceId: invite.workspaceId },
        select: { userId: true },
      });
      const currentMemberCount = new Set(allWsMembers.map((m) => m.userId)).size;

      if (workspace && currentMemberCount >= (workspace.maxMembers ?? 10)) {
        res.status(403).json({
          error: "This workspace has reached its member limit. The workspace owner needs to upgrade the plan.",
          code: "MEMBER_LIMIT_REACHED",
        });
        return;
      }

      // Create workspace-level member
      await prisma.member.create({
        data: {
          userId: user.id,
          workspaceId: invite.workspaceId,
          role: "CONTRIBUTOR",
        },
      });

      // Add user to all existing projects in the workspace
      const projects = await prisma.project.findMany({
        where: { workspaceId: invite.workspaceId },
        select: { id: true },
      });

      if (projects.length > 0) {
        await prisma.member.createMany({
          data: projects.map((project) => ({
            userId: user.id,
            workspaceId: invite.workspaceId,
            projectId: project.id,
            role: "CONTRIBUTOR",
          })),
        });
      }

      // Delete invite after use
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
          },
        });

        if (!invite) {
          res.status(404).json({ error: "Invalid invite token" });
          return;
        }

        if (invite.expiresAt && invite.expiresAt < new Date()) {
          await prisma.invite.delete({ where: { token } });
          res.status(400).json({ error: "Invite link has expired" });
          return;
        }

        res.status(200).json({
          message: "Invite verified successfully",
          data: {
            workspace: invite.workspace,
          },
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  //****************************************  Remove Member  *****************************************/
  public removeMember = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const memberId = req.params.memberId;
        const workspaceId = req.params.workspaceId;

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }

        // Verify requester is OWNER of the workspace OR has ADMIN/MANAGER user role
        const isOwner = await prisma.member.findFirst({
          where: { userId: user.id, workspaceId, role: "OWNER" },
        });

        const hasAdminOrManagerRole =
          user.role === "ADMIN" || user.role === "MANAGER";

        if (!isOwner && !hasAdminOrManagerRole) {
          res
            .status(403)
            .json({
              error:
                "Only admin, manager, or workspace owner can remove members",
            });
          return;
        }

        const member = await prisma.member.findUnique({
          where: { id: memberId },
        });

        if (!member) {
          res.status(404).json({ error: "Member not found" });
          return;
        }

        // Cannot remove yourself as owner
        if (member.userId === user.id) {
          res
            .status(400)
            .json({ error: "Cannot remove yourself as workspace owner" });
          return;
        }

        // Delete task assignments for this member
        await prisma.taskAssignment.deleteMany({
          where: { memberId },
        });

        // Delete the member
        await prisma.member.delete({ where: { id: memberId } });

        res.status(200).json({ message: "Member removed successfully" });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  //****************************************  Update Member Role  *****************************************/
  public updateMemberRole = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const memberId = req.params.memberId;
        const workspaceId = req.params.workspaceId;
        const { role } = req.body;

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }

        if (!["OWNER", "CONTRIBUTOR", "VIEWER"].includes(role)) {
          res.status(400).json({ error: "Invalid role" });
          return;
        }

        // Verify requester is OWNER
        const isOwner = await prisma.member.findFirst({
          where: { userId: user.id, workspaceId, role: "OWNER" },
        });

        if (!isOwner) {
          res
            .status(403)
            .json({ error: "Only workspace owner can update roles" });
          return;
        }

        const member = await prisma.member.findUnique({
          where: { id: memberId },
        });

        if (!member) {
          res.status(404).json({ error: "Member not found" });
          return;
        }

        if (member.userId === user.id) {
          res.status(400).json({ error: "Cannot change your own role" });
          return;
        }

        const updated = await prisma.member.update({
          where: { id: memberId },
          data: { role },
          include: {
            user: { select: { id: true, full_name: true, email: true } },
          },
        });

        res.status(200).json({
          data: updated,
          message: "Member role updated successfully",
        });
      } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );

  //****************************************  Get Member By WorkspaceId  *****************************************/
  public getMemberByWorkspaceId = expressAsyncHandler(
    async (req: Request, res: Response) => {
      try {
        const user = req.user;
        const workspaceId = req.params.id;
        console.log("workspaceId", workspaceId);

        if (!workspaceId) {
          res.status(404).json({ error: "Workspace ID not found" });
          return;
        }

        if (!user) {
          res.status(401).json({ error: "User not authenticated" });
          return;
        }

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
                    // ⭐ IMPORTANT: make project NULL-safe
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
            // ⭐ OPTIONAL: allow NULL safely if you decide to show workspace role
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        // Deduplicate: keep only the first member record per user
        const seen = new Set<string>();
        const uniqueMembers = members.filter((member) => {
          if (seen.has(member.userId)) return false;
          seen.add(member.userId);
          return true;
        });

        res.status(200).json({
          data: uniqueMembers,
          message: "Members with assigned tasks and stats fetched successfully",
        });
      } catch (err) {
        console.error("❌ Error fetching members:", err);
        res.status(500).json({ error: "Internal server error" });
      }
    },
  );
}
export default MemberController;
