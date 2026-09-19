import prisma from "./prismaService";

interface UsageUpdate {
  charactersUsed?: number;
  speechCount?: number;
  audioSeconds?: number;
}

export const updateDailyUsage = async (
  userId: string,
  usage: UsageUpdate
): Promise<void> => {
  const today = new Date();

  // Start of today
  const startOfDay = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  // Start of tomorrow
  const startOfTomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1
  );

  const existingUsage = await prisma.usageRecord.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lt: startOfTomorrow,
      },
    },
  });

  if (existingUsage) {
    await prisma.usageRecord.update({
      where: {
        id: existingUsage.id,
      },
      data: {
        charactersUsed: {
          increment: usage.charactersUsed ?? 0,
        },
        speechCount: {
          increment: usage.speechCount ?? 0,
        },
        audioSeconds: {
          increment: usage.audioSeconds ?? 0,
        },
      },
    });

    return;
  }

  await prisma.usageRecord.create({
    data: {
      userId,
      date: startOfDay,
      charactersUsed: usage.charactersUsed ?? 0,
      speechCount: usage.speechCount ?? 0,
      audioSeconds: usage.audioSeconds ?? 0,
    },
  });
};