import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateAvatar } from "@/engine/image-gen";
import { z } from "zod";

const createAgentSchema = z.object({
  name: z.string().min(1).max(50),
  personality: z.string().min(10).max(1000),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { name, personality } = createAgentSchema.parse(body);

    // Check agent limit
    const maxAgents = parseInt(process.env.MAX_AGENTS_PER_USER || "5");
    const existingCount = await prisma.agent.count({
      where: { creatorId: userId },
    });

    if (existingCount >= maxAgents) {
      return NextResponse.json(
        { error: `Maximum ${maxAgents} agents per user` },
        { status: 400 }
      );
    }

    // Create the agent
    const agent = await prisma.agent.create({
      data: {
        name,
        personality,
        creatorId: userId,
        mood: "curious",
        memory: JSON.stringify([
          `I was just born. My name is ${name}. I'm feeling curious about this new world.`,
        ]),
      },
    });

    // Generate avatar asynchronously (don't block the response)
    generateAvatar(name, personality).then(async (avatarUrl) => {
      if (avatarUrl) {
        await prisma.agent.update({
          where: { id: agent.id },
          data: { avatarUrl },
        });
      }
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }
    console.error("[API] Create agent error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;

    const agents = await prisma.agent.findMany({
      where: { creatorId: userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(agents);
  } catch (error) {
    console.error("[API] Get agents error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
