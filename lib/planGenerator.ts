// lib/planGenerator.ts
import { v4 as uuidv4 } from "uuid";
import type {
  TrainingPlan,
  SportType,
  GoalType,
  Week,
  Session,
  SessionType,
} from "./types";

// ─── Constantes ───────────────────────────────────────────────────────────────

const PLAN_DURATIONS: Record<SportType, number> = {
  marathon: 16,
  "semi-marathon": 10,
  triathlon: 16,
  velo: 12,
};

const SPORT_LABELS: Record<SportType, string> = {
  marathon: "Marathon",
  "semi-marathon": "Semi-Marathon",
  triathlon: "Triathlon",
  velo: "Course à Vélo",
};

// ─── Utilitaires ──────────────────────────────────────────────────────────────

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
  day: number,
  type: SessionType,
  label: string,
  durationMin: number,
  description: string,
  options: Partial<Session> = {}
): Session {
  const intensityMap: Record<SessionType, Session["intensity"]> = {
    repos: "repos",
    "recup-active": "faible",
    endurance: "modere",
    natation: "modere",
    velo: "modere",
    muscu: "faible",
    seuil: "eleve",
    fractionne: "eleve",
    "longue-sortie": "modere",
    brique: "eleve",
  };
  return {
    id: uuidv4(),
    day,
    type,
    label,
    durationMin,
    description,
    intensity: intensityMap[type] || "modere",
    ...options,
  };
}

// ─── Calcul charge hebdomadaire cible ─────────────────────────────────────────
// Progression en U inversé : montée progressive, pic semaine 60-70%, descente affûtage

function getWeekLoadFactor(weekNum: number, totalWeeks: number): number {
  const progress = weekNum / totalWeeks;
  // Semaine de récup toutes les 3-4 semaines (~0.65 de charge)
  if (weekNum % 4 === 0) return 0.65;
  if (progress < 0.3) return 0.7 + progress * 0.5; // montée douce
  if (progress < 0.7) return 0.85 + Math.sin(progress * Math.PI) * 0.15; // pic
  if (progress < 0.9) return 0.75 - (progress - 0.7) * 1.5; // affûtage
  return 0.5; // dernière semaine : légèreté
}

function getPhase(
  weekNum: number,
  totalWeeks: number
): Week["phase"] {
  const progress = weekNum / totalWeeks;
  if (progress < 0.25) return "base";
  if (progress < 0.55) return "construction";
  if (progress < 0.8) return "specifique";
  if (weekNum < totalWeeks) return "affutage";
  return "course";
}

// ─── Templates de semaine ─────────────────────────────────────────────────────

function buildMarathonWeek(
  weekNum: number,
  totalWeeks: number,
  hoursPerWeek: number
): Session[] {
  const factor = getWeekLoadFactor(weekNum, totalWeeks);
  const totalMin = Math.round(hoursPerWeek * 60 * factor);
  const phase = getPhase(weekNum, totalWeeks);

  // Plan de base pour 6h/semaine, on scale ensuite
  const BASE = 360;
  const scale = totalMin / BASE;

  if (phase === "affutage" || phase === "course") {
    return [
      makeSession(0, "endurance", "Footing récup", Math.round(40 * scale), "Allure très confortable, respirez bien"),
      makeSession(2, "seuil", "Seuil court", Math.round(45 * scale), "15' échauffement + 2×10' allure semi + 10' retour calme"),
      makeSession(4, "longue-sortie", "Sortie longue courte", Math.round(70 * scale), "Dernière longue sortie, allure marathon confortable", { distanceKm: Math.round(12 * scale) }),
      makeSession(6, "repos", "Repos", 0, "Repos complet, hydratation, étirements"),
    ];
  }

  if (phase === "base") {
    return [
      makeSession(0, "endurance", "Footing endurance", Math.round(50 * scale), "Allure conversationnelle — Z2"),
      makeSession(2, "endurance", "Footing tempo", Math.round(45 * scale), "Légèrement plus soutenu que Z2"),
      makeSession(4, "longue-sortie", "Sortie longue", Math.round(80 * scale), "Allure confortable, sans forcer", { distanceKm: Math.round(14 * scale) }),
      makeSession(5, "repos", "Repos actif", 30, "Marche ou mobilité légère"),
      makeSession(6, "repos", "Repos complet", 0, "Repos passif total"),
    ];
  }

  // construction / specifique
  return [
    makeSession(0, "endurance", "Footing récup", Math.round(45 * scale), "Allure Z2 stricte"),
    makeSession(1, "fractionne", "Fractionné court", Math.round(55 * scale), "6–8×400m allure 5km avec 90s récup"),
    makeSession(3, "seuil", "Allure seuil", Math.round(55 * scale), "20–30' au seuil lactique (allure 10km course)"),
    makeSession(5, "longue-sortie", "Sortie longue", Math.round(90 * scale), "Allure marathon cible sur la fin", { distanceKm: Math.round(22 * scale) }),
    makeSession(6, "repos", "Repos", 0, "Récupération passive"),
  ];
}

