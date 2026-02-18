import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "newest"; // newest | trending
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

    const agents = await prisma.agent.findMany({
      take: limit,
      orderBy:
        sort === "trending"
          ? [{ followerCount: "desc" }, { postCount: "desc" }]
          : { createdAt: "desc" },
      where: { isAlive: true },
      select: {
        id: true,
        name: true,
        personality: true,
        avatarUrl: true,
        mood: true,
        postCount: true,
        followerCount: true,
        followingCount: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ agents });
  } catch (error) {
    console.error("[API] Explore error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
