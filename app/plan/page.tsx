// app/plan/page.tsx
"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import SessionCard from "@/components/SessionCard";
import type { TrainingPlan, Session, Week } from "@/lib/types";

const DAY_NAMES_FULL = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const DAY_NAMES_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const MICROCYCLE_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  "recup-active": { label: "Récup active",  color: "text-blue-400 border-blue-800 bg-blue-900/20",    dot: "bg-blue-400" },
  "foncier":      { label: "Foncier Z0",    color: "text-green-400 border-green-800 bg-green-900/20", dot: "bg-green-400" },
  "rythme-X":     { label: "Rythme X",      color: "text-orange-400 border-orange-800 bg-orange-900/20", dot: "bg-orange-400" },
  "intensif-XX":  { label: "Intensif XX",   color: "text-red-400 border-red-800 bg-red-900/20",       dot: "bg-red-400" },
  "affutage":     { label: "Affûtage",      color: "text-purple-400 border-purple-800 bg-purple-900/20", dot: "bg-purple-400" },
  "competition":  { label: "Compétition",   color: "text-yellow-400 border-yellow-800 bg-yellow-900/20", dot: "bg-yellow-400" },
};

const DISC_EMOJI: Record<string, string> = {
  repos: "😴", nat: "🏊", velo: "🚴", cap: "🏃", ppg: "💪", brique: "⚡",
};

const SPORT_EMOJIS: Record<string, string> = {
  marathon: "🏃", "semi-marathon": "🏅", triathlon: "🏊", velo: "🚴",
};

function getTodayDayIndex(): number {
  // 0=Lun … 6=Dim (JS: 0=dim, 1=lun…)
  return (new Date().getDay() + 6) % 7;
}

function findCurrentWeek(weeks: Week[]): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (const w of weeks) {
    const start = new Date(w.startDate);
    const end = new Date(w.endDate);
    if (today >= start && today <= end) return w.weekNumber;
  }
  // Si avant le plan : semaine 1, si après : dernière semaine
  const firstStart = new Date(weeks[0]?.startDate ?? today);
  if (today < firstStart) return 1;
  return weeks[weeks.length - 1]?.weekNumber ?? 1;
}

function WeekProgress(week: Week) {
  const active = week.sessions.filter(s => s.discipline !== "repos" && s.intensity !== "race");
  const done = active.filter(s => !!s.log).length;
  return { done, total: active.length, pct: active.length > 0 ? Math.round(done / active.length * 100) : 0 };
}

