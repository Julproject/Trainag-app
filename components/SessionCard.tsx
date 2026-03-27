// components/SessionCard.tsx
"use client";
import { useState } from "react";
import type { Session } from "@/lib/types";

const SESSION_COLORS: Record<string, string> = {
  repos: "border-slate-700 bg-slate-800/50 text-slate-400",
  "recup-active": "border-blue-800 bg-blue-900/30 text-blue-300",
  endurance: "border-green-800 bg-green-900/30 text-green-300",
  fractionne: "border-red-800 bg-red-900/30 text-red-300",
  seuil: "border-orange-800 bg-orange-900/30 text-orange-300",
  "longue-sortie": "border-purple-800 bg-purple-900/30 text-purple-300",
  muscu: "border-yellow-800 bg-yellow-900/30 text-yellow-300",
  brique: "border-pink-800 bg-pink-900/30 text-pink-300",
  natation: "border-cyan-800 bg-cyan-900/30 text-cyan-300",
  velo: "border-indigo-800 bg-indigo-900/30 text-indigo-300",
};

const INTENSITY_DOTS: Record<string, string> = {
  repos: "bg-slate-600",
  faible: "bg-blue-400",
  modere: "bg-orange-400",
  eleve: "bg-red-400",
};

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

type Mode = "view" | "edit" | "log" | "paces";

interface Props {
  session: Session;
  onUpdate: (updated: Session) => void;
  onDelete: (id: string) => void;
}