function buildSemiMarathonWeek(
  weekNum: number,
  totalWeeks: number,
  hoursPerWeek: number
): Session[] {
  const factor = getWeekLoadFactor(weekNum, totalWeeks);
  const totalMin = Math.round(hoursPerWeek * 60 * factor);
  const scale = totalMin / 300;
  const phase = getPhase(weekNum, totalWeeks);

  if (phase === "affutage" || phase === "course") {
    return [
      makeSession(0, "endurance", "Footing récup", Math.round(35 * scale), "Très léger"),
      makeSession(2, "seuil", "Allure semi", Math.round(40 * scale), "10' au seuil, bonne maîtrise"),
      makeSession(4, "longue-sortie", "Dernière longue", Math.round(60 * scale), "Relaxe, confiance en soi", { distanceKm: Math.round(10 * scale) }),
    ];
  }

  if (phase === "base") {
    return [
      makeSession(0, "endurance", "Footing Z2", Math.round(40 * scale), "Endurance fondamentale"),
      makeSession(2, "endurance", "Footing varié", Math.round(40 * scale), "Quelques accélérations légères"),
      makeSession(5, "longue-sortie", "Sortie longue", Math.round(65 * scale), "Allure facile", { distanceKm: Math.round(11 * scale) }),
      makeSession(6, "repos", "Repos", 0, "Repos passif"),
    ];
  }

  return [
    makeSession(0, "endurance", "Footing récup", Math.round(35 * scale), "Z2 récupération"),
    makeSession(1, "fractionne", "Fractionné", Math.round(50 * scale), "5×1km à allure 10km avec 2' récup"),
    makeSession(3, "seuil", "Seuil progressif", Math.round(50 * scale), "25' au seuil lactique"),
    makeSession(5, "longue-sortie", "Sortie longue", Math.round(70 * scale), "Allure semi cible sur 5 derniers km", { distanceKm: Math.round(15 * scale) }),
    makeSession(6, "repos", "Repos", 0, "Récupération passive"),
  ];
}

function buildTriathlonWeek(
  weekNum: number,
  totalWeeks: number,
  hoursPerWeek: number
): Session[] {
  const factor = getWeekLoadFactor(weekNum, totalWeeks);
  const totalMin = Math.round(hoursPerWeek * 60 * factor);
  const scale = totalMin / 420;
  const phase = getPhase(weekNum, totalWeeks);

  if (phase === "affutage" || phase === "course") {
    return [
      makeSession(0, "natation", "Natation légère", Math.round(40 * scale), "Technique, sans effort"),
      makeSession(2, "velo", "Vélo récup", Math.round(50 * scale), "Z2, petite vitesse"),
      makeSession(4, "endurance", "Footing court", Math.round(30 * scale), "20-25' allure facile"),
      makeSession(5, "repos", "Repos complet", 0, "Récupération avant course"),
    ];
  }

  if (phase === "base") {
    return [
      makeSession(0, "natation", "Natation endurance", Math.round(50 * scale), "Technique + endurance, 1500-2000m"),
      makeSession(1, "velo", "Vélo Z2", Math.round(80 * scale), "Sortie longue vélo à allure confortable"),
      makeSession(3, "endurance", "Footing Z2", Math.round(40 * scale), "Endurance fondamentale"),
      makeSession(5, "natation", "Natation technique", Math.round(45 * scale), "Focus technique de nage"),
      makeSession(6, "repos", "Repos", 0, "Repos passif"),
    ];
  }

  return [
    makeSession(0, "natation", "Natation seuil", Math.round(50 * scale), "8×100m allure rapide + 200m récup"),
    makeSession(1, "velo", "Vélo long", Math.round(90 * scale), "Z2-Z3, incluant côtes"),
    makeSession(2, "brique", "Séance brique vélo-cap", Math.round(60 * scale), "45' vélo + 15' course directement après"),
    makeSession(4, "endurance", "Footing seuil", Math.round(45 * scale), "20' seuil lactique"),
    makeSession(5, "natation", "Natation longue", Math.round(55 * scale), "Open water simulation si possible"),
    makeSession(6, "repos", "Repos", 0, "Récupération passive"),
  ];
}

