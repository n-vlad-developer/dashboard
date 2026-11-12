"use client";
import { useEffect, useRef, useState, type InputHTMLAttributes } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;
/** A shared calendar avoids platform-specific date input sizing and formatting. */
export default function DateField(props: Props) {
  const [open, setOpen] = useState(false),
    [month, setMonth] = useState(() =>
      String(props.value || new Date().toISOString()).slice(0, 7),
    );
  const root = useRef<HTMLSpanElement>(null),
    input = useRef<HTMLInputElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  const date = new Date(`${month}-01T12:00:00Z`),
    valid = Number.isFinite(date.getTime());
  const first = valid ? date : new Date(),
    year = first.getUTCFullYear(),
    m = first.getUTCMonth(),
    offset = (new Date(Date.UTC(year, m, 1)).getUTCDay() + 6) % 7;
  function move(n: number) {
    setMonth(new Date(Date.UTC(year, m + n, 1)).toISOString().slice(0, 7));
  }
  function choose(value: string) {
    // Use the real input setter so existing controlled React forms keep their contract.
    const el = input.current!;
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    setOpen(false);
    trigger.current?.focus();
  }
  return (
    <span
      className="date-field"
      ref={root}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setOpen(false);
          trigger.current?.focus();
        }
      }}
    >
      <input
        {...props}
        ref={input}
        type="text"
        inputMode="numeric"
        placeholder="ГГГГ-ММ-ДД"
        pattern="\d{4}-\d{2}-\d{2}"
        maxLength={10}
      />
      <button
        ref={trigger}
        type="button"
        className="date-trigger"
        aria-label="Открыть календарь"
        aria-expanded={open}
        disabled={props.disabled}
        onClick={() => {
          if (props.value) setMonth(String(props.value).slice(0, 7));
          setOpen(!open);
        }}
      >
        <CalendarDays size={17} />
      </button>
      {open && (
        <span className="date-popover" role="dialog" aria-label="Выбор даты">
          <span className="date-month">
            <button
              type="button"
              aria-label="Предыдущий месяц"
              onClick={() => move(-1)}
            >
              <ChevronLeft size={18} />
            </button>
            <b>
              {new Intl.DateTimeFormat("ru-RU", {
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              }).format(first)}
            </b>
            <button
              type="button"
              aria-label="Следующий месяц"
              onClick={() => move(1)}
            >
              <ChevronRight size={18} />
            </button>
          </span>
          <span className="date-grid">
            {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((x) => (
              <small key={x}>{x}</small>
            ))}
            {Array.from({ length: 42 }, (_, i) => {
              const d = new Date(Date.UTC(year, m, i - offset + 1)),
                value = d.toISOString().slice(0, 10);
              return (
                <button
                  type="button"
                  key={value}
                  className={`${d.getUTCMonth() !== m ? "other-month" : ""} ${value === props.value ? "selected" : ""}`}
                  aria-label={value}
                  aria-pressed={value === props.value}
                  onClick={() => choose(value)}
                >
                  {d.getUTCDate()}
                </button>
              );
            })}
          </span>
        </span>
      )}
    </span>
  );
}
