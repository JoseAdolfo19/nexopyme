import type { MetadataRoute } from "next";
import { getPublicSiteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getPublicSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/configuracion",
        "/dashboard",
        "/inventario",
        "/login",
        "/onboarding",
        "/perfil",
        "/productos",
        "/register",
        "/reportes",
        "/superadmin",
        "/ventas",
        "/comprobantes",
        "/clientes",
        "/verify-email",
      ],
    },
    ...(siteUrl ? { sitemap: new URL("/sitemap.xml", siteUrl).toString() } : {}),
  };
}