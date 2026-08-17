import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/webp"],
    minimumCacheTTL: 2678400, // 31 j — les pages comics ne changent pas
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
    deviceSizes: [640, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 144, 256, 320],
  },
  headers: async () => [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800",
        },
      ],
    },
  ],
};

export default nextConfig;
