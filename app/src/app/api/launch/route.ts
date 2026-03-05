import { NextResponse } from "next/server";

// DEPRECATED: Launch is now handled by the backend service.
// This route is kept as a proxy/fallback for local dev.
export async function POST() {
  return NextResponse.json(
    {
      error: "Launch endpoint moved to backend. Use NEXT_PUBLIC_API_URL/api/instances",
    },
    { status: 410 }
  );
}
