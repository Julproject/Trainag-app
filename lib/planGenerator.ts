// lib/planGenerator.ts
import { v4 as uuidv4 } from "uuid";
import { computeTargetPaces } from "./paceCalculator";
import type {
  TrainingPlan, SportType, GoalType, Week, Session, SessionType, PaceReference,
} from "./types";

const PLAN_DURATIONS: Record<SportType, number> = {
  marathon: 16,
  "semi-marathon": 10,
  triathlon: 16,
  velo: 12,
};

function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
}

function getPlanStartDate(eventDate: string, totalWeeks: number): string {
  const event = new Date(eventDate);
  event.setDate(event.getDate() - totalWeeks * 7);
  return event.toISOString().split("T")[0];
}

function makeSession(
  sport: SportType,
  paceRef: PaceReference,
  day: number,
  type: SessionType,
  label: string,
  durationMin: number,
  description: string,
  options: Partial<Session> = {}
): Session {
  const intensityMap: Record<SessionType, Session["intensity"]> = {
    repos: "repos", "recup-active": "faible", endurance: "modere",
    natation: "modere", velo: "modere", muscu: "faible",
    seuil: "eleve", fractionne: "eleve", "longue-sortie": "modere", brique: "eleve",
  };

  const targetPaces = type !== "repos" && type !== "muscu"
    ? computeTargetPaces(sport, type, paceRef)
    : undefined;

  return {
    id: uuidv4(),
    day, type, label, durationMin, description,
    intensity: intensityMap[type] || "modere",
    targetPaces,
    ...options,
  };
}

function getWeekLoadFactor(weekNum: number, totalWeeks: number): number {
  if (weekNum % 4 === 0) return 0.65;
  const progress = weekNum / totalWeeks;
  if (progress < 0.3) return 0.7 + progress * 0.5;
  if (progress < 0.7) return 0.85 + Math.sin(progress * Math.PI) * 0.15;
  if (progress < 0.9) return 0.75 - (progress - 0.7) * 1.5;
  return 0.5;
}

function getPhase(weekNum: number, totalWeeks: number): Week["phase"] {
  const p = weekNum / totalWeeks;
  if (p < 0.25) return "base";
  if (p < 0.55) return "construction";
  if (p < 0.8) return "specifique";
  if (weekNum < totalWeeks) return "affutage";
  return "course";
}

// ── Builders par sport ────────────────────────────────────────────────────────

function buildMarathonWeek(sport: SportType, paceRef: PaceReference, weekNum: number, totalWeeks: number, hoursPerWeek: number): Session[] {
  const factor = getWeekLoadFactor(weekNum, totalWeeks);
  const scale = (hoursPerWeek * 60 * factor) / 360;
  const phase = getPhase(weekNum, totalWeeks);
  const mk = (day: number, type: SessionType, label: string, dur: number, desc: string, opts: Partial<Session> = {}) =>
    makeSession(sport, paceRef, day, type, label, Math.max(20, Math.round(dur * scale)), desc, opts);

  if (phase === "affutage" || phase === "course") return [
    mk(0, "endurance", "Footing récup", 40, "Allure très confortable Z2"),
    mk(2, "seuil", "Seuil court", 45, "15' échauffement + 2×10' allure semi + 10' calme"),
    mk(4, "longue-sortie", "Sortie longue courte", 70, "Allure marathon, confiance", { distanceKm: Math.round(12 * scale) }),
    makeSession(sport, paceRef, 6, "repos", "Repos", 0, "Repos complet"),
  ];

  if (phase === "base") return [
    mk(0, "endurance", "Footing endurance", 50, "Allure conversationnelle Z2"),
    mk(2, "endurance", "Footing tempo", 45, "Légèrement plus soutenu que Z2"),
    mk(4, "longue-sortie", "Sortie longue", 80, "Allure confortable, sans forcer", { distanceKm: Math.round(14 * scale) }),
    makeSession(sport, paceRef, 5, "recup-active", "Repos actif", 30, "Marche ou mobilité légère"),
    makeSession(sport, paceRef, 6, "repos", "Repos complet", 0, "Repos passif total"),
  ];

  return [
    mk(0, "endurance", "Footing récup", 45, "Z2 stricte"),
    mk(1, "fractionne", "Fractionné court", 55, "6–8×400m allure 5km avec 90s récup"),
    mk(3, "seuil", "Allure seuil", 55, "20–30' au seuil lactique"),
    mk(5, "longue-sortie", "Sortie longue", 90, "Allure marathon cible sur la fin", { distanceKm: Math.round(22 * scale) }),
    makeSession(sport, paceRef, 6, "repos", "Repos", 0, "Récupération passive"),
  ];
}

