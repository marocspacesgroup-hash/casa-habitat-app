import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.21"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // Couvre n'importe quel projet Supabase (sous-domaine {ref}.supabase.co)
        // sans coder en dur l'identifiant du projet dans le code source.
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
  // Anciens slugs de quartier (publiés dans le sitemap) alignés sur ceux de Supabase.
  async redirects() {
    return [
      { source: "/quartiers/triangle-d-or", destination: "/quartiers/triangle-dor", permanent: true },
      { source: "/quartiers/mer-sultan", destination: "/quartiers/mers-sultan", permanent: true },
    ];
  },
};

export default nextConfig;
