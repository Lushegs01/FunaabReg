/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  experimental: {
    typedRoutes: true
  },
  images: {
    remotePatterns: []
  }
};

export default nextConfig;
