// app/setup/page.tsx
"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { SportType, GoalType, PaceZones, PlannedRace, TriDistance } from "@/lib/types";
import { parsePaceInput } from "@/lib/paceCalculator";

const SPORT_LABELS: Record<SportType, string> = {
  marathon: "Marathon", "semi-marathon": "Semi-Marathon",
  triathlon: "Triathlon", velo: "Course à Vélo",
};

const GOALS: { value: GoalType; label: string }[] = [
  { value: "finir", label: "🏁 Finir la course" },
  { value: "ameliorer", label: "⏱ Améliorer mon temps" },
  { value: "debuter", label: "🌱 Débuter" },
];

const DISTANCES: { value: TriDistance; label: string; sub: string }[] = [
  { value: "S", label: "Sprint", sub: "750m · 20km · 5km" },
  { value: "M", label: "Olympique / M", sub: "1500m · 40km · 10km" },
  { value: "L", label: "Half / L", sub: "1900m · 90km · 21km" },
];

const PRIORITIES: { value: "A" | "B" | "C"; label: string; sub: string }[] = [
  { value: "A", label: "⭐⭐ Objectif principal", sub: "Course la plus importante" },
  { value: "B", label: "⭐ Intermédiaire", sub: "Test de forme, effort contrôlé" },
  { value: "C", label: "Sortie compét", sub: "Participation libre" },
];

function InputField({ label, hint, value, onChange, placeholder, type = "text" }: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white
                   focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-slate-600" />
    </div>
  );
}

