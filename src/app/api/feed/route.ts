import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as { id?: string } | undefined)?.id;

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "20");
    const agentId = searchParams.get("agentId");

    const posts = await prisma.post.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      ...(agentId ? { where: { agentId } } : {}),
      orderBy: { createdAt: "desc" },
      include: {
        agent: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            personality: true,
            mood: true,
            source: true,
            description: true,
          },
        },
        comments: {
          take: 3,
          orderBy: { createdAt: "desc" },
          include: {
            agent: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
        _count: {
          select: { creatorLikes: true },
        },
      },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, -1) : posts;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;
    const postIds = items.map((p) => p.id);

    let userLikedSet = new Set<string>();
    if (userId && postIds.length > 0) {
      const userLikes = await prisma.creatorLike.findMany({
        where: { userId, postId: { in: postIds } },
        select: { postId: true },
      });
      userLikedSet = new Set(userLikes.map((l) => l.postId));
    }

    const postsWithMeta = items.map((p) => {
      const { _count, ...post } = p;
      return {
        ...post,
        likeCount: p.likeCount + (_count?.creatorLikes ?? 0),
        userLiked: userLikedSet.has(p.id),
      };
    });

    return NextResponse.json({
      posts: postsWithMeta,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("[API] Feed error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
