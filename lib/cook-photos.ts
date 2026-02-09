import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";
import { Analytics } from "@/lib/analytics";

const BUCKET = "cook-photos";

/**
 * Pick a photo from the user's library
 * Returns the local URI or null if cancelled
 */
export async function pickCookPhoto(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== "granted") {
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    quality: 0.7,
    allowsEditing: true,
    aspect: [1, 1],
  });

  if (result.canceled || !result.assets?.[0]?.uri) {
    return null;
  }

  return result.assets[0].uri;
}

/**
 * Upload a cook photo to Supabase Storage and create a database record.
 * Returns the storage path on success, null on failure.
 * Failures are non-blocking — completion flow should never be interrupted.
 */
export async function uploadCookPhoto(
  localUri: string,
  userId: string,
  sessionId: string,
  recipeId: string
): Promise<string | null> {
  try {
    const timestamp = Date.now();
    const storagePath = `${userId}/${sessionId}/${timestamp}.jpg`;

    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, decode(base64), {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (uploadError) {
      console.error("[cook-photos] Upload failed:", uploadError);
      return null;
    }

    // Create database record
    const { error: dbError } = await supabase
      .from("cook_session_photos")
      .insert({
        session_id: sessionId,
        user_id: userId,
        storage_path: storagePath,
      });

    if (dbError) {
      console.error("[cook-photos] DB insert failed:", dbError);
      // Try to clean up the uploaded file
      await supabase.storage.from(BUCKET).remove([storagePath]);
      return null;
    }

    // Track analytics (non-blocking)
    Analytics.cookPhotoUploaded(sessionId, recipeId);

    return storagePath;
  } catch (err) {
    console.error("[cook-photos] Unexpected error:", err);
    return null;
  }
}

/**
 * Get a signed URL for a cook photo
 */
export async function getCookPhotoUrl(
  storagePath: string
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600); // 1 hour expiry

  if (error) {
    console.error("[cook-photos] Signed URL error:", error);
    return null;
  }

  return data.signedUrl;
}
