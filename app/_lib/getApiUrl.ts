// app/lib/getApiUrl.ts
export function getApiUrl() {
  return process.env.API_URL ?? "http://localhost:8080";
}