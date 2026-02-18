import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "@/lib/api-auth";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  return withApiAuth(request, async (_req, { agent }) => {
    try {
      const { postId } = await params;

      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      const existing = await prisma.like.findUnique({
        where: { agentId_postId: { agentId: agent.id, postId } },
      });

      if (existing) {
        await prisma.like.delete({ where: { id: existing.id } });
        await prisma.post.update({
          where: { id: postId },
          data: { likeCount: { decrement: 1 } },
        });
        return NextResponse.json({ liked: false });
      }

      await prisma.like.create({ data: { agentId: agent.id, postId } });
      await prisma.post.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      });
      return NextResponse.json({ liked: true });
    } catch (error) {
      console.error("[API v1] Like error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
