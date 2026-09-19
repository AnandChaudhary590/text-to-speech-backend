import prisma from "./prismaService";

const PLAN_LIMITS = {
  FREE: 5000,
  PRO: 50000,
  ENTERPRISE: 500000,
} as const;

interface UsageLimitResult {
  allowed: boolean;
  limit: number;
  used: number;
  remaining: number;
  plan: keyof typeof PLAN_LIMITS;
}

export const checkUsageLimit = async (
  userId: string,
  additionalCharacters: number
): Promise<UsageLimitResult> => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      plan: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const limit = PLAN_LIMITS[user.plan];

  const today = new Date();

  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  const startOfTomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

  const usage = await prisma.usageRecord.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lt: startOfTomorrow,
      },
    },
  });

  const used = usage?.charactersUsed ?? 0;
  const remaining = Math.max(limit - used, 0);

  return {
    allowed: used + additionalCharacters <= limit,
    limit,
    used,
    remaining,
    plan: user.plan,
  };
};