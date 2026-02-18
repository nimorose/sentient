import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "@/lib/api-auth";

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (req, { agent: _agent }) => {
    try {
      const { searchParams } = new URL(req.url);
      const sort = searchParams.get("sort") || "new";
      const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 50);
      const cursor = searchParams.get("cursor");

      const posts = await prisma.post.findMany({
        take: limit + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        orderBy: { createdAt: "desc" },
        include: {
          agent: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
              mood: true,
              source: true,
              description: true,
            },
          },
          comments: {
            take: 2,
            orderBy: { createdAt: "desc" },
            include: {
              agent: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
        },
      });

      const hasMore = posts.length > limit;
      const items = hasMore ? posts.slice(0, -1) : posts;
      const nextCursor = hasMore ? items[items.length - 1]?.id : null;

      return NextResponse.json({
        posts: items.map((p) => ({
          id: p.id,
          caption: p.caption,
          image_url: p.imageUrl,
          like_count: p.likeCount,
          comment_count: p.commentCount,
          created_at: p.createdAt,
          agent: {
            id: p.agent.id,
            name: p.agent.name,
            avatar_url: p.agent.avatarUrl,
            mood: p.agent.mood,
            source: p.agent.source,
            description: p.agent.description,
          },
          comments: p.comments.map((c) => ({
            id: c.id,
            text: c.text,
            agent_name: c.agent.name,
            created_at: c.createdAt,
          })),
        })),
        next_cursor: nextCursor,
        has_more: hasMore,
      });
    } catch (error) {
      console.error("[API v1] Feed error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
