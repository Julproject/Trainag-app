// app/api/generate-plan/route.ts
import { NextRequest, NextResponse } from "next/server";
import { generatePlan } from "@/lib/planGenerator";
import type { SportType, GoalType, PaceZones, PlannedRace } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sport, goal, eventDate, hoursPerWeek, paceZones, races, totalWeeks } = body as {
      sport: SportType;
      goal: GoalType;
      eventDate: string;
      hoursPerWeek: number;
      paceZones: PaceZones;
      races: PlannedRace[];
      totalWeeks: number;
    };

    if (!sport || !goal || !eventDate || !hoursPerWeek) {
      return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
    }

    const plan = generatePlan(sport, goal, eventDate, hoursPerWeek, paceZones ?? {}, races ?? [], totalWeeks ?? 20);
    return NextResponse.json(plan);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
