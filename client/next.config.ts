import type { NextConfig } from "next";
import { execSync } from "child_process";

const getGitCommitHash = () => {
  const envHash = 
    process.env.VERCEL_GIT_COMMIT_SHA || 
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || 
    process.env.RENDER_GIT_COMMIT || 
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT_SHA ||
    process.env.GIT_COMMIT;
    
  if (envHash) {
    return envHash.substring(0, 7);
  }

  try {
    return execSync("git rev-parse --short HEAD").toString().trim();
  } catch {
    return "unknown";
  }
};

const parseAllowedDevOrigins = () => {
  const defaults = ["localhost", "127.0.0.1"];
  const fromEnv = (process.env.ALLOWED_DEV_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return Array.from(new Set([...defaults, ...fromEnv]));
};

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_GIT_COMMIT: getGitCommitHash(),
  },
  allowedDevOrigins: parseAllowedDevOrigins(),
};

export default nextConfig;

