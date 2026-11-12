"use client";
import { useEffect, useRef, useState } from "react";

export default function LoginPreviewChart() {
  const chart = useRef<SVGSVGElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!chart.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(chart.current);
    return () => observer.disconnect();
  }, []);
  return (
    <svg
      ref={chart}
      data-visible={visible}
      className="q1-auth-preview-chart"
      viewBox="0 0 540 126"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="q1-auth-chart-fill" x1="0" x2="0" y1="0" y2="1">
          <stop stopColor="#cae213" stopOpacity=".29" />
          <stop offset="1" stopColor="#cae213" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 102 C42 99 65 85 96 92 S152 65 190 75 S258 27 300 47 S364 64 400 35 S475 36 540 12 L540 126 L0 126 Z"
        className="q1-auth-chart-area"
        fill="url(#q1-auth-chart-fill)"
      />
      <path
        d="M0 102 C42 99 65 85 96 92 S152 65 190 75 S258 27 300 47 S364 64 400 35 S475 36 540 12"
        className="q1-auth-chart-line"
        pathLength={1}
        fill="none"
        stroke="#cae213"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
