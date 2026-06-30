import type { MetadataRoute } from "next";
export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AI Document Converter",
    short_name: "AI Converter",
    description: "Instantly convert scanned documents and bills into clean Excel sheets.",
    start_url: "/",
    display: "standalone",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}