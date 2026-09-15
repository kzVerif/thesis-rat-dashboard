import "server-only";

import { forbidden, unauthorized } from "next/navigation";

export function interruptForApiStatus(status: number): never {
  if (status === 401) unauthorized();
  if (status === 403) forbidden();
  throw new Error(`Backend returned HTTP ${status}`);
}

export function isAccessInterrupt(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof error.digest === "string" &&
      (error.digest === "NEXT_HTTP_ERROR_FALLBACK;401" ||
        error.digest === "NEXT_HTTP_ERROR_FALLBACK;403"),
  );
}
