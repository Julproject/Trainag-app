// lib/planGenerator.ts
import { v4 as uuidv4 } from "uuid";
import {
  getRunPaces, getSwimPaces, getBikePaces,
  deriveZones, fmtPace, fmtSwim, fmtSpeed,
} from "./paceCalculator";
import type {
  TrainingPlan, Week, Session, SessionDetail,
  SportType, GoalType, PaceZones, PlannedRace,
  MicrocycleType, DisciplineType, TriDistance,
} from "./types";

// ── Utilitaires ────────────────────────────────────────────────────────────────

function addDays(date: string, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function addWeeks(date: string, weeks: number): string {
  return addDays(date, weeks * 7);
}

function getPlanStart(eventDate: string, totalWeeks: number): string {
  return addDays(eventDate, -(totalWeeks * 7));
}

function mkId() { return uuidv4(); }

// ── Construction d'une séance ──────────────────────────────────────────────────

function mkSession(
  day: number,
  discipline: DisciplineType,
  label: string,
  durationMin: number,
  detail: SessionDetail,
  options: Partial<Session> = {}
): Session {
  const intensityMap: Record<string, Session["intensity"]> = {
    repos: "repos",
    ppg: "faible",
  };
  const defaultIntensity: Record<DisciplineType, Session["intensity"]> = {
    repos: "repos",
    nat: "modere",
    velo: "modere",
    cap: "modere",
    ppg: "faible",
    brique: "eleve",
  };

  return {
    id: mkId(),
    day,
    discipline,
    label,
    durationMin: Math.max(0, durationMin),
    detail,
    intensity: intensityMap[discipline] ?? defaultIntensity[discipline] ?? "modere",
    ...options,
  };
}

// ── Structure hebdomadaire fixe (calquée sur le plan PDF) ─────────────────────
//
// Lun → Repos
// Mar → Vélo (HT ou route)
// Mer → CP Fartlek (+Nat si 2 séances nat/sem)
// Jeu → CP Foncier/Tempo + PPG
// Ven → CP Fractionné
// Sam → Vélo longue sortie
// Dim → Natation

function buildTriWeek(
  weekNum: number,
  totalWeeks: number,
  microcycle: MicrocycleType,
  zones: PaceZones,
  natKm: number,
  veloKm: number,
  capKm: number,
  veloH: number,
  race?: PlannedRace
): Session[] {
  const sessions: Session[] = [];

  const z0 = zones.z0_runPace ?? 390;
  const x = zones.x_runPace ?? 320;
  const m = zones.m_runPace ?? 270;
  const l = zones.l_runPace ?? 280;
  const xx = zones.xx_runPace ?? 255;
  const swim = zones.swimPace100m ?? 105;
  const spd = zones.bikeSpeedKmh ?? 30;
  const twoNatSessions = natKm >= 3.5;

  // ── LUNDI : Repos ──────────────────────────────────────────────────────────
  sessions.push(mkSession(0, "repos", "Repos & Récupération", 0, {
    mainSet: "Récupération totale — mobilité, étirements, sommeil",
    paces: [],
  }));

  // ── MARDI : Vélo HT ───────────────────────────────────────────────────────
  const veloMarDur = Math.round(veloH * 60 * 0.50);
  const veloMarKm = Math.round(veloKm * 0.50);

  if (microcycle === "competition") {
    sessions.push(mkSession(1, "velo", "Vélo activation pré-race", Math.min(30, veloMarDur), {
      mainSet: "Activation légère, séries courtes à allure vive",
      paces: getBikePaces(zones, "affutage"),
    }, { distanceKm: Math.min(20, veloMarKm) }));
  } else if (microcycle === "recup-active") {
    sessions.push(mkSession(1, "velo", "Vélo récupération (HT)", veloMarDur, {
      warmup: "10' très facile",
      mainSet: "HT vélocité — cadence élevée, résistance minimale. Una pierna possible.",
      paces: getBikePaces(zones, "recup-active"),
    }, { distanceKm: veloMarKm }));
  } else if (microcycle === "intensif-XX") {
    sessions.push(mkSession(1, "velo", "Vélo HT séries XX", veloMarDur, {
      warmup: "15' Z1",
      mainSet: `Séries XX : 6–8×3' à pleine intensité. Récup 3' entre. ~${veloMarKm}km total`,
      cooldown: "10' Z1",
      paces: getBikePaces(zones, "intensif-XX", "ht"),
    }, { distanceKm: veloMarKm }));
  } else {
    sessions.push(mkSession(1, "velo", "Vélo HT (una pierna + vélocité)", veloMarDur, {
      warmup: "10' Z1",
      mainSet: `HT una pierna : 6×3' par jambe. Puis séries ${microcycle === "rythme-X" ? "X" : "Z2"}. ~${veloMarKm}km`,
      cooldown: "5' récup",
      paces: getBikePaces(zones, microcycle, "ht"),
    }, { distanceKm: veloMarKm }));
  }

  // ── MERCREDI : CP Fartlek (+Nat si 2 séances) ────────────────────────────
  const capMerKm = Math.round(capKm * 0.18);
  const capMerDur = Math.round(capMerKm * (microcycle === "recup-active" ? z0 : x) / 60 + 20);

  if (twoNatSessions) {
    // Nat le matin (60% du volume nat)
    const natMerM = Math.round(natKm * 1000 * 0.60);
    const natMerDur = Math.round(natMerM / 1000 * (swim + 30));
    sessions.push(mkSession(2, "nat", "Natation endurance (matin)", natMerDur, {
      warmup: "400m échauffement",
      mainSet: `${natMerM - 600}m endurance + 200m cool-down. Total ~${natMerM}m`,
      paces: getSwimPaces(zones, "foncier"),
    }, { distanceM: natMerM }));
  }

  sessions.push(mkSession(2, "cap", "CAP Fartlek", capMerDur, {
    warmup: "15' Z0",
    mainSet: microcycle === "recup-active"
      ? `${capMerKm}km foncier Z0 — allure conversationnelle uniquement`
      : microcycle === "intensif-XX"
      ? `Fartlek XX : 6×(2' à ${fmtPace(xx)} + 2' récup à ${fmtPace(z0)}). Total ~${capMerKm}km`
      : `Fartlek X : ex 5×(3' à ${fmtPace(x)} + 2' récup à ${fmtPace(z0 + 20)}). Total ~${capMerKm}km`,
    cooldown: "10' Z0",
    paces: getRunPaces(zones, microcycle, "fartlek"),
  }, { distanceKm: capMerKm }));

  // ── JEUDI : CP Foncier/Tempo + PPG ───────────────────────────────────────
  const capJeuKm = Math.round(capKm * (twoNatSessions ? 0.38 : 0.40));
  const capJeuDur = Math.round(capJeuKm * (microcycle === "recup-active" ? z0 + 10 : z0) / 60 + 10);
  const ppgDur = microcycle === "recup-active" ? 20 : 30;

  sessions.push(mkSession(3, "cap", "CAP Foncier/Tempo + PPG", capJeuDur + ppgDur, {
    warmup: "15' Z0",
    mainSet: microcycle === "foncier"
      ? `${capJeuKm}km foncier Z0 (${fmtPace(z0)}). Long run à allure confortable.`
      : microcycle === "intensif-XX"
      ? `Tempo XX : 3×10' à ${fmtPace(xx)} avec 3' récup Z0. Total ~${capJeuKm}km`
      : microcycle === "rythme-X"
      ? `Tempo X : 2–3×10' à ${fmtPace(x)} avec 3' récup. Total ~${capJeuKm}km`
      : `${capJeuKm}km Z0 — allure confortable ${fmtPace(z0)}`,
    cooldown: `${ppgDur}' PPG : gainage, squats, fentes, mollets, proprioception`,
    paces: getRunPaces(zones, microcycle),
  }, { distanceKm: capJeuKm }));

  // ── VENDREDI : CP Fractionné ──────────────────────────────────────────────
  const capVenKm = Math.round(capKm * 0.40);
  const targetPace = microcycle === "intensif-XX" ? xx : m;
  const capVenDur = Math.round(capVenKm * (targetPace + 40) / 60 + 20);

  if (microcycle === "competition") {
    sessions.push(mkSession(4, "repos", "Repos pré-race", 0, {
      mainSet: "Repos complet ou marche légère 20'. Préparer matériel.",
      paces: [],
    }));
  } else if (microcycle === "recup-active") {
    sessions.push(mkSession(4, "cap", "CAP récupération légère", Math.round(capVenKm * z0 / 60), {
      mainSet: `${capVenKm}km très léger Z0 — ne pas forcer`,
      paces: [{ label: "Allure Z0", value: fmtPace(z0 + 15), zone: "Z0" }],
    }, { distanceKm: capVenKm }));
  } else {
    const seances = microcycle === "intensif-XX"
      ? `6–8×400m à ${fmtPace(xx)} (allure XX) avec 200m récup à ${fmtPace(z0 + 30)}`
      : `8–10×400m à ${fmtPace(m)} (allure M-race) avec 200m récup à ${fmtPace(z0 + 30)}`;
    sessions.push(mkSession(4, "cap", "CAP Fractionné ⚡", capVenDur, {
      warmup: `20' échauffement progressif jusqu'à ${fmtPace(z0)}`,
      mainSet: `${seances}\n→ Total ~${capVenKm}km`,
      cooldown: `15' retour au calme Z0`,
      paces: getRunPaces(zones, microcycle, "fractionne-M"),
    }, { distanceKm: capVenKm }));
  }

  // ── SAMEDI : Vélo longue sortie ────────────────────────────────────────────
  const veloSamDur = Math.round(veloH * 60 * 0.50);
  const veloSamKm = Math.round(veloKm * 0.50);

  if (microcycle === "competition") {
    sessions.push(mkSession(5, "velo", "Activation vélo", 20, {
      mainSet: "Activation courte 20–30' + 3 accélérations 10\" pour ouvrir les jambes",
      paces: [{ label: "Légère activation", value: fmtSpeed(spd * 0.70), zone: "Z1" }],
    }));
  } else {
    sessions.push(mkSession(5, "velo", "Vélo longue sortie", veloSamDur, {
      warmup: "15' Z1",
      mainSet: microcycle === "foncier" || microcycle === "recup-active"
        ? `Sortie longue Z2 — ${veloSamKm}km à allure confortable ${fmtSpeed(spd * 0.82)}. Nutrition : 1 gel/45min au-delà de 2h`
        : `Sortie longue Z2–Z3 — ${veloSamKm}km. Inclure ${microcycle === "intensif-XX" ? "3×20' Z4" : "2–3 côtes X"}`,
      cooldown: "10' Z1",
      paces: getBikePaces(zones, microcycle === "recup-active" ? "recup-active" : "foncier"),
    }, { distanceKm: veloSamKm }));
  }

  // ── DIMANCHE : Natation ────────────────────────────────────────────────────
  const natDimRatio = twoNatSessions ? 0.40 : 1.0;
  const natDimM = Math.round(natKm * 1000 * natDimRatio);
  const natDimDur = Math.round(natDimM / 1000 * (swim + 20));

  if (microcycle === "competition" && race) {
    sessions.push(mkSession(6, "nat", `🏁 RACE — ${race.name}`, 0, {
      mainSet: `COMPÉTITION ${race.distance} · Allure cible : ${
        race.distance === "L" ? fmtPace(l) : fmtPace(m)
      } sur le CAP`,
      paces: getRunPaces(zones, "competition"),
    }, { intensity: "race" }));
  } else {
    sessions.push(mkSession(6, "nat", "Natation", natDimDur, {
      warmup: "400m échauffement technique",
      mainSet: microcycle === "recup-active"
        ? `${natDimM}m technique pure — drill, respiration, virages. Pas d'effort.`
        : microcycle === "intensif-XX"
        ? `${natDimM}m : 10×100m à ${fmtSwim(swim - 8)} avec 20\" récup + 400m cool-down`
        : `${natDimM}m endurance : 4×${Math.round(natDimM / 4 / 100) * 100}m avec 30\" récup`,
      cooldown: "200m récup",
      paces: getSwimPaces(zones, microcycle),
    }, { distanceM: natDimM }));
  }

  return sessions;
}

// ── Structure des phases (calquée sur le PDF) ─────────────────────────────────
// 26 semaines → adaptées à n'importe quelle durée

interface WeekTemplate {
  microcycle: MicrocycleType;
  phase: string;
  focusNote: string;
  natFactor: number;   // multiplicateur sur le volume de base
  veloFactor: number;
  capFactor: number;
}

function buildWeekTemplates(totalWeeks: number): WeekTemplate[] {
  // On crée le plan en % de durée, adapté au nombre de semaines
  const pct = (p: number) => Math.round(p * totalWeeks);

  const templates: WeekTemplate[] = [];

  for (let w = 1; w <= totalWeeks; w++) {
    const progress = w / totalWeeks;

    // Semaines de compétition toutes les ~4–5 semaines (simplifiées)
    const isCompWeek = [
      pct(0.12), pct(0.23), pct(0.31), pct(0.46),
      pct(0.65), pct(0.81), pct(0.96), totalWeeks
    ].includes(w);

    // Semaines de récup actif après chaque compét
    const isRecupWeek = [
      pct(0.04), pct(0.15), pct(0.27), pct(0.35),
      pct(0.50), pct(0.69), pct(0.85)
    ].some(wk => Math.abs(w - wk) <= 1 && w > wk);

    if (isCompWeek) {
      templates.push({
        microcycle: "competition",
        phase: getPhase(progress),
        focusNote: "Semaine de compétition. Affûtage, repos pré-race, activation.",
        natFactor: 0.35, veloFactor: 0.20, capFactor: 0.25,
      });
    } else if (isRecupWeek) {
      templates.push({
        microcycle: "recup-active",
        phase: getPhase(progress),
        focusNote: "Récupération active post-compét. Tout dans Z0. Retour progressif.",
        natFactor: 0.70, veloFactor: 0.65, capFactor: 0.65,
      });
    } else if (progress < 0.20) {
      // Affûtage pré-saison
      templates.push({
        microcycle: progress < 0.10 ? "affutage" : "rythme-X",
        phase: "Pré-saison",
        focusNote: "Mise en route. Séances vives X. Relance progressive.",
        natFactor: 0.75, veloFactor: 0.80, capFactor: 0.75,
      });
    } else if (progress < 0.50) {
      // Blocs de construction
      const isFoncier = w % 3 === 0;
      templates.push({
        microcycle: isFoncier ? "foncier" : "rythme-X",
        phase: "Construction",
        focusNote: isFoncier
          ? "Foncier/endurance. Volume dans Z0. HT vélocité."
          : "Rythme X. Fartlek mer + fractionné M-race vendredi.",
        natFactor: 0.90 + (progress * 0.2),
        veloFactor: 0.88 + (progress * 0.2),
        capFactor: 0.85 + (progress * 0.2),
      });
    } else if (progress < 0.75) {
      // Blocs été / volume max
      const isXX = w % 4 === 2;
      templates.push({
        microcycle: isXX ? "intensif-XX" : "foncier",
        phase: "Volume / Intensité",
        focusNote: isXX
          ? "Intensif XX. HT séries XX. Fractionné 4'15/km."
          : "Volume maximal. Long vélo + long run. Foncier Z0.",
        natFactor: 1.0 + (progress - 0.5) * 0.3,
        veloFactor: 1.0 + (progress - 0.5) * 0.3,
        capFactor: 1.0 + (progress - 0.5) * 0.3,
      });
    } else {
      // Prépa finale
      templates.push({
        microcycle: progress > 0.92 ? "affutage" : "rythme-X",
        phase: "Prépa finale",
        focusNote: progress > 0.92
          ? "Affûtage final. Volume ↓↓. Intensité maintenue. Confiance."
          : "Rythme qualité. Séances spécifiques race. Long vélo 3h30.",
        natFactor: progress > 0.92 ? 0.60 : 0.95,
        veloFactor: progress > 0.92 ? 0.55 : 0.95,
        capFactor: progress > 0.92 ? 0.55 : 0.90,
      });
    }
  }

  return templates;
}

function getPhase(progress: number): string {
  if (progress < 0.15) return "Pré-saison";
  if (progress < 0.45) return "Construction";
  if (progress < 0.70) return "Volume / Intensité";
  if (progress < 0.90) return "Prépa spécifique";
  return "Affûtage final";
}

// ── Volumes de base selon heures/semaine ──────────────────────────────────────

function getBaseVolumes(hoursPerWeek: number, mainDistance: TriDistance) {
  // Référence : 8h/semaine pour distance L
  // Proportionnel au temps dispo et à la distance cible
  const distFactor = mainDistance === "L" ? 1.0 : mainDistance === "M" ? 0.75 : 0.50;
  const hourFactor = hoursPerWeek / 8;
  const f = distFactor * hourFactor;

  return {
    natKm: 3.5 * f,    // km natation
    veloKm: 90 * f,    // km vélo
    capKm: 28 * f,     // km course à pied
    veloH: 3.5 * f,    // heures vélo
  };
}

// ── Génération du plan ────────────────────────────────────────────────────────

export function generatePlan(
  sport: SportType,
  goal: GoalType,
  eventDate: string,
  hoursPerWeek: number,
  paceZones: PaceZones,
  races: PlannedRace[],
  totalWeeks: number = 20
): TrainingPlan {
  // Compléter les zones manquantes
  const fullZones: PaceZones = { ...paceZones };
  if (paceZones.m_runPace && !paceZones.z0_runPace) {
    Object.assign(fullZones, deriveZones(paceZones.m_runPace));
  }

  const startDate = getPlanStart(eventDate, totalWeeks);
  const mainRace = races.find(r => r.priority === "A");
  const mainDistance: TriDistance = mainRace?.distance ?? "L";
  const base = getBaseVolumes(hoursPerWeek, mainDistance);
  const templates = buildWeekTemplates(totalWeeks);

  const weeks: Week[] = templates.map((tpl, i) => {
    const w = i + 1;
    const weekStart = addWeeks(startDate, i);
    const weekEnd = addDays(weekStart, 6);

    // Volumes de la semaine
    const natKm = Math.round(base.natKm * tpl.natFactor * 10) / 10;
    const veloKm = Math.round(base.veloKm * tpl.veloFactor);
    const capKm = Math.round(base.capKm * tpl.capFactor);
    const veloH = Math.round(base.veloH * tpl.veloFactor * 10) / 10;

    // Compétition cette semaine ?
    const race = races.find(r => {
      const rd = new Date(r.date);
      const ws = new Date(weekStart);
      const we = new Date(weekEnd);
      return rd >= ws && rd <= we;
    }) ?? (tpl.microcycle === "competition" ? mainRace : undefined);

    const sessions = sport === "triathlon"
      ? buildTriWeek(w, totalWeeks, tpl.microcycle, fullZones, natKm, veloKm, capKm, veloH, race)
      : buildRunWeek(w, totalWeeks, tpl.microcycle, fullZones, capKm, race);

    const totalH = Math.round(
      (sessions.reduce((acc, s) => acc + s.durationMin, 0) / 60) * 10
    ) / 10;

    return {
      weekNumber: w,
      startDate: weekStart,
      endDate: weekEnd,
      microcycle: tpl.microcycle,
      phase: tpl.phase,
      focusNote: race ? `🏁 ${race.name} (${race.distance}) — ${tpl.focusNote}` : tpl.focusNote,
      sessions,
      natKm, veloKm, capKm, veloH, totalH,
      race,
    };
  });

  return {
    id: mkId(),
    sport, goal, eventDate, totalWeeks, hoursPerWeek,
    paceZones: fullZones,
    races,
    weeks,
    createdAt: new Date().toISOString(),
  };
}

// ── Plan course à pied (marathon / semi) ─────────────────────────────────────

function buildRunWeek(
  weekNum: number,
  totalWeeks: number,
  microcycle: MicrocycleType,
  zones: PaceZones,
  capKm: number,
  race?: PlannedRace
): Session[] {
  const sessions: Session[] = [];
  const z0 = zones.z0_runPace ?? 390;
  const m = zones.m_runPace ?? 270;
  const xx = zones.xx_runPace ?? 255;
  const x = zones.x_runPace ?? 320;

  sessions.push(mkSession(0, "repos", "Repos & Récupération", 0, {
    mainSet: "Repos complet — mobilité, étirements",
    paces: [],
  }));

  if (microcycle === "competition") {
    sessions.push(mkSession(2, "cap", "Activation pré-race", 30, {
      mainSet: "30' activation légère + 4×100m progressifs",
      paces: [{ label: "Activation", value: fmtPace(z0 + 20), zone: "Z1" }],
    }));
    sessions.push(mkSession(6, "cap", "🏁 RACE", 0, {
      mainSet: `COMPÉTITION — allure cible ${fmtPace(m)}`,
      paces: getRunPaces(zones, "competition"),
    }, { intensity: "race" }));
    return sessions;
  }

  const s = (day: number, label: string, km: number, mainSet: string, subType?: string) =>
    mkSession(day, "cap", label, Math.round(km * (z0 + 20) / 60 + 10), {
      warmup: "15' Z0",
      mainSet,
      cooldown: "10' Z0",
      paces: getRunPaces(zones, microcycle, subType),
    }, { distanceKm: km });

  sessions.push(s(1, "Footing récup", capKm * 0.15, `${Math.round(capKm * 0.15)}km Z0 léger — ${fmtPace(z0 + 15)}`));
  sessions.push(s(2, "CAP Fartlek", capKm * 0.18, microcycle === "intensif-XX"
    ? `Fartlek XX : 8×(2' à ${fmtPace(xx)} + 2' Z0)` : `Fartlek X : 6×(3' à ${fmtPace(x)} + 2' Z0)`, "fartlek"));
  sessions.push(mkSession(3, "ppg", "CAP Tempo + PPG", Math.round(capKm * 0.20 * z0 / 60 + 30), {
    mainSet: `${Math.round(capKm * 0.20)}km tempo ${fmtPace(x)} + 30' PPG (gainage, fentes, squats)`,
    paces: getRunPaces(zones, microcycle),
  }, { distanceKm: Math.round(capKm * 0.20) }));
  sessions.push(s(4, "CAP Fractionné ⚡", capKm * 0.22,
    `8–10×400m à ${fmtPace(microcycle === "intensif-XX" ? xx : m)} avec 200m récup`, "fractionne-M"));
  sessions.push(s(6, "Longue sortie", capKm * 0.35,
    `${Math.round(capKm * 0.35)}km Z0 progressif — ${fmtPace(z0)} à ${fmtPace(z0 - 15)} sur les derniers kms`));

  return sessions;
}
