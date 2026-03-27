// lib/types.ts

export type SportType = "marathon" | "semi-marathon" | "triathlon" | "velo";
export type GoalType = "finir" | "ameliorer" | "debuter";

// ── Triathlon distance ────────────────────────────────────────────────────────
export type TriDistance = "S" | "M" | "L"; // Sprint, Olympique/M, Half/L

// ── Microcycle types ──────────────────────────────────────────────────────────
export type MicrocycleType =
  | "repos"           // Récupération totale
  | "recup-active"    // Récupération active (tout dans Z0)
  | "foncier"         // Endurance fondamentale Z0
  | "rythme-X"        // Rythme soutenu allure X
  | "intensif-XX"     // Intensif allure XX
  | "affutage"        // Réduction volume pré-compét
  | "competition";    // Semaine de course

// ── Allures cibles ────────────────────────────────────────────────────────────
export interface PaceZones {
  // Course à pied
  z0_runPace?: number;      // Z0 fondamentale (sec/km) ex: 390 = 6'30"
  x_runPace?: number;       // Allure X (sec/km) ex: 320 = 5'20"
  m_runPace?: number;       // Allure M-race (sec/km) ex: 270 = 4'30"
  l_runPace?: number;       // Allure L-race (sec/km) ex: 280 = 4'40"
  xx_runPace?: number;      // Allure XX (sec/km) ex: 255 = 4'15"
  // Natation
  swimPace100m?: number;    // Allure nage (sec/100m)
  // Vélo
  bikeSpeedKmh?: number;    // Vitesse moyenne vélo (km/h)
  bikeFTPWatts?: number;    // FTP watts (optionnel)
}

// ── Compétition planifiée ─────────────────────────────────────────────────────
export interface PlannedRace {
  name: string;
  date: string;           // ISO date
  distance: TriDistance;
  priority: "A" | "B" | "C"; // A = objectif principal
}

// ── Séance ────────────────────────────────────────────────────────────────────
export type DisciplineType = "nat" | "velo" | "cap" | "ppg" | "brique" | "repos";

export interface PaceInstruction {
  label: string;    // ex: "Allure M-race"
  value: string;    // ex: "4'30\"/km"
  zone: string;     // ex: "Z4"
}

export interface SessionDetail {
  warmup?: string;       // Description échauffement
  mainSet: string;       // Bloc principal
  cooldown?: string;     // Retour au calme
  paces: PaceInstruction[];
}

export interface Session {
  id: string;
  day: number;           // 0=Lun … 6=Dim
  discipline: DisciplineType;
  label: string;
  durationMin: number;
  distanceKm?: number;
  distanceM?: number;    // Pour la natation (en mètres)
  detail?: SessionDetail;
  intensity: "repos" | "faible" | "modere" | "eleve" | "race";
  log?: SessionLog;
}

export interface SessionLog {
  durationMin: number;
  distanceKm?: number;
  distanceM?: number;
  note?: string;
  rpe?: number;         // Ressenti 1-10
  loggedAt: string;
}

// ── Semaine ───────────────────────────────────────────────────────────────────
export interface Week {
  weekNumber: number;
  startDate: string;
  endDate: string;
  microcycle: MicrocycleType;
  phase: string;         // Nom du bloc ex: "Bloc Lacanau"
  focusNote: string;     // Résumé de la semaine
  sessions: Session[];
  // Volumes
  natKm: number;
  veloKm: number;
  capKm: number;
  veloH: number;
  totalH: number;
  // Compétition éventuelle
  race?: PlannedRace;
}

// ── Plan complet ──────────────────────────────────────────────────────────────
export interface TrainingPlan {
  id: string;
  sport: SportType;
  goal: GoalType;
  eventDate: string;          // Date course principale (A)
  totalWeeks: number;
  hoursPerWeek: number;
  paceZones: PaceZones;
  races: PlannedRace[];
  weeks: Week[];
  createdAt: string;
}

// ── Formulaire setup ──────────────────────────────────────────────────────────
export interface SetupFormData {
  sport: SportType;
  goal: GoalType;
  eventDate: string;
  eventName: string;
  eventDistance: TriDistance;
  hoursPerWeek: number;
  paceZones: PaceZones;
  races: PlannedRace[];
}

// ── Strava (conservé pour plus tard) ─────────────────────────────────────────
export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  elapsed_time: number;
  distance: number;
  moving_time: number;
}
