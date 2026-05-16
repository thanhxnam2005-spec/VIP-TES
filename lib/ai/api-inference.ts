import type { AIProvider } from "@/lib/db";

export function filterApiInferenceProviders<T extends Pick<
  AIProvider,
  "id" | "providerType"
>>(
  providers: T[] | undefined,
): T[] | undefined {
  if (!providers) return undefined;
  return providers;
}
