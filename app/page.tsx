// app/page.tsx
"use client";
import { useRouter } from "next/navigation";
import type { SportType } from "@/lib/types";

const SPORTS: { type: SportType; emoji: string; label: string; sub: string }[] = [
  { type: "marathon", emoji: "🏃", label: "Marathon", sub: "42,195 km" },
  { type: "semi-marathon", emoji: "🏅", label: "Semi-Marathon", sub: "21,097 km" },
  { type: "triathlon", emoji: "🏊", label: "Triathlon", sub: "Natation · Vélo · Course" },
  { type: "velo", emoji: "🚴", label: "Course à Vélo", sub: "Contre-la-montre ou cyclosportive" },
];

export default function HomePage() {
  const router = useRouter();

  const handleSelect = (sport: SportType) => {
    router.push(`/setup?sport=${sport}`);
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-center mb-2 text-white">
          🎯 Mon Plan d'Entraînement
        </h1>
        <p className="text-slate-400 text-center mb-10 text-lg">
          Choisissez votre objectif pour commencer
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SPORTS.map((sport) => (
            <button
              key={sport.type}
              onClick={() => handleSelect(sport.type)}
              className="group bg-slate-900 border border-slate-700 rounded-2xl p-6 text-left
                         hover:border-orange-500 hover:bg-slate-800 transition-all duration-200
                         focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <div className="text-4xl mb-3">{sport.emoji}</div>
              <div className="text-xl font-semibold text-white group-hover:text-orange-400 transition-colors">
                {sport.label}
              </div>
              <div className="text-slate-400 text-sm mt-1">{sport.sub}</div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