function buildSemiMarathonWeek(sport: SportType, paceRef: PaceReference, weekNum: number, totalWeeks: number, hoursPerWeek: number): Session[] {
  const factor = getWeekLoadFactor(weekNum, totalWeeks);
  const scale = (hoursPerWeek * 60 * factor) / 300;
  const phase = getPhase(weekNum, totalWeeks);
  const mk = (day: number, type: SessionType, label: string, dur: number, desc: string, opts: Partial<Session> = {}) =>
    makeSession(sport, paceRef, day, type, label, Math.max(20, Math.round(dur * scale)), desc, opts);

  if (phase === "affutage" || phase === "course") return [
    mk(0, "endurance", "Footing récup", 35, "Très léger"),
    mk(2, "seuil", "Allure semi", 40, "10' au seuil, bonne maîtrise"),
    mk(4, "longue-sortie", "Dernière longue", 60, "Relaxe, confiance", { distanceKm: Math.round(10 * scale) }),
  ];

  if (phase === "base") return [
    mk(0, "endurance", "Footing Z2", 40, "Endurance fondamentale"),
    mk(2, "endurance", "Footing varié", 40, "Quelques accélérations légères"),
    mk(5, "longue-sortie", "Sortie longue", 65, "Allure facile", { distanceKm: Math.round(11 * scale) }),
    makeSession(sport, paceRef, 6, "repos", "Repos", 0, "Repos passif"),
  ];

  return [
    mk(0, "endurance", "Footing récup", 35, "Z2 récupération"),
    mk(1, "fractionne", "Fractionné", 50, "5×1km à allure 10km avec 2' récup"),
    mk(3, "seuil", "Seuil progressif", 50, "25' au seuil lactique"),
    mk(5, "longue-sortie", "Sortie longue", 70, "Allure semi cible sur 5 derniers km", { distanceKm: Math.round(15 * scale) }),
    makeSession(sport, paceRef, 6, "repos", "Repos", 0, "Récupération passive"),
  ];
}

function buildTriathlonWeek(sport: SportType, paceRef: PaceReference, weekNum: number, totalWeeks: number, hoursPerWeek: number): Session[] {
  const factor = getWeekLoadFactor(weekNum, totalWeeks);
  const scale = (hoursPerWeek * 60 * factor) / 420;
  const phase = getPhase(weekNum, totalWeeks);
  const mk = (day: number, type: SessionType, label: string, dur: number, desc: string, opts: Partial<Session> = {}) =>
    makeSession(sport, paceRef, day, type, label, Math.max(20, Math.round(dur * scale)), desc, opts);

  if (phase === "affutage" || phase === "course") return [
    mk(0, "natation", "Natation légère", 40, "Technique, sans effort"),
    mk(2, "velo", "Vélo récup", 50, "Z2, petite vitesse"),
    mk(4, "endurance", "Footing court", 30, "20–25' allure facile"),
    makeSession(sport, paceRef, 5, "repos", "Repos complet", 0, "Récupération avant course"),
  ];

  if (phase === "base") return [
    mk(0, "natation", "Natation endurance", 50, "Technique + endurance, 1500–2000m"),
    mk(1, "velo", "Vélo Z2", 80, "Sortie longue vélo confortable"),
    mk(3, "endurance", "Footing Z2", 40, "Endurance fondamentale"),
    mk(5, "natation", "Natation technique", 45, "Focus technique de nage"),
    makeSession(sport, paceRef, 6, "repos", "Repos", 0, "Repos passif"),
  ];

  return [
    mk(0, "natation", "Natation seuil", 50, "8×100m allure rapide + 200m récup"),
    mk(1, "velo", "Vélo long", 90, "Z2–Z3, incluant côtes"),
    mk(2, "brique", "Séance brique vélo→cap", 60, "45' vélo + 15' course directement après"),
    mk(4, "endurance", "Footing seuil", 45, "20' seuil lactique"),
    mk(5, "natation", "Natation longue", 55, "Open water simulation si possible"),
    makeSession(sport, paceRef, 6, "repos", "Repos", 0, "Récupération passive"),
  ];
}

