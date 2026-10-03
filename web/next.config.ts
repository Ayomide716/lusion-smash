import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Stamped at every build (so every deploy) for the footer's "last updated".
  env: { BUILD_TIME: new Date().toISOString() },
};

export default nextConfig;
