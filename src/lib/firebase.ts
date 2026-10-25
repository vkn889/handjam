"use client";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { connectDatabaseEmulator, getDatabase, type Database } from "firebase/database";

/**
 * Firebase (Auth + Realtime Database). Configure with NEXT_PUBLIC_FIREBASE_* env vars
 * (see .env.example). These values are public by design; the database rules in
 * database.rules.json are what protect the data.
 *
 * Without a config the app still works: progress, the market and playlists use a
 * local profile, and online rooms / the global leaderboard are disabled.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseEnabled = !!(config.apiKey && config.databaseURL && config.projectId);
const useEmulator = process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === "1";

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Database | null = null;

export function fb(): { auth: Auth; db: Database } | null {
  if (!firebaseEnabled || typeof window === "undefined") return null;
  if (!app) {
    app = getApps()[0] ?? initializeApp(config);
    auth = getAuth(app);
    db = getDatabase(app);
    if (useEmulator) {
      connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
      connectDatabaseEmulator(db, "127.0.0.1", 9000);
    }
  }
  return { auth: auth!, db: db! };
}