export default function SessionCard({ session, onUpdate, onDelete }: Props) {
  const [mode, setMode] = useState<Mode>("view");
  const [editDuration, setEditDuration] = useState(session.durationMin);
  const [editDay, setEditDay] = useState(session.day);
  const [logDuration, setLogDuration] = useState(session.log?.durationMin ?? session.durationMin);
  const [logDistance, setLogDistance] = useState(session.log?.distanceKm ?? session.distanceKm ?? 0);
  const [logNote, setLogNote] = useState(session.log?.note ?? "");

  const colorClass = SESSION_COLORS[session.type] ?? SESSION_COLORS.endurance;
  const dotClass = INTENSITY_DOTS[session.intensity] ?? INTENSITY_DOTS.modere;
  const isDone = !!session.log;
  const hasPaces = (session.targetPaces?.lines?.length ?? 0) > 0;

  const handleSaveEdit = () => {
    onUpdate({ ...session, durationMin: editDuration, day: editDay });
    setMode("view");
  };

  const handleSaveLog = () => {
    onUpdate({
      ...session,
      log: {
        durationMin: logDuration,
        distanceKm: logDistance > 0 ? logDistance : undefined,
        note: logNote || undefined,
        loggedAt: new Date().toISOString(),
      },
    });
    setMode("view");
  };

  const handleDeleteLog = () => {
    const { log, ...rest } = session;
    onUpdate(rest as Session);
    setMode("view");
  };

  if (session.type === "repos") {
    return (
      <div className={`rounded-xl border px-3 py-2 text-xs ${colorClass}`}>
        😴 {session.label}
      </div>
    );
  }

  // ── Vue allures cibles ────────────────────────────────────────────────────
  if (mode === "paces") {
    return (
      <div className={`rounded-xl border px-3 py-3 text-xs ${colorClass} space-y-2`}>
        <div className="font-semibold flex items-center gap-1.5">
          🎯 Allures cibles
        </div>
        <div className="space-y-1">
          {session.targetPaces?.lines.map((line, i) => (
            <div key={i} className="opacity-90 leading-relaxed">{line}</div>
          ))}
        </div>
        <button
          onClick={() => setMode("view")}
          className="w-full py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors mt-1"
        >
          ← Retour
        </button>
      </div>
    );
  }

  // ── Vue principale ────────────────────────────────────────────────────────
  if (mode === "view") {
    return (
      <div className={`rounded-xl border px-3 py-2 text-xs ${colorClass} relative group`}>
        {isDone && (
          <span className="absolute top-1.5 right-1.5 text-green-400 font-bold">✓</span>
        )}

        <div className="font-semibold flex items-center gap-1.5 pr-4">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} />
          {session.label}
        </div>

        <div className="opacity-60 mt-0.5">
          {session.durationMin} min
          {session.distanceKm ? ` · ~${session.distanceKm} km` : ""}
        </div>

        {/* Aperçu allure principale */}
        {hasPaces && !isDone && (
          <div className="mt-1 opacity-70 text-xs truncate italic">
            {session.targetPaces!.lines[0]}
          </div>
        )}

        {/* Ce qui a été fait */}
        {isDone && session.log && (
          <div className="mt-1.5 pt-1.5 border-t border-white/10 text-green-300">
            ✓ {session.log.durationMin} min
            {session.log.distanceKm ? ` · ${session.log.distanceKm} km` : ""}
            {session.log.note && <div className="opacity-70 italic truncate">{session.log.note}</div>}
          </div>
        )}

        {/* Actions au hover */}
        <div className="mt-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-wrap">
          <button
            onClick={() => setMode("log")}
            className="text-xs px-2 py-0.5 rounded-lg bg-green-700/40 hover:bg-green-700/70 text-green-300 transition-colors"
          >
            {isDone ? "✏️" : "✅"}
          </button>
          {hasPaces && (
            <button
              onClick={() => setMode("paces")}
              className="text-xs px-2 py-0.5 rounded-lg bg-blue-700/40 hover:bg-blue-700/70 text-blue-300 transition-colors"
            >
              🎯
            </button>
          )}
          <button
            onClick={() => setMode("edit")}
            className="text-xs px-2 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            ⚙️
          </button>
          <button
            onClick={() => onDelete(session.id)}
            className="text-xs px-2 py-0.5 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-red-300 transition-colors"
          >
            🗑️
          </button>
        </div>
      </div>
    );
  }

  // ── Saisie du temps réel ──────────────────────────────────────────────────
  if (mode === "log") {
    return (
      <div className={`rounded-xl border px-3 py-3 text-xs ${colorClass} space-y-2`}>
        <div className="font-semibold opacity-70">{session.label}</div>

        <div>
          <label className="opacity-60">Durée réelle : <b>{logDuration} min</b></label>
          <input type="range" min={5} max={300} step={5} value={logDuration}
            onChange={(e) => setLogDuration(Number(e.target.value))}
            className="w-full accent-green-500 mt-1" />
        </div>

        {session.distanceKm !== undefined && (
          <div>
            <label className="opacity-60">Distance : <b>{logDistance} km</b></label>
            <input type="range" min={0} max={60} step={0.5} value={logDistance}
              onChange={(e) => setLogDistance(Number(e.target.value))}
              className="w-full accent-green-500 mt-1" />
          </div>
        )}

        <div>
          <label className="opacity-60 block mb-1">Note (optionnel)</label>
          <input type="text" value={logNote} onChange={(e) => setLogNote(e.target.value)}
            placeholder="Comment ça s'est passé ?"
            className="w-full bg-black/20 border border-white/10 rounded-lg px-2 py-1 text-xs placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-green-500" />
        </div>

        <div className="flex gap-1.5">
          <button onClick={handleSaveLog}
            className="flex-1 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors font-medium">
            ✓ Valider
          </button>
          {isDone && (
            <button onClick={handleDeleteLog}
              className="py-1.5 px-2 rounded-lg bg-red-500/30 hover:bg-red-500/50 text-red-300 transition-colors">
              ✗
            </button>
          )}
          <button onClick={() => setMode("view")}
            className="flex-1 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors">
            Annuler
          </button>
        </div>
      </div>
    );
  }

  // ── Édition séance ────────────────────────────────────────────────────────
  return (
    <div className={`rounded-xl border px-3 py-3 text-xs ${colorClass} space-y-2`}>
      <div className="font-semibold opacity-70">{session.label}</div>

      <div>
        <label className="opacity-60">Jour</label>
        <select value={editDay} onChange={(e) => setEditDay(Number(e.target.value))}
          className="w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-white">
          {DAY_NAMES.map((d, i) => <option key={i} value={i}>{d}</option>)}
        </select>
      </div>

      <div>
        <label className="opacity-60">Durée prévue : <b>{editDuration} min</b></label>
        <input type="range" min={10} max={240} step={5} value={editDuration}
          onChange={(e) => setEditDuration(Number(e.target.value))}
          className="w-full accent-orange-500 mt-1" />
      </div>

      <div className="flex gap-1.5">
        <button onClick={handleSaveEdit}
          className="flex-1 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white transition-colors">
          ✓ OK
        </button>
        <button onClick={() => setMode("view")}
          className="flex-1 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors">
          Annuler
        </button>
      </div>
    </div>
  );
}
