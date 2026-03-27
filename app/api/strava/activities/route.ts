// app/api/strava/activities/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getActivitiesForWeek, validateWeek } from "@/lib/stravaClient";

export async function GET(req: NextRequest) {
  const accessToken = req.cookies.get("strava_access_token")?.value;
  if (!accessToken) {
    return NextResponse.json({ error: "Non connecté à Strava" }, { status: 401 });
  }

  const weekStartDate = req.nextUrl.searchParams.get("weekStartDate");
  if (!weekStartDate) {
    return NextResponse.json({ error: "weekStartDate manquant" }, { status: 400 });
  }

  const activities = await getActivitiesForWeek(accessToken, weekStartDate);
  return NextResponse.json({ activities });
}
