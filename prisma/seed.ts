import prisma from "../src/services/prismaService";

async function main() {
    await prisma.voice.deleteMany({
  where: {
    provider: "demo",
  },
});
  const voices = [
    {
      provider: "edge",
      providerId: "en-US-AriaNeural",
      name: "English Female",
      language: "English",
      languageCode: "en-US",
      gender: "FEMALE",
      description: "Natural English female voice",
    },
    {
      provider: "edge",
      providerId: "en-US-GuyNeural",
      name: "English Male",
      language: "English",
      languageCode: "en-US",
      gender: "MALE",
      description: "Natural English male voice",
    },
    {
      provider: "edge",
      providerId: "hi-IN-SwaraNeural",
      name: "Hindi Female",
      language: "Hindi",
      languageCode: "hi-IN",
      gender: "FEMALE",
      description: "Natural Hindi female voice",
    },
    {
      provider: "edge",
      providerId: "hi-IN-MadhurNeural",
      name: "Hindi Male",
      language: "Hindi",
      languageCode: "hi-IN",
      gender: "MALE",
      description: "Natural Hindi male voice",
    },
  ];

  for (const voice of voices) {
    await prisma.voice.upsert({
      where: {
        provider_providerId: {
          provider: voice.provider,
          providerId: voice.providerId,
        },
      },
      update: {
        name: voice.name,
        language: voice.language,
        languageCode: voice.languageCode,
        gender: voice.gender,
        description: voice.description,
        isActive: true,
      },
      create: voice,
    });
  }

  console.log("Edge voices inserted/updated successfully");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });