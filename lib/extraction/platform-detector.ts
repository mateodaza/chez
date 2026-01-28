/**
 * Platform detection for video URLs
 * Supports YouTube, TikTok, and Instagram
 */

export type Platform = "youtube" | "tiktok" | "instagram" | "unknown";

export interface PlatformDetectionResult {
  platform: Platform;
  isValid: boolean;
  videoId: string | null;
  normalizedUrl: string | null;
  error: string | null;
}

// YouTube patterns:
// - youtube.com/watch?v=VIDEO_ID
// - youtu.be/VIDEO_ID
// - youtube.com/shorts/VIDEO_ID
// - youtube.com/embed/VIDEO_ID
const YOUTUBE_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
];

// TikTok patterns:
// - tiktok.com/@username/video/VIDEO_ID (desktop)
// - m.tiktok.com/v/VIDEO_ID.html (mobile web)
// - vm.tiktok.com/CODE (mobile share - EU, US, AU, Africa)
// - vt.tiktok.com/CODE (mobile share - Asia)
// - tiktok.com/t/CODE (short link)
const TIKTOK_PATTERNS = [
  /tiktok\.com\/@[\w.-]+\/video\/(\d+)/,
  /m\.tiktok\.com\/v\/(\d+)\.html/,
  /vm\.tiktok\.com\/([a-zA-Z0-9]+)/,
  /vt\.tiktok\.com\/([a-zA-Z0-9]+)/,
  /tiktok\.com\/t\/([a-zA-Z0-9]+)/,
];

// Instagram patterns:
// - instagram.com/reel/REEL_ID
// - instagram.com/p/POST_ID
const INSTAGRAM_PATTERNS = [
  /instagram\.com\/(?:reel|p)\/([a-zA-Z0-9_-]+)/,
  /instagr\.am\/(?:reel|p)\/([a-zA-Z0-9_-]+)/,
];

/**
 * Detects the platform from a URL and extracts the video ID
 */
export function detectPlatform(url: string): PlatformDetectionResult {
  // Normalize URL
  let normalizedUrl = url.trim();

  // Add protocol if missing
  if (
    !normalizedUrl.startsWith("http://") &&
    !normalizedUrl.startsWith("https://")
  ) {
    normalizedUrl = "https://" + normalizedUrl;
  }

  // Try to parse as URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(normalizedUrl);
  } catch {
    return {
      platform: "unknown",
      isValid: false,
      videoId: null,
      normalizedUrl: null,
      error: "Invalid URL format",
    };
  }

  // Check YouTube
  for (const pattern of YOUTUBE_PATTERNS) {
    const match = normalizedUrl.match(pattern);
    if (match) {
      return {
        platform: "youtube",
        isValid: true,
        videoId: match[1],
        normalizedUrl: `https://www.youtube.com/watch?v=${match[1]}`,
        error: null,
      };
    }
  }

  // Check TikTok
  for (const pattern of TIKTOK_PATTERNS) {
    const match = normalizedUrl.match(pattern);
    if (match) {
      return {
        platform: "tiktok",
        isValid: true,
        videoId: match[1],
        normalizedUrl,
        error: null,
      };
    }
  }

  // Check Instagram
  for (const pattern of INSTAGRAM_PATTERNS) {
    const match = normalizedUrl.match(pattern);
    if (match) {
      return {
        platform: "instagram",
        isValid: true,
        videoId: match[1],
        normalizedUrl,
        error: null,
      };
    }
  }

  // Check if it's a known domain but unrecognized format
  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname.includes("youtube") || hostname.includes("youtu.be")) {
    return {
      platform: "youtube",
      isValid: false,
      videoId: null,
      normalizedUrl: null,
      error:
        "Could not extract YouTube video ID. Please use a direct video link.",
    };
  }
  if (hostname.includes("tiktok")) {
    return {
      platform: "tiktok",
      isValid: false,
      videoId: null,
      normalizedUrl: null,
      error:
        "Could not extract TikTok video ID. Please use a direct video link.",
    };
  }
  if (hostname.includes("instagram") || hostname.includes("instagr.am")) {
    return {
      platform: "instagram",
      isValid: false,
      videoId: null,
      normalizedUrl: null,
      error:
        "Could not extract Instagram post ID. Please use a reel or post link.",
    };
  }

  return {
    platform: "unknown",
    isValid: false,
    videoId: null,
    normalizedUrl: null,
    error: "Unsupported platform. We support YouTube, TikTok, and Instagram.",
  };
}

/**
 * Returns user-friendly platform name
 */
export function getPlatformDisplayName(platform: Platform): string {
  switch (platform) {
    case "youtube":
      return "YouTube";
    case "tiktok":
      return "TikTok";
    case "instagram":
      return "Instagram";
    default:
      return "Unknown";
  }
}

/**
 * Returns platform-specific icon name (for use with icon libraries)
 */
export function getPlatformIcon(platform: Platform): string {
  switch (platform) {
    case "youtube":
      return "logo-youtube";
    case "tiktok":
      return "musical-notes"; // TikTok doesn't have a standard icon
    case "instagram":
      return "logo-instagram";
    default:
      return "link";
  }
}
