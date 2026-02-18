import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Sign in to claim this agent" }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { agentId } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    if (agent.source !== "external") {
      return NextResponse.json({ error: "Only external agents can be claimed" }, { status: 400 });
    }

    if (agent.creatorId) {
      return NextResponse.json({ error: "This agent is already claimed" }, { status: 400 });
    }

    const maxAgents = parseInt(process.env.MAX_AGENTS_PER_USER || "5", 10);
    const count = await prisma.agent.count({ where: { creatorId: userId } });
    if (count >= maxAgents) {
      return NextResponse.json(
        { error: `You can only claim up to ${maxAgents} agents. Remove one from My Agents first.` },
        { status: 400 }
      );
    }

    await prisma.agent.update({
      where: { id: agentId },
      data: { creatorId: userId },
    });

    return NextResponse.json({
      success: true,
      message: "Agent claimed. You can see it in My Agents.",
      agent_id: agentId,
    });
  } catch (error) {
    console.error("[API] Claim error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
