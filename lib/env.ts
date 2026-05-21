import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Safely resolves an environment variable by checking the Cloudflare runtime context first,
 * and falling back to process.env. Using dynamic lookup process.env[key] prevents
 * Next.js from inlining old values at build time.
 */
export function getEnv(key: string): string {
  // 1. Try Cloudflare runtime context
  try {
    const ctx = getCloudflareContext();
    if (ctx && ctx.env) {
      const val = (ctx.env as any)[key];
      if (typeof val === "string" && val) {
        return val;
      }
    }
  } catch (err) {
    // Context might not be available during local development or build time
  }

  // 2. Fallback to process.env (prevents Next.js compile-time inlining via dynamic lookup)
  return process.env[key] || "";
}
