// app/api/strava/auth/route.ts
import { NextResponse } from "next/server";
import { getStravaAuthUrl } from "@/lib/stravaClient";

export async function GET() {
  const url = getStravaAuthUrl();
  return NextResponse.redirect(url);
}

// ────────────────────────────────────────────────────────────────────────────
// app/api/strava/callback/route.ts  (créer dans un fichier séparé)
// ────────────────────────────────────────────────────────────────────────────
// import { NextRequest, NextResponse } from "next/server";
// import { exchangeCodeForToken } from "@/lib/stravaClient";
//
// export async function GET(req: NextRequest) {
//   const code = req.nextUrl.searchParams.get("code");
//   if (!code) return NextResponse.json({ error: "No code" }, { status: 400 });
//   const tokens = await exchangeCodeForToken(code);
//   // Stocker les tokens (cookie httpOnly ou session)
//   const response = NextResponse.redirect(new URL("/plan", req.url));
//   response.cookies.set("strava_access_token", tokens.access_token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     maxAge: 60 * 60 * 6, // 6h
//   });
//   response.cookies.set("strava_refresh_token", tokens.refresh_token, {
//     httpOnly: true,
//     secure: process.env.NODE_ENV === "production",
//     maxAge: 60 * 60 * 24 * 30, // 30 jours
//   });
//   return response;
// }
