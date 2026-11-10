/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  serverExternalPackages: ["pg"],
  experimental: { serverActions: { bodySizeLimit: "3mb" } },
};
export default nextConfig;
