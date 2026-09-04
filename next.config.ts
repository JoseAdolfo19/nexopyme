import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Comprimir respuestas y ocultar el header X-Powered-By
  compress: true,
  poweredByHeader: false,
  // bcryptjs es una librería nativa de servidor; evitar su empaquetado en edge
  serverExternalPackages: ["bcryptjs"],
  // Cabeceras de seguridad básicas para todas las rutas
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
