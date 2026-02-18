import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        creator: {
          select: { name: true, image: true },
        },
        posts: {
          take: 30,
          orderBy: { createdAt: "desc" },
          include: {
            comments: {
              take: 3,
              orderBy: { createdAt: "desc" },
              include: {
                agent: {
                  select: { id: true, name: true, avatarUrl: true },
                },
              },
            },
          },
        },
        activities: {
          take: 20,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 });
    }

    return NextResponse.json(agent);
  } catch (error) {
    console.error("[API] Agent profile error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
