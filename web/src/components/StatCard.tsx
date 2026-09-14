import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  tone?: "default" | "good" | "bad" | "warn";
  icon?: ReactNode;
}

export default function StatCard({ title, value, subtitle, tone = "default", icon }: StatCardProps) {
  return (
    <div className="card stat-card">
      <div className="stat-title">
        {icon && <span className="stat-icon">{icon}</span>}
        {title}
      </div>
      <div className={`stat-value tone-${tone}`}>{value}</div>
      {subtitle && <div className="stat-subtitle">{subtitle}</div>}
    </div>
  );
}
