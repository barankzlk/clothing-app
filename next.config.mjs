/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Product images come from arbitrary external shop CDNs, so we allow any
    // https host. We use plain <img> tags for product images, but this keeps
    // next/image usable elsewhere if needed.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
