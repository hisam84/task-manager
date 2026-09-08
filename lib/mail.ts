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
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Request</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0c0d0e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ededed;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0c0d0e; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #141517; border: 1px solid #232529; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <!-- Header -->
                <tr>
                  <td style="padding: 28px 32px; border-bottom: 1px solid #232529; background-color: #17181c;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="display: inline-block; width: 28px; height: 28px; line-height: 28px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 6px; text-align: center; color: #ffffff; font-weight: bold; font-size: 14px; margin-right: 10px; vertical-align: middle;">
                            TM
                          </div>
                          <span style="font-size: 17px; font-weight: 700; color: #ffffff; vertical-align: middle; letter-spacing: -0.3px;">
                            Task Manager
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #ffffff; letter-spacing: -0.4px;">
                      Password Reset Request
                    </h2>
                    <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 22px; color: #a1a1aa;">
                      Hello <strong style="color: #ffffff;">${name}</strong>,
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #a1a1aa;">
                      We received a request to reset the password for your Task Manager account. Click the button below to choose a new password:
                    </p>

                    <!-- CTA Button -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" target="_blank" style="display: inline-block; background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>

                    <p style="margin: 24px 0 8px 0; font-size: 12px; line-height: 18px; color: #71717a;">
                      Or copy and paste this link into your web browser:
                    </p>
                    <p style="margin: 0 0 24px 0; font-size: 12px; line-height: 18px; word-break: break-all;">
                      <a href="${resetUrl}" style="color: #3b82f6; text-decoration: underline;">${resetUrl}</a>
                    </p>

                    <div style="padding-top: 20px; border-top: 1px solid #232529;">
                      <p style="margin: 0; font-size: 12px; line-height: 18px; color: #71717a;">
                        ⚠️ This password reset link is valid for <strong>60 minutes</strong>. If you did not request a password reset, you can safely ignore this email — your password will remain unchanged.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 32px; background-color: #0f1012; border-top: 1px solid #1f2125; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #52525b;">
                      &copy; ${new Date().getFullYear()} Task Manager System. All rights reserved.
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
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Verification Code</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0c0d0e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ededed;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0c0d0e; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="520" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #141517; border: 1px solid #232529; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                <!-- Header -->
                <tr>
                  <td style="padding: 28px 32px; border-bottom: 1px solid #232529; background-color: #17181c;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="display: inline-block; width: 28px; height: 28px; line-height: 28px; background: linear-gradient(135deg, #2563eb, #1d4ed8); border-radius: 6px; text-align: center; color: #ffffff; font-weight: bold; font-size: 14px; margin-right: 10px; vertical-align: middle;">
                            TM
                          </div>
                          <span style="font-size: 17px; font-weight: 700; color: #ffffff; vertical-align: middle; letter-spacing: -0.3px;">
                            Task Manager
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px; text-align: center;">
                    <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.4px;">
                      Password Reset Verification Code
                    </h2>
                    <p style="margin: 0 0 20px 0; font-size: 14px; line-height: 22px; color: #a1a1aa;">
                      Hello <strong style="color: #ffffff;">${name}</strong>,<br>
                      Use the 6-digit One-Time Password (OTP) below to reset your Task Manager password:
                    </p>

                    <!-- OTP Box -->
                    <div style="margin: 28px auto; display: inline-block; background-color: #1b1c20; border: 1px dashed #3b82f6; border-radius: 10px; padding: 18px 32px;">
                      <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #60a5fa; text-indent: 10px; display: block;">
                        ${otp}
                      </span>
                    </div>

                    <p style="margin: 16px 0 0 0; font-size: 13px; color: #94a3b8;">
                      ⏰ This code expires in <strong style="color: #f59e0b;">10 minutes</strong>.
                    </p>

                    <div style="margin-top: 28px; padding-top: 20px; border-top: 1px solid #232529; text-align: left;">
                      <p style="margin: 0; font-size: 12px; line-height: 18px; color: #71717a;">
                        🔒 <strong>Security Warning:</strong> Never share this OTP with anyone. Task Manager support staff will never ask for your verification code. If you did not request this, please ignore this email and your account will remain secure.
                      </p>
                    </div>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 32px; background-color: #0f1012; border-top: 1px solid #1f2125; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #52525b;">
                      &copy; ${new Date().getFullYear()} Task Manager System. All rights reserved.
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
    subject: `Your Password Reset OTP: ${otp}`,
    text: `Hello ${name},\n\nYour 6-digit Password Reset OTP is: ${otp}\n\nThis code will expire in 10 minutes.\nIf you did not request this code, please ignore this message.`,
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

  const priorityColors: Record<string, { bg: string; text: string; border: string }> = {
    URGENT: { bg: "#450a0a", text: "#f87171", border: "#ef4444" },
    HIGH: { bg: "#431407", text: "#fb923c", border: "#f97316" },
    MEDIUM: { bg: "#1e1b4b", text: "#a5b4fc", border: "#6366f1" },
    LOW: { bg: "#064e3b", text: "#6ee7b7", border: "#10b981" },
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
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Task Assigned</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #0c0d0e; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #ededed;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0c0d0e; padding: 40px 15px;">
          <tr>
            <td align="center">
              <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #141517; border: 1px solid #232529; border-radius: 14px; overflow: hidden; box-shadow: 0 12px 36px rgba(0,0,0,0.5);">
                <!-- Header -->
                <tr>
                  <td style="padding: 24px 32px; border-bottom: 1px solid #232529; background-color: #17181c;">
                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="display: inline-block; width: 32px; height: 32px; line-height: 32px; background: linear-gradient(135deg, #4f46e5, #7c3aed); border-radius: 8px; text-align: center; color: #ffffff; font-weight: bold; font-size: 15px; margin-right: 12px; vertical-align: middle;">
                            TM
                          </div>
                          <span style="font-size: 17px; font-weight: 700; color: #ffffff; vertical-align: middle; letter-spacing: -0.3px;">
                            ${companyName ? `${companyName} &bull; ` : ""}Task Manager
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 32px;">
                    <div style="display: inline-block; padding: 4px 12px; background-color: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 20px; font-size: 12px; font-weight: 600; color: #818cf8; margin-bottom: 16px;">
                      📋 NEW TASK ASSIGNMENT
                    </div>

                    <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.4px;">
                      ${isSelfAssigned ? "You added a new task" : "You have been assigned a new task"}
                    </h2>
                    <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #a1a1aa;">
                      Hello <strong style="color: #ffffff;">${assigneeName}</strong>,<br>
                      ${
                        isSelfAssigned
                          ? "A new task has been added to your task list:"
                          : `<strong style="color: #ffffff;">${creatorName}</strong> assigned a new task to you:`
                      }
                    </p>

                    <!-- Task Detail Box -->
                    <div style="background-color: #1a1b1f; border: 1px solid #282a30; border-radius: 12px; padding: 22px; margin-bottom: 24px;">
                      <h3 style="margin: 0 0 14px 0; font-size: 17px; font-weight: 600; color: #f8fafc; line-height: 24px;">
                        ${taskTitle}
                      </h3>

                      <table width="100%" border="0" cellspacing="0" cellpadding="0" style="font-size: 13px;">
                        <tr>
                          <td style="padding: 6px 0; color: #71717a; width: 100px;">Priority:</td>
                          <td style="padding: 6px 0;">
                            <span style="display: inline-block; padding: 2px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; background-color: ${priorityStyle.bg}; color: ${priorityStyle.text}; border: 1px solid ${priorityStyle.border};">
                              ${priority}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #71717a;">Status:</td>
                          <td style="padding: 6px 0; color: #e2e8f0; font-weight: 500;">
                            ${status}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #71717a;">Due Date:</td>
                          <td style="padding: 6px 0; color: #e2e8f0; font-weight: 500;">
                            📅 ${formattedDueDate}
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 6px 0; color: #71717a;">Assigned By:</td>
                          <td style="padding: 6px 0; color: #e2e8f0; font-weight: 500;">
                            👤 ${creatorName}
                          </td>
                        </tr>
                      </table>

                      ${
                        taskDescription
                          ? `
                        <div style="margin-top: 16px; padding-top: 14px; border-top: 1px solid #282a30;">
                          <div style="font-size: 12px; font-weight: 600; color: #94a3b8; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px;">
                            Description
                          </div>
                          <div style="font-size: 13px; line-height: 20px; color: #cbd5e1; white-space: pre-line;">
                            ${taskDescription}
                          </div>
                        </div>
                      `
                          : ""
                      }
                    </div>

                    <!-- CTA Button -->
                    <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 28px 0 16px 0;">
                      <tr>
                        <td align="center">
                          <a href="${targetUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5, #6366f1); color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 10px; font-weight: 600; font-size: 14px; box-shadow: 0 4px 16px rgba(79, 70, 229, 0.4);">
                            View Task in Task Manager &rarr;
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="padding: 20px 32px; background-color: #0f1012; border-top: 1px solid #1f2125; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #52525b;">
                      &copy; ${new Date().getFullYear()} Task Manager System. Automated task notification email.
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

