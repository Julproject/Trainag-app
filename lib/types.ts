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

export interface SessionLog {
  durationMin: number;  // temps réel saisi par l'utilisateur
  distanceKm?: number;  // distance réelle (optionnelle)
  note?: string;        // commentaire libre
  loggedAt: string;     // ISO date
}

export interface Session {
  id: string;
  day: number; // 0=Lundi, 6=Dimanche
  type: SessionType;
  label: string;
  durationMin: number;
  description: string;
  distanceKm?: number;
  intensity: "repos" | "faible" | "modere" | "eleve";
  log?: SessionLog; // ce que l'athlète a réellement fait
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
}