function buildVeloWeek(
  weekNum: number,
  totalWeeks: number,
  hoursPerWeek: number
): Session[] {
  const factor = getWeekLoadFactor(weekNum, totalWeeks);
  const totalMin = Math.round(hoursPerWeek * 60 * factor);
  const scale = totalMin / 360;
  const phase = getPhase(weekNum, totalWeeks);

  if (phase === "affutage" || phase === "course") {
    return [
      makeSession(0, "velo", "Vélo récup", Math.round(45 * scale), "Petits braquets, jambes tournantes"),
      makeSession(2, "velo", "Seuil court vélo", Math.round(55 * scale), "2×10' au seuil + ouverture de vitesse"),
      makeSession(4, "velo", "Sortie légère", Math.round(60 * scale), "Allure facile, confiance"),
      makeSession(6, "repos", "Repos", 0, "Avant la course"),
    ];
  }

  if (phase === "base") {
    return [
      makeSession(0, "velo", "Endurance vélo", Math.round(70 * scale), "Z2, cadence 80-90 rpm"),
      makeSession(2, "muscu", "Muscu jambes", 45, "Squat, fentes, gainage"),
      makeSession(4, "velo", "Endurance + accélérations", Math.round(65 * scale), "Z2 + 4×1' Z4"),
      makeSession(6, "velo", "Sortie longue", Math.round(90 * scale), "Z2, progressive", { distanceKm: Math.round(60 * scale) }),
    ];
  }

  return [
    makeSession(0, "velo", "Récupération active", Math.round(45 * scale), "Jambes légères"),
    makeSession(1, "velo", "Fractionné vélo", Math.round(65 * scale), "6×3' Z5 avec 3' récup"),
    makeSession(3, "velo", "Seuil long", Math.round(70 * scale), "2×20' à allure seuil lactique"),
    makeSession(5, "velo", "Sortie longue", Math.round(110 * scale), "Z2-Z3, terrain varié", { distanceKm: Math.round(80 * scale) }),
    makeSession(6, "repos", "Repos", 0, "Récupération passive"),
  ];
}

// ─── Sélecteur de builder ──────────────────────────────────────────────────────

function buildWeekSessions(
  sport: SportType,
  weekNum: number,
  totalWeeks: number,
  hoursPerWeek: number
): Session[] {
  switch (sport) {
    case "marathon":
      return buildMarathonWeek(weekNum, totalWeeks, hoursPerWeek);
    case "semi-marathon":
      return buildSemiMarathonWeek(weekNum, totalWeeks, hoursPerWeek);
    case "triathlon":
      return buildTriathlonWeek(weekNum, totalWeeks, hoursPerWeek);
    case "velo":
      return buildVeloWeek(weekNum, totalWeeks, hoursPerWeek);
  }
}

// ─── Génération du plan complet ───────────────────────────────────────────────

export function generatePlan(
  sport: SportType,
  goal: GoalType,
  eventDate: string,
  hoursPerWeek: number
): TrainingPlan {
  const totalWeeks = PLAN_DURATIONS[sport];
  const startDate = getPlanStartDate(eventDate, totalWeeks);

  const adjustedHours = goal === "debuter" ? Math.min(hoursPerWeek, 5) : hoursPerWeek;

  const weeks: Week[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const weekStartDate = addWeeks(startDate, w - 1);
    const sessions = buildWeekSessions(sport, w, totalWeeks, adjustedHours);
    const totalDurationMin = sessions.reduce((acc, s) => acc + s.durationMin, 0);
    const phase = getPhase(w, totalWeeks);

    const phaseNotes: Record<Week["phase"], string> = {
      base: "Phase de base : construire l'aérobie, habituer le corps à l'effort régulier.",
      construction: "Phase de construction : augmenter l'intensité et la spécificité.",
      specifique: "Phase spécifique : séances proches des conditions de course.",
      affutage: "Affûtage : réduire le volume, garder l'intensité. Le corps récupère et absorbe.",
      course: "Semaine de course ! Restez léger, dormez bien, faites confiance à votre préparation.",
    };

    weeks.push({
      weekNumber: w,
      startDate: weekStartDate,
      phase,
      sessions,
      totalDurationMin,
      notes: phaseNotes[phase],
    });
  }

  return {
    id: uuidv4(),
    sport,
    goal,
    eventDate,
    hoursPerWeek,
    totalWeeks,
    weeks,
    createdAt: new Date().toISOString(),
  };
}
