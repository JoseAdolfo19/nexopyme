export const SITE_NAME = "Tienda Plus";
export const SITE_DESCRIPTION =
  "Sistema de gestión para pequeños negocios del Perú: organiza ventas, productos, clientes, inventario y reportes desde una sola plataforma.";

export function getPublicSiteUrl(): URL | null {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (configuredUrl) {
    try {
      const url = new URL(configuredUrl);
      if (!/(localhost|127\.0\.0\.1|\[::1\])/.test(url.hostname)) return url;
    } catch {
      return null;
    }
  }

  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (!productionDomain) return null;

  try {
    return new URL(productionDomain.startsWith("http") ? productionDomain : `https://${productionDomain}`);
  } catch {
    return null;
  }
}