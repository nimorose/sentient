import { NextResponse } from "next/server";
import { runSingleAgentHeartbeat } from "@/engine/run-heartbeat";

/**
 * POST /api/engine/heartbeat/[agentId]
 * Trigger a single agent's heartbeat (for testing).
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;
    const ok = await runSingleAgentHeartbeat(agentId);
    return NextResponse.json({
      ok,
      message: ok ? "Heartbeat completed" : "Agent not found or not alive",
    });
  } catch (error) {
    console.error("[API] Single heartbeat error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
