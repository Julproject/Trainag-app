// app/setup/page.tsx
"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SportType, GoalType } from "@/lib/types";

const SPORT_LABELS: Record<SportType, string> = {
  marathon: "Marathon",
  "semi-marathon": "Semi-Marathon",
  triathlon: "Triathlon",
  velo: "Course à Vélo",
};

const GOALS: { value: GoalType; label: string; desc: string }[] = [
  { value: "finir", label: "Finir la course", desc: "Franchir la ligne d'arrivée" },
  { value: "ameliorer", label: "Améliorer mon temps", desc: "Battre mon record personnel" },
  { value: "debuter", label: "Débuter", desc: "Première expérience, progresser doucement" },
];

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sport = (searchParams.get("sport") as SportType) || "marathon";

  const [eventDate, setEventDate] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState(6);
  const [goal, setGoal] = useState<GoalType>("finir");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Date min = dans 4 semaines
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 28);
  const minDateStr = minDate.toISOString().split("T")[0];

  const handleSubmit = async () => {
    if (!eventDate) {
      setError("Veuillez choisir une date d'événement.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport, goal, eventDate, hoursPerWeek }),
      });
      if (!res.ok) throw new Error("Erreur API");
      const plan = await res.json();
      localStorage.setItem("training-plan", JSON.stringify(plan));
      router.push("/plan");
    } catch (e) {
      setError("Erreur lors de la génération du plan. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <button
          onClick={() => router.back()}
          className="text-slate-400 hover:text-white mb-6 flex items-center gap-2 transition-colors"
        >
          ← Retour
        </button>

        <h1 className="text-3xl font-bold mb-1">
          {SPORT_LABELS[sport] ?? ""}
        </h1>
        <p className="text-slate-400 mb-8">Paramétrez votre préparation</p>

        <div className="space-y-6">
          {/* Date de l'événement */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Date de l'événement
            </label>
            <input
              type="date"
              min={minDateStr}
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3
                         text-white focus:outline-none focus:ring-2 focus:ring-orange-500
                         focus:border-transparent"
            />
          </div>

          {/* Heures par semaine */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Temps disponible par semaine :{" "}
              <span className="text-orange-400 font-bold">{hoursPerWeek}h</span>
            </label>
            <input
              type="range"
              min={3}
              max={15}
              step={0.5}
              value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>3h (débutant)</span>
              <span>8h (intermédiaire)</span>
              <span>15h (confirmé)</span>
            </div>
          </div>

          {/* Objectif */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Votre objectif
            </label>
            <div className="space-y-2">
              {GOALS.map((g) => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all duration-150
                    ${
                      goal === g.value
                        ? "border-orange-500 bg-orange-500/10 text-white"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"
                    }`}
                >
                  <div className="font-medium">{g.label}</div>
                  <div className="text-sm opacity-60">{g.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3">{error}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700
                       text-white font-semibold py-4 rounded-xl transition-colors duration-200
                       focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                       focus:ring-offset-slate-950"
          >
            {loading ? "Génération en cours..." : "Générer mon plan →"}
          </button>
        </div>
      </div>
    </main>
  );
}

export default function SetupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Chargement...</div>}>
      <SetupContent />
    </Suspense>
  );
}
