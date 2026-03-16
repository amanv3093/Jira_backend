import expressAsyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import { uploadFile } from "../lib/cloudinary";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

const prisma = new PrismaClient();

class UserController {
  //****************************************  Get Profile  *****************************************/
  public getProfile = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const user = req.user;

      if (!user) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      const profile = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          full_name: true,
          role: true,
          avatarUrl: true,
          isEmailVerified: true,
          createdAt: true,
        },
      });

      if (!profile) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      res.status(200).json({
        data: profile,
        message: "Profile fetched successfully",
      });
    }
  );

  //****************************************  Update Profile  *****************************************/
  public updateProfile = expressAsyncHandler(
    async (req: MulterRequest, res: Response) => {
      const user = req.user;

      if (!user) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      const { first_name, last_name } = req.body;

      const updateData: any = {};

      if (first_name && first_name.trim()) {
        updateData.first_name = first_name.trim();
      }
      if (last_name && last_name.trim()) {
        updateData.last_name = last_name.trim();
      }

      // Update full_name if either name part changed
      if (updateData.first_name || updateData.last_name) {
        updateData.full_name = `${updateData.first_name || user.first_name} ${updateData.last_name || user.last_name}`;
      }

      // Handle avatar upload
      if (req.file) {
        try {
          const imageUrl = await uploadFile(req.file);
          updateData.avatarUrl = imageUrl;
        } catch (err) {
          console.error("Avatar upload error:", err);
          res.status(500).json({ error: "Failed to upload avatar" });
          return;
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
        select: {
          id: true,
          email: true,
          first_name: true,
          last_name: true,
          full_name: true,
          role: true,
          avatarUrl: true,
          isEmailVerified: true,
          createdAt: true,
        },
      });

      res.status(200).json({
        data: updatedUser,
        message: "Profile updated successfully",
      });
    }
  );

  //****************************************  Change Password  *****************************************/
  public changePassword = expressAsyncHandler(
    async (req: Request, res: Response) => {
      const user = req.user;

      if (!user) {
        res.status(401).json({ error: "User not authenticated" });
        return;
      }

      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res
          .status(400)
          .json({ error: "Current password and new password are required" });
        return;
      }

      if (newPassword.length < 6) {
        res
          .status(400)
          .json({ error: "New password must be at least 6 characters" });
        return;
      }

      // Verify current password
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!dbUser || !dbUser.passwordHash) {
        res.status(400).json({
          error: "Password change not available for this account",
        });
        return;
      }

      const isValid = await bcrypt.compare(
        currentPassword,
        dbUser.passwordHash
      );
      if (!isValid) {
        res.status(401).json({ error: "Current password is incorrect" });
        return;
      }

      const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10);
      const newHash = await bcrypt.hash(newPassword, saltRounds);

      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: newHash },
      });

      res
        .status(200)
        .json({ message: "Password changed successfully" });
    }
  );
}

export default UserController;
