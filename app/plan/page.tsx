// app/plan/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SessionCard from "@/components/SessionCard";
import type { TrainingPlan, Week, Session } from "@/lib/types";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const PHASE_LABELS: Record<string, string> = {
  base: "🌱 Base",
  construction: "🏗️ Construction",
  specifique: "🎯 Spécifique",
  affutage: "⚡ Affûtage",
  course: "🏁 Course",
};

const STATUS_CONFIG = {
  validee: { label: "✅ Semaine validée", cls: "text-green-400 bg-green-400/10 border-green-800" },
  partielle: { label: "⚠️ Partiellement faite", cls: "text-yellow-400 bg-yellow-400/10 border-yellow-800" },
  "a-faire": { label: "📋 À faire", cls: "text-slate-400 bg-slate-400/10 border-slate-700" },
};

export default function PlanPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number>(1);
  const [stravaConnected, setStravaConnected] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("training-plan");
    if (!stored) { router.push("/"); return; }
    setPlan(JSON.parse(stored));
  }, []);

  const handleSessionUpdate = (weekNumber: number, updated: Session) => {
    if (!plan) return;
    const newPlan: TrainingPlan = {
      ...plan,
      weeks: plan.weeks.map((w) =>
        w.weekNumber !== weekNumber
          ? w
          : {
              ...w,
              sessions: w.sessions.map((s) => (s.id === updated.id ? updated : s)),
              totalDurationMin: w.sessions
                .map((s) => (s.id === updated.id ? updated : s))
                .reduce((acc, s) => acc + s.durationMin, 0),
            }
      ),
    };
    setPlan(newPlan);
    localStorage.setItem("training-plan", JSON.stringify(newPlan));
  };

  const handleSessionDelete = (weekNumber: number, sessionId: string) => {
    if (!plan) return;
    const newPlan: TrainingPlan = {
      ...plan,
      weeks: plan.weeks.map((w) =>
        w.weekNumber !== weekNumber
          ? w
          : {
              ...w,
              sessions: w.sessions.filter((s) => s.id !== sessionId),
              totalDurationMin: w.sessions
                .filter((s) => s.id !== sessionId)
                .reduce((acc, s) => acc + s.durationMin, 0),
            }
      ),
    };
    setPlan(newPlan);
    localStorage.setItem("training-plan", JSON.stringify(newPlan));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
    });
  };

  const formatDuration = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h${m}`;
  };

  if (!plan) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-slate-400">Chargement du plan...</p>
        </div>
      </div>
    );
  }

  const SPORT_EMOJIS: Record<string, string> = {
    marathon: "🏃",
    "semi-marathon": "🏅",
    triathlon: "🏊",
    velo: "🚴",
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">
              {SPORT_EMOJIS[plan.sport]} Plan {plan.sport.charAt(0).toUpperCase() + plan.sport.slice(1)}
            </h1>
            <p className="text-slate-400 text-sm">
              {plan.totalWeeks} semaines · Course le{" "}
              {new Date(plan.eventDate).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex gap-2">
            {!stravaConnected ? (
              <a
                href="/api/strava/auth"
                className="text-xs px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 transition-colors text-white font-medium"
              >
                🔗 Connecter Strava
              </a>
            ) : (
              <span className="text-xs px-3 py-2 rounded-xl bg-green-800/40 text-green-400 border border-green-800">
                ✓ Strava connecté
              </span>
            )}
            <button
              onClick={() => router.push("/")}
              className="text-xs px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
            >
              Nouveau plan
            </button>
          </div>
        </div>
      </div>

      {/* Weeks */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {plan.weeks.map((week) => {
          const isExpanded = expandedWeek === week.weekNumber;
          const sessionsByDay = DAY_NAMES.map((_, i) =>
            week.sessions.filter((s) => s.day === i)
          );

          return (
            <div
              key={week.weekNumber}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden
                ${isExpanded ? "border-orange-800/50 bg-slate-900/80" : "border-slate-800 bg-slate-900/40"}`}
            >
              {/* Week header */}
              <button
                onClick={() => setExpandedWeek(isExpanded ? -1 : week.weekNumber)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-500 text-sm font-mono w-6">
                    {week.weekNumber}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">
                        {formatDate(week.startDate)}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {PHASE_LABELS[week.phase] ?? week.phase}
                      </span>
                    </div>
                    <div className="text-slate-500 text-xs mt-0.5">
                      {formatDuration(week.totalDurationMin)} ·{" "}
                      {week.sessions.filter((s) => s.type !== "repos").length} séances
                    </div>
                  </div>
                </div>
                <span className="text-slate-500 text-lg">
                  {isExpanded ? "▲" : "▼"}
                </span>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  {/* Phase note */}
                  <p className="text-slate-400 text-xs mb-4 italic border-l-2 border-orange-700 pl-3">
                    {week.notes}
                  </p>

                  {/* 7 days grid */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAY_NAMES.map((d) => (
                      <div key={d} className="text-center text-xs text-slate-500 font-medium">
                        {d}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {sessionsByDay.map((daySessions, dayIndex) => (
                      <div key={dayIndex} className="space-y-1 min-h-[60px]">
                        {daySessions.length === 0 ? (
                          <div className="h-full min-h-[56px] rounded-xl border border-dashed border-slate-800 opacity-30" />
                        ) : (
                          daySessions.map((session) => (
                            <SessionCard
                              key={session.id}
                              session={session}
                              onUpdate={(updated) =>
                                handleSessionUpdate(week.weekNumber, updated)
                              }
                              onDelete={(id) =>
                                handleSessionDelete(week.weekNumber, id)
                              }
                            />
                          ))
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Week totals */}
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
                    <span>
                      ⏱ Volume total :{" "}
                      <b className="text-slate-300">
                        {formatDuration(week.totalDurationMin)}
                      </b>
                    </span>
                    {week.sessions.some((s) => s.distanceKm) && (
                      <span>
                        📍 Distance longue sortie :{" "}
                        <b className="text-slate-300">
                          {Math.max(...week.sessions.map((s) => s.distanceKm ?? 0))} km
                        </b>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
