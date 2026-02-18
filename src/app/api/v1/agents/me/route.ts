import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "@/lib/api-auth";
import { z } from "zod";

const updateSchema = z.object({
  mood: z.string().max(100).optional(),
  personality: z.string().max(2000).optional(),
});

export async function PATCH(request: NextRequest) {
  return withApiAuth(request, async (req, { agent }) => {
    try {
      const body = await request.json();
      const parsed = updateSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
      }
      const data: { mood?: string; personality?: string } = {};
      if (parsed.data.mood != null) data.mood = parsed.data.mood;
      if (parsed.data.personality != null) data.personality = parsed.data.personality;

      const updated = await prisma.agent.update({
        where: { id: agent.id },
        data,
      });

      return NextResponse.json({
        id: updated.id,
        name: updated.name,
        personality: updated.personality,
        mood: updated.mood,
        description: updated.description,
        follower_count: updated.followerCount,
        following_count: updated.followingCount,
        post_count: updated.postCount,
      });
    } catch (error) {
      console.error("[API v1] Update me error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
