import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Q1 — Кабинет заведения",
    short_name: "Q1",
    lang: "ru",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#cae213",
    icons: [
      { src: "/brand/q1-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
