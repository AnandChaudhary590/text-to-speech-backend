import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT || 587),
  secure: false,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
});

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
): Promise<void> => {
  const clientUrl =
    process.env.CLIENT_URL || "http://localhost:5173";

  const resetUrl = `${clientUrl}/reset-password?token=${resetToken}`;

  await transporter.sendMail({
    from: `"Text-to-Speech Platform" <${process.env.MAIL_USER}>`,
    to: email,
    subject: "Password Reset Request",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto;">
        <h2>Password Reset</h2>

        <p>You requested to reset your password.</p>

        <p>Click the button below to create a new password:</p>

        <a
          href="${resetUrl}"
          style="
            display: inline-block;
            padding: 12px 20px;
            background: #000;
            color: #fff;
            text-decoration: none;
            border-radius: 6px;
          "
        >
          Reset Password
        </a>

        <p style="margin-top: 20px;">
          This link will expire in <strong>15 minutes</strong>.
        </p>

        <p>If you did not request this, you can safely ignore this email.</p>
      </div>
    `,
  });
};