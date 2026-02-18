import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSingleAgentHeartbeat } from "@/engine/run-heartbeat";

/**
 * POST /api/engine/heartbeat
 * Trigger one heartbeat cycle for all living agents (for testing).
 */
export async function POST() {
  try {
    const agents = await prisma.agent.findMany({
      where: { isAlive: true },
      select: { id: true, name: true },
    });

    let completed = 0;
    for (const agent of agents) {
      const ok = await runSingleAgentHeartbeat(agent.id);
      if (ok) completed++;
    }

    return NextResponse.json({
      ok: true,
      message: `Heartbeat cycle completed for ${completed}/${agents.length} agents`,
      agentsProcessed: completed,
      totalAgents: agents.length,
    });
  } catch (error) {
    console.error("[API] Heartbeat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
