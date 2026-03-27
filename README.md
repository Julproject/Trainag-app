# 🎯 Sport Training Planner

Application web de génération de plans d'entraînement personnalisés pour Marathon, Semi-Marathon, Triathlon et Course à Vélo. Intégration Strava pour valider les semaines.

## Stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS**
- **API Routes Vercel** (backend intégré)
- **Strava API** (OAuth 2.0)

## Structure

```
app/
├── page.tsx              # Écran 1 : Choix du sport
├── setup/page.tsx        # Écran 2 : Formulaire
├── plan/page.tsx         # Écran 3 : Calendrier du plan
└── api/
    ├── generate-plan/    # Génération du plan
    └── strava/           # OAuth + activités
components/
├── SessionCard.tsx       # Carte séance éditable
lib/
├── types.ts              # Types TypeScript
├── planGenerator.ts      # Logique plans d'entraînement
└── stravaClient.ts       # Client Strava
```

## Installation locale

```bash
git clone https://github.com/VOTRE_USERNAME/sport-training-app.git
cd sport-training-app
npm install
cp .env.example .env.local
# → Remplissez .env.local avec vos clés Strava
npm run dev
```

## Configuration Strava

1. Créez une application sur [strava.com/settings/api](https://www.strava.com/settings/api)
2. Renseignez dans votre `.env.local` :
   ```
   STRAVA_CLIENT_ID=xxx
   STRAVA_CLIENT_SECRET=xxx
   STRAVA_REDIRECT_URI=http://localhost:3000/api/strava/callback
   ```
3. Dans les paramètres Strava, ajoutez `http://localhost:3000` comme domaine autorisé

## Déploiement Vercel

### Option 1 : Via l'interface Vercel (recommandé)

1. Poussez votre code sur GitHub
2. Allez sur [vercel.com/new](https://vercel.com/new)
3. Importez votre repo GitHub
4. Ajoutez les variables d'environnement dans Vercel :
   - `STRAVA_CLIENT_ID`
   - `STRAVA_CLIENT_SECRET`
   - `STRAVA_REDIRECT_URI` → `https://votre-app.vercel.app/api/strava/callback`
5. Cliquez **Deploy**

### Option 2 : Via CLI

```bash
npm i -g vercel
vercel login
vercel --prod
# Vercel détecte automatiquement Next.js, aucun vercel.json nécessaire
```

## Fonctionnalités

- ✅ Génération de plans semaine par semaine (10–16 semaines selon la discipline)
- ✅ Progression de charge classique : base → construction → spécifique → affûtage
- ✅ Semaines de récupération automatiques (toutes les 4 semaines)
- ✅ Adaptatif selon le volume horaire disponible (3h–15h/semaine)
- ✅ Édition des séances : modifier durée, déplacer le jour
- ✅ Connexion Strava OAuth pour importer les activités
- 🔜 Validation automatique des semaines via Strava
- 🔜 Coaching adaptatif (réduction charge si semaines ratées)

## Logique d'entraînement

Les plans suivent les principes classiques d'entraînement :

| Phase       | Durée (Marathon) | Focus |
|-------------|-----------------|-------|
| Base        | Sem. 1–4        | Aérobie fondamentale, Z2 |
| Construction| Sem. 5–9        | Intensité, fractionné |
| Spécifique  | Sem. 10–13      | Allure course, longues sorties |
| Affûtage    | Sem. 14–15      | Volume ↓, intensité maintenue |
| Course      | Sem. 16         | Légèreté et confiance |

## Variables d'environnement

| Variable | Description |
|----------|-------------|
| `STRAVA_CLIENT_ID` | ID de votre app Strava |
| `STRAVA_CLIENT_SECRET` | Secret de votre app Strava |
| `STRAVA_REDIRECT_URI` | URL de callback OAuth |
