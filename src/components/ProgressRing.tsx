'use client';

/**
 * Apple-Health-style circular progress ring.
 *
 * SVG rather than CSS: a conic-gradient can draw the arc but cannot give it
 * rounded caps, and `stroke-dasharray` on a circle is the standard, accessible
 * way to do this. The ring is drawn from 12 o'clock clockwise by rotating the
 * group -90°.
 *
 * Sizing is driven by the parent's CSS class, not props — the SVG scales to
 * its box via `viewBox`, so a phone and a desktop get the same component at
 * different sizes with no JS involved (§12).
 */

import React from 'react';

/** Geometry is in viewBox units; the rendered size comes from CSS. */
const VIEWBOX = 120;
const STROKE = 12;
const RADIUS = (VIEWBOX - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface ProgressRingProps {
  /** 0–100. Clamped, so a bad input cannot draw an arc longer than the ring. */
  percent: number;
  /** Big number in the middle. Defaults to `{percent}%`. */
  value?: string;
  /** Caption under the ring. */
  label: string;
  /** Any CSS colour or custom property. */
  tone?: string;
}

export default function ProgressRing({
  percent,
  value,
  label,
  tone = 'var(--accent-orange)',
}: ProgressRingProps) {
  const safePercent = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  const offset = CIRCUMFERENCE * (1 - safePercent / 100);

  return (
    <div className="progress-ring">
      <svg
        className="progress-ring-svg"
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        role="img"
        aria-label={`${label}: ${safePercent}%`}
      >
        <g transform={`rotate(-90 ${VIEWBOX / 2} ${VIEWBOX / 2})`}>
          <circle
            cx={VIEWBOX / 2}
            cy={VIEWBOX / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--grid-empty)"
            strokeWidth={STROKE}
          />
          <circle
            className="progress-ring-arc"
            cx={VIEWBOX / 2}
            cy={VIEWBOX / 2}
            r={RADIUS}
            fill="none"
            stroke={tone}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
          />
        </g>
      </svg>

      {/* aria-hidden: the accessible name already lives on the svg above, so
          screen readers would otherwise announce the number twice. */}
      <span className="progress-ring-value" aria-hidden="true">
        {value ?? `${safePercent}%`}
      </span>
      <span className="progress-ring-label">{label}</span>
    </div>
  );
}
