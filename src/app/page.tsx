import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { BUSINESS_TYPES } from "@/lib/constants";
import { getPublicSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

const title = "Tienda Plus | Sistema de gestión para pequeños negocios del Perú";
const description = "Ordena ventas, productos, clientes, inventario y reportes con Tienda Plus, el sistema de gestión para pequeños negocios peruanos.";
const publicUrl = getPublicSiteUrl();

export const metadata: Metadata = {
  title: { absolute: title },
  description,
  ...(publicUrl
    ? {
        alternates: { canonical: publicUrl },
        openGraph: {
          title,
          description,
          siteName: SITE_NAME,
          locale: "es_PE",
          type: "website",
          url: publicUrl,
          images: [{ url: "/logo_icono.png", width: 512, height: 512, alt: "Tienda Plus" }],
        },
      }
    : {}),
  twitter: {
    card: "summary",
    title,
    description,
    ...(publicUrl ? { images: ["/logo_icono.png"] } : {}),
  },
  robots: { index: true, follow: true, "max-image-preview": "large" },
};

export default function HomePage() {
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      areaServed: { "@type": "Country", name: "Perú" },
      ...(publicUrl ? { url: publicUrl.toString(), logo: new URL("/logo_icono.png", publicUrl).toString() } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SITE_NAME,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description,
      offers: { "@type": "Offer", price: "0", priceCurrency: "PEN" },
      ...(publicUrl ? { url: publicUrl.toString() } : {}),
    },
  ];

  return (
    <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    <div className="min-h-screen bg-white text-neutral-900">
      <a href="#contenido" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:px-4 focus:py-3">
        Saltar al contenido
      </a>
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo_icono.png" alt="Tienda Plus" width={36} height={36} className="size-9 rounded-xl" />
            <span className="text-lg font-bold text-neutral-900">Tienda Plus</span>
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
              className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-900"
            >
              Crear cuenta
            </Link>
          </div>
        </div>
        <nav aria-label="Navegación principal" className="mx-auto flex max-w-7xl gap-5 overflow-x-auto border-t border-neutral-100 px-4 py-2 text-sm font-medium text-neutral-600 sm:justify-center sm:px-6 lg:px-8">
          <a href="#nosotros" className="whitespace-nowrap hover:text-emerald-800">Quiénes somos</a>
          <a href="#solucion" className="whitespace-nowrap hover:text-emerald-800">La solución</a>
          <a href="#mision-vision" className="whitespace-nowrap hover:text-emerald-800">Misión y visión</a>
          <a href="#rubros" className="whitespace-nowrap hover:text-emerald-800">Rubros</a>
        </nav>
      </header>

      {/* HERO */}
      <main id="contenido">
      <section className="bg-[#123b35] px-4 py-8 text-center text-white sm:py-16">
        <Image src="/logo_icono.png" alt="" width={68} height={68} priority className="mx-auto size-14 rounded-xl sm:size-[68px] sm:rounded-2xl" />
        <p className="mt-3 text-sm font-bold uppercase text-emerald-200 sm:mt-5">
          Tecnología para negocios peruanos
        </p>
        <h1 className="mx-auto mt-3 max-w-4xl text-3xl font-extrabold leading-tight sm:mt-4 sm:text-5xl">
          Tienda Plus: gestión para negocios peruanos
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base leading-7 text-emerald-50 sm:mt-5 sm:text-lg sm:leading-8">
          Un sistema de gestión para ordenar ventas, productos, clientes, inventario y reportes desde una plataforma sencilla.
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:mt-8 sm:flex-row">
          <Link
            href="/register"
            className="w-full rounded-lg bg-[#f5c451] px-7 py-3.5 font-bold text-neutral-950 hover:bg-[#ffda79] sm:w-auto"
          >
            Empieza gratis
          </Link>
          <a href="#solucion" className="w-full rounded-lg border border-white/50 px-7 py-3.5 font-semibold text-white hover:bg-white/10 sm:w-auto">Conoce la plataforma</a>
        </div>
        <p className="mt-3 text-sm text-emerald-100 sm:mt-4">Plan Free disponible · Sin tarjeta para empezar</p>
      </section>
      <div className="border-b border-white/15 bg-[#123b35]">
        <ul className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-7 gap-y-2 px-4 py-4 text-sm font-medium text-emerald-50">
          <li>Ventas</li><li>Productos</li><li>Inventario</li><li>Clientes</li><li>Comprobantes</li><li>Reportes</li>
        </ul>
      </div>

      <section id="nosotros" className="scroll-mt-28 bg-[#f5f7f4]">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-[0.7fr_1.3fr] md:py-20 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-800">El proyecto</p>
            <h2 className="mt-3 text-3xl font-extrabold">Quiénes somos</h2>
          </div>
          <div className="max-w-3xl">
            <p className="text-xl font-semibold leading-8 text-neutral-800">
              Tienda Plus es una plataforma de gestión creada para ayudar a los pequeños negocios a trabajar con más orden.
            </p>
            <p className="mt-4 leading-7 text-neutral-600">
              Reunimos en un solo espacio tareas que suelen quedar repartidas entre cuadernos, hojas de cálculo y distintas aplicaciones: registrar ventas, mantener productos al día, organizar clientes y revisar reportes. El proyecto está enfocado en las necesidades cotidianas de quienes emprenden y administran negocios en el Perú.
            </p>
            <p className="mt-4 leading-7 text-neutral-600">
              La plataforma funciona desde el navegador y se configura según el rubro, para que cada negocio encuentre a mano las herramientas que necesita.
            </p>
          </div>
        </div>
      </section>

      <section id="solucion" className="scroll-mt-28">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase text-emerald-800">Una operación más ordenada</p>
            <h2 className="mt-3 text-3xl font-extrabold">Una solución para el trabajo diario</h2>
            <p className="mt-4 leading-7 text-neutral-600">
              Desde la primera venta hasta el seguimiento de tus productos, Tienda Plus conecta la información que necesitas para administrar tu negocio.
            </p>
          </div>
          <dl className="mt-10 grid gap-x-12 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "Ventas", description: "Registra ventas y consulta su historial en un solo lugar." },
              { title: "Productos e inventario", description: "Organiza tu catálogo, precios y movimientos de stock." },
              { title: "Clientes", description: "Mantén sus datos e historial de compras disponibles." },
              { title: "Comprobantes", description: "Consulta, imprime y comparte comprobantes en PDF." },
              { title: "Reportes", description: "Revisa tus operaciones con información ordenada." },
              { title: "Sucursales", description: "Administra sedes y consulta el movimiento de cada una." },
            ].map((item, index) => (
              <div key={item.title} className="border-t-2 border-emerald-800 py-5">
                <dt className="text-lg font-bold">{item.title}</dt>
                <dd className="mt-2 leading-6 text-neutral-600">{item.description}</dd>
                <span aria-hidden="true" className="mt-4 block text-sm font-bold text-emerald-800">0{index + 1}</span>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="mision-vision" className="scroll-mt-28 bg-[#f5f7f4]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <p className="text-sm font-bold uppercase text-emerald-800">Nuestro propósito</p>
          <h2 className="mt-3 text-3xl font-extrabold">Misión y visión</h2>
          <div className="mt-9 grid gap-10 md:grid-cols-2 md:gap-16">
            <article className="border-l-4 border-emerald-800 pl-5">
              <h3 className="text-xl font-bold">Misión</h3>
              <p className="mt-3 leading-7 text-neutral-700">
                Facilitar la gestión diaria de los pequeños negocios con herramientas digitales claras, útiles y accesibles, para que puedan dedicar más tiempo a atender a sus clientes y hacer crecer sus proyectos.
              </p>
            </article>
            <article className="border-l-4 border-[#e8a63a] pl-5">
              <h3 className="text-xl font-bold">Visión</h3>
              <p className="mt-3 leading-7 text-neutral-700">
                Ser una plataforma confiable para los negocios peruanos que buscan ordenar sus operaciones y avanzar hacia una gestión más digital, sin perder de vista la realidad de cada emprendimiento.
              </p>
            </article>
          </div>
          <div className="mt-14 border-t border-neutral-300 pt-8">
            <h3 className="text-xl font-bold">Nuestros valores</h3>
            <dl className="mt-6 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { title: "Claridad", description: "Información comprensible para decidir con confianza." },
                { title: "Utilidad", description: "Funciones pensadas para el trabajo cotidiano del negocio." },
                { title: "Cercanía", description: "Un producto diseñado para la realidad de los negocios peruanos." },
                { title: "Mejora continua", description: "Una plataforma que evoluciona a partir de necesidades reales." },
              ].map((value) => (
                <div key={value.title}>
                  <dt className="font-bold text-emerald-900">{value.title}</dt>
                  <dd className="mt-2 text-sm leading-6 text-neutral-600">{value.description}</dd>
                </div>
              ))}
            </dl>
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
                <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-800 text-xl font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-4 text-lg font-bold text-neutral-900">{s.t}</h3>
                <p className="mt-2 text-neutral-600">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TIPOS DE NEGOCIO */}
      <section id="rubros" className="scroll-mt-28 border-b border-neutral-200 bg-white py-14">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-center text-sm font-bold uppercase text-emerald-800">Flexible por naturaleza</p>
          <h2 className="mt-3 text-center text-3xl font-extrabold text-neutral-900">
            Para distintos tipos de negocio
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center leading-7 text-neutral-600">
            Tiendas, bodegas, restaurantes y servicios tienen procesos distintos. Tienda Plus configura las herramientas iniciales según la actividad de cada negocio.
          </p>
          <ul className="mt-8 grid grid-cols-2 gap-x-6 border-y border-neutral-200 sm:grid-cols-3 lg:grid-cols-4">
            {BUSINESS_TYPES.map((t) => (
              <li key={t.value} className="border-b border-neutral-200 py-3 text-sm font-medium text-neutral-700">
                <span aria-hidden="true" className="mr-2">{t.emoji}</span>{t.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="faq-heading" className="border-y border-neutral-200 bg-[#f5f7f4]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 md:py-20 lg:px-8">
          <p className="text-sm font-bold uppercase text-emerald-800">Información del producto</p>
          <h2 id="faq-heading" className="mt-3 text-3xl font-extrabold">Preguntas frecuentes</h2>
          <div className="mt-8 divide-y divide-neutral-300 border-y border-neutral-300">
            <details className="py-5">
              <summary className="cursor-pointer font-bold">¿Qué es Tienda Plus?</summary>
              <p className="mt-3 leading-7 text-neutral-600">Es un sistema de gestión en línea para organizar ventas, productos, inventario, clientes, comprobantes y reportes de pequeños negocios.</p>
            </details>
            <details className="py-5">
              <summary className="cursor-pointer font-bold">¿Puedo usarlo desde el celular?</summary>
              <p className="mt-3 leading-7 text-neutral-600">Sí. Puedes entrar desde un navegador en tu celular, tablet o computadora con conexión a internet.</p>
            </details>
            <details className="py-5">
              <summary className="cursor-pointer font-bold">¿La integración con SUNAT ya está activa?</summary>
              <p className="mt-3 leading-7 text-neutral-600">La integración se encuentra en etapa beta. Verifica su disponibilidad antes de depender de ella para emitir comprobantes tributarios oficiales.</p>
            </details>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="bg-[#123b35] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-14 sm:px-6 md:flex-row md:items-center md:justify-between md:py-16 lg:px-8">
          <div>
            <p className="text-sm font-bold uppercase text-emerald-200">Empieza con lo esencial</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-extrabold">Dale más orden a la gestión de tu negocio.</h2>
            <p className="mt-3 text-emerald-50">Crea una cuenta y configura Tienda Plus según lo que haces.</p>
          </div>
          <Link href="/register" className="inline-flex shrink-0 justify-center rounded-lg bg-[#f5c451] px-7 py-3.5 font-bold text-neutral-950 hover:bg-[#ffda79]">
            Crear cuenta gratis
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      </main>
      <footer className="bg-neutral-950 text-neutral-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="font-bold text-white">Tienda Plus</p>
            <p className="mt-1 text-sm">Tecnología para negocios peruanos.</p>
          </div>
          <nav aria-label="Navegación del pie de página" className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <a href="#nosotros" className="hover:text-white">Quiénes somos</a>
            <a href="#mision-vision" className="hover:text-white">Misión y visión</a>
            <Link href="/login" className="hover:text-white">Ingresar</Link>
            <Link href="/register" className="hover:text-white">Crear cuenta</Link>
          </nav>
          <p className="text-sm">Perú</p>
        </div>
      </footer>
    </div>
    </>
  );
}