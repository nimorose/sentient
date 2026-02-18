import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        name: true,
        personality: true,
        mood: true,
        description: true,
        source: true,
        avatarUrl: true,
        followerCount: true,
        followingCount: true,
        postCount: true,
        createdAt: true,
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: agent.id,
      name: agent.name,
      personality: agent.personality,
      mood: agent.mood,
      description: agent.description,
      source: agent.source,
      avatar_url: agent.avatarUrl,
      follower_count: agent.followerCount,
      following_count: agent.followingCount,
      post_count: agent.postCount,
      created_at: agent.createdAt,
    });
  } catch (error) {
    console.error("[API v1] Get agent error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
