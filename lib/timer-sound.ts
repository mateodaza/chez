import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system/legacy";

let cachedUri: string | null = null;

/**
 * Generate a simple beep WAV file (880Hz, 0.3s) and cache it.
 * Returns a file:// URI playable by expo-av.
 */
async function getBeepUri(): Promise<string> {
  if (cachedUri) return cachedUri;

  const sampleRate = 22050;
  const duration = 0.3;
  const freq = 880; // A5 — classic alarm tone
  const numSamples = Math.floor(sampleRate * duration);
  const dataBytes = numSamples * 2; // 16-bit mono
  const fileSize = 44 + dataBytes;

  // Build WAV as Uint8Array
  const buf = new Uint8Array(fileSize);
  const view = new DataView(buf.buffer);

  // RIFF header
  buf.set([0x52, 0x49, 0x46, 0x46], 0); // "RIFF"
  view.setUint32(4, fileSize - 8, true);
  buf.set([0x57, 0x41, 0x56, 0x45], 8); // "WAVE"

  // fmt chunk
  buf.set([0x66, 0x6d, 0x74, 0x20], 12); // "fmt "
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // byte rate
  view.setUint16(32, 2, true); // block align
  view.setUint16(34, 16, true); // bits per sample

  // data chunk
  buf.set([0x64, 0x61, 0x74, 0x61], 36); // "data"
  view.setUint32(40, dataBytes, true);

  // Generate sine wave with fade-out envelope
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = 1 - i / numSamples; // linear fade-out
    const sample = Math.sin(2 * Math.PI * freq * t) * envelope * 0.8;
    const int16 = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)));
    view.setInt16(44 + i * 2, int16, true);
  }

  // Convert to base64 and write to cache
  const base64 = btoa(String.fromCharCode(...buf));
  const uri = `${FileSystem.cacheDirectory}timer-beep.wav`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  cachedUri = uri;
  return uri;
}

/**
 * Play the timer alarm — 3 beeps with short gaps.
 */
export async function playTimerAlarm(): Promise<void> {
  try {
    const uri = await getBeepUri();

    for (let i = 0; i < 3; i++) {
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: true, volume: 1.0 }
      );
      // Wait for beep (300ms) + gap (200ms)
      await new Promise((resolve) => setTimeout(resolve, 500));
      await sound.unloadAsync();
    }
  } catch (err) {
    console.warn("[TimerSound] Failed to play alarm:", err);
  }
}
