import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Tienda Plus — Tu negocio, tu sistema",
    template: "%s | Tienda Plus",
  },
  icons: {
    icon: "/logo_icono.png",
    shortcut: "/logo_icono.png",
    apple: "/logo_icono.png",
  },
  description:
    "Sistema de gestión, ventas y facturación electrónica para pequeños negocios del Perú. Regístrate, configura tu negocio y empieza a vender.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}