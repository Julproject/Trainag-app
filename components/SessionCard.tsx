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

interface Props {
  session: Session;
  onUpdate: (updated: Session) => void;
  onDelete: (id: string) => void;
}

export default function SessionCard({ session, onUpdate, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [editDuration, setEditDuration] = useState(session.durationMin);
  const [editDay, setEditDay] = useState(session.day);

  const colorClass = SESSION_COLORS[session.type] ?? SESSION_COLORS.endurance;
  const dotClass = INTENSITY_DOTS[session.intensity] ?? INTENSITY_DOTS.modere;

  const handleSave = () => {
    onUpdate({ ...session, durationMin: editDuration, day: editDay });
    setEditing(false);
  };

  if (session.type === "repos") {
    return (
      <div className={`rounded-xl border px-3 py-2 text-xs ${colorClass}`}>
        <span>😴 {session.label}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border px-3 py-3 text-sm ${colorClass} relative group`}>
      {!editing ? (
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full inline-block flex-shrink-0 ${dotClass}`}
                />
                {session.label}
              </div>
              {session.durationMin > 0 && (
                <div className="opacity-60 text-xs mt-0.5">
                  {session.durationMin} min
                  {session.distanceKm ? ` · ~${session.distanceKm} km` : ""}
                </div>
              )}
              <div className="opacity-50 text-xs mt-1 line-clamp-2">{session.description}</div>
            </div>
          </div>

          <div className="mt-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditing(true)}
              className="text-xs px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
            >
              ✏️ Modifier
            </button>
            <button
              onClick={() => onDelete(session.id)}
              className="text-xs px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/40 transition-colors text-red-300"
            >
              🗑️
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-2">
          <div className="font-semibold text-xs opacity-70 mb-1">{session.label}</div>

          <div>
            <label className="text-xs opacity-60">Jour</label>
            <select
              value={editDay}
              onChange={(e) => setEditDay(Number(e.target.value))}
              className="w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg px-2 py-1 text-xs text-white"
            >
              {DAY_NAMES.map((d, i) => (
                <option key={i} value={i}>{d}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs opacity-60">Durée : {editDuration} min</label>
            <input
              type="range"
              min={10}
              max={240}
              step={5}
              value={editDuration}
              onChange={(e) => setEditDuration(Number(e.target.value))}
              className="w-full accent-orange-500 mt-1"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 text-xs py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white transition-colors"
            >
              ✓ Valider
            </button>
            <button
              onClick={() => setEditing(false)}
              className="flex-1 text-xs py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
