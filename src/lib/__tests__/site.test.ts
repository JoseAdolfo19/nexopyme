import { afterEach, describe, expect, it, vi } from "vitest";
import { getPublicSiteUrl } from "@/lib/site";

afterEach(() => vi.unstubAllEnvs());

describe("getPublicSiteUrl", () => {
  it("no publica localhost como canonical", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "");

    expect(getPublicSiteUrl()).toBeNull();
  });

  it("usa el dominio de producción de Vercel como respaldo", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "tiendaplus.pe");

    expect(getPublicSiteUrl()?.toString()).toBe("https://tiendaplus.pe/");
  });

  it("prioriza la URL pública configurada", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://www.tiendaplus.pe");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "preview.vercel.app");

    expect(getPublicSiteUrl()?.toString()).toBe("https://www.tiendaplus.pe/");
  });
});