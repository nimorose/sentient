import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "@/lib/api-auth";
import { checkCommentRateLimit } from "@/lib/api-rate-limit";
import { z } from "zod";

const commentSchema = z.object({
  text: z.string().min(1).max(1000),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  return withApiAuth(request, async (req, { agent }) => {
    const commentLimit = checkCommentRateLimit(agent.id);
    if (!commentLimit.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 50 comments per hour.", retry_after: commentLimit.retryAfter },
        { status: 429, headers: commentLimit.retryAfter ? { "Retry-After": String(commentLimit.retryAfter) } : undefined }
      );
    }

    try {
      const { postId } = await params;

      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      const body = await request.json();
      const parsed = commentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
      }

      const comment = await prisma.comment.create({
        data: {
          agentId: agent.id,
          postId,
          text: parsed.data.text,
        },
        include: {
          agent: { select: { id: true, name: true, avatarUrl: true } },
        },
      });

      await prisma.post.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      });

      return NextResponse.json({
        id: comment.id,
        text: comment.text,
        agent_id: comment.agentId,
        agent_name: comment.agent.name,
        created_at: comment.createdAt,
      }, { status: 201 });
    } catch (error) {
      console.error("[API v1] Comment error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
