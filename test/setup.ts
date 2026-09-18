import { vi } from "vitest";

/**
 * `server-only` lanza un error cuando se importa fuera de un React Server
 * Component (p. ej. en el runtime de Node de los tests). Lo sustituimos por un
 * stub vacío para poder testear los módulos de servidor (mailer, verification,
 * secrets) en aislamiento.
 */
vi.mock("server-only", () => ({ default: {} }));