
import Image from "next/image";

type Props = {
  compact?: boolean;
  subtitle?: boolean;
  className?: string;
};

export default function Q1Brand({ compact = false, subtitle = true, className = "" }: Props) {
  return <div className={`q1-brand q1-brand--premium ${compact ? "compact" : ""} ${className}`}>
    <span className="q1-brand-logo-wrap">
      <Image src="/q1-logo.png" alt="Q1" width={compact ? 46 : 58} height={compact ? 46 : 58} className="q1-brand-logo" priority />
    </span>

    <span className="q1-brand-text">
      <span className="q1-brand-kicker"><i /> Q1 WORKSPACE</span>
      <span className="q1-brand-title">Mind<span>Tech</span></span>
      {subtitle && <span className="q1-brand-subtitle">УПРАВЛЕНИЕ РЕСТОРАНОМ</span>}
    </span>
  </div>;
}
