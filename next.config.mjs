/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Same-origin validation is used locally and on the deployed domain.
      bodySizeLimit: "100mb",
    },
  },
};

export default nextConfig;