export default function PlanPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [selectedWeekNum, setSelectedWeekNum] = useState<number>(1);
  const [selectedDay, setSelectedDay] = useState<number>(getTodayDayIndex());

  useEffect(() => {
    const stored = localStorage.getItem("training-plan");
    if (!stored) { router.push("/"); return; }
    const p: TrainingPlan = JSON.parse(stored);
    setPlan(p);
    const currentWeekNum = findCurrentWeek(p.weeks);
    setSelectedWeekNum(currentWeekNum);
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

  const selectedWeek = useMemo(
    () => plan?.weeks.find(w => w.weekNumber === selectedWeekNum),
    [plan, selectedWeekNum]
  );

  const todaysSessions = useMemo(
    () => selectedWeek?.sessions.filter(s => s.day === selectedDay) ?? [],
    [selectedWeek, selectedDay]
  );

  const fmtDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  const fmtH = (h: number) => { const hh = Math.floor(h); const mm = Math.round((h - hh) * 60); return mm > 0 ? `${hh}h${mm}` : `${hh}h`; };

  const isToday = (weekNum: number, dayIdx: number) => {
    if (!plan) return false;
    const week = plan.weeks.find(w => w.weekNumber === weekNum);
    if (!week) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(week.startDate);
    const end = new Date(week.endDate);
    return today >= start && today <= end && dayIdx === getTodayDayIndex();
  };

  if (!plan || !selectedWeek) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
      <div className="text-center"><div className="text-4xl mb-4">⏳</div><p className="text-slate-400">Chargement...</p></div>
    </div>
  );

  const mc = MICROCYCLE_CONFIG[selectedWeek.microcycle] ?? { label: selectedWeek.microcycle, color: "text-slate-400 border-slate-700 bg-slate-800", dot: "bg-slate-400" };
  const prog = WeekProgress(selectedWeek);

  const allActive = plan.weeks.flatMap(w => w.sessions.filter(s => s.discipline !== "repos" && s.intensity !== "race"));
  const allDone = allActive.filter(s => !!s.log);

  // Sessions du jour par discipline pour le résumé
  const dayHasContent = todaysSessions.some(s => s.discipline !== "repos");

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col">

      {/* ── TOP HEADER ────────────────────────────────────────────────────── */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{SPORT_EMOJIS[plan.sport]}</span>
            <div>
              <h1 className="text-base font-bold leading-tight">
                {plan.races?.find(r => r.priority === "A")?.name ?? "Mon Plan"}
              </h1>
              <p className="text-slate-500 text-xs">
                {plan.totalWeeks} semaines · {allDone.length}/{allActive.length} séances
              </p>
            </div>
          </div>
          <button onClick={() => router.push("/")}
            className="text-xs px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors text-slate-300">
            Nouveau plan
          </button>
        </div>
        {/* Barre progression globale */}
        <div className="max-w-2xl mx-auto mt-2">
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full transition-all duration-700"
              style={{ width: `${allActive.length > 0 ? (allDone.length / allActive.length) * 100 : 0}%` }} />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full px-4 py-4 flex flex-col gap-4 flex-1">

        {/* ── SÉLECTEUR DE SEMAINE ──────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <select
              value={selectedWeekNum}
              onChange={e => { setSelectedWeekNum(Number(e.target.value)); setSelectedDay(0); }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm
                         focus:outline-none focus:ring-2 focus:ring-orange-500 appearance-none cursor-pointer"
            >
              {plan.weeks.map(w => {
                const p = WeekProgress(w);
                const mc2 = MICROCYCLE_CONFIG[w.microcycle];
                const hasRace = !!w.race;
                return (
                  <option key={w.weekNumber} value={w.weekNumber}>
                    Sem {w.weekNumber} · {new Date(w.startDate).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    {" · "}{mc2?.label ?? w.microcycle}
                    {hasRace ? ` 🏁 ${w.race!.name}` : ""}
                    {p.total > 0 ? ` · ${p.done}/${p.total}` : ""}
                  </option>
                );
              })}
            </select>
          </div>
          <button
            onClick={() => { const cur = findCurrentWeek(plan.weeks); setSelectedWeekNum(cur); setSelectedDay(getTodayDayIndex()); }}
            className="text-xs px-3 py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 border border-orange-800 transition-colors whitespace-nowrap"
          >
            Aujourd'hui
          </button>
        </div>

        {/* ── CARTE SEMAINE ────────────────────────────────────────────── */}
        <div className={`rounded-2xl border p-4 ${mc.color}`}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${mc.color}`}>{mc.label}</span>
                {selectedWeek.race && (
                  <span className="text-xs px-2 py-0.5 rounded-full border border-yellow-700 bg-yellow-900/30 text-yellow-300 font-medium">
                    🏁 {selectedWeek.race.name}
                  </span>
                )}
              </div>
              <p className="text-white/50 text-xs mt-2 italic">{selectedWeek.focusNote}</p>
            </div>
            {/* Progress ring */}
            <div className="flex-shrink-0 text-center ml-4">
              <div className="text-2xl font-bold text-white">{prog.pct}%</div>
              <div className="text-xs text-white/40">{prog.done}/{prog.total}</div>
            </div>
          </div>

          {/* Volumes */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: "🏊", label: "Nat", val: selectedWeek.natKm > 0 ? `${selectedWeek.natKm}km` : "—" },
              { icon: "🚴", label: "Vélo", val: selectedWeek.veloKm > 0 ? `${selectedWeek.veloKm}km` : "—" },
              { icon: "🏃", label: "CAP", val: selectedWeek.capKm > 0 ? `${selectedWeek.capKm}km` : "—" },
              { icon: "⏱", label: "Total", val: `~${fmtH(selectedWeek.totalH)}` },
            ].map(({ icon, label, val }) => (
              <div key={label} className="bg-black/20 rounded-xl py-2 text-center">
                <div className="text-sm">{icon}</div>
                <div className="text-xs text-white/40">{label}</div>
                <div className="text-xs font-bold text-white">{val}</div>
              </div>
            ))}
          </div>

          {/* Barre progression semaine */}
          <div className="mt-3 h-1.5 bg-black/20 rounded-full overflow-hidden">
            <div className="h-full bg-white/40 rounded-full transition-all"
              style={{ width: `${prog.pct}%` }} />
          </div>
        </div>

        {/* ── NAVIGATION JOURS ─────────────────────────────────────────── */}
        <div className="grid grid-cols-7 gap-1">
          {DAY_NAMES_SHORT.map((d, i) => {
            const daySessions = selectedWeek.sessions.filter(s => s.day === i);
            const hasContent = daySessions.some(s => s.discipline !== "repos");
            const allLogged = hasContent && daySessions.filter(s => s.discipline !== "repos").every(s => !!s.log);
            const someLogged = hasContent && daySessions.some(s => !!s.log);
            const isSelected = selectedDay === i;
            const isCurrentDay = isToday(selectedWeekNum, i);

            return (
              <button key={i} onClick={() => setSelectedDay(i)}
                className={`relative flex flex-col items-center py-2.5 px-1 rounded-xl transition-all duration-150
                  ${isSelected
                    ? "bg-orange-500 text-white"
                    : isCurrentDay
                    ? "bg-slate-700 text-white ring-1 ring-orange-500"
                    : "bg-slate-900 text-slate-400 hover:bg-slate-800"
                  }`}
              >
                <span className="text-xs font-medium">{d}</span>

                {/* Icône discipline */}
                <span className="text-sm mt-0.5">
                  {hasContent
                    ? daySessions.filter(s => s.discipline !== "repos").map(s => DISC_EMOJI[s.discipline] ?? "").join("")
                    : "·"}
                </span>

                {/* Indicateur fait/pas fait */}
                {hasContent && (
                  <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full
                    ${allLogged ? "bg-green-400" : someLogged ? "bg-yellow-400" : "bg-slate-600"}`} />
                )}

                {isCurrentDay && !isSelected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* ── CONTENU DU JOUR ───────────────────────────────────────────── */}
        <div className="flex-1">
          {/* Titre du jour */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-white">
              {DAY_NAMES_FULL[selectedDay]}
              {isToday(selectedWeekNum, selectedDay) && (
                <span className="ml-2 text-xs font-normal text-orange-400 bg-orange-400/10 border border-orange-800 px-2 py-0.5 rounded-full">
                  Aujourd'hui
                </span>
              )}
            </h2>
            <span className="text-slate-500 text-sm">
              {fmtDate(new Date(new Date(selectedWeek.startDate).getTime() + selectedDay * 86400000).toISOString())}
            </span>
          </div>

          {/* Séances du jour */}
          {!dayHasContent ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 py-10 flex flex-col items-center justify-center text-center">
              <div className="text-4xl mb-3">😴</div>
              <div className="text-white font-medium">Repos</div>
              <div className="text-slate-500 text-sm mt-1">Récupération, mobilité, sommeil</div>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysSessions.filter(s => s.discipline !== "repos").map(session => (
                <FullSessionCard
                  key={session.id}
                  session={session}
                  onUpdate={u => updateSession(selectedWeek.weekNumber, u)}
                  onDelete={id => deleteSession(selectedWeek.weekNumber, id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

// ── Carte séance pleine largeur ────────────────────────────────────────────────

const DISC_COLORS_FULL: Record<string, string> = {
  repos: "border-slate-700 bg-slate-900",
  nat: "border-cyan-800 bg-cyan-950/60",
  velo: "border-indigo-800 bg-indigo-950/60",
  cap: "border-green-800 bg-green-950/60",
  ppg: "border-yellow-800 bg-yellow-950/60",
  brique: "border-pink-800 bg-pink-950/60",
};

const INTENSITY_BADGE: Record<string, string> = {
  repos: "bg-slate-700 text-slate-300",
  faible: "bg-blue-800 text-blue-300",
  modere: "bg-orange-800 text-orange-300",
  eleve: "bg-red-800 text-red-300",
  race: "bg-yellow-700 text-yellow-200",
};

const INTENSITY_LABEL: Record<string, string> = {
  faible: "Facile", modere: "Modéré", eleve: "Intensif", race: "RACE", repos: "Repos",
};

function FullSessionCard({ session, onUpdate, onDelete }: {
  session: Session;
  onUpdate: (s: Session) => void;
  onDelete: (id: string) => void;
}) {
  const [showDetail, setShowDetail] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [logDuration, setLogDuration] = useState(session.log?.durationMin ?? session.durationMin);
  const [logDist, setLogDist] = useState(session.log?.distanceKm ?? session.distanceKm ?? 0);
  const [logNote, setLogNote] = useState(session.log?.note ?? "");
  const [logRpe, setLogRpe] = useState(session.log?.rpe ?? 5);

  const color = DISC_COLORS_FULL[session.discipline] ?? DISC_COLORS_FULL.cap;
  const isDone = !!session.log;
  const isRace = session.intensity === "race";

  const saveLog = () => {
    onUpdate({ ...session, log: {
      durationMin: logDuration,
      distanceKm: logDist > 0 ? logDist : undefined,
      note: logNote || undefined,
      rpe: logRpe,
      loggedAt: new Date().toISOString(),
    }});
    setShowLog(false);
  };

  const removeLog = () => {
    const { log, ...rest } = session;
    onUpdate(rest as Session);
    setShowLog(false);
  };

  return (
    <div className={`rounded-2xl border overflow-hidden ${color}`}>
      {/* Header séance */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-2xl">{DISC_EMOJI[session.discipline]}</span>
              <h3 className={`text-lg font-bold ${isRace ? "text-yellow-300" : "text-white"}`}>
                {session.label}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INTENSITY_BADGE[session.intensity]}`}>
                {INTENSITY_LABEL[session.intensity]}
              </span>
              {session.durationMin > 0 && (
                <span className="text-slate-400 text-sm">{session.durationMin} min</span>
              )}
              {session.distanceKm && (
                <span className="text-slate-400 text-sm">· {session.distanceKm} km</span>
              )}
              {session.distanceM && (
                <span className="text-slate-400 text-sm">· {session.distanceM} m</span>
              )}
            </div>
          </div>

          {/* Badge fait */}
          {isDone && (
            <div className="flex-shrink-0 bg-green-500/20 border border-green-700 rounded-xl px-3 py-2 text-center">
              <div className="text-green-400 text-lg">✓</div>
              <div className="text-green-400 text-xs font-medium">{session.log!.durationMin}min</div>
              {session.log!.rpe && <div className="text-green-300/60 text-xs">RPE {session.log!.rpe}/10</div>}
            </div>
          )}
        </div>

        {/* Allures cibles en aperçu */}
        {session.detail?.paces && session.detail.paces.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {session.detail.paces.slice(0, 3).map((p, i) => (
              <div key={i} className="bg-black/30 rounded-lg px-3 py-1.5 text-xs">
                <span className="text-white/40">{p.label} : </span>
                <span className="font-mono font-bold text-white">{p.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Détail séance (expandable) */}
      {showDetail && session.detail && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/5 pt-3">
          {session.detail.warmup && (
            <div>
              <div className="text-xs text-white/30 uppercase tracking-wider mb-1">Échauffement</div>
              <p className="text-sm text-white/70">{session.detail.warmup}</p>
            </div>
          )}
          <div>
            <div className="text-xs text-white/30 uppercase tracking-wider mb-1">Bloc principal</div>
            <p className="text-sm text-white/80 whitespace-pre-wrap">{session.detail.mainSet}</p>
          </div>
          {session.detail.cooldown && (
            <div>
              <div className="text-xs text-white/30 uppercase tracking-wider mb-1">Retour au calme / PPG</div>
              <p className="text-sm text-white/70">{session.detail.cooldown}</p>
            </div>
          )}
          {session.detail.paces.length > 0 && (
            <div className="bg-black/20 rounded-xl p-3 space-y-2">
              <div className="text-xs text-white/30 uppercase tracking-wider">🎯 Toutes les allures</div>
              {session.detail.paces.map((p, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm text-white/60">{p.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/30 bg-white/5 px-1.5 py-0.5 rounded">{p.zone}</span>
                    <span className="font-mono text-sm font-bold text-white">{p.value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Note si log existant */}
      {isDone && session.log?.note && (
        <div className="px-4 pb-3">
          <div className="bg-green-900/20 border border-green-800/40 rounded-xl px-3 py-2 text-sm text-green-300/80 italic">
            💬 "{session.log.note}"
          </div>
        </div>
      )}

      {/* Formulaire de log */}
      {showLog && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3 space-y-4">
          <h4 className="text-sm font-semibold text-white">
            {isDone ? "Modifier la séance" : "Enregistrer la séance"}
          </h4>

          <div>
            <label className="text-xs text-white/50 block mb-1">
              Durée réelle : <b className="text-white">{logDuration} min</b>
            </label>
            <input type="range" min={5} max={360} step={5} value={logDuration}
              onChange={e => setLogDuration(Number(e.target.value))}
              className="w-full accent-green-500" />
            <div className="flex justify-between text-xs text-white/20 mt-0.5">
              <span>5min</span><span>3h</span><span>6h</span>
            </div>
          </div>

          {(session.distanceKm !== undefined || session.distanceM !== undefined) && (
            <div>
              <label className="text-xs text-white/50 block mb-1">
                Distance : <b className="text-white">{logDist} km</b>
              </label>
              <input type="range" min={0} max={200} step={0.5} value={logDist}
                onChange={e => setLogDist(Number(e.target.value))}
                className="w-full accent-green-500" />
            </div>
          )}

          <div>
            <label className="text-xs text-white/50 block mb-2">
              Ressenti (RPE) : <b className="text-white">{logRpe}/10</b>
              <span className="ml-2 text-white/30">
                {logRpe <= 3 ? "😌 Très facile" : logRpe <= 5 ? "🙂 Confortable" : logRpe <= 7 ? "😤 Difficile" : "🔥 Très dur"}
              </span>
            </label>
            <div className="flex gap-1">
              {[1,2,3,4,5,6,7,8,9,10].map(n => (
                <button key={n} onClick={() => setLogRpe(n)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all
                    ${logRpe === n
                      ? n <= 3 ? "bg-blue-500 text-white" : n <= 6 ? "bg-orange-500 text-white" : "bg-red-500 text-white"
                      : "bg-white/5 text-white/30 hover:bg-white/10"
                    }`}
                >{n}</button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 block mb-1">Note libre (optionnel)</label>
            <input type="text" value={logNote} onChange={e => setLogNote(e.target.value)}
              placeholder="Comment ça s'est passé ? Sensations, conditions..."
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-sm
                         placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-green-500 text-white" />
          </div>

          <div className="flex gap-2">
            <button onClick={saveLog}
              className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 text-white font-semibold transition-colors">
              ✓ Valider la séance
            </button>
            {isDone && (
              <button onClick={removeLog}
                className="py-3 px-4 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-300 transition-colors text-sm">
                Effacer
              </button>
            )}
            <button onClick={() => setShowLog(false)}
              className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 transition-colors text-sm">
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Boutons d'action */}
      {!showLog && (
        <div className="px-4 pb-4 flex gap-2">
          {session.detail?.mainSet && (
            <button onClick={() => setShowDetail(!showDetail)}
              className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-sm transition-colors flex items-center justify-center gap-2">
              {showDetail ? "▲ Masquer" : "📋 Voir le détail"}
            </button>
          )}
          <button onClick={() => setShowLog(true)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2
              ${isDone
                ? "bg-green-900/40 hover:bg-green-900/60 text-green-400 border border-green-800"
                : "bg-orange-500 hover:bg-orange-400 text-white"
              }`}>
            {isDone ? "✏️ Modifier" : "✅ Séance faite ?"}
          </button>
          <button onClick={() => onDelete(session.id)}
            className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-colors text-sm">
            🗑️
          </button>
        </div>
      )}
    </div>
  );
}
