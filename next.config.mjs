/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Product images are served same-origin through /api/image-proxy and via
    // plain <img> tags, so we don't rely on the next/image optimizer for them.
    // `unoptimized` avoids the optimizer entirely for arbitrary shop CDNs.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
