import crypto from "crypto";
import prisma from "./prismaService";

// Reset token validity: 15 minutes
const RESET_TOKEN_EXPIRY_MINUTES = 15;

export const createPasswordResetToken = async (
  userId: string
): Promise<string> => {
  // Generate secure random token
  const rawToken = crypto.randomBytes(32).toString("hex");

  // Store only hashed token in database
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const expiresAt = new Date(
    Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000
  );

  // Remove previous reset tokens for this user
  await prisma.passwordResetToken.deleteMany({
    where: {
      userId,
    },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId,
      token: hashedToken,
      expiresAt,
    },
  });

  // Return raw token only for the reset link/email
  return rawToken;
};

export const verifyPasswordResetToken = async (
  rawToken: string
) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(rawToken)
    .digest("hex");

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: {
      token: hashedToken,
    },
    include: {
      user: true,
    },
  });

  if (!resetToken) {
    return null;
  }

  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({
      where: {
        id: resetToken.id,
      },
    });

    return null;
  }

  return resetToken;
};

export const deletePasswordResetToken = async (
  tokenId: string
): Promise<void> => {
  await prisma.passwordResetToken.delete({
    where: {
      id: tokenId,
    },
  });
};