import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "../styles/dashboard.css";
import "../styles/login.css";
import "../styles/auth.css";
import "../styles/design-system.css";
export const viewport: Viewport = {
  themeColor: "#cae213",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.APP_ORIGIN || "https://dashboard.mindtech.kz",
  ),
  title: "Q1 — Кабинет заведения",
  description:
    "Меню, команда и аналитика ресторана — в одном пространстве Q1 by MindTech.",
  icons: {
    icon: [
      { url: "/brand/q1-icon.svg", type: "image/svg+xml" },
      { url: "/brand/q1-icon-32.png", sizes: "32x32" },
    ],
    apple: "/brand/q1-apple-icon.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: {
    type: "website",
    locale: "ru_RU",
    siteName: "Q1 by MindTech",
    title: "Q1 — Кабинет заведения",
    description: "Меню, команда и аналитика ресторана — в одном пространстве.",
    images: [{ url: "/brand/q1-social-v1.png", alt: "Q1 by MindTech" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Q1 — Кабинет заведения",
    images: ["/brand/q1-social-v1.png"],
  },
  robots: { index: false, follow: false },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
