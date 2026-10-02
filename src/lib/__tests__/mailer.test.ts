import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// sendEmail captura RESEND_API_KEY al cargar el módulo: reiniciamos el módulo
// en cada test para controlar el entorno de forma aislada.
async function loadMailer() {
  vi.resetModules();
  const mod = await import("@/lib/mailer");
  return mod;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("mailer — modo desarrollo (sin RESEND_API_KEY)", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "");
    delete process.env.EMAIL_FROM;
  });

  it("devuelve { dev: true } y no llama a la API de Resend", async () => {
    const { sendEmail } = await loadMailer();
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const res = await sendEmail({
      to: "cliente@ejemplo.com",
      subject: "Confirma tu correo",
      html: "<p>Hola</p>",
      text: "Hola",
    });

    expect(res).toEqual({ dev: true });
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});

describe("mailer — modo producción (con RESEND_API_KEY)", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key_123");
    delete process.env.EMAIL_FROM;
  });

  it("llama a la API de Resend con el remitente por defecto y los encabezados correctos", async () => {
    const { sendEmail } = await loadMailer();

    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ id: "evt_1" }) });
    vi.stubGlobal("fetch", fetchMock);

    const res = await sendEmail({
      to: "a@b.com",
      subject: "Asunto",
      html: "<p>x</p>",
      text: "x",
    });

    expect(res).toEqual({ id: "evt_1" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer re_test_key_123");
    const body = JSON.parse(init.body);
    expect(body.from).toBe("Tienda Plus <no-reply@resend.dev>");
    expect(body.to).toEqual(["a@b.com"]);
    expect(body.subject).toBe("Asunto");
  });

  it("incluye adjuntos PDF en la solicitud a Resend", async () => {
    const { sendEmail } = await loadMailer();
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ id: "evt_pdf" }) });
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail({
      to: "cliente@ejemplo.com",
      subject: "Comprobante",
      html: "<p>Adjunto</p>",
      text: "Adjunto",
      attachments: [{ filename: "B001-000001.pdf", content: "JVBERi0=", contentType: "application/pdf" }],
    });

    const [, init] = fetchMock.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.attachments).toEqual([
      { filename: "B001-000001.pdf", content: "JVBERi0=", contentType: "application/pdf" },
    ]);
  });

  it("lanza un error si Resend responde con error", async () => {
    const { sendEmail } = await loadMailer();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        text: async () => "missing to",
      })
    );

    await expect(
      sendEmail({ to: "a@b.com", subject: "s", html: "h", text: "t" })
    ).rejects.toThrow(/Resend error 422/);
  });
});