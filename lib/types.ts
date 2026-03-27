// lib/types.ts

export type SportType = "marathon" | "semi-marathon" | "triathlon" | "velo";
export type GoalType = "finir" | "ameliorer" | "debuter";
export type SessionType =
  | "endurance"
  | "fractionne"
  | "seuil"
  | "longue-sortie"
  | "recup-active"
  | "repos"
  | "muscu"
  | "brique"
  | "natation"
  | "velo";

// ── Référence de performance saisie par l'utilisateur ─────────────────────────

export interface PaceReference {
  // Course à pied : allure en secondes/km (ex: 5'30" = 330)
  runPaceSecPerKm?: number;
  // Natation : temps au 100m en secondes (ex: 1'45" = 105)
  swimPaceSec100m?: number;
  // Vélo : vitesse moyenne en km/h (ex: 30)
  bikeSpeedKmh?: number;
  // Vélo : FTP en watts (optionnel)
  bikeFTPWatts?: number;
}

// ── Allures cibles calculées pour une séance ──────────────────────────────────

export interface TargetPaces {
  lines: string[]; // ex: ["Allure : 5'45\"/km", "FC cible : Z2 (130–145 bpm)"]
}

export interface SessionLog {
  durationMin: number;
  distanceKm?: number;
  note?: string;
  loggedAt: string;
}

export interface Session {
  id: string;
  day: number; // 0=Lun … 6=Dim
  type: SessionType;
  label: string;
  durationMin: number;
  description: string;
  distanceKm?: number;
  intensity: "repos" | "faible" | "modere" | "eleve";
  targetPaces?: TargetPaces;
  log?: SessionLog;
}

export interface Week {
  weekNumber: number;
  startDate: string;
  phase: "base" | "construction" | "specifique" | "affutage" | "course";
  sessions: Session[];
  totalDurationMin: number;
  notes: string;
}

export interface TrainingPlan {
  id: string;
  sport: SportType;
  goal: GoalType;
  eventDate: string;
  hoursPerWeek: number;
  totalWeeks: number;
  weeks: Week[];
  paceRef: PaceReference;
  createdAt: string;
}

export interface StravaActivity {
  id: number;
  name: string;
  type: string;
  start_date: string;
  elapsed_time: number;
  distance: number;
  moving_time: number;
}

export interface SetupFormData {
  sport: SportType;
  eventDate: string;
  hoursPerWeek: number;
  goal: GoalType;
  paceRef: PaceReference;
}
