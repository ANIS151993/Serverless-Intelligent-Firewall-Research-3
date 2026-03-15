/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/sif/:path*",
        destination: "http://sif-core:8000/api/v1/:path*"
      },
      {
        source: "/api/ai/:path*",
        destination: "http://sif-ai-engine:8001/:path*"
      },
      {
        source: "/api/monitor/:path*",
        destination: "http://sif-monitor:3000/:path*"
      }
    ];
  }
};

module.exports = nextConfig;
