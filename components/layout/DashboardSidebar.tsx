"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, LogOut, UserRound, X } from "lucide-react";
import Q1Brand from "../Q1Brand";
import { useDialogFocus } from "../useDialogFocus";
import type { Rec } from "@/lib/client";
import type { Section, NavItem } from "../Dashboard";
const basicSections: Section[] = [
  "overview",
  "analytics",
  "menu",
  "calls",
  "shifts",
];
const utilitySections: Section[] = ["reports", "jobs"];
type PropsSidebar = {
  me: Rec;
  venues: Rec[];
  venueId: number | null;
  allowed: NavItem[];
  current: Section;
  open: boolean;
  chooseVenue: (id: number) => void;
  navigate: (section: Section) => void;
  logout: () => void;
  close: () => void;
};

function venueMonogram(name: string) {
  const words = name
    .trim()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .filter(
      (word) =>
        !["ТОО", "ИП", "LLP", "LTD", "TOO"].includes(word.toUpperCase()),
    );
  if (!words.length) return "Q";
  return (
    words.length === 1
      ? words[0].slice(0, 1)
      : words
          .slice(0, 2)
          .map((word) => word[0])
          .join("")
  ).toLocaleUpperCase("ru-RU");
}

function VenueSwitcher({
  venues,
  venueId,
  chooseVenue,
}: {
  venues: Rec[];
  venueId: number | null;
  chooseVenue: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = venues.find((item) => Number(item.id) === venueId);
  const name = String(current?.name || "Выберите заведение");

  useEffect(() => {
    setExpanded(false);
  }, [venueId]);

  useEffect(() => {
    if (!expanded) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setExpanded(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [expanded]);

  return (
    <div className={`q1-vswitch ${expanded ? "is-open" : ""}`} ref={root}>
      <button
        ref={trigger}
        type="button"
        className="q1-vswitch-trigger"
        disabled={!venues.length}
        aria-expanded={expanded}
        aria-controls="q1-venue-choices"
        onClick={() => setExpanded((value) => !value)}
      >
        <span className="q1-vswitch-avatar" aria-hidden="true">
          {venueMonogram(name)}
        </span>
        <span className="q1-vswitch-copy">
          <span className="q1-vswitch-overline">ВАШЕ ЗАВЕДЕНИЕ</span>
          <strong title={name}>{name}</strong>
          <small>
            {venues.length > 1
              ? `${venues.length} заведения в кабинете`
              : "Подключено к Q1"}
          </small>
        </span>
        <span className="q1-vswitch-arrow">
          <ChevronDown size={16} />
        </span>
      </button>

      {expanded && (
        <div
          id="q1-venue-choices"
          className="q1-vswitch-menu"
          role="group"
          aria-label="Выбор заведения"
        >
          <div className="q1-vswitch-menu-head">
            <span>ВАШИ ЗАВЕДЕНИЯ</span>
            <b>{venues.length}</b>
          </div>
          <div className="q1-vswitch-options">
            {venues.map((item) => {
              const active = Number(item.id) === venueId;
              const title = String(item.name || `Заведение #${item.id}`);
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`q1-vswitch-option ${active ? "is-active" : ""}`}
                  aria-pressed={active}
                  onClick={() => {
                    setExpanded(false);
                    if (!active) chooseVenue(Number(item.id));
                  }}
                >
                  <span className="q1-vswitch-small-avatar" aria-hidden="true">
                    {venueMonogram(title)}
                  </span>
                  <span className="q1-vswitch-option-copy">
                    <strong title={title}>{title}</strong>
                    <small>
                      {active ? "Текущее заведение" : "Перейти в кабинет"}
                    </small>
                  </span>
                  {active && <Check size={16} className="q1-vswitch-check" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================
   SIDEBAR NAVIGATION
   ========================================= */

function SidebarNav({
  items,
  current,
  navigate,
}: {
  items: NavItem[];
  current: Section;
  navigate: (key: Section) => void;
}) {
  return (
    <div className="q1-side-links">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            type="button"
            key={item.key}
            className={`nav-item q1-side-link ${current === item.key ? "active" : ""}`}
            aria-current={current === item.key ? "page" : undefined}
            onClick={() => navigate(item.key)}
          >
            <span className="q1-side-link-icon">
              <Icon size={18} strokeWidth={1.85} />
            </span>
            <span className="q1-side-link-name">{item.label}</span>
            {current === item.key && (
              <span className="nav-marker q1-side-marker" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/* =========================================
   SIDEBAR — FIXED BRAND & PROFILE
   ========================================= */

export default function Sidebar({
  me,
  venues,
  venueId,
  allowed,
  current,
  open,
  chooseVenue,
  navigate,
  logout,
  close,
}: PropsSidebar) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width:800px)");
    const sync = () => setMobile(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useDialogFocus(open && mobile, "#q1-sidebar", close);
  const basic = allowed.filter((item) => basicSections.includes(item.key));
  const tools = allowed.filter((item) => utilitySections.includes(item.key));

  return (
    <aside
      id="q1-sidebar"
      className={`sidebar q1-sidebar q1-sidebar-compact ${open ? "sidebar-open" : ""}`}
      aria-label="Боковое меню"
      inert={mobile && !open}
    >
      <div className="q1-side-glow" aria-hidden="true" />
      <div className="sidebar-brand q1-sidebar-brand">
        <Q1Brand />
        <button
          type="button"
          className="q1-side-close mobile-close"
          onClick={close}
          aria-label="Закрыть меню"
        >
          <X size={20} />
        </button>
      </div>

      <div className="q1-sidebar-scroll">
        <div className="q1-side-workspace">
          <span className="q1-side-eyebrow">РАБОЧЕЕ ПРОСТРАНСТВО</span>
          <span className="q1-side-workspace-line" />
        </div>
        <VenueSwitcher
          venues={venues}
          venueId={venueId}
          chooseVenue={chooseVenue}
        />

        <nav className="sidebar-nav q1-side-nav" aria-label="Разделы кабинета">
          {!!basic.length && (
            <>
              <div className="sidebar-label q1-side-group-title">
                УПРАВЛЕНИЕ
              </div>
              <SidebarNav items={basic} current={current} navigate={navigate} />
            </>
          )}
          {!!tools.length && (
            <>
              <div className="sidebar-label q1-side-group-title q1-side-group-spaced">
                ИНСТРУМЕНТЫ
              </div>
              <SidebarNav items={tools} current={current} navigate={navigate} />
            </>
          )}
        </nav>
      </div>

      <div className="q1-sidebar-footer">
        <div className="sidebar-profile q1-side-profile">
          <span className="profile-avatar q1-side-avatar">
            <UserRound size={19} />
          </span>
          <div className="q1-side-profile-text">
            <b title={String(me.full_name || me.email)}>
              {me.full_name || me.email}
            </b>
            <small title={String(me.email)}>{me.email}</small>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Выйти из аккаунта"
            aria-label="Выйти из аккаунта"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </aside>
  );
}
