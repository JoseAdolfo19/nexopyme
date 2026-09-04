import Link from "next/link";
import { BUSINESS_TYPES, PLANS } from "@/lib/constants";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">
              B
            </span>
            <span className="text-lg font-bold text-neutral-900">BizCaja</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-100"
            >
              Ingresar
            </Link>
            <Link
              href="/register"
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 text-center sm:pt-20">
        <p className="mb-3 inline-block rounded-full bg-brand-50 px-4 py-1.5 text-sm font-semibold text-brand-700">
          🇵🇪 Hecho para pequeños negocios del Perú
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-extrabold leading-tight text-neutral-900 sm:text-6xl">
          Tu negocio, <span className="text-brand-600">tu sistema</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-neutral-600">
          BizCaja se adapta a tu negocio. Registra ventas, controla tu stock,
          emite comprobantes y entiende cuánto ganas, todo desde tu celular.
          Sin cuadernos, sin Excel complicado, sin sistemas difíciles.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="w-full rounded-2xl bg-brand-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700 sm:w-auto"
          >
            Crear mi cuenta gratis
          </Link>
          <Link
            href="/login"
            className="w-full rounded-2xl border border-neutral-300 bg-white px-8 py-4 text-lg font-semibold text-neutral-800 hover:bg-neutral-100 sm:w-auto"
          >
            Ya tengo cuenta
          </Link>
        </div>
        <p className="mt-4 text-sm text-neutral-500">Sin tarjeta. Empieza en minutos.</p>
      </section>

      {/* TIPOS DE NEGOCIO */}
      <section className="border-y border-neutral-200 bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-neutral-900 sm:text-3xl">
            ¿Qué tipo de negocio tienes?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-neutral-600">
            El sistema se configura solo según tu actividad. No aprendes el software:
            el software te entiende a ti.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {BUSINESS_TYPES.map((t) => (
              <div
                key={t.value}
                className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3"
              >
                <span className="text-2xl">{t.emoji}</span>
                <span className="font-medium text-neutral-800">{t.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section className="py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-neutral-900 sm:text-3xl">
            Empezar es así de fácil
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { n: "1", t: "Crea tu cuenta", d: "Regístrate con tu correo en menos de un minuto." },
              { n: "2", t: "Registra tu negocio", d: "Cuéntanos qué vendes y el sistema se configura solo." },
              { n: "3", t: "Empieza a vender", d: "Registra ventas, controla stock y emite comprobantes." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-neutral-200 bg-white p-6 text-center">
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-brand-600 text-xl font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg font-bold text-neutral-900">{s.t}</h3>
                <p className="mt-2 text-neutral-600">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANES */}
      <section className="border-y border-neutral-200 bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-bold text-neutral-900 sm:text-3xl">
            Planes sencillos
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-neutral-600">
            Precios provisionales en soles, pensados para emprendedores.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((p) => (
              <div
                key={p.code}
                className={`flex flex-col rounded-2xl border p-6 ${
                  p.code === "emprendedor"
                    ? "border-brand-500 bg-brand-50/50 shadow-lg shadow-brand-600/10"
                    : "border-neutral-200 bg-white"
                }`}
              >
                <h3 className="text-lg font-bold text-neutral-900">{p.name}</h3>
                <p className="mt-2 text-3xl font-extrabold text-neutral-900">
                  {p.price === 0 ? "Gratis" : `S/ ${p.price}`}
                  {p.price > 0 && <span className="text-base font-medium text-neutral-500">/mes</span>}
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-neutral-700">
                      <span className="mt-0.5 text-emerald-600">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`mt-6 rounded-xl px-4 py-3 text-center text-sm font-bold ${
                    p.code === "emprendedor"
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50"
                  }`}
                >
                  Empezar gratis
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-extrabold text-neutral-900">
            Registra tu negocio, configura lo que necesitas y empieza a vender.
          </h2>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-2xl bg-brand-600 px-10 py-4 text-lg font-bold text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700"
          >
            Crear mi cuenta gratis
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-neutral-200 bg-white py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-neutral-500">
          <p className="font-semibold text-neutral-700">BizCaja</p>
          <p className="mt-1">Urubamba · Cusco · Perú — "Tu negocio, tu sistema"</p>
        </div>
      </footer>
    </div>
  );
}