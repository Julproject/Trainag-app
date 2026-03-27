// lib/paceCalculator.ts
import type { PaceReference, TargetPaces, SessionType } from "./types";

// ── Formatage ─────────────────────────────────────────────────────────────────

export function formatPace(secPerKm: number): string {
  const min = Math.floor(secPerKm / 60);
  const sec = Math.round(secPerKm % 60);
  return `${min}'${sec.toString().padStart(2, "0")}"/km`;
}

export function formatSwim(sec100m: number): string {
  const min = Math.floor(sec100m / 60);
  const sec = Math.round(sec100m % 60);
  return `${min}'${sec.toString().padStart(2, "0")}"/100m`;
}

export function secPerKmFromMinKm(minKm: string): number {
  // Accepte "5:30", "5'30", "5.5"
  const cleaned = minKm.replace("'", ":").replace('"', "");
  if (cleaned.includes(":")) {
    const [m, s] = cleaned.split(":").map(Number);
    return m * 60 + (s || 0);
  }
  return parseFloat(cleaned) * 60;
}

// ── Zones de course à pied ────────────────────────────────────────────────────
// Basé sur l'allure de référence (ex: allure marathon ou 10km)
// Z1 récup = +90s/km, Z2 endurance = +60s/km, Z3 tempo = +20s/km
// Z4 seuil = ref, Z5 fractionné = -15s/km

export function getRunPaces(ref: number, type: SessionType): string[] {
  switch (type) {
    case "recup-active":
    case "repos":
      return [`Allure très facile : ${formatPace(ref + 90)} à ${formatPace(ref + 120)}`];
    case "endurance":
      return [
        `Allure Z2 (endurance) : ${formatPace(ref + 55)} à ${formatPace(ref + 70)}`,
        `Respiration facile, conversation possible`,
      ];
    case "longue-sortie":
      return [
        `Allure Z2 : ${formatPace(ref + 50)} à ${formatPace(ref + 75)}`,
        `Restez confortable toute la sortie`,
      ];
    case "seuil":
      return [
        `Allure seuil Z4 : ${formatPace(ref - 10)} à ${formatPace(ref + 5)}`,
        `Respiration contrôlée mais soutenue`,
        `FC : ~85–90% FC max`,
      ];
    case "fractionne":
      return [
        `400m : ~${formatPace(ref - 25)} (allure 5km)`,
        `1000m : ~${formatPace(ref - 15)}`,
        `Récup : trot à ${formatPace(ref + 80)}`,
      ];
    default:
      return [`Allure modérée : ${formatPace(ref + 30)}`];
  }
}

// ── Zones natation ────────────────────────────────────────────────────────────
// Z2 = +15s/100m, seuil = ref, rapide = -10s/100m

export function getSwimPaces(ref: number, type: SessionType): string[] {
  switch (type) {
    case "natation":
      if (type === "natation") {
        return [
          `Endurance : ${formatSwim(ref + 15)} à ${formatSwim(ref + 20)}`,
          `Seuil : ${formatSwim(ref)} à ${formatSwim(ref + 5)}`,
          `Sprint (50m) : ~${formatSwim(ref - 12)}`,
        ];
      }
      return [`${formatSwim(ref + 10)}`];
    default:
      return [`Allure confortable : ${formatSwim(ref + 15)}`];
  }
}

// ── Zones vélo ────────────────────────────────────────────────────────────────

export function getBikePaces(speedKmh: number, ftpWatts: number | undefined, type: SessionType): string[] {
  const z2Speed = Math.round(speedKmh * 0.82);
  const z3Speed = Math.round(speedKmh * 0.90);
  const z4Speed = Math.round(speedKmh * 0.97);
  const z5Speed = Math.round(speedKmh * 1.05);

  const ftpLines = ftpWatts
    ? [
        `FTP : ${ftpWatts}W → Z2: ${Math.round(ftpWatts * 0.60)}–${Math.round(ftpWatts * 0.75)}W`,
        `Z4 seuil: ${Math.round(ftpWatts * 0.91)}–${Math.round(ftpWatts * 1.05)}W`,
      ]
    : [];

  switch (type) {
    case "velo":
    case "endurance":
      return [
        `Z2 endurance : ~${z2Speed}–${z3Speed} km/h`,
        `Cadence cible : 85–95 rpm`,
        ...ftpLines,
      ];
    case "seuil":
      return [
        `Z4 seuil : ~${z4Speed} km/h`,
        `Effort soutenu, respiration contrôlée`,
        ...(ftpWatts ? [`Watts cible : ${Math.round(ftpWatts * 0.91)}–${Math.round(ftpWatts * 1.05)}W`] : []),
      ];
    case "fractionne":
      return [
        `Intervalles Z5 : ~${z5Speed} km/h`,
        `Récup Z1 : ~${Math.round(speedKmh * 0.60)} km/h`,
        ...(ftpWatts ? [`Watts cible : >${Math.round(ftpWatts * 1.06)}W`] : []),
      ];
    case "longue-sortie":
      return [
        `Z2 constant : ~${z2Speed}–${z3Speed} km/h`,
        `Nutrition : 1 gel toutes les 45min`,
      ];
    case "brique":
      return [
        `Vélo Z3 : ~${z3Speed} km/h`,
        `→ Transition rapide`,
        `Cap Z2 : ${formatPace(Math.round(speedKmh > 0 ? 3600 / (speedKmh * 0.25) : 360))}`,
      ];
    default:
      return [`Allure modérée : ~${z2Speed} km/h`];
  }
}

// ── Calcul allures triathlon ──────────────────────────────────────────────────

export function getTriPaces(ref: PaceReference, type: SessionType): string[] {
  const lines: string[] = [];

  if (type === "natation" && ref.swimPaceSec100m) {
    return getSwimPaces(ref.swimPaceSec100m, type);
  }

  if ((type === "velo" || type === "brique") && ref.bikeSpeedKmh) {
    return getBikePaces(ref.bikeSpeedKmh, ref.bikeFTPWatts, type);
  }

  if (ref.runPaceSecPerKm) {
    return getRunPaces(ref.runPaceSecPerKm, type);
  }

  return lines;
}

// ── Point d'entrée principal ──────────────────────────────────────────────────

export function computeTargetPaces(
  sport: string,
  type: SessionType,
  ref: PaceReference
): TargetPaces {
  let lines: string[] = [];

  if (sport === "marathon" || sport === "semi-marathon") {
    if (ref.runPaceSecPerKm) {
      lines = getRunPaces(ref.runPaceSecPerKm, type);
    }
  } else if (sport === "velo") {
    if (ref.bikeSpeedKmh) {
      lines = getBikePaces(ref.bikeSpeedKmh, ref.bikeFTPWatts, type);
    }
  } else if (sport === "triathlon") {
    lines = getTriPaces(ref, type);
  }

  return { lines };
}
