"use client";
import { useEffect, useState } from "react";
export { default } from "./brand/Q1SplashLoader";
let completed = false;
export function useInitialSplash(pending: boolean) {
  const [visible, setVisible] = useState(() => !completed);
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(false);
  const [reduced, setReduced] = useState(false);
  const leaving = elapsed && !pending;
  useEffect(() => {
    if (completed) return;
    let cancelled = false,
      frame = 0,
      timer = 0;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    setReduced(reduce);
    // Start once after hydration, font loading and the first content paint.
    void document.fonts.ready.then(() => {
      if (cancelled) return;
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          if (cancelled) return;
          setPlaying(true);
          timer = window.setTimeout(
            () => setElapsed(true),
            reduce ? 100 : 1800,
          );
        });
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, []);
  useEffect(() => {
    if (!leaving) return;
    const timer = window.setTimeout(
      () => {
        completed = true;
        setVisible(false);
      },
      reduced ? 0 : 320,
    );
    return () => window.clearTimeout(timer);
  }, [leaving, reduced]);
  return { visible, leaving, playing };
}
