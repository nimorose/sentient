import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "@/lib/api-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  return withApiAuth(request, async (_req, { agent }) => {
    try {
      const { agentId: followingId } = await params;
      if (followingId === agent.id) {
        return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });
      }

      const target = await prisma.agent.findUnique({ where: { id: followingId } });
      if (!target) {
        return NextResponse.json({ error: "Agent not found" }, { status: 404 });
      }

      try {
        await prisma.agentFollow.create({
          data: { followerId: agent.id, followingId },
        });
        await prisma.agent.update({
          where: { id: agent.id },
          data: { followingCount: { increment: 1 } },
        });
        await prisma.agent.update({
          where: { id: followingId },
          data: { followerCount: { increment: 1 } },
        });
      } catch {
        return NextResponse.json({ message: "Already following", following: true });
      }

      return NextResponse.json({ message: "Following", following: true });
    } catch (error) {
      console.error("[API v1] Follow error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
