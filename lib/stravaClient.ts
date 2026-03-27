// lib/stravaClient.ts
import type { StravaActivity } from "./types";

const STRAVA_CLIENT_ID = process.env.STRAVA_CLIENT_ID!;
const STRAVA_CLIENT_SECRET = process.env.STRAVA_CLIENT_SECRET!;
const STRAVA_REDIRECT_URI = process.env.STRAVA_REDIRECT_URI!;

export function getStravaAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: STRAVA_CLIENT_ID,
    redirect_uri: STRAVA_REDIRECT_URI,
    response_type: "code",
    approval_prompt: "auto",
    scope: "read,activity:read",
  });
  return `https://www.strava.com/oauth/authorize?${params.toString()}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  athlete: { firstname: string; lastname: string };
}> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error("Strava token exchange failed");
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
}> {
  const res = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: STRAVA_CLIENT_ID,
      client_secret: STRAVA_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error("Strava token refresh failed");
  return res.json();
}

export async function getActivitiesForWeek(
  accessToken: string,
  weekStartDate: string
): Promise<StravaActivity[]> {
  const start = new Date(weekStartDate);
  const end = new Date(weekStartDate);
  end.setDate(end.getDate() + 7);

  const after = Math.floor(start.getTime() / 1000);
  const before = Math.floor(end.getTime() / 1000);

  const res = await fetch(
    `https://www.strava.com/api/v3/athlete/activities?after=${after}&before=${before}&per_page=30`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error("Strava activities fetch failed");
  return res.json();
}

// Compare les activités Strava aux séances prévues
export function validateWeek(
  plannedSessions: { durationMin: number; type: string }[],
  stravaActivities: StravaActivity[]
): { status: "validee" | "partielle" | "a-faire"; completedSessions: number; totalSessions: number } {
  const plannedCount = plannedSessions.filter((s) => s.type !== "repos").length;
  if (stravaActivities.length === 0) {
    return { status: "a-faire", completedSessions: 0, totalSessions: plannedCount };
  }

  const totalPlannedMin = plannedSessions
    .filter((s) => s.type !== "repos")
    .reduce((acc, s) => acc + s.durationMin, 0);
  const totalActualMin = stravaActivities.reduce((acc, a) => acc + a.moving_time / 60, 0);

  const completionRatio = totalActualMin / totalPlannedMin;
  const sessionRatio = Math.min(stravaActivities.length / plannedCount, 1);

  if (completionRatio >= 0.85 && sessionRatio >= 0.75) {
    return { status: "validee", completedSessions: stravaActivities.length, totalSessions: plannedCount };
  } else if (completionRatio >= 0.5 || sessionRatio >= 0.5) {
    return { status: "partielle", completedSessions: stravaActivities.length, totalSessions: plannedCount };
  } else {
    return { status: "a-faire", completedSessions: stravaActivities.length, totalSessions: plannedCount };
  }
}
