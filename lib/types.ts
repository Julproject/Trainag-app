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

export interface Session {
  id: string;
  day: number; // 0=Lundi, 6=Dimanche
  type: SessionType;
  label: string;
  durationMin: number; // en minutes
  description: string;
  distanceKm?: number;
  intensity: "repos" | "faible" | "modere" | "eleve";
}

export interface Week {
  weekNumber: number;
  startDate: string; // ISO date string
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
  elapsed_time: number; // secondes
  distance: number; // mètres
  moving_time: number;
}

export interface WeekValidation {
  weekNumber: number;
  status: "validee" | "partielle" | "a-faire";
  completedSessions: number;
  totalSessions: number;
  stravaActivities: StravaActivity[];
}

export interface SetupFormData {
  sport: SportType;
  eventDate: string;
  hoursPerWeek: number;
  goal: GoalType;
}
