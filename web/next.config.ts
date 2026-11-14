import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ponytail: every page is per-user and dynamic, so Cache Components / partial prefetching are off.
  turbopack: {
    root: __dirname, // the parent folder is the Expo app with its own lockfile
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
