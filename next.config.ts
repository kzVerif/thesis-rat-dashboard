import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";
import { validateProductionConfig } from "./lib/transport-config.mjs";

const nextConfig: NextConfig = {
  /* config options here */
  // Development tunnel/proxy hosts used to access the app remotely.
   allowedDevOrigins: [
    "192.168.1.194",
    "localhost:3000",
    "*.devtunnels.ms",
    "127.0.0.1",
    "10.58.208.90",
  ],
  experimental: {
    authInterrupts: true,
    serverActions: {
      // Next compares Origin with Host/X-Forwarded-Host for Server Actions.
      // Keep this list limited to local development hosts.
      allowedOrigins: process.env.NODE_ENV === "production" ? [] : ["localhost:3000", "*.devtunnels.ms"],
    },
  },
};

export default function config(phase: string) {
  if (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER) {
    validateProductionConfig(process.env);
  }
  return nextConfig;
}
