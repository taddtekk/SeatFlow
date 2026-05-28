/** @type {import("next").NextConfig} */
const nextConfig = {
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

module.exports = nextConfig;
