import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@seatflow/geometry",
    "@seatflow/planner-core",
    "@seatflow/repositories",
    "@seatflow/rules",
    "@seatflow/types"
  ],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://localhost:4000/api/:path*"
      }
    ];
  }
};

export default nextConfig;
