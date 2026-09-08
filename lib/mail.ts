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
