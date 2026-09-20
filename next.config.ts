import type { NextConfig } from "next";

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
      allowedOrigins: ["localhost:3000", "*.devtunnels.ms"],
    },
  },
};

export default nextConfig;
