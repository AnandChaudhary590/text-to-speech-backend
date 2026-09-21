import { EdgeTTS } from "node-edge-tts";
import path from "path";
import fs from "fs/promises";
import { parseFile } from "music-metadata";

export interface TTSOptions {
  text: string;
  language: string;
  providerVoiceId?: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

export interface TTSResult {
  audioUrl: string;
  duration?: number;
}

const getDefaultVoice = (language: string): string => {
  const voices: Record<string, string> = {
    "en-US": "en-US-AriaNeural",
    "hi-IN": "hi-IN-SwaraNeural",
  };

  return voices[language] || "en-US-AriaNeural";
};

const convertSpeedToRate = (speed: number): string => {
  const percentage = Math.round((speed - 1) * 100);

  if (percentage === 0) {
    return "default";
  }

  return `${percentage > 0 ? "+" : ""}${percentage}%`;
};

const convertPitchToEdgeFormat = (pitch: number): string => {
  if (pitch === 0) {
    return "default";
  }

  return `${pitch > 0 ? "+" : ""}${pitch}Hz`;
};

const convertVolumeToEdgeFormat = (volume: number): string => {
  const percentage = Math.round((volume - 1) * 100);

  if (percentage === 0) {
    return "default";
  }

  return `${percentage > 0 ? "+" : ""}${percentage}%`;
};

export const generateSpeech = async (
  options: TTSOptions
): Promise<TTSResult> => {
  const {
    text,
    language,
    providerVoiceId,
    speed = 1.0,
    pitch = 0.0,
    volume = 1.0,
  } = options;

  console.log("TTS generation request:", {
    textLength: text.length,
    language,
    providerVoiceId,
    speed,
    pitch,
    volume,
  });

  const voice =
    providerVoiceId || getDefaultVoice(language);

  const rate = convertSpeedToRate(speed);
  const pitchValue = convertPitchToEdgeFormat(pitch);
  const volumeValue = convertVolumeToEdgeFormat(volume);

  const audioDirectory = path.join(
    process.cwd(),
    "uploads",
    "audio"
  );

  await fs.mkdir(audioDirectory, {
    recursive: true,
  });

  const fileName = `${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 10)}.mp3`;

  const filePath = path.join(
    audioDirectory,
    fileName
  );

  const tts = new EdgeTTS({
    voice,
    lang: language,
    outputFormat:
      "audio-24khz-96kbitrate-mono-mp3",
    rate,
    pitch: pitchValue,
    volume: volumeValue,
  });

  await tts.ttsPromise(text, filePath);

  // Calculate actual audio duration
  let duration: number | undefined;

  try {
    const metadata = await parseFile(filePath);

    if (
      metadata.format.duration &&
      Number.isFinite(metadata.format.duration)
    ) {
      duration = Number(
        metadata.format.duration.toFixed(2)
      );
    }

    console.log(
      "Audio duration:",
      duration,
      "seconds"
    );
  } catch (metadataError) {
    console.error(
      "Unable to read audio duration:",
      metadataError
    );
  }

  console.log(
    "Audio generated successfully:",
    filePath
  );

  console.log(
    "Edge voice used:",
    voice
  );

  const audioUrl = `/uploads/audio/${fileName}`;

  return {
    audioUrl,
    duration,
  };
};