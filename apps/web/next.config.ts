import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@seatflow/planner-core", "@seatflow/rules", "@seatflow/types", "@seatflow/ui"]
};

export default nextConfig;
