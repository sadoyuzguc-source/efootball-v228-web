import React, { useId } from "react";
import { number } from "./ui";
import styles from "./DashboardMetric.module.css";

export default function DashboardMetric({ Icon, count, label, color }) {
  const gradient = `metric-metal-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <div
      className={`metric ${styles.metric}`}
      style={{ "--metric-accent": color }}
    >
      <div className={styles.badge} aria-hidden="true">
        <span className={styles.rim} />
        <Icon
          className={styles.glyph}
          size={30}
          strokeWidth={1.75}
          stroke={`url(#${gradient})`}
        >
          <defs>
            <linearGradient
              id={gradient}
              x1="4"
              y1="2"
              x2="21"
              y2="24"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0" stopColor="#f1fbff" />
              <stop offset=".38" stopColor={color} />
              <stop offset=".7" stopColor={color} />
              <stop offset="1" stopColor="#f1fbff" stopOpacity=".9" />
            </linearGradient>
          </defs>
        </Icon>
        <span className={styles.spark} />
      </div>
      <strong>{number(count)}</strong>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
