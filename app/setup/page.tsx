// app/setup/page.tsx
"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SportType, GoalType, PaceReference } from "@/lib/types";

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

// ── Composant saisie allure course à pied ─────────────────────────────────────
function RunPaceInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <p className="text-slate-500 text-xs mb-2">Format : min'sec"/km — ex: <b className="text-slate-400">5'30"</b> pour 5 minutes 30 secondes au km</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="5'30&quot;"
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white
                   focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-600"
      />
    </div>
  );
}

// ── Composant saisie allure natation ─────────────────────────────────────────
function SwimPaceInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">🏊 Votre temps au 100m (nage)</label>
      <p className="text-slate-500 text-xs mb-2">Format : min'sec" — ex: <b className="text-slate-400">1'45"</b> pour 1 min 45 sec au 100m</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="1'45&quot;"
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white
                   focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-600"
      />
    </div>
  );
}

// ── Composant saisie vélo ─────────────────────────────────────────────────────
function BikeInput({
  speed, onSpeed, ftp, onFtp
}: { speed: string; onSpeed: (v: string) => void; ftp: string; onFtp: (v: string) => void }) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">🚴 Vitesse moyenne en sortie (km/h)</label>
        <p className="text-slate-500 text-xs mb-2">Votre vitesse sur une sortie d'entraînement typique</p>
        <input
          type="number"
          value={speed}
          onChange={(e) => onSpeed(e.target.value)}
          placeholder="ex: 28"
          min={10} max={60}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white
                     focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-600"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">⚡ FTP (watts) <span className="text-slate-500 font-normal">— optionnel</span></label>
        <p className="text-slate-500 text-xs mb-2">Votre seuil fonctionnel de puissance si vous avez un capteur</p>
        <input
          type="number"
          value={ftp}
          onChange={(e) => onFtp(e.target.value)}
          placeholder="ex: 220"
          min={50} max={500}
          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white
                     focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-600"
        />
      </div>
    </div>
  );
}

// ── Parser allure texte → secondes/km ─────────────────────────────────────────
function parsePace(str: string): number | undefined {
  const cleaned = str.replace(/['"]/g, "").replace(",", ":").trim();
  if (!cleaned) return undefined;
  if (cleaned.includes(":")) {
    const [m, s] = cleaned.split(":").map(Number);
    if (isNaN(m) || isNaN(s)) return undefined;
    return m * 60 + s;
  }
  const n = parseFloat(cleaned);
  if (isNaN(n)) return undefined;
  return Math.round(n * 60);
}

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sport = (searchParams.get("sport") as SportType) || "marathon";

  const [eventDate, setEventDate] = useState("");
  const [hoursPerWeek, setHoursPerWeek] = useState(6);
  const [goal, setGoal] = useState<GoalType>("finir");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Références de performance
  const [runPace, setRunPace] = useState(""); // ex: "5'30"
  const [swimPace, setSwimPace] = useState(""); // ex: "1'45"
  const [bikeSpeed, setBikeSpeed] = useState(""); // ex: "28"
  const [bikeFtp, setBikeFtp] = useState(""); // ex: "220"

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 28);
  const minDateStr = minDate.toISOString().split("T")[0];

  const handleSubmit = async () => {
    if (!eventDate) { setError("Veuillez choisir une date d'événement."); return; }

    // Construire la référence de performance
    const paceRef: PaceReference = {};

    if (sport === "marathon" || sport === "semi-marathon") {
      const sec = parsePace(runPace);
      if (!sec) { setError("Veuillez saisir votre allure de course (ex: 5'30\")."); return; }
      paceRef.runPaceSecPerKm = sec;
    }

    if (sport === "triathlon") {
      const swimSec = parsePace(swimPace);
      if (!swimSec) { setError("Veuillez saisir votre temps au 100m nage."); return; }
      paceRef.swimPaceSec100m = swimSec;
      const bikeSec = parseFloat(bikeSpeed);
      if (!bikeSec) { setError("Veuillez saisir votre vitesse vélo."); return; }
      paceRef.bikeSpeedKmh = bikeSec;
      const runSec = parsePace(runPace);
      if (!runSec) { setError("Veuillez saisir votre allure de course à pied."); return; }
      paceRef.runPaceSecPerKm = runSec;
      if (bikeFtp) paceRef.bikeFTPWatts = parseInt(bikeFtp);
    }

    if (sport === "velo") {
      const spd = parseFloat(bikeSpeed);
      if (!spd) { setError("Veuillez saisir votre vitesse moyenne vélo."); return; }
      paceRef.bikeSpeedKmh = spd;
      if (bikeFtp) paceRef.bikeFTPWatts = parseInt(bikeFtp);
    }

    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sport, goal, eventDate, hoursPerWeek, paceRef }),
      });
      if (!res.ok) throw new Error("Erreur API");
      const plan = await res.json();
      localStorage.setItem("training-plan", JSON.stringify(plan));
      router.push("/plan");
    } catch {
      setError("Erreur lors de la génération du plan. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6">
      <div className="max-w-lg w-full">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white mb-6 flex items-center gap-2 transition-colors">
          ← Retour
        </button>

        <h1 className="text-3xl font-bold mb-1">{SPORT_LABELS[sport]}</h1>
        <p className="text-slate-400 mb-8">Paramétrez votre préparation</p>

        <div className="space-y-6">

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">📅 Date de l'événement</label>
            <input
              type="date" min={minDateStr} value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Heures par semaine */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              ⏱ Temps disponible : <span className="text-orange-400 font-bold">{hoursPerWeek}h / semaine</span>
            </label>
            <input
              type="range" min={3} max={15} step={0.5} value={hoursPerWeek}
              onChange={(e) => setHoursPerWeek(Number(e.target.value))}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>3h</span><span>8h</span><span>15h</span>
            </div>
          </div>

          {/* Objectif */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">🎯 Votre objectif</label>
            <div className="space-y-2">
              {GOALS.map((g) => (
                <button key={g.value} onClick={() => setGoal(g.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-all
                    ${goal === g.value ? "border-orange-500 bg-orange-500/10 text-white" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"}`}>
                  <div className="font-medium">{g.label}</div>
                  <div className="text-sm opacity-60">{g.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Références de performance selon le sport ── */}
          <div className="border border-slate-700 rounded-2xl p-4 space-y-4 bg-slate-900/50">
            <p className="text-sm font-semibold text-slate-200">📊 Vos références de performance</p>
            <p className="text-xs text-slate-400">Utilisées pour calculer vos allures cibles dans chaque séance.</p>

            {(sport === "marathon" || sport === "semi-marathon") && (
              <RunPaceInput
                label="🏃 Votre allure de course actuelle (au km)"
                value={runPace}
                onChange={setRunPace}
              />
            )}

            {sport === "triathlon" && (
              <>
                <SwimPaceInput value={swimPace} onChange={setSwimPace} />
                <BikeInput speed={bikeSpeed} onSpeed={setBikeSpeed} ftp={bikeFtp} onFtp={setBikeFtp} />
                <RunPaceInput
                  label="🏃 Votre allure de course à pied (au km)"
                  value={runPace}
                  onChange={setRunPace}
                />
              </>
            )}

            {sport === "velo" && (
              <BikeInput speed={bikeSpeed} onSpeed={setBikeSpeed} ftp={bikeFtp} onFtp={setBikeFtp} />
            )}
          </div>

          {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3">{error}</p>}

          <button
            onClick={handleSubmit} disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700
                       text-white font-semibold py-4 rounded-xl transition-colors"
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