function buildVeloWeek(sport: SportType, paceRef: PaceReference, weekNum: number, totalWeeks: number, hoursPerWeek: number): Session[] {
  const factor = getWeekLoadFactor(weekNum, totalWeeks);
  const scale = (hoursPerWeek * 60 * factor) / 360;
  const phase = getPhase(weekNum, totalWeeks);
  const mk = (day: number, type: SessionType, label: string, dur: number, desc: string, opts: Partial<Session> = {}) =>
    makeSession(sport, paceRef, day, type, label, Math.max(20, Math.round(dur * scale)), desc, opts);

  if (phase === "affutage" || phase === "course") return [
    mk(0, "velo", "Vélo récup", 45, "Petits braquets, jambes tournantes"),
    mk(2, "seuil", "Seuil court vélo", 55, "2×10' au seuil + ouverture de vitesse"),
    mk(4, "velo", "Sortie légère", 60, "Allure facile, confiance"),
    makeSession(sport, paceRef, 6, "repos", "Repos", 0, "Avant la course"),
  ];

  if (phase === "base") return [
    mk(0, "velo", "Endurance vélo", 70, "Z2, cadence 80–90 rpm"),
    makeSession(sport, paceRef, 2, "muscu", "Muscu jambes", 45, "Squat, fentes, gainage"),
    mk(4, "velo", "Endurance + accélérations", 65, "Z2 + 4×1' Z4"),
    mk(6, "longue-sortie", "Sortie longue", 90, "Z2, progressive", { distanceKm: Math.round(60 * scale) }),
  ];

  return [
    mk(0, "recup-active", "Récupération active", 45, "Jambes légères"),
    mk(1, "fractionne", "Fractionné vélo", 65, "6×3' Z5 avec 3' récup"),
    mk(3, "seuil", "Seuil long", 70, "2×20' à allure seuil lactique"),
    mk(5, "longue-sortie", "Sortie longue", 110, "Z2–Z3, terrain varié", { distanceKm: Math.round(80 * scale) }),
    makeSession(sport, paceRef, 6, "repos", "Repos", 0, "Récupération passive"),
  ];
}

function buildWeekSessions(sport: SportType, paceRef: PaceReference, weekNum: number, totalWeeks: number, hoursPerWeek: number): Session[] {
  switch (sport) {
    case "marathon": return buildMarathonWeek(sport, paceRef, weekNum, totalWeeks, hoursPerWeek);
    case "semi-marathon": return buildSemiMarathonWeek(sport, paceRef, weekNum, totalWeeks, hoursPerWeek);
    case "triathlon": return buildTriathlonWeek(sport, paceRef, weekNum, totalWeeks, hoursPerWeek);
    case "velo": return buildVeloWeek(sport, paceRef, weekNum, totalWeeks, hoursPerWeek);
  }
}

export function generatePlan(
  sport: SportType,
  goal: GoalType,
  eventDate: string,
  hoursPerWeek: number,
  paceRef: PaceReference
): TrainingPlan {
  const totalWeeks = PLAN_DURATIONS[sport];
  const startDate = getPlanStartDate(eventDate, totalWeeks);
  const adjustedHours = goal === "debuter" ? Math.min(hoursPerWeek, 5) : hoursPerWeek;

  const phaseNotes: Record<Week["phase"], string> = {
    base: "Phase de base : construire l'aérobie, habituer le corps à l'effort régulier.",
    construction: "Phase de construction : augmenter l'intensité et la spécificité.",
    specifique: "Phase spécifique : séances proches des conditions de course.",
    affutage: "Affûtage : réduire le volume, garder l'intensité. Le corps récupère et absorbe.",
    course: "Semaine de course ! Restez léger, dormez bien, faites confiance à votre préparation.",
  };

  const weeks: Week[] = Array.from({ length: totalWeeks }, (_, i) => {
    const w = i + 1;
    const sessions = buildWeekSessions(sport, paceRef, w, totalWeeks, adjustedHours);
    return {
      weekNumber: w,
      startDate: addWeeks(startDate, i),
      phase: getPhase(w, totalWeeks),
      sessions,
      totalDurationMin: sessions.reduce((acc, s) => acc + s.durationMin, 0),
      notes: phaseNotes[getPhase(w, totalWeeks)],
    };
  });

  return {
    id: uuidv4(),
    sport, goal, eventDate, hoursPerWeek, totalWeeks, weeks, paceRef,
    createdAt: new Date().toISOString(),
  };
}
