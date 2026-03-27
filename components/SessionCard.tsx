// components/SessionCard.tsx
"use client";
import { useState } from "react";
import type { Session } from "@/lib/types";

const DISC_COLORS: Record<string, string> = {
  repos: "border-slate-700 bg-slate-800/40 text-slate-400",
  nat: "border-cyan-800 bg-cyan-900/30 text-cyan-300",
  velo: "border-indigo-800 bg-indigo-900/30 text-indigo-300",
  cap: "border-green-800 bg-green-900/30 text-green-300",
  ppg: "border-yellow-800 bg-yellow-900/30 text-yellow-300",
  brique: "border-pink-800 bg-pink-900/30 text-pink-300",
};

const DISC_EMOJI: Record<string, string> = {
  repos: "😴", nat: "🏊", velo: "🚴", cap: "🏃", ppg: "💪", brique: "⚡",
};

const INTENSITY_DOT: Record<string, string> = {
  repos: "bg-slate-600", faible: "bg-blue-400",
  modere: "bg-orange-400", eleve: "bg-red-400", race: "bg-yellow-400",
};

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
type Mode = "view" | "detail" | "log" | "edit";

interface Props {
  session: Session;
  onUpdate: (s: Session) => void;
  onDelete: (id: string) => void;
}

export default function SessionCard({ session, onUpdate, onDelete }: Props) {
  const [mode, setMode] = useState<Mode>("view");
  const [editDuration, setEditDuration] = useState(session.durationMin);
  const [editDay, setEditDay] = useState(session.day);
  const [logDuration, setLogDuration] = useState(session.log?.durationMin ?? session.durationMin);
  const [logDist, setLogDist] = useState(session.log?.distanceKm ?? session.distanceKm ?? 0);
  const [logNote, setLogNote] = useState(session.log?.note ?? "");
  const [logRpe, setLogRpe] = useState(session.log?.rpe ?? 5);

  const color = DISC_COLORS[session.discipline] ?? DISC_COLORS.cap;
  const dot = INTENSITY_DOT[session.intensity] ?? INTENSITY_DOT.modere;
  const isDone = !!session.log;
  const isRace = session.intensity === "race";
  const hasDetail = !!(session.detail?.mainSet);

  const saveLog = () => {
    onUpdate({ ...session, log: {
      durationMin: logDuration,
      distanceKm: logDist > 0 ? logDist : undefined,
      note: logNote || undefined,
      rpe: logRpe,
      loggedAt: new Date().toISOString(),
    }});
    setMode("view");
  };

  const removeLog = () => {
    const { log, ...rest } = session;
    onUpdate(rest as Session);
    setMode("view");
  };

  const saveEdit = () => {
    onUpdate({ ...session, durationMin: editDuration, day: editDay });
    setMode("view");
  };

  if (session.discipline === "repos") {
    return (
      <div className={`rounded-xl border px-2 py-2 text-xs ${color}`}>
        😴 <span className="opacity-70">Repos</span>
      </div>
    );
  }

  if (isRace) {
    return (
      <div className="rounded-xl border border-yellow-600 bg-yellow-900/30 px-3 py-2 text-xs text-yellow-300">
        <div className="font-bold text-sm">🏁 RACE</div>
        <div className="opacity-80 text-xs mt-0.5 line-clamp-1">{session.label}</div>
        {session.detail?.mainSet && (
          <div className="opacity-60 text-xs mt-1 italic">{session.detail.mainSet}</div>
        )}
      </div>
    );
  }

  // ── Détail complet ─────────────────────────────────────────────────────────
  if (mode === "detail") {
    return (
      <div className={`rounded-xl border px-3 py-3 text-xs ${color} space-y-3`}>
        <div className="font-semibold text-sm">
          {DISC_EMOJI[session.discipline]} {session.label}
        </div>

        {session.detail?.warmup && (
          <div>
            <div className="opacity-50 text-xs uppercase tracking-wide mb-0.5">Échauffement</div>
            <div>{session.detail.warmup}</div>
          </div>
        )}

        <div>
          <div className="opacity-50 text-xs uppercase tracking-wide mb-0.5">Bloc principal</div>
          <div className="whitespace-pre-wrap">{session.detail?.mainSet}</div>
        </div>

        {session.detail?.cooldown && (
          <div>
            <div className="opacity-50 text-xs uppercase tracking-wide mb-0.5">Retour au calme / PPG</div>
            <div>{session.detail.cooldown}</div>
          </div>
        )}

        {(session.detail?.paces?.length ?? 0) > 0 && (
          <div className="border-t border-white/10 pt-2 space-y-1">
            <div className="opacity-50 text-xs uppercase tracking-wide mb-1">🎯 Allures cibles</div>
            {session.detail!.paces.map((p, i) => (
              <div key={i} className="flex justify-between items-center">
                <span className="opacity-70">{p.label}</span>
                <span className="font-mono font-bold">{p.value}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={() => setMode("view")}
          className="w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
          ← Fermer
        </button>
      </div>
    );
  }

  // ── Saisie temps réel ─────────────────────────────────────────────────────
  if (mode === "log") {
    return (
      <div className={`rounded-xl border px-3 py-3 text-xs ${color} space-y-2`}>
        <div className="font-semibold opacity-80">{DISC_EMOJI[session.discipline]} {session.label}</div>

        <div>
          <label className="opacity-60">Durée réelle : <b>{logDuration} min</b></label>
          <input type="range" min={5} max={360} step={5} value={logDuration}
            onChange={e => setLogDuration(Number(e.target.value))}
            className="w-full accent-green-500 mt-1" />
        </div>

        {(session.distanceKm !== undefined || session.distanceM !== undefined) && (
          <div>
            <label className="opacity-60">
              Distance : <b>{session.distanceM ? `${logDist * 1000}m` : `${logDist} km`}</b>
            </label>
            <input type="range"
              min={0} max={session.distanceM ? 10 : 200} step={session.distanceM ? 0.1 : 0.5}
              value={logDist}
              onChange={e => setLogDist(Number(e.target.value))}
              className="w-full accent-green-500 mt-1" />
          </div>
        )}

        <div>
          <label className="opacity-60">Ressenti (RPE) : <b>{logRpe}/10</b></label>
          <input type="range" min={1} max={10} step={1} value={logRpe}
            onChange={e => setLogRpe(Number(e.target.value))}
            className="w-full accent-green-500 mt-1" />
          <div className="flex justify-between text-xs opacity-40 mt-0.5">
            <span>Très facile</span><span>Modéré</span><span>Max</span>
          </div>
        </div>

        <input type="text" value={logNote} onChange={e => setLogNote(e.target.value)}
          placeholder="Note libre... (optionnel)"
          className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1.5 placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-green-500" />

        <div className="flex gap-1.5 pt-1">
          <button onClick={saveLog}
            className="flex-1 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium transition-colors">
            ✓ Valider
          </button>
          {isDone && (
            <button onClick={removeLog}
              className="py-1.5 px-2.5 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-red-300 transition-colors">✗</button>
          )}
          <button onClick={() => setMode("view")}
            className="flex-1 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors">
            Annuler
          </button>
        </div>
      </div>
    );
  }

  // ── Édition ────────────────────────────────────────────────────────────────
  if (mode === "edit") {
    return (
      <div className={`rounded-xl border px-3 py-3 text-xs ${color} space-y-2`}>
        <div className="font-semibold opacity-70">{session.label}</div>
        <div>
          <label className="opacity-60">Jour</label>
          <select value={editDay} onChange={e => setEditDay(Number(e.target.value))}
            className="w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-white">
            {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
          </select>
        </div>
        <div>
          <label className="opacity-60">Durée : <b>{editDuration} min</b></label>
          <input type="range" min={10} max={300} step={5} value={editDuration}
            onChange={e => setEditDuration(Number(e.target.value))}
            className="w-full accent-orange-500 mt-1" />
        </div>
        <div className="flex gap-1.5">
          <button onClick={saveEdit}
            className="flex-1 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white transition-colors">✓ OK</button>
          <button onClick={() => setMode("view")}
            className="flex-1 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors">Annuler</button>
        </div>
      </div>
    );
  }

  // ── Vue principale ─────────────────────────────────────────────────────────
  return (
    <div className={`rounded-xl border px-2 py-2 text-xs ${color} relative group`}>
      {isDone && <span className="absolute top-1 right-1 text-green-400 text-xs font-bold">✓</span>}

      <div className="flex items-start gap-1.5 pr-3">
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 mt-1 ${dot}`} />
        <div className="min-w-0 flex-1">
          <div className="font-semibold leading-tight">
            {DISC_EMOJI[session.discipline]} {session.label}
          </div>
          <div className="opacity-60 mt-0.5">
            {session.durationMin > 0 ? `${session.durationMin}min` : ""}
            {session.distanceKm ? ` · ${session.distanceKm}km` : ""}
            {session.distanceM ? ` · ${session.distanceM}m` : ""}
          </div>

          {/* Aperçu allure principale */}
          {!isDone && session.detail?.paces?.[0] && (
            <div className="opacity-50 italic truncate mt-0.5">
              {session.detail.paces[0].value}
            </div>
          )}

          {/* Réalisé */}
          {isDone && session.log && (
            <div className="text-green-400 mt-0.5">
              ✓ {session.log.durationMin}min
              {session.log.distanceKm ? ` · ${session.log.distanceKm}km` : ""}
              {session.log.rpe ? ` · RPE ${session.log.rpe}/10` : ""}
            </div>
          )}
        </div>
      </div>

      {/* Actions hover */}
      <div className="mt-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
        {hasDetail && (
          <button onClick={() => setMode("detail")}
            className="text-xs px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors">
            📋
          </button>
        )}
        <button onClick={() => setMode("log")}
          className="text-xs px-1.5 py-0.5 rounded bg-green-700/40 hover:bg-green-600/60 text-green-300 transition-colors">
          {isDone ? "✏️" : "✅"}
        </button>
        <button onClick={() => setMode("edit")}
          className="text-xs px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors">
          ⚙️
        </button>
        <button onClick={() => onDelete(session.id)}
          className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 hover:bg-red-500/40 text-red-300 transition-colors">
          🗑️
        </button>
      </div>
    </div>
  );
}
