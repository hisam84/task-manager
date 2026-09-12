import nodemailer from "nodemailer";

const smtpHost = process.env.SMTP_HOST || "smtp-relay.brevo.com";
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const defaultSenderEmail =
  smtpUser && smtpUser.includes("@") && !smtpUser.includes("smtp-brevo")
    ? smtpUser
    : "taskmanager360.noreplay@gmail.com";
const defaultSender = `"Task Manager" <${defaultSenderEmail}>`;
const smtpFrom = process.env.SMTP_FROM || defaultSender;

export function getMailTransporter() {
  if (!smtpUser || !smtpPass) {
    console.warn("SMTP credentials not set. Emails will not be sent.");
    return null;
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
}

export async function sendPasswordResetEmail({
  to,
  name,
  resetUrl,
}: {
  to: string;
  name: string;
  resetUrl: string;
}) {
  const transporter = getMailTransporter();
  if (!transporter) {
    throw new Error("Email service is not configured on the server.");
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 500px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td style="padding: 24px 28px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="display: inline-block; width: 28px; height: 28px; line-height: 28px; background-color: #2563eb; border-radius: 6px; text-align: center; color: #ffffff; font-weight: bold; font-size: 13px; margin-right: 8px; vertical-align: middle;">
                            TM
                          </div>
                          <span style="font-size: 16px; font-weight: 700; color: #0f172a; vertical-align: middle; letter-spacing: -0.2px;">
                            Task Manager
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 28px;">
                    <h2 style="margin: 0 0 14px 0; font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                      Reset Your Password
                    </h2>
                    <p style="margin: 0 0 14px 0; font-size: 14px; line-height: 22px; color: #334155;">
                      Hello <strong>${name}</strong>,
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #475569;">
                      We received a request to reset the password for your account. Click the button below to choose a new password:
                    </p>

                    <!-- Action Button -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; letter-spacing: 0.2px;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 20px 0 6px 0; font-size: 12px; color: #64748b;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="margin: 0 0 20px 0; font-size: 12px; line-height: 18px; word-break: break-all;">
                      <a href="${resetUrl}" style="color: #2563eb; text-decoration: underline;">${resetUrl}</a>
                    </p>

                    <div style="padding-top: 16px; border-top: 1px solid #f1f5f9;">
                      <p style="margin: 0; font-size: 12px; line-height: 18px; color: #64748b;">
                        This password reset link will expire in <strong>60 minutes</strong>. If you did not request this, you can safely ignore this email.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      &copy; ${new Date().getFullYear()} Task Manager. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return await transporter.sendMail({
    from: smtpFrom,
    to,
    subject: "Reset your Task Manager password",
    text: `Hello ${name},\n\nYou requested a password reset for your Task Manager account.\nPlease visit the link below to set a new password:\n\n${resetUrl}\n\nThis link will expire in 60 minutes.\nIf you did not request this, please ignore this email.`,
    html,
  });
}

export async function sendPasswordResetOtpEmail({
  to,
  name,
  otp,
}: {
  to: string;
  name: string;
  otp: string;
}) {
  const transporter = getMailTransporter();
  if (!transporter) {
    throw new Error("Email service is not configured on the server.");
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td style="padding: 24px 28px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="display: inline-block; width: 28px; height: 28px; line-height: 28px; background-color: #2563eb; border-radius: 6px; text-align: center; color: #ffffff; font-weight: bold; font-size: 13px; margin-right: 8px; vertical-align: middle;">
                            TM
                          </div>
                          <span style="font-size: 16px; font-weight: 700; color: #0f172a; vertical-align: middle; letter-spacing: -0.2px;">
                            Task Manager
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 28px; text-align: center;">
                    <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                      Verification Code
                    </h2>
                    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #475569;">
                      Hello <strong>${name}</strong>,<br>
                      Use the 6-digit code below to reset your Task Manager password:
                    </p>

                    <!-- OTP Code Box -->
                    <div style="margin: 20px auto; display: inline-block; background-color: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 10px; padding: 14px 28px;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #0f172a; text-indent: 8px; display: block;">
                        ${otp}
                      </span>
                    </div>

                    <p style="margin: 14px 0 0 0; font-size: 13px; color: #64748b;">
                      This code will expire in <strong>10 minutes</strong>.
                    </p>

                    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: left;">
                      <p style="margin: 0; font-size: 12px; line-height: 18px; color: #64748b;">
                        Never share this code with anyone. If you did not request a password reset, you can safely ignore this email.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      &copy; ${new Date().getFullYear()} Task Manager. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  return await transporter.sendMail({
    from: smtpFrom,
    to,
    subject: `Your Password Reset Code: ${otp}`,
    text: `Hello ${name},\n\nYour 6-digit Password Reset code is: ${otp}\n\nThis code will expire in 10 minutes.\nIf you did not request this code, please ignore this message.`,
    html,
  });
}

export async function sendTaskCreatedEmail({
  to,
  assigneeName,
  taskTitle,
  taskDescription,
  priority,
  status,
  dueDate,
  creatorName,
  companyName,
  taskUrl,
}: {
  to: string;
  assigneeName: string;
  taskTitle: string;
  taskDescription?: string | null;
  priority: string;
  status: string;
  dueDate?: Date | string | null;
  creatorName: string;
  companyName?: string | null;
  taskUrl?: string;
}) {
  const transporter = getMailTransporter();
  if (!transporter) {
    console.warn("SMTP credentials not set. Task notification email skipped.");
    return null;
  }

  // Light mode badges
  const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
    URGENT: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
    HIGH: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
    MEDIUM: { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
    LOW: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  };

  const priorityStyle = priorityColors[priority] || priorityColors.MEDIUM;

  let formattedDueDate = "No deadline specified";
  if (dueDate) {
    const d = new Date(dueDate);
    if (!isNaN(d.getTime())) {
      formattedDueDate = d.toLocaleDateString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }
  }

  const targetUrl =
    taskUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://taskmanager-iit.vercel.app/";

  const isSelfAssigned = creatorName.toLowerCase() === assigneeName.toLowerCase();

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Task Assigned</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td style="padding: 22px 28px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="display: inline-block; width: 28px; height: 28px; line-height: 28px; background-color: #4f46e5; border-radius: 6px; text-align: center; color: #ffffff; font-weight: bold; font-size: 13px; margin-right: 8px; vertical-align: middle;">
                            TM
                          </div>
                          <span style="font-size: 16px; font-weight: 700; color: #0f172a; vertical-align: middle; letter-spacing: -0.2px;">
                            ${companyName ? `${companyName} &bull; ` : ""}Task Manager
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 28px;">
                    <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                      ${isSelfAssigned ? "New Task Added" : "New Task Assigned"}
                    </h2>
                    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #475569;">
                      Hello <strong>${assigneeName}</strong>,<br>
                      ${
                        isSelfAssigned
                          ? "A new task has been added to your task list:"
                          : `<strong>${creatorName}</strong> assigned a new task to you:`
                      }
                    </p>

                    <!-- Task Detail Box -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px;">
                      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #0f172a; line-height: 22px;">
                        ${taskTitle}
                      </h3>

                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                        <tr>
                          <td style="padding: 5px 0; color: #64748b; width: 100px;">Priority:</td>
                          <td style="padding: 5px 0;">
                            <span style="display: inline-block; padding: 2px 8px; border-radius: 5px; font-size: 11px; font-weight: 600; background-color: ${priorityStyle.bg}; color: ${priorityStyle.text}; border: 1px solid ${priorityStyle.border};">
                              ${priority}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0; color: #64748b;">Status:</td>
                          <td style="padding: 5px 0; color: #334155; font-weight: 600;">
                            ${status}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0; color: #64748b;">Due Date:</td>
                          <td style="padding: 5px 0; color: #334155; font-weight: 500;">
                            ${formattedDueDate}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0; color: #64748b;">Assigned By:</td>
                          <td style="padding: 5px 0; color: #334155; font-weight: 500;">
                            ${creatorName}
                          </td>
                        </tr>
                      </table>

                      ${
                        taskDescription
                          ? `
                        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                          <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Description
                          </div>
                          <div style="font-size: 13px; line-height: 20px; color: #334155; white-space: pre-line;">
                            ${taskDescription}
                          </div>
                        </div>
                      `
                          : ""
                      }
                    </div>

                    <!-- CTA Button -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0 8px 0;">
                      <tr>
                        <td align="center">
                          <a href="${targetUrl}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                            View Task
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      &copy; ${new Date().getFullYear()} Task Manager. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const cleanTo = to.trim();
  console.log(`[Task Email] Sending notification to ${cleanTo} for task: "${taskTitle}"`);

  const info = await transporter.sendMail({
    from: smtpFrom,
    to: cleanTo,
    subject: `[Task] ${taskTitle} (${priority})`,
    text: `Hello ${assigneeName},\n\n${creatorName} assigned a new task to you:\n\nTask: ${taskTitle}\nPriority: ${priority}\nStatus: ${status}\nDue Date: ${formattedDueDate}\n\nView task: ${targetUrl}`,
    html,
  });

  console.log(`[Task Email] Notification sent successfully to ${cleanTo} (MessageId: ${info?.messageId})`);
  return info;
}

export async function sendTaskCompletedEmail({
  to,
  creatorName,
  assigneeName,
  taskTitle,
  taskDescription,
  priority,
  completedAt,
  completionNote,
  companyName,
  taskUrl,
}: {
  to: string;
  creatorName: string;
  assigneeName: string;
  taskTitle: string;
  taskDescription?: string | null;
  priority: string;
  completedAt?: Date | string | null;
  completionNote?: string | null;
  companyName?: string | null;
  taskUrl?: string;
}) {
  const transporter = getMailTransporter();
  if (!transporter) {
    console.warn("SMTP credentials not set. Task completed notification email skipped.");
    return null;
  }

  const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
    URGENT: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
    HIGH: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
    MEDIUM: { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
    LOW: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  };

  const priorityStyle = priorityColors[priority] || priorityColors.MEDIUM;

  let formattedDate = "Just now";
  if (completedAt) {
    const d = new Date(completedAt);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  }

  const targetUrl =
    taskUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://taskmanager-iit.vercel.app/";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Completed</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);">
                <!-- Header -->
                <tr>
                  <td style="padding: 22px 28px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="display: inline-block; width: 28px; height: 28px; line-height: 28px; background-color: #10b981; border-radius: 6px; text-align: center; color: #ffffff; font-weight: bold; font-size: 13px; margin-right: 8px; vertical-align: middle;">
                            ✓
                          </div>
                          <span style="font-size: 16px; font-weight: 700; color: #0f172a; vertical-align: middle; letter-spacing: -0.2px;">
                            ${companyName ? `${companyName} &bull; ` : ""}Task Manager
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 28px;">
                    <div style="display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; background-color: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; margin-bottom: 12px;">
                      ✓ Task Completed
                    </div>
                    <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                      Task Finished by ${assigneeName}
                    </h2>
                    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #475569;">
                      Hello <strong>${creatorName}</strong>,<br>
                      <strong>${assigneeName}</strong> has marked the task assigned by you as <strong>Completed</strong>.
                    </p>

                    <!-- Task Detail Box -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin-bottom: 20px;">
                      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #0f172a; line-height: 22px;">
                        ${taskTitle}
                      </h3>

                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                        <tr>
                          <td style="padding: 5px 0; color: #64748b; width: 110px;">Status:</td>
                          <td style="padding: 5px 0;">
                            <span style="display: inline-block; padding: 2px 8px; border-radius: 5px; font-size: 11px; font-weight: 600; background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0;">
                              DONE (Completed)
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0; color: #64748b;">Priority:</td>
                          <td style="padding: 5px 0;">
                            <span style="display: inline-block; padding: 2px 8px; border-radius: 5px; font-size: 11px; font-weight: 600; background-color: ${priorityStyle.bg}; color: ${priorityStyle.text}; border: 1px solid ${priorityStyle.border};">
                              ${priority}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0; color: #64748b;">Completed By:</td>
                          <td style="padding: 5px 0; color: #334155; font-weight: 600;">
                            ${assigneeName}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0; color: #64748b;">Completed At:</td>
                          <td style="padding: 5px 0; color: #334155; font-weight: 500;">
                            ${formattedDate}
                          </td>
                        </tr>
                      </table>

                      ${
                        taskDescription
                          ? `
                        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                          <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Task Description
                          </div>
                          <div style="font-size: 13px; line-height: 20px; color: #334155; white-space: pre-line;">
                            ${taskDescription}
                          </div>
                        </div>
                      `
                          : ""
                      }
                    </div>

                    ${
                      completionNote
                        ? `
                      <!-- Note from Employee -->
                      <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 14px 16px; margin-bottom: 22px;">
                        <div style="font-size: 11px; font-weight: 700; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                          Note from ${assigneeName}:
                        </div>
                        <div style="font-size: 13px; line-height: 20px; color: #1e3a8a; white-space: pre-line;">
                          ${completionNote}
                        </div>
                      </div>
                    `
                        : ""
                    }

                    <!-- CTA Button -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0 8px 0;">
                      <tr>
                        <td align="center">
                          <a href="${targetUrl}" target="_blank" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                            View Completed Task
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      &copy; ${new Date().getFullYear()} Task Manager. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const cleanTo = to.trim();
  console.log(`[Task Email] Sending completion notification to assigner ${cleanTo} for task: "${taskTitle}"`);

  const info = await transporter.sendMail({
    from: smtpFrom,
    to: cleanTo,
    subject: `[Completed] ${taskTitle} - Done by ${assigneeName}`,
    text: `Hello ${creatorName},\n\n${assigneeName} has completed the task: "${taskTitle}".\nPriority: ${priority}\nCompleted At: ${formattedDate}${completionNote ? `\n\nNote from ${assigneeName}:\n${completionNote}` : ""}\n\nView task: ${targetUrl}`,
    html,
  });

  console.log(`[Task Email] Completion notification sent successfully to ${cleanTo} (MessageId: ${info?.messageId})`);
  return info;
}

export async function sendTaskCancelledEmail({
  to,
  recipientName,
  cancellerName,
  taskTitle,
  taskDescription,
  priority,
  cancelledAt,
  cancelReason,
  companyName,
  taskUrl,
}: {
  to: string;
  recipientName: string;
  cancellerName: string;
  taskTitle: string;
  taskDescription?: string | null;
  priority: string;
  cancelledAt: Date;
  cancelReason?: string | null;
  companyName?: string | null;
  taskUrl?: string;
}) {
  const transporter = getMailTransporter();
  if (!transporter) {
    console.warn("SMTP credentials not set. Task cancellation email notification skipped.");
    return null;
  }

  const cleanTo = to.trim();
  if (!cleanTo) {
    console.warn("[Task Email] No recipient email address provided. Skipping task cancellation email.");
    return null;
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://taskmanager-iit.vercel.app/";
  const baseUrl = appUrl.endsWith("/") ? appUrl : `${appUrl}/`;
  const targetUrl = taskUrl || baseUrl;

  const formattedDate = cancelledAt.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const priorityColor =
    priority === "URGENT"
      ? "#ef4444"
      : priority === "HIGH"
      ? "#f59e0b"
      : priority === "MEDIUM"
      ? "#3b82f6"
      : "#64748b";

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Task Cancelled</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px 12px; color: #1e293b;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <table width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;" border="0" cellspacing="0" cellpadding="0">
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #e11d48, #be123c); padding: 28px 24px; text-align: center;">
                    <div style="font-size: 28px; line-height: 1; margin-bottom: 8px;">🚫</div>
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">Task Cancelled</h1>
                    <p style="color: #ffe4e6; margin: 6px 0 0 0; font-size: 13px;">${companyName ? `${companyName} &bull; ` : ""}Task Status Update</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 28px;">
                    <p style="font-size: 15px; line-height: 24px; margin: 0 0 16px 0; color: #334155;">
                      Hello <strong>${recipientName}</strong>,
                    </p>
                    <p style="font-size: 14px; line-height: 22px; margin: 0 0 20px 0; color: #475569;">
                      <strong>${cancellerName}</strong> has marked this task as cancelled:
                    </p>

                    <!-- Task Card -->
                    <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 10px; padding: 18px 20px; margin-bottom: 20px;">
                      <div style="font-size: 16px; font-weight: 700; color: #9f1239; margin-bottom: 6px; text-decoration: line-through;">
                        ${taskTitle}
                      </div>
                      ${
                        taskDescription
                          ? `<div style="font-size: 13px; line-height: 20px; color: #881337; margin-bottom: 12px; white-space: pre-line;">${taskDescription}</div>`
                          : ""
                      }
                      <table border="0" cellspacing="0" cellpadding="0" style="margin-top: 10px; font-size: 12px; color: #9f1239;">
                        <tr>
                          <td style="padding-right: 16px;">
                            <strong>Priority:</strong>
                            <span style="display: inline-block; background-color: ${priorityColor}; color: #ffffff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; margin-left: 4px;">${priority}</span>
                          </td>
                          <td>
                            <strong>Cancelled At:</strong> ${formattedDate}
                          </td>
                        </tr>
                      </table>
                    </div>

                    ${
                      cancelReason
                        ? `
                      <!-- Reason for Cancellation -->
                      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px 16px; margin-bottom: 22px;">
                        <div style="font-size: 11px; font-weight: 700; color: #b91c1c; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                          Cancellation Reason:
                        </div>
                        <div style="font-size: 13px; line-height: 20px; color: #7f1d1d; white-space: pre-line;">
                          ${cancelReason}
                        </div>
                      </div>
                    `
                        : ""
                    }

                    <!-- CTA Button -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0 8px 0;">
                      <tr>
                        <td align="center">
                          <a href="${targetUrl}" target="_blank" style="display: inline-block; background-color: #e11d48; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                            View Task
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      &copy; ${new Date().getFullYear()} Task Manager. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const info = await transporter.sendMail({
    from: smtpFrom,
    to: cleanTo,
    subject: `[Cancelled] ${taskTitle} - Cancelled by ${cancellerName}`,
    text: `Hello ${recipientName},\n\n${cancellerName} has cancelled the task: "${taskTitle}".\nPriority: ${priority}\nCancelled At: ${formattedDate}${cancelReason ? `\n\nReason:\n${cancelReason}` : ""}\n\nView task: ${targetUrl}`,
    html,
  });

  console.log(`[Task Email] Cancellation notification sent successfully to ${cleanTo} (MessageId: ${info?.messageId})`);
  return info;
}

export async function sendLeaveApplicationEmail({
  to,
  applicantName,
  applicantDesignation,
  applicantDepartment,
  companyName,
  startDate,
  endDate,
  daysCount,
  leaveType,
  reason,
  actionToken,
  appUrl,
}: {
  to: string | string[];
  applicantName: string;
  applicantDesignation?: string | null;
  applicantDepartment?: string | null;
  companyName: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  leaveType: string;
  reason: string;
  actionToken: string;
  appUrl?: string;
}) {
  const transporter = getMailTransporter();
  if (!transporter) {
    console.warn("SMTP credentials not set. Leave notification email skipped.");
    return null;
  }

  const cleanBaseUrl = (
    appUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://taskmanager-iit.vercel.app"
  ).replace(/\/+$/, "");

  const approveUrl = `${cleanBaseUrl}/api/leaves/action?token=${encodeURIComponent(actionToken)}&action=approve`;
  const rejectUrl = `${cleanBaseUrl}/api/leaves/action?token=${encodeURIComponent(actionToken)}&action=reject`;
  const portalUrl = `${cleanBaseUrl}/attendance`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Leave Application</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 540px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);">
                <!-- Header -->
                <tr>
                  <td style="padding: 22px 28px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="display: inline-block; width: 30px; height: 30px; line-height: 30px; background-color: #4f46e5; border-radius: 8px; text-align: center; color: #ffffff; font-weight: bold; font-size: 13px; margin-right: 10px; vertical-align: middle;">
                            TM
                          </div>
                          <span style="font-size: 16px; font-weight: 700; color: #0f172a; vertical-align: middle;">
                            ${companyName ? `${companyName} &bull; ` : ""}Task Manager
                          </span>
                        </td>
                        <td align="right">
                          <span style="display: inline-block; padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; background-color: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe;">
                            LEAVE REQUEST
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 28px;">
                    <h2 style="margin: 0 0 10px 0; font-size: 19px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                      Leave Application Submitted
                    </h2>
                    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #475569;">
                      <strong>${applicantName}</strong> has submitted a leave application requiring your review and decision.
                    </p>

                    <!-- Details Card -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                        <tr>
                          <td style="padding: 6px 0; color: #64748b; width: 120px;">Applicant:</td>
                          <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">
                            ${applicantName} ${applicantDesignation ? `(${applicantDesignation})` : ""}
                          </td>
                        </tr>
                        ${
                          applicantDepartment
                            ? `
                        <tr>
                          <td style="padding: 6px 0; color: #64748b;">Department:</td>
                          <td style="padding: 6px 0; color: #334155; font-weight: 500;">
                            ${applicantDepartment}
                          </td>
                        </tr>
                        `
                            : ""
                        }
                        <tr>
                          <td style="padding: 6px 0; color: #64748b;">Leave Period:</td>
                          <td style="padding: 6px 0; color: #0f172a; font-weight: 600;">
                            ${startDate} to ${endDate}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #64748b;">Duration:</td>
                          <td style="padding: 6px 0; color: #334155; font-weight: 600;">
                            ${daysCount} Day${daysCount > 1 ? "s" : ""}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #64748b;">Leave Type:</td>
                          <td style="padding: 6px 0;">
                            <span style="display: inline-block; padding: 2px 8px; border-radius: 5px; font-size: 11px; font-weight: 600; background-color: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;">
                              ${leaveType}
                            </span>
                          </td>
                        </tr>
                      </table>

                      <div style="margin-top: 14px; padding-top: 14px; border-top: 1px solid #e2e8f0;">
                        <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                          Reason for Leave:
                        </div>
                        <div style="font-size: 13px; line-height: 20px; color: #334155; white-space: pre-line; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px;">
                          ${reason}
                        </div>
                      </div>
                    </div>

                    <!-- Direct Email Actions -->
                    <div style="text-align: center; margin: 24px 0 16px 0;">
                      <p style="margin: 0 0 14px 0; font-size: 13px; font-weight: 600; color: #334155;">
                        Quick Action (Click to decide directly):
                      </p>
                      <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                        <tr>
                          <td style="padding-right: 12px;">
                            <a href="${approveUrl}" target="_blank" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.2);">
                              &#10003; Accept Leave
                            </a>
                          </td>
                          <td>
                            <a href="${rejectUrl}" target="_blank" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; box-shadow: 0 2px 4px rgba(220, 38, 38, 0.2);">
                              &#10007; Reject Leave
                            </a>
                          </td>
                        </tr>
                      </table>
                    </div>

                    <div style="text-align: center; margin-top: 18px; padding-top: 14px; border-top: 1px solid #f1f5f9;">
                      <a href="${portalUrl}" target="_blank" style="color: #4f46e5; text-decoration: underline; font-size: 12px; font-weight: 500;">
                        Or review all attendance & leave requests on portal
                      </a>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      &copy; ${new Date().getFullYear()} Task Manager. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const rawRecipients = Array.isArray(to) ? to : [to];
  const recipients = rawRecipients
    .map((r) => (typeof r === "string" ? r.trim() : ""))
    .filter((r) => r.length > 0 && r.includes("@"));

  if (recipients.length === 0) {
    console.warn("[Leave Email] No valid recipient email addresses provided. Skipped sending.");
    return null;
  }

  console.log(`[Leave Email] Sending leave application email to ${recipients.length} recipient(s): ${recipients.join(", ")}`);

  const results = await Promise.allSettled(
    recipients.map(async (recipientEmail) => {
      const info = await transporter.sendMail({
        from: smtpFrom,
        to: recipientEmail,
        subject: `[Leave Application] ${applicantName} - ${daysCount} Day${daysCount > 1 ? "s" : ""} (${leaveType})`,
        text: `Hello,\n\n${applicantName} has applied for ${daysCount} day(s) leave (${leaveType}).\nPeriod: ${startDate} to ${endDate}\nReason: ${reason}\n\nAccept: ${approveUrl}\nReject: ${rejectUrl}\n\nView Portal: ${portalUrl}`,
        html,
      });
      console.log(`[Leave Email] Successfully delivered to ${recipientEmail} (MessageId: ${info?.messageId})`);
      return info;
    })
  );

  return results;
}

export async function sendLeaveDecisionEmail({
  to,
  employeeName,
  status,
  reviewerName,
  startDate,
  endDate,
  daysCount,
  leaveType,
  reviewNotes,
  appUrl,
}: {
  to: string;
  employeeName: string;
  status: "APPROVED" | "REJECTED" | "CANCELLED";
  reviewerName: string;
  startDate: string;
  endDate: string;
  daysCount: number;
  leaveType: string;
  reviewNotes?: string | null;
  appUrl?: string;
}) {
  const transporter = getMailTransporter();
  if (!transporter) {
    console.warn("SMTP credentials not set. Leave decision email skipped.");
    return null;
  }

  const isApproved = status === "APPROVED";
  const isCancelled = status === "CANCELLED";
  const statusLabel = isApproved ? "APPROVED" : isCancelled ? "CANCELLED" : "REJECTED";
  const headerColor = isApproved ? "#059669" : isCancelled ? "#d97706" : "#dc2626";
  const badgeBg = isApproved ? "#ecfdf5" : isCancelled ? "#fffbeb" : "#fef2f2";
  const badgeText = isApproved ? "#047857" : isCancelled ? "#b45309" : "#b91c1c";
  const badgeBorder = isApproved ? "#a7f3d0" : isCancelled ? "#fde68a" : "#fecaca";

  const cleanBaseUrl = (
    appUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://taskmanager-iit.vercel.app"
  ).replace(/\/+$/, "");

  const portalUrl = `${cleanBaseUrl}/attendance`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Leave Request ${statusLabel}</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);">
                <!-- Header -->
                <tr>
                  <td style="padding: 22px 28px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="display: inline-block; width: 30px; height: 30px; line-height: 30px; background-color: ${headerColor}; border-radius: 8px; text-align: center; color: #ffffff; font-weight: bold; font-size: 13px; margin-right: 10px; vertical-align: middle;">
                            TM
                          </div>
                          <span style="font-size: 16px; font-weight: 700; color: #0f172a; vertical-align: middle;">
                            Task Manager
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 28px;">
                    <div style="margin-bottom: 18px;">
                      <span style="display: inline-block; padding: 4px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; background-color: ${badgeBg}; color: ${badgeText}; border: 1px solid ${badgeBorder};">
                        LEAVE ${statusLabel}
                      </span>
                    </div>

                    <h2 style="margin: 0 0 12px 0; font-size: 19px; font-weight: 700; color: #0f172a; letter-spacing: -0.3px;">
                      Your Leave Request has been ${statusLabel}
                    </h2>

                    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #475569;">
                      Hello <strong>${employeeName}</strong>,<br>
                      Your leave request for <strong>${startDate} to ${endDate} (${daysCount} day${daysCount > 1 ? "s" : ""})</strong> has been <strong>${status.toLowerCase()}</strong> by <strong>${reviewerName}</strong>.
                      ${isApproved ? "<br><br>The approved dates have been automatically recorded in your attendance sheet." : isCancelled ? "<br><br>Any leave dates previously marked in your attendance sheet have been removed." : ""}
                    </p>

                    ${
                      reviewNotes
                        ? `
                      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 20px;">
                        <span style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase;">Note from Reviewer:</span>
                        <p style="margin: 4px 0 0 0; font-size: 13px; color: #334155; line-height: 20px;">
                          ${reviewNotes}
                        </p>
                      </div>
                      `
                        : ""
                    }

                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0 8px 0;">
                      <tr>
                        <td align="center">
                          <a href="${portalUrl}" target="_blank" style="display: inline-block; background-color: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px;">
                            View Attendance Sheet
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      &copy; ${new Date().getFullYear()} Task Manager. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  console.log(`[Leave Email] Sending decision (${status}) to: ${to}`);

  return await transporter.sendMail({
    from: smtpFrom,
    to: to.trim(),
    subject: `[Leave ${statusLabel}] ${startDate} - ${endDate}`,
    text: `Hello ${employeeName},\n\nYour leave request for ${startDate} to ${endDate} (${daysCount} days) has been ${status.toLowerCase()} by ${reviewerName}.\n\nView attendance sheet: ${portalUrl}`,
    html,
  });
}

export async function sendTaskOverdueEmail({
  to,
  cc,
  assigneeName,
  taskTitle,
  taskDescription,
  priority,
  status,
  dueDate,
  creatorName,
  companyName,
  taskUrl,
}: {
  to: string;
  cc?: string | string[];
  assigneeName: string;
  taskTitle: string;
  taskDescription?: string | null;
  priority: string;
  status: string;
  dueDate: Date | string;
  creatorName?: string;
  companyName?: string | null;
  taskUrl?: string;
}) {
  const transporter = getMailTransporter();
  if (!transporter) {
    console.warn("SMTP credentials not set. Overdue notification email skipped.");
    return null;
  }

  const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
    URGENT: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" },
    HIGH: { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
    MEDIUM: { bg: "#eef2ff", text: "#4338ca", border: "#c7d2fe" },
    LOW: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  };

  const priorityStyle = priorityColors[priority] || priorityColors.MEDIUM;

  let formattedDueDate = "Past due";
  if (dueDate) {
    const d = new Date(dueDate);
    if (!isNaN(d.getTime())) {
      formattedDueDate = d.toLocaleString("en-US", {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  }

  const targetUrl =
    taskUrl ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://taskmanager-iit.vercel.app/";

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Task Overdue Alert</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #ffffff; border: 1px solid #fee2e2; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(220, 38, 38, 0.08);">
                <!-- Header -->
                <tr>
                  <td style="padding: 22px 28px; border-bottom: 1px solid #fecaca; background-color: #fff1f2;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="display: inline-block; width: 28px; height: 28px; line-height: 28px; background-color: #e11d48; border-radius: 6px; text-align: center; color: #ffffff; font-weight: bold; font-size: 13px; margin-right: 8px; vertical-align: middle;">
                            TM
                          </div>
                          <span style="font-size: 16px; font-weight: 700; color: #9f1239; vertical-align: middle; letter-spacing: -0.2px;">
                            ${companyName ? `${companyName} &bull; ` : ""}Task Manager
                          </span>
                        </td>
                        <td align="right">
                          <span style="display: inline-block; padding: 3px 9px; border-radius: 6px; font-size: 11px; font-weight: 700; background-color: #ffe4e6; color: #be123c; border: 1px solid #fda4af;">
                            OVERDUE
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 28px;">
                    <h2 style="margin: 0 0 10px 0; font-size: 18px; font-weight: 700; color: #9f1239; letter-spacing: -0.3px;">
                      ⚠️ Task Overdue Reminder
                    </h2>
                    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #475569;">
                      Hello <strong>${assigneeName}</strong>,<br>
                      The deadline for the following task has passed and it is currently marked as <strong>${status}</strong>. Please review and update its progress:
                    </p>

                    <!-- Task Detail Box -->
                    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px 20px; margin-bottom: 24px;">
                      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 700; color: #0f172a; line-height: 22px;">
                        ${taskTitle}
                      </h3>

                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                        <tr>
                          <td style="padding: 5px 0; color: #64748b; width: 100px;">Deadline:</td>
                          <td style="padding: 5px 0; color: #b91c1c; font-weight: 700;">
                            ${formattedDueDate} (Overdue)
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0; color: #64748b;">Priority:</td>
                          <td style="padding: 5px 0;">
                            <span style="display: inline-block; padding: 2px 8px; border-radius: 5px; font-size: 11px; font-weight: 600; background-color: ${priorityStyle.bg}; color: ${priorityStyle.text}; border: 1px solid ${priorityStyle.border};">
                              ${priority}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 5px 0; color: #64748b;">Current Status:</td>
                          <td style="padding: 5px 0; color: #334155; font-weight: 600;">
                            ${status}
                          </td>
                        </tr>
                        ${
                          creatorName
                            ? `
                        <tr>
                          <td style="padding: 5px 0; color: #64748b;">Assigned By:</td>
                          <td style="padding: 5px 0; color: #334155; font-weight: 500;">
                            ${creatorName}
                          </td>
                        </tr>
                        `
                            : ""
                        }
                      </table>

                      ${
                        taskDescription
                          ? `
                        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                          <div style="font-size: 11px; font-weight: 600; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Description
                          </div>
                          <div style="font-size: 13px; line-height: 20px; color: #334155; white-space: pre-line;">
                            ${taskDescription}
                          </div>
                        </div>
                      `
                          : ""
                      }
                    </div>

                    <!-- CTA Button -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 20px 0 8px 0;">
                      <tr>
                        <td align="center">
                          <a href="${targetUrl}" target="_blank" style="display: inline-block; background-color: #e11d48; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 6px rgba(225, 29, 72, 0.25);">
                            View & Complete Task
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 16px 28px; background-color: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                      &copy; ${new Date().getFullYear()} Task Manager. All rights reserved.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const cleanTo = to.trim();
  console.log(`[Task Overdue Email] Sending alert to ${cleanTo} for overdue task: "${taskTitle}"`);

  const mailOptions: any = {
    from: smtpFrom,
    to: cleanTo,
    subject: `⚠️ [Overdue Alert] ${taskTitle} is past deadline`,
    text: `Hello ${assigneeName},\n\nThe following task has passed its deadline (${formattedDueDate}) and is still ${status}:\n\nTask: ${taskTitle}\nPriority: ${priority}\nStatus: ${status}\nDue Date: ${formattedDueDate}\n\nPlease view and update it: ${targetUrl}`,
    html,
  };

  if (cc) {
    const cleanCc = Array.isArray(cc) ? cc.join(", ") : cc;
    if (cleanCc.trim()) mailOptions.cc = cleanCc;
  }

  const info = await transporter.sendMail(mailOptions);
  console.log(`[Task Overdue Email] Alert sent successfully to ${cleanTo} (MessageId: ${info?.messageId})`);
  return info;
}
