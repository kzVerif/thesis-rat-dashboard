import { validateAPIURL } from "@/lib/transport-config.mjs";
export function getApiUrl() {
  return validateAPIURL(process.env.API_URL ?? "http://localhost:8080", process.env.NODE_ENV === "production");
}
