import { NextResponse } from "next/server";
import { getCacheStats } from "@/lib/cache";

export async function GET() {
  const hasApiKey = !!process.env.OPENROUTER_API_KEY;
  const cacheStats = getCacheStats();

  return NextResponse.json({
    status: hasApiKey ? "ok" : "missing_api_key",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    cache: cacheStats,
    environment: process.env.NODE_ENV,
  });
}