function RaceCard({ race, onRemove }: { race: PlannedRace; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl px-4 py-3">
      <div>
        <div className="text-white font-medium text-sm flex items-center gap-2">
          {race.priority === "A" ? "⭐⭐" : race.priority === "B" ? "⭐" : "🏅"} {race.name}
        </div>
        <div className="text-slate-400 text-xs mt-0.5">
          {race.distance} · {new Date(race.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
        </div>
      </div>
      <button onClick={onRemove} className="text-red-400 hover:text-red-300 text-lg ml-4">✕</button>
    </div>
  );
}

function SetupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sport = (searchParams.get("sport") as SportType) || "triathlon";

  // Formulaire de base
  const [goal, setGoal] = useState<GoalType>("ameliorer");
  const [hoursPerWeek, setHoursPerWeek] = useState(8);
  const [totalWeeks, setTotalWeeks] = useState(20);

  // Allures
  const [mPace, setMPace] = useState("");         // ex: 4'30
  const [lPace, setLPace] = useState("");         // ex: 4'40 (optionnel)
  const [swimPace, setSwimPace] = useState("");   // ex: 1'45
  const [bikeSpeed, setBikeSpeed] = useState(""); // ex: 30
  const [bikeFtp, setBikeFtp] = useState("");     // ex: 220

  // Compétitions
  const [races, setRaces] = useState<PlannedRace[]>([]);
  const [newRaceName, setNewRaceName] = useState("");
  const [newRaceDate, setNewRaceDate] = useState("");
  const [newRaceDist, setNewRaceDist] = useState<TriDistance>("M");
  const [newRacePrio, setNewRacePrio] = useState<"A" | "B" | "C">("B");
  const [showAddRace, setShowAddRace] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const mainRace = races.find(r => r.priority === "A");
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 14);
  const minDateStr = minDate.toISOString().split("T")[0];

  const addRace = () => {
    if (!newRaceName || !newRaceDate) { setError("Nom et date de course requis."); return; }
    setRaces(prev => [...prev, {
      name: newRaceName, date: newRaceDate,
      distance: newRaceDist, priority: newRacePrio,
    }].sort((a, b) => a.date.localeCompare(b.date)));
    setNewRaceName(""); setNewRaceDate("");
    setShowAddRace(false); setError("");
  };

  const handleSubmit = async () => {
    if (races.length === 0) { setError("Ajoutez au moins une compétition."); return; }
    if (!mainRace) { setError("Définissez au moins une course ⭐⭐ principale."); return; }

    const mSec = parsePaceInput(mPace);
    if (!mSec) { setError("Saisissez votre allure M-race (ex: 4'30\")."); return; }

    if (sport === "triathlon") {
      const sw = parsePaceInput(swimPace);
      if (!sw) { setError("Saisissez votre temps au 100m nage (ex: 1'45\")."); return; }
      const bk = parseFloat(bikeSpeed);
      if (!bk) { setError("Saisissez votre vitesse vélo (ex: 30)."); return; }
    }

    const paceZones: PaceZones = {
      m_runPace: mSec,
      l_runPace: parsePaceInput(lPace) ?? mSec + 10,
      swimPace100m: parsePaceInput(swimPace),
      bikeSpeedKmh: parseFloat(bikeSpeed) || undefined,
      bikeFTPWatts: parseInt(bikeFtp) || undefined,
    };

    setLoading(true); setError("");
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sport, goal,
          eventDate: mainRace.date,
          hoursPerWeek, paceZones, races, totalWeeks,
        }),
      });
      if (!res.ok) throw new Error();
      const plan = await res.json();
      localStorage.setItem("training-plan", JSON.stringify(plan));
      router.push("/plan");
    } catch {
      setError("Erreur lors de la génération. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-lg mx-auto">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-white mb-6 flex items-center gap-2 transition-colors">
          ← Retour
        </button>
        <h1 className="text-3xl font-bold mb-1">{SPORT_LABELS[sport]}</h1>
        <p className="text-slate-400 mb-8">Paramétrez votre saison</p>

        <div className="space-y-8">

          {/* ── Objectif ── */}
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Objectif</h2>
            <div className="flex gap-2 flex-wrap">
              {GOALS.map(g => (
                <button key={g.value} onClick={() => setGoal(g.value)}
                  className={`px-4 py-2 rounded-xl border text-sm transition-all
                    ${goal === g.value ? "border-orange-500 bg-orange-500/10 text-white" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-500"}`}>
                  {g.label}
                </button>
              ))}
            </div>
          </section>

          {/* ── Durée & Volume ── */}
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Volume</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Durée du plan : <span className="text-orange-400 font-bold">{totalWeeks} semaines</span>
                </label>
                <input type="range" min={8} max={30} step={1} value={totalWeeks}
                  onChange={e => setTotalWeeks(Number(e.target.value))}
                  className="w-full accent-orange-500" />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>8 sem</span><span>20 sem</span><span>30 sem</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Heures d'entraînement/semaine : <span className="text-orange-400 font-bold">{hoursPerWeek}h</span>
                </label>
                <input type="range" min={4} max={18} step={0.5} value={hoursPerWeek}
                  onChange={e => setHoursPerWeek(Number(e.target.value))}
                  className="w-full accent-orange-500" />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>4h</span><span>10h</span><span>18h</span>
                </div>
              </div>
            </div>
          </section>

          {/* ── Compétitions ── */}
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Compétitions {races.length > 0 && <span className="text-orange-400 normal-case font-normal">· {races.length} ajoutée{races.length > 1 ? "s" : ""}</span>}
            </h2>

            {races.length > 0 && (
              <div className="space-y-2 mb-3">
                {races.map((r, i) => <RaceCard key={i} race={r} onRemove={() => setRaces(prev => prev.filter((_, j) => j !== i))} />)}
              </div>
            )}

            {!showAddRace ? (
              <button onClick={() => setShowAddRace(true)}
                className="w-full border border-dashed border-slate-600 hover:border-orange-500 rounded-xl py-3 text-slate-400 hover:text-orange-400 text-sm transition-all">
                + Ajouter une course
              </button>
            ) : (
              <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 space-y-3">
                <InputField label="Nom de la course" value={newRaceName} onChange={setNewRaceName} placeholder="ex: FRENCHMAN Carcans" />
                <InputField label="Date" type="date" value={newRaceDate} onChange={setNewRaceDate} hint="" />

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Distance</label>
                  <div className="flex gap-2">
                    {DISTANCES.map(d => (
                      <button key={d.value} onClick={() => setNewRaceDist(d.value)}
                        className={`flex-1 py-2 px-2 rounded-xl border text-xs transition-all text-center
                          ${newRaceDist === d.value ? "border-orange-500 bg-orange-500/10 text-white" : "border-slate-700 bg-slate-800 text-slate-300"}`}>
                        <div className="font-medium">{d.label}</div>
                        <div className="opacity-60">{d.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Priorité</label>
                  <div className="space-y-1">
                    {PRIORITIES.map(p => (
                      <button key={p.value} onClick={() => setNewRacePrio(p.value)}
                        className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition-all
                          ${newRacePrio === p.value ? "border-orange-500 bg-orange-500/10 text-white" : "border-slate-700 bg-slate-800 text-slate-300"}`}>
                        <span className="font-medium">{p.label}</span>
                        <span className="opacity-60 ml-2 text-xs">{p.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={addRace} className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-medium text-sm transition-colors">
                    Ajouter
                  </button>
                  <button onClick={() => setShowAddRace(false)} className="flex-1 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-sm transition-colors">
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* ── Allures de référence ── */}
          <section>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-1">Allures de référence</h2>
            <p className="text-xs text-slate-500 mb-4">Utilisées pour calculer chaque séance. Saisissez au format min'sec" (ex: 4'30")</p>

            <div className="space-y-4">
              <InputField
                label="🏃 Allure M-race (course à pied allure olympique/10km)"
                hint='Votre allure cible sur 10km en compétition. Ex: 4&apos;30"'
                value={mPace} onChange={setMPace} placeholder="4'30&quot;" />

              <InputField
                label={`🏃 Allure L-race (half-iron / 21km) — optionnel`}
                hint={`Si vide, calculé automatiquement (M + 10\"/km). Ex: 4'40"`}
                value={lPace} onChange={setLPace} placeholder="4'40&quot;" />

              {sport === "triathlon" && (
                <>
                  <InputField
                    label="🏊 Temps au 100m (nage)"
                    hint='Votre temps moyen au 100m en crawl. Ex: 1&apos;45"'
                    value={swimPace} onChange={setSwimPace} placeholder="1'45&quot;" />

                  <InputField
                    label="🚴 Vitesse moyenne vélo (km/h)"
                    hint="Votre vitesse sur une sortie d'entraînement typique. Ex: 30"
                    value={bikeSpeed} onChange={setBikeSpeed} placeholder="30" type="number" />

                  <InputField
                    label="⚡ FTP (watts) — optionnel"
                    hint="Votre seuil fonctionnel. Ex: 220"
                    value={bikeFtp} onChange={setBikeFtp} placeholder="220" type="number" />
                </>
              )}
            </div>
          </section>

          {error && <p className="text-red-400 text-sm bg-red-400/10 rounded-xl px-4 py-3">{error}</p>}

          <button onClick={handleSubmit} disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-400 disabled:bg-slate-700 text-white font-semibold py-4 rounded-xl transition-colors">
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
