// app/plan/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SessionCard from "@/components/SessionCard";
import type { TrainingPlan, Session } from "@/lib/types";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const PHASE_LABELS: Record<string, string> = {
  base: "🌱 Base",
  construction: "🏗️ Construction",
  specifique: "🎯 Spécifique",
  affutage: "⚡ Affûtage",
  course: "🏁 Course",
};

const SPORT_EMOJIS: Record<string, string> = {
  marathon: "🏃",
  "semi-marathon": "🏅",
  triathlon: "🏊",
  velo: "🚴",
};

function getWeekStatus(sessions: Session[]): {
  label: string;
  cls: string;
  done: number;
  total: number;
} {
  const active = sessions.filter((s) => s.type !== "repos");
  const done = active.filter((s) => !!s.log).length;
  const total = active.length;

  if (total === 0) return { label: "—", cls: "text-slate-500", done: 0, total: 0 };

  const ratio = done / total;
  if (ratio === 1) return { label: "✅ Semaine validée", cls: "text-green-400", done, total };
  if (ratio >= 0.5) return { label: "⚠️ Partiellement faite", cls: "text-yellow-400", done, total };
  if (ratio > 0) return { label: "🔄 En cours", cls: "text-blue-400", done, total };
  return { label: "📋 À faire", cls: "text-slate-400", done, total };
}

export default function PlanPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number>(1);

  useEffect(() => {
    const stored = localStorage.getItem("training-plan");
    if (!stored) { router.push("/"); return; }
    setPlan(JSON.parse(stored));
  }, []);

  const savePlan = (newPlan: TrainingPlan) => {
    setPlan(newPlan);
    localStorage.setItem("training-plan", JSON.stringify(newPlan));
  };

  const handleSessionUpdate = (weekNumber: number, updated: Session) => {
    if (!plan) return;
    savePlan({
      ...plan,
      weeks: plan.weeks.map((w) =>
        w.weekNumber !== weekNumber ? w : {
          ...w,
          sessions: w.sessions.map((s) => (s.id === updated.id ? updated : s)),
          totalDurationMin: w.sessions
            .map((s) => (s.id === updated.id ? updated : s))
            .reduce((acc, s) => acc + s.durationMin, 0),
        }
      ),
    });
  };

  const handleSessionDelete = (weekNumber: number, sessionId: string) => {
    if (!plan) return;
    savePlan({
      ...plan,
      weeks: plan.weeks.map((w) =>
        w.weekNumber !== weekNumber ? w : {
          ...w,
          sessions: w.sessions.filter((s) => s.id !== sessionId),
          totalDurationMin: w.sessions
            .filter((s) => s.id !== sessionId)
            .reduce((acc, s) => acc + s.durationMin, 0),
        }
      ),
    });
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

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
          <p className="text-slate-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // Stats globales
  const allActive = plan.weeks.flatMap((w) => w.sessions.filter((s) => s.type !== "repos"));
  const allDone = allActive.filter((s) => !!s.log);
  const totalLoggedMin = allDone.reduce((acc, s) => acc + (s.log?.durationMin ?? 0), 0);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">
              {SPORT_EMOJIS[plan.sport]} Plan {plan.sport.charAt(0).toUpperCase() + plan.sport.slice(1)}
            </h1>
            <p className="text-slate-400 text-xs">
              {plan.totalWeeks} semaines · Course le{" "}
              {new Date(plan.eventDate).toLocaleDateString("fr-FR", {
                day: "numeric", month: "long", year: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="text-xs px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            Nouveau plan
          </button>
        </div>

        {/* Barre de progression globale */}
        <div className="max-w-3xl mx-auto mt-2">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{allDone.length} / {allActive.length} séances complétées</span>
            <span>{formatDuration(totalLoggedMin)} enregistrés</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${allActive.length > 0 ? (allDone.length / allActive.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Liste des semaines */}
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {plan.weeks.map((week) => {
          const isExpanded = expandedWeek === week.weekNumber;
          const sessionsByDay = DAY_NAMES.map((_, i) =>
            week.sessions.filter((s) => s.day === i)
          );
          const status = getWeekStatus(week.sessions);

          return (
            <div
              key={week.weekNumber}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden
                ${isExpanded ? "border-orange-800/50 bg-slate-900/80" : "border-slate-800 bg-slate-900/40"}`}
            >
              {/* En-tête semaine */}
              <button
                onClick={() => setExpandedWeek(isExpanded ? -1 : week.weekNumber)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/40 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-slate-600 text-sm font-mono w-5">{week.weekNumber}</span>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{formatDate(week.startDate)}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {PHASE_LABELS[week.phase]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-slate-500 text-xs">
                        {formatDuration(week.totalDurationMin)} · {status.total} séances
                      </span>
                      {status.total > 0 && (
                        <span className={`text-xs font-medium ${status.cls}`}>
                          {status.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mini progress bar */}
                <div className="flex items-center gap-2">
                  {status.total > 0 && (
                    <div className="w-16 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${(status.done / status.total) * 100}%` }}
                      />
                    </div>
                  )}
                  <span className="text-slate-500">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Contenu déplié */}
              {isExpanded && (
                <div className="px-4 pb-4">
                  <p className="text-slate-400 text-xs mb-4 italic border-l-2 border-orange-700 pl-3">
                    {week.notes}
                  </p>

                  {/* Grille 7 jours */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {DAY_NAMES.map((d) => (
                      <div key={d} className="text-center text-xs text-slate-500 font-medium">{d}</div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {sessionsByDay.map((daySessions, dayIndex) => (
                      <div key={dayIndex} className="space-y-1 min-h-[56px]">
                        {daySessions.length === 0 ? (
                          <div className="h-full min-h-[52px] rounded-xl border border-dashed border-slate-800 opacity-20" />
                        ) : (
                          daySessions.map((session) => (
                            <SessionCard
                              key={session.id}
                              session={session}
                              onUpdate={(u) => handleSessionUpdate(week.weekNumber, u)}
                              onDelete={(id) => handleSessionDelete(week.weekNumber, id)}
                            />
                          ))
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Résumé semaine */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap gap-3 text-xs text-slate-500">
                    <span>⏱ Prévu : <b className="text-slate-300">{formatDuration(week.totalDurationMin)}</b></span>
                    {status.done > 0 && (
                      <span>
                        ✅ Réalisé :{" "}
                        <b className="text-green-400">
                          {formatDuration(
                            week.sessions
                              .filter((s) => s.log)
                              .reduce((acc, s) => acc + (s.log?.durationMin ?? 0), 0)
                          )}
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
