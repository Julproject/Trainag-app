// lib/paceCalculator.ts
import type { PaceZones, PaceInstruction, DisciplineType, MicrocycleType } from "./types";

// ── Formatage ─────────────────────────────────────────────────────────────────

export function fmtPace(secPerKm: number): string {
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${s.toString().padStart(2, "0")}"/km`;
}

export function fmtSwim(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}'${s.toString().padStart(2, "0")}"/100m`;
}

export function fmtSpeed(kmh: number): string {
  return `${kmh.toFixed(1)} km/h`;
}

export function parsePaceInput(str: string): number | undefined {
  const cleaned = str.replace(/['"«»]/g, "").replace(",", ":").trim();
  if (!cleaned) return undefined;
  if (cleaned.includes(":")) {
    const [m, s] = cleaned.split(":").map(Number);
    if (isNaN(m) || isNaN(s)) return undefined;
    return m * 60 + s;
  }
  const n = parseFloat(cleaned);
  if (isNaN(n)) return undefined;
  return Math.round(n * 60);
}

// ── Dériver toutes les zones depuis l'allure M-race ───────────────────────────
// Si l'utilisateur ne donne que son allure M-race, on calcule les autres

export function deriveZones(mRacePace: number): Partial<PaceZones> {
  return {
    m_runPace: mRacePace,
    l_runPace: Math.round(mRacePace + 10),          // L-race = M + ~10s
    xx_runPace: Math.round(mRacePace - 15),          // XX = M - 15s
    x_runPace: Math.round(mRacePace + 50),           // X = M + 50s (5'20 si M=4'30)
    z0_runPace: Math.round(mRacePace + 120),         // Z0 = M + 2min (6'30 si M=4'30)
  };
}

export function deriveSwimZones(base100m: number): { easy: number; threshold: number; fast: number } {
  return {
    easy: Math.round(base100m + 15),
    threshold: base100m,
    fast: Math.round(base100m - 10),
  };
}

// ── Instructions d'allure par discipline et microcycle ───────────────────────

export function getRunPaces(zones: PaceZones, microcycle: MicrocycleType, subType?: string): PaceInstruction[] {
  const z0 = zones.z0_runPace ?? 390;
  const x = zones.x_runPace ?? 320;
  const m = zones.m_runPace ?? 270;
  const l = zones.l_runPace ?? 280;
  const xx = zones.xx_runPace ?? 255;

  switch (microcycle) {
    case "recup-active":
    case "repos":
      return [{ label: "Allure Z0 (fondamentale)", value: `${fmtPace(z0)} à ${fmtPace(z0 + 20)}`, zone: "Z0" }];

    case "foncier":
      return [
        { label: "Foncier Z0", value: `${fmtPace(z0)} à ${fmtPace(z0 + 15)}`, zone: "Z0" },
        { label: "Long run dim", value: fmtPace(z0 + 10), zone: "Z0" },
      ];

    case "rythme-X":
      if (subType === "fartlek") return [
        { label: "Allure X (fartlek)", value: fmtPace(x), zone: "X" },
        { label: "Récup entre efforts", value: `${fmtPace(z0)} à ${fmtPace(z0 + 20)}`, zone: "Z0" },
      ];
      if (subType === "fractionne-M") return [
        { label: "Allure M-race", value: fmtPace(m), zone: "M" },
        { label: "Récupération", value: fmtPace(z0 + 30), zone: "Z0" },
      ];
      return [
        { label: "Allure X", value: fmtPace(x), zone: "X" },
        { label: "Allure M-race", value: fmtPace(m), zone: "M" },
      ];

    case "intensif-XX":
      return [
        { label: "Allure XX (intensif)", value: fmtPace(xx), zone: "XX" },
        { label: "Allure M-race", value: fmtPace(m), zone: "M" },
        { label: "Récupération Z0", value: fmtPace(z0), zone: "Z0" },
      ];

    case "affutage":
      return [
        { label: "Séances vives X", value: fmtPace(x), zone: "X" },
        { label: "Footing récup", value: fmtPace(z0 + 10), zone: "Z0" },
      ];

    case "competition":
      return [
        { label: "Allure race M", value: fmtPace(m), zone: "M" },
        { label: "Allure race L", value: fmtPace(l), zone: "L" },
      ];
  }
}

export function getSwimPaces(zones: PaceZones, microcycle: MicrocycleType): PaceInstruction[] {
  const base = zones.swimPace100m ?? 105;
  const z = deriveSwimZones(base);

  switch (microcycle) {
    case "recup-active":
    case "repos":
      return [{ label: "Technique / récup", value: fmtSwim(z.easy + 10), zone: "Z0" }];
    case "foncier":
      return [
        { label: "Endurance", value: fmtSwim(z.easy), zone: "Z0–Z1" },
        { label: "Seuil", value: fmtSwim(z.threshold), zone: "Z3" },
      ];
    case "rythme-X":
    case "intensif-XX":
      return [
        { label: "Seuil", value: fmtSwim(z.threshold), zone: "Z3" },
        { label: "Effort rapide", value: fmtSwim(z.fast), zone: "Z4" },
        { label: "Récupération", value: fmtSwim(z.easy + 5), zone: "Z1" },
      ];
    case "affutage":
    case "competition":
      return [
        { label: "Activation", value: fmtSwim(z.easy), zone: "Z1" },
        { label: "Allure race", value: fmtSwim(z.threshold - 5), zone: "Z3" },
      ];
    default:
      return [{ label: "Allure confortable", value: fmtSwim(z.easy), zone: "Z1" }];
  }
}

export function getBikePaces(zones: PaceZones, microcycle: MicrocycleType, subType?: string): PaceInstruction[] {
  const spd = zones.bikeSpeedKmh ?? 30;
  const ftp = zones.bikeFTPWatts;

  const z2Spd = Math.round(spd * 0.80);
  const z3Spd = Math.round(spd * 0.88);
  const z4Spd = Math.round(spd * 0.96);
  const z5Spd = Math.round(spd * 1.05);

  const ftpStr = (ratio: number) => ftp ? ` · ${Math.round(ftp * ratio)}W` : "";

  switch (microcycle) {
    case "recup-active":
    case "repos":
      return [
        { label: "Z0 vélocité", value: `${fmtSpeed(z2Spd - 5)}${ftpStr(0.55)} · 90+ rpm`, zone: "Z0" },
      ];
    case "foncier":
      return [
        { label: "HT vélocité (una pierna)", value: `${fmtSpeed(z2Spd)}${ftpStr(0.65)} · 90 rpm`, zone: "Z2" },
        { label: "Sortie longue Z2", value: `${fmtSpeed(z2Spd)}–${fmtSpeed(z3Spd)}${ftpStr(0.72)}`, zone: "Z2" },
      ];
    case "rythme-X":
      if (subType === "ht") return [
        { label: "HT una pierna (1 jambe)", value: `${fmtSpeed(z2Spd)}${ftpStr(0.65)}`, zone: "Z2" },
        { label: "Séries X", value: `${fmtSpeed(z4Spd)}${ftpStr(0.92)}`, zone: "Z4" },
      ];
      return [
        { label: "HT vélocité", value: `${fmtSpeed(z2Spd)}${ftpStr(0.65)}`, zone: "Z2" },
        { label: "Effort Z3", value: `${fmtSpeed(z3Spd)}${ftpStr(0.82)}`, zone: "Z3" },
      ];
    case "intensif-XX":
      return [
        { label: "HT séries XX", value: `${fmtSpeed(z5Spd)}${ftpStr(1.10)}`, zone: "Z5" },
        { label: "Récupération", value: `${fmtSpeed(z2Spd - 3)}${ftpStr(0.55)}`, zone: "Z1" },
        ...(ftp ? [{ label: "FTP (seuil)", value: `${fmtSpeed(z4Spd)}${ftpStr(0.95)}`, zone: "Z4" }] : []),
      ];
    case "affutage":
    case "competition":
      return [
        { label: "Activation", value: `${fmtSpeed(z2Spd)}${ftpStr(0.60)}`, zone: "Z2" },
        { label: "Séances vives X", value: `${fmtSpeed(z4Spd)}${ftpStr(0.90)}`, zone: "Z4" },
      ];
    default:
      return [{ label: "Endurance Z2", value: `${fmtSpeed(z2Spd)}${ftpStr(0.65)}`, zone: "Z2" }];
  }
}
