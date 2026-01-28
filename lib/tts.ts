/* eslint-disable no-console */
import type { AudioPlayer } from "expo-audio";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import Constants from "expo-constants";
import { supabase } from "./supabase";

let currentPlayer: AudioPlayer | null = null;
let isAudioModeConfigured = false;

// Preload cache for instant playback
const preloadCache = new Map<string, string>();

export type TTSVoice = "alloy" | "echo" | "fable" | "onyx" | "nova" | "shimmer";

interface TTSOptions {
  voice?: TTSVoice;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Fetches audio from the TTS Edge Function.
 * Returns base64 audio data or throws with detailed error.
 */
async function fetchAudio(text: string, voice: TTSVoice): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    throw new Error("Not authenticated");
  }

  const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
  if (!supabaseUrl) {
    throw new Error("Supabase URL not configured");
  }
  const response = await fetch(`${supabaseUrl}/functions/v1/text-to-speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionData.session.access_token}`,
    },
    body: JSON.stringify({ text, voice }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`TTS failed (${response.status}): ${responseText}`);
  }

  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error(`Invalid JSON response: ${responseText.slice(0, 200)}`);
  }

  if (!data?.audio) {
    throw new Error(
      `No audio data received. Got: ${responseText.slice(0, 200)}`
    );
  }

  return data.audio;
}

/**
 * Preloads audio for later instant playback.
 */
export async function preload(
  text: string,
  voice: TTSVoice = "nova"
): Promise<void> {
  const cacheKey = `${voice}:${text}`;
  if (preloadCache.has(cacheKey)) return;

  const audio = await fetchAudio(text, voice);
  if (audio) {
    preloadCache.set(cacheKey, audio);
  }
}

/**
 * Preloads multiple texts in parallel.
 */
export async function preloadAll(
  texts: string[],
  voice: TTSVoice = "nova"
): Promise<void> {
  await Promise.all(texts.map((text) => preload(text, voice)));
}

/**
 * Clears the preload cache.
 */
export function clearCache(): void {
  preloadCache.clear();
}

/**
 * Configures audio mode for TTS playback (iOS silent mode support).
 */
async function configureAudioMode(): Promise<void> {
  if (isAudioModeConfigured) return;

  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "duckOthers",
      interruptionModeAndroid: "duckOthers",
    });
    isAudioModeConfigured = true;
    console.log("[TTS] Audio mode configured");
  } catch (error) {
    console.warn("[TTS] Failed to configure audio mode:", error);
  }
}

/**
 * Speaks text using OpenAI TTS via Edge Function.
 * Uses preloaded audio if available for instant playback.
 */
export async function speak(
  text: string,
  options: TTSOptions = {}
): Promise<void> {
  const { voice = "nova", onStart, onDone, onError } = options;
  const cacheKey = `${voice}:${text}`;

  console.log("[TTS] speak() called");

  try {
    // Configure audio mode first
    await configureAudioMode();

    // Stop any currently playing audio
    await stop();

    let audioBase64: string;

    // Check preload cache first
    if (preloadCache.has(cacheKey)) {
      console.log("[TTS] Using preloaded audio");
      audioBase64 = preloadCache.get(cacheKey)!;
      preloadCache.delete(cacheKey);
    } else {
      console.log("[TTS] Fetching audio from API...");
      audioBase64 = await fetchAudio(text, voice);
      console.log("[TTS] Audio fetched, size:", audioBase64.length);
    }

    // Write base64 audio to a temporary file
    const tempFile = `${FileSystem.cacheDirectory}tts-${Date.now()}.mp3`;
    await FileSystem.writeAsStringAsync(tempFile, audioBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    console.log("[TTS] Wrote temp file:", tempFile);

    // Create player directly with the file path
    console.log("[TTS] Creating audio player with source...");
    const player = createAudioPlayer(tempFile);
    currentPlayer = player;

    // Set up event listener for playback completion
    const subscription = player.addListener(
      "playbackStatusUpdate",
      (status) => {
        console.log("[TTS] Status update:", JSON.stringify(status));

        if (status.didJustFinish) {
          console.log("[TTS] Playback finished");
          onDone?.();
          subscription.remove();
          player.release();
          FileSystem.deleteAsync(tempFile, { idempotent: true }).catch(
            () => {}
          );
          if (currentPlayer === player) {
            currentPlayer = null;
          }
        }
      }
    );

    // Start playback
    console.log("[TTS] Starting playback...");
    onStart?.();
    player.play();
    console.log("[TTS] Playback started");
  } catch (error) {
    console.error("[TTS] Error:", error);
    onError?.(error instanceof Error ? error : new Error("TTS failed"));
    onDone?.();
  }
}

/**
 * Stops any currently playing TTS audio.
 */
export async function stop(): Promise<void> {
  if (currentPlayer) {
    try {
      currentPlayer.pause();
      currentPlayer.release();
    } catch {
      // Player may already be released
    }
    currentPlayer = null;
  }
}

/**
 * Checks if TTS is currently playing.
 */
export function isPlaying(): boolean {
  return currentPlayer !== null;
}
