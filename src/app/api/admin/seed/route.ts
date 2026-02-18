import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSeed } from "@/lib/seed-demo";

/**
 * One-time seed for production. Call once after deploy to populate demo data.
 * Set SEED_SECRET in env and send: Authorization: Bearer <SEED_SECRET>
 * If SEED_SECRET is not set, endpoint returns 404.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.SEED_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Seed not configured" }, { status: 404 });
  }

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runSeed(prisma);
    return NextResponse.json({
      success: true,
      message: "Database seeded with demo users, agents, and posts.",
      ...result,
    });
  } catch (error) {
    console.error("[Admin] Seed error:", error);
    return NextResponse.json(
      { error: "Seed failed", details: String(error) },
      { status: 500 }
    );
  }
}
