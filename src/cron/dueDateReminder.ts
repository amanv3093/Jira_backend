import cron from "node-cron";
import { PrismaClient } from "@prisma/client";
import { sendEmail } from "../utils/sendEmail";
import { dueDateReminderEmail } from "../utils/emailTemplates";

const prisma = new PrismaClient();

export function startDueDateReminderCron() {
  // Run every day at 9:00 AM
  cron.schedule("0 9 * * *", async () => {
    console.log("⏰ Running due date reminder cron job...");

    try {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(23, 59, 59, 999);

      // Find tasks that are:
      // 1. Due within the next 24 hours (due soon)
      // 2. Already overdue (past due date, not done)
      const tasks = await prisma.task.findMany({
        where: {
          status: { not: "DONE" },
          dueDate: { not: null, lte: tomorrow },
        },
        include: {
          project: { include: { workspace: true } },
          assignments: {
            include: {
              member: { include: { user: true } },
            },
          },
        },
      });

      let emailsSent = 0;

      for (const task of tasks) {
        if (!task.dueDate || !task.project) continue;

        const isOverdue = task.dueDate < now;
        const taskUrl = `${process.env.FRONTEND_URL}/workspace/${task.project.workspaceId}/task`;

        for (const assignment of task.assignments) {
          const user = assignment.member?.user;
          if (!user?.email) continue;

          try {
            await sendEmail({
              to: user.email,
              subject: isOverdue
                ? `⚠ Overdue: ${task.task_name}`
                : `⏰ Due soon: ${task.task_name}`,
              html: dueDateReminderEmail(
                user.first_name || user.full_name,
                task.task_name,
                task.project.name,
                task.dueDate.toISOString(),
                isOverdue,
                taskUrl
              ),
            });
            emailsSent++;
          } catch (err) {
            console.error(
              `Failed to send due date email to ${user.email}:`,
              err
            );
          }
        }
      }

      console.log(
        `✅ Due date reminder cron complete. ${emailsSent} emails sent for ${tasks.length} tasks.`
      );
    } catch (err) {
      console.error("❌ Due date reminder cron error:", err);
    }
  });

  console.log("📅 Due date reminder cron job scheduled (daily at 9:00 AM)");
}
