import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.ACIDIC_STANDALONE === "1" ? "standalone" : undefined,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }];
  },
  async redirects() { return [{ source: "/", destination: "/login", permanent: false }]; },
};

export default nextConfig;
