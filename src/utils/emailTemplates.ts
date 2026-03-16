// ─── Base layout wrapper for all emails ───

function baseLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#2563eb 0%,#4f46e5 100%);padding:28px 32px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">TaskFlow</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px;border-top:1px solid #e4e4e7;background-color:#fafafa;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;text-align:center;">
                &copy; ${new Date().getFullYear()} TaskFlow. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(text: string, href: string, color = "#2563eb"): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr>
        <td style="border-radius:8px;background-color:${color};">
          <a href="${href}" target="_blank"
            style="display:inline-block;padding:12px 28px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>`;
}

function infoBadge(label: string, value: string, color = "#2563eb"): string {
  return `
    <td style="padding:8px 16px;background-color:#f4f4f5;border-radius:8px;border-left:3px solid ${color};">
      <p style="margin:0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#71717a;font-weight:600;">${label}</p>
      <p style="margin:2px 0 0;font-size:14px;font-weight:600;color:#18181b;">${value}</p>
    </td>`;
}

// ─── Email Templates ───

export function welcomeEmail(name: string, loginUrl: string): string {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Welcome to TaskFlow!</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.6;">
      Hi ${name}, your account has been created successfully. You're all set to start managing your projects and collaborating with your team.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:#f0f9ff;border-radius:10px;padding:20px;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#18181b;">Here's what you can do:</p>
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;font-size:14px;color:#52525b;">&#10003;&nbsp; Create workspaces and projects</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#52525b;">&#10003;&nbsp; Assign and track tasks</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#52525b;">&#10003;&nbsp; Collaborate with your team</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#52525b;">&#10003;&nbsp; Monitor progress with dashboards</td></tr>
          </table>
        </td>
      </tr>
    </table>

    ${button("Get Started", loginUrl)}

    <p style="margin:0;font-size:13px;color:#a1a1aa;">
      If you didn't create this account, please ignore this email.
    </p>
  `);
}

export function taskAssignedEmail(
  assigneeName: string,
  taskName: string,
  projectName: string,
  priority: string,
  dueDate: string | null,
  assignedByName: string,
  taskUrl: string
): string {
  const priorityColors: Record<string, string> = {
    CRITICAL: "#dc2626",
    HIGH: "#ea580c",
    MEDIUM: "#ca8a04",
    LOW: "#16a34a",
  };
  const pColor = priorityColors[priority] || "#ca8a04";
  const formattedDue = dueDate
    ? new Date(dueDate).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "No due date";

  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">New Task Assigned</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.6;">
      Hi ${assigneeName}, <strong>${assignedByName}</strong> has assigned you a new task.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#18181b;">${taskName}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="8">
            <tr>
              ${infoBadge("Project", projectName)}
              ${infoBadge("Priority", priority, pColor)}
            </tr>
            <tr>
              ${infoBadge("Due Date", formattedDue, dueDate ? "#2563eb" : "#a1a1aa")}
              ${infoBadge("Assigned By", assignedByName)}
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${button("View Task", taskUrl)}
  `);
}

export function dueDateReminderEmail(
  userName: string,
  taskName: string,
  projectName: string,
  dueDate: string,
  isOverdue: boolean,
  taskUrl: string
): string {
  const formattedDue = new Date(dueDate).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const headerText = isOverdue ? "Task Overdue" : "Task Due Soon";
  const headerColor = isOverdue ? "#dc2626" : "#ca8a04";
  const description = isOverdue
    ? `The following task is <strong style="color:#dc2626;">overdue</strong> and needs your attention.`
    : `The following task is <strong style="color:#ca8a04;">due soon</strong>. Please make sure to complete it on time.`;

  return baseLayout(`
    <div style="padding:10px 16px;background-color:${isOverdue ? "#fef2f2" : "#fffbeb"};border-radius:8px;border-left:4px solid ${headerColor};margin-bottom:20px;">
      <p style="margin:0;font-size:14px;font-weight:600;color:${headerColor};">
        ${isOverdue ? "&#9888;" : "&#9200;"} ${headerText}
      </p>
    </div>

    <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.6;">
      Hi ${userName}, ${description}
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border:1px solid #e4e4e7;border-radius:10px;overflow:hidden;">
      <tr>
        <td style="padding:20px;">
          <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#18181b;">${taskName}</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="8">
            <tr>
              ${infoBadge("Project", projectName)}
              ${infoBadge("Due Date", formattedDue, headerColor)}
            </tr>
          </table>
        </td>
      </tr>
    </table>

    ${button("View Task", taskUrl, isOverdue ? "#dc2626" : "#ca8a04")}
  `);
}

export function passwordResetEmail(
  name: string,
  resetUrl: string
): string {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">Reset Your Password</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.6;">
      Hi ${name}, we received a request to reset your password. Click the button below to set a new one.
    </p>

    ${button("Reset Password", resetUrl)}

    <p style="margin:0;font-size:13px;color:#a1a1aa;">
      This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
    </p>
  `);
}

export function workspaceInviteEmail(
  role: string,
  inviteUrl: string,
  workspaceName?: string
): string {
  const wsText = workspaceName
    ? `the <strong>${workspaceName}</strong> workspace`
    : "a workspace";

  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#18181b;">You're Invited!</h1>
    <p style="margin:0 0 20px;font-size:15px;color:#52525b;line-height:1.6;">
      You've been invited to join ${wsText} as a <strong>${role}</strong>. Click below to accept and start collaborating.
    </p>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background-color:#f0f9ff;border-radius:10px;">
      <tr>
        <td style="padding:20px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;font-size:14px;color:#52525b;">&#128101;&nbsp; Collaborate with the team</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#52525b;">&#128203;&nbsp; Track and manage tasks</td></tr>
            <tr><td style="padding:4px 0;font-size:14px;color:#52525b;">&#128640;&nbsp; Ship projects faster</td></tr>
          </table>
        </td>
      </tr>
    </table>

    ${button("Accept Invite", inviteUrl, "#7c3aed")}

    <p style="margin:0;font-size:13px;color:#a1a1aa;">
      This link will expire in 7 days.
    </p>
  `);
}
