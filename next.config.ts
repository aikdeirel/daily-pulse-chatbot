import withSerwistInit from "@serwist/next";
import type { NextConfig } from "next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  // Disable cacheComponents to resolve conflict with dynamic route configs
  cacheComponents: false,
  // Required for Next.js 16+ when @serwist/next adds webpack config
  turbopack: {},
  images: {
    remotePatterns: [
      {
        hostname: "avatar.vercel.sh",
      },
      {
        protocol: "https",
        //https://nextjs.org/docs/messages/next-image-unconfigured-host
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "**.scdn.co", // Spotify CDN (album artwork, mosaics, etc.) - ** matches any subdomain
      },
      {
        protocol: "https",
        hostname: "**.spotifycdn.com", // Spotify CDN (user images, playlist covers, etc.) - ** matches any subdomain
      },
    ],
  },
};

export default withSerwist(nextConfig);
