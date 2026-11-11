import type { Metadata } from "next";
import "./globals.css";
import "./q1-showcase.css";
import "./q1-auth-v93.css";
export const metadata:Metadata={title:"Q1 — Кабинет заведения",description:"Управление меню и аналитика сервиса Q1 by MindTech"};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ru"><body>{children}</body></html>}
