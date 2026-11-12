"use client";
import { useEffect } from "react";
/** Focus, Escape, background scroll, and keyboard containment shared by drawers. */
export function useDialogFocus(
  open: boolean,
  selector: string,
  close: () => void,
) {
  useEffect(() => {
    if (!open) return;
    const root = document.querySelector<HTMLElement>(selector);
    if (!root) return;
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
        ),
      ).filter((x) => x.getClientRects().length);
    focusable()[0]?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const list = focusable(),
        first = list[0],
        last = list.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    root.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      root.removeEventListener("keydown", key);
      previous?.focus();
    };
    // The lifecycle follows visibility; callers supply the close action for that opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selector]);
}
