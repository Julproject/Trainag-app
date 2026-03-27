// app/plan/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SessionCard from "@/components/SessionCard";
import type { TrainingPlan, Session, Week } from "@/lib/types";

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const MICROCYCLE_CONFIG: Record<string, { label: string; color: string }> = {
  "recup-active":  { label: "Récup active",   color: "text-blue-400 bg-blue-400/10 border-blue-800" },
  "foncier":       { label: "Foncier Z0",      color: "text-green-400 bg-green-400/10 border-green-800" },
  "rythme-X":      { label: "Rythme X",        color: "text-orange-400 bg-orange-400/10 border-orange-800" },
  "intensif-XX":   { label: "Intensif XX",     color: "text-red-400 bg-red-400/10 border-red-800" },
  "affutage":      { label: "Affûtage",        color: "text-purple-400 bg-purple-400/10 border-purple-800" },
  "competition":   { label: "Compétition",     color: "text-yellow-400 bg-yellow-400/10 border-yellow-800" },
  "repos":         { label: "Repos",           color: "text-slate-400 bg-slate-400/10 border-slate-700" },
};

const SPORT_EMOJIS: Record<string, string> = {
  marathon: "🏃", "semi-marathon": "🏅", triathlon: "🏊", velo: "🚴",
};

function WeekStatus(sessions: Session[]): { label: string; cls: string; done: number; total: number } {
  const active = sessions.filter(s => s.discipline !== "repos" && s.intensity !== "race");
  const done = active.filter(s => !!s.log).length;
  const total = active.length;
  if (total === 0) return { label: "—", cls: "text-slate-500", done: 0, total: 0 };
  const r = done / total;
  if (r === 1) return { label: "✅ Validée", cls: "text-green-400", done, total };
  if (r >= 0.5) return { label: "⚠️ Partielle", cls: "text-yellow-400", done, total };
  if (r > 0) return { label: "🔄 En cours", cls: "text-blue-400", done, total };
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

  const save = (newPlan: TrainingPlan) => {
    setPlan(newPlan);
    localStorage.setItem("training-plan", JSON.stringify(newPlan));
  };

  const updateSession = (weekNumber: number, updated: Session) => {
    if (!plan) return;
    save({
      ...plan,
      weeks: plan.weeks.map(w => w.weekNumber !== weekNumber ? w : {
        ...w,
        sessions: w.sessions.map(s => s.id === updated.id ? updated : s),
      }),
    });
  };

  const deleteSession = (weekNumber: number, id: string) => {
    if (!plan) return;
    save({
      ...plan,
      weeks: plan.weeks.map(w => w.weekNumber !== weekNumber ? w : {
        ...w,
        sessions: w.sessions.filter(s => s.id !== id),
      }),
    });
  };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

  const fmtH = (h: number) => {
    const hh = Math.floor(h);
    const mm = Math.round((h - hh) * 60);
    return mm > 0 ? `${hh}h${mm}` : `${hh}h`;
  };

  if (!plan) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <div className="text-center"><div className="text-4xl mb-4">⏳</div><p className="text-slate-400">Chargement...</p></div>
    </div>
  );

  const allActive = plan.weeks.flatMap(w => w.sessions.filter(s => s.discipline !== "repos" && s.intensity !== "race"));
  const allDone = allActive.filter(s => !!s.log);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Header sticky */}
      <div className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur border-b border-slate-800 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-lg font-bold">
                {SPORT_EMOJIS[plan.sport]} Plan {plan.sport.charAt(0).toUpperCase() + plan.sport.slice(1)}
              </h1>
              <p className="text-slate-400 text-xs">
                {plan.totalWeeks} semaines · {plan.races?.find(r => r.priority === "A")?.name ?? "Course principale"}
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => router.push("/")}
                className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors">
                Nouveau plan
              </button>
            </div>
          </div>

          {/* Barre progression globale */}
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>{allDone.length}/{allActive.length} séances</span>
            <span>{Math.round(allDone.length / Math.max(allActive.length, 1) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${allActive.length > 0 ? (allDone.length / allActive.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      {/* Liste semaines */}
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-2">
        {plan.weeks.map(week => {
          const isExp = expandedWeek === week.weekNumber;
          const mc = MICROCYCLE_CONFIG[week.microcycle] ?? { label: week.microcycle, color: "text-slate-400" };
          const status = WeekStatus(week.sessions);
          const sessionsByDay = DAY_NAMES.map((_, i) => week.sessions.filter(s => s.day === i));

          return (
            <div key={week.weekNumber}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden
                ${isExp ? "border-orange-800/50 bg-slate-900" : "border-slate-800 bg-slate-900/40"}`}>

              {/* En-tête */}
              <button
                onClick={() => setExpandedWeek(isExp ? -1 : week.weekNumber)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-800/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-slate-600 text-xs font-mono w-5 flex-shrink-0">{week.weekNumber}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">{fmtDate(week.startDate)}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${mc.color}`}>{mc.label}</span>
                      {week.race && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-yellow-700 bg-yellow-900/30 text-yellow-300">
                          🏁 {week.race.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500 flex-wrap">
                      {week.natKm > 0 && <span>🏊 {week.natKm}km</span>}
                      {week.veloKm > 0 && <span>🚴 {week.veloKm}km</span>}
                      {week.capKm > 0 && <span>🏃 {week.capKm}km</span>}
                      <span>⏱ ~{fmtH(week.totalH)}</span>
                      {status.total > 0 && <span className={status.cls}>{status.label}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  {status.total > 0 && (
                    <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${(status.done / status.total) * 100}%` }} />
                    </div>
                  )}
                  <span className="text-slate-500 text-xs">{isExp ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Contenu déplié */}
              {isExp && (
                <div className="px-4 pb-4">
                  {/* Focus note */}
                  <p className="text-slate-400 text-xs mb-4 italic border-l-2 border-orange-700 pl-3">
                    {week.focusNote}
                  </p>

                  {/* Volumes détaillés */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {[
                      { icon: "🏊", label: "Nat", val: week.natKm > 0 ? `${week.natKm}km` : "—" },
                      { icon: "🚴", label: "Vélo", val: week.veloKm > 0 ? `${week.veloKm}km` : "—" },
                      { icon: "🏃", label: "CAP", val: week.capKm > 0 ? `${week.capKm}km` : "—" },
                      { icon: "⏱", label: "Total", val: `~${fmtH(week.totalH)}` },
                    ].map(({ icon, label, val }) => (
                      <div key={label} className="bg-slate-800/50 rounded-xl px-2 py-2 text-center">
                        <div className="text-sm">{icon}</div>
                        <div className="text-xs text-slate-500">{label}</div>
                        <div className="text-xs font-bold text-white">{val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Grille 7 jours */}
                  <div className="grid grid-cols-7 gap-1 mb-1.5">
                    {DAY_NAMES.map(d => (
                      <div key={d} className="text-center text-xs text-slate-500 font-medium">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {sessionsByDay.map((daySessions, dayIndex) => (
                      <div key={dayIndex} className="space-y-1 min-h-[50px]">
                        {daySessions.length === 0
                          ? <div className="h-full min-h-[48px] rounded-xl border border-dashed border-slate-800/60 opacity-20" />
                          : daySessions.map(s => (
                            <SessionCard key={s.id} session={s}
                              onUpdate={u => updateSession(week.weekNumber, u)}
                              onDelete={id => deleteSession(week.weekNumber, id)} />
                          ))}
                      </div>
                    ))}
                  </div>

                  {/* Résumé semaine */}
                  {status.done > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-500">
                      ✅ Réalisé : <b className="text-green-400">
                        {week.sessions.filter(s => s.log).reduce((acc, s) => acc + (s.log?.durationMin ?? 0), 0)} min
                      </b>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
