/** Site-wide facts used for SEO metadata, the sitemap and structured data. */
const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

/** Set NEXT_PUBLIC_SITE_URL to your custom domain; on Vercel it falls back to the production URL. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || (vercelUrl ? `https://${vercelUrl}` : "http://localhost:3000")).replace(/\/$/, "");

export const SITE_NAME = "HandJam";
export const SITE_TITLE = "HandJam: Remix Music With Your Hands | Free Hand-Tracking DJ Game";
export const SITE_DESCRIPTION =
  "Remix any song with hand gestures using just your webcam. Pinch to bend pitch and speed, raise your arms for reverb and filter, land combos to earn Cognus, and battle friends online. Free, in your browser, no download.";

export const KEYWORDS = [
  "hand gesture music",
  "remix music with your hands",
  "air DJ",
  "webcam DJ",
  "hand tracking music game",
  "gesture controlled music",
  "online DJ game",
  "browser music game",
  "free music remix game",
  "theremin online",
  "motion controlled music",
  "AI hand tracking",
  "MediaPipe hand tracking",
  "pitch shifter online",
  "music game multiplayer",
  "rhythm game browser",
  "HandJam",
];
