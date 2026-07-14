import React from "react";
import { C, gradeColor, vamColor, prettyTime } from "../theme";
import { RiderChip } from "./RiderChip";
import type { Chip } from "../data";

type Vam = { inst: number; v500?: number; v1k?: number; v5k?: number };

// Mirrors src/views/ListView.svelte group section
export const GroupRow: React.FC<{
  label: string;
  size: number;
  gapToLeader: number;
  kph: number;
  km: number;
  trend?: "up" | "down";
  gradient?: number;
  windLabel?: string;
  windKph?: number;
  windDeg?: number;
  temp?: number;
  vam?: Vam;
  riders: Chip[];
  slowRiders?: number[];
}> = (p) => {
  const cell = { fontVariantNumeric: "tabular-nums" as const };
  return (
    <section
      style={{
        borderBottom: `2px solid ${C.liveAccent}`,
        padding: "12px 20px 16px",
      }}
    >
      <header
        style={{
          display: "flex",
          gap: 22,
          alignItems: "baseline",
          fontSize: 21,
          color: C.muted,
          paddingBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 24, color: C.ink }}>
          {p.label}
        </span>
        <span>
          {p.size} rider{p.size > 1 ? "s" : ""}
        </span>
        <span
          style={{ ...cell, color: C.liveAccent, fontWeight: 600 }}
        >
          {p.gapToLeader > 0 ? `+${prettyTime(p.gapToLeader)}` : "at the front"}
          {p.trend === "up" && (
            <span style={{ color: C.up, fontWeight: 700 }}> ↗</span>
          )}
          {p.trend === "down" && (
            <span style={{ color: C.down, fontWeight: 700 }}> ↘</span>
          )}
        </span>
        <span style={{ ...cell, fontWeight: 600, color: C.kph }}>
          {Math.round(p.kph)} km/h
        </span>
        <span style={cell}>{p.km.toFixed(1)} km to go</span>
        {p.windLabel != null && p.windKph != null && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              ...cell,
              fontWeight: 600,
              color: C.up,
            }}
          >
            <span
              style={{
                display: "inline-block",
                transform: `rotate(${p.windDeg ?? 0}deg)`,
                fontWeight: 700,
              }}
            >
              ↑
            </span>
            {Math.round(p.windKph)} km/h {p.windLabel}
          </span>
        )}
        {p.temp != null && (
          <span style={{ ...cell, fontWeight: 600 }}>{Math.round(p.temp)}°C</span>
        )}
        {p.gradient != null && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 3,
              ...cell,
              fontWeight: 700,
              color: gradeColor(p.gradient),
            }}
          >
            {p.gradient > 0 ? "↗" : p.gradient < 0 ? "↘" : "→"}
            {p.gradient > 0 ? "+" : ""}
            {Math.round(p.gradient * 10) / 10}%
          </span>
        )}
        {p.vam != null && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: 5,
              ...cell,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                fontWeight: 700,
                fontSize: 17,
                letterSpacing: "0.03em",
                color: C.faint,
              }}
            >
              VAM
            </span>
            <span style={{ color: vamColor(p.vam.inst) }}>{p.vam.inst}</span>
            <span style={{ color: "#bbb" }}>·</span>
            {p.vam.v500 ?? "—"}
            <span style={{ color: "#bbb" }}>·</span>
            {p.vam.v1k ?? "—"}
            <span style={{ color: "#bbb" }}>·</span>
            {p.vam.v5k ?? "—"}
          </span>
        )}
      </header>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {p.riders.map((r) => (
          <RiderChip
            key={r.bib}
            chip={r}
            slow={p.slowRiders?.includes(r.bib)}
          />
        ))}
      </div>
    </section>
  );
};
