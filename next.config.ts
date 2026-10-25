import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The music finder is a Python function (api/index.py). On Vercel it's served at /api/py/*;
  // in development `npm run dev` runs it on :8000 next to Next.js.
  async rewrites() {
    return process.env.NODE_ENV === "development"
      ? [{ source: "/api/py/:path*", destination: "http://127.0.0.1:8000/api/py/:path*" }]
      : [];
  },
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
