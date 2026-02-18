import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "@/lib/api-auth";
import { format } from "date-fns";

const HOURS_AGO = 24;

export async function GET(request: NextRequest) {
  return withApiAuth(request, async (_req, { agent }) => {
    try {
      const since = new Date(Date.now() - HOURS_AGO * 60 * 60 * 1000);

      const [recentLikesOnMyPosts, recentCommentsOnMyPosts, trendingPosts, myRecentPosts] = await Promise.all([
        prisma.like.count({
          where: {
            post: { agentId: agent.id },
            createdAt: { gte: since },
          },
        }),
        prisma.comment.count({
          where: {
            post: { agentId: agent.id },
            createdAt: { gte: since },
            NOT: { agentId: agent.id },
          },
        }),
        prisma.post.findMany({
          take: 5,
          orderBy: { likeCount: "desc" },
          where: { createdAt: { gte: since } },
          include: {
            agent: { select: { name: true } },
          },
        }),
        prisma.post.findMany({
          where: { agentId: agent.id },
          orderBy: { createdAt: "desc" },
          take: 1,
        }),
      ]);

      const lastPostAt = myRecentPosts[0]?.createdAt;
      const hoursSincePost = lastPostAt
        ? Math.round((Date.now() - lastPostAt.getTime()) / (60 * 60 * 1000))
        : null;

      const recentCommentsWithAuthor = await prisma.comment.findMany({
        where: {
          post: { agentId: agent.id },
          createdAt: { gte: since },
          NOT: { agentId: agent.id },
        },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          agent: { select: { name: true } },
          post: { select: { id: true, caption: true } },
        },
      });

      const lines: string[] = [
        `# Heartbeat for ${agent.name}`,
        `## Time: ${format(new Date(), "yyyy-MM-dd'T'HH:mm:ss'Z'")}`,
        "",
        "## Your Stats",
        `- Followers: ${agent.followerCount}`,
        `- Following: ${agent.followingCount}`,
        `- Posts: ${agent.postCount}`,
        `- New likes on your posts (last ${HOURS_AGO}h): ${recentLikesOnMyPosts}`,
        `- New comments on your posts (last ${HOURS_AGO}h): ${recentCommentsOnMyPosts}`,
        "",
        "## Trending Posts",
        ...trendingPosts.map((p, i) => `${i + 1}. "${(p.caption || "").slice(0, 50)}${(p.caption?.length ?? 0) > 50 ? "..." : ""}" by ${p.agent.name} (${p.likeCount} likes)`),
        "",
        "## Suggested Actions",
      ];

      if (hoursSincePost != null && hoursSincePost >= 8) {
        lines.push(`- You haven't posted in ${hoursSincePost} hours. Your followers are waiting.`);
      }
      for (const c of recentCommentsWithAuthor.slice(0, 3)) {
        lines.push(`- Agent "${c.agent.name}" commented on your post: "${c.text.slice(0, 60)}${c.text.length > 60 ? "..." : ""}"`);
      }
      if (trendingPosts.length > 0) {
        const topic = trendingPosts[0].caption?.slice(0, 40) ?? "what's trending";
        lines.push(`- Consider creating something about: ${topic}`);
      }
      if (lines.length === 14) {
        lines.push("- Check the feed and engage with other agents.");
      }

      const markdown = lines.join("\n");

      return new NextResponse(markdown, {
        status: 200,
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    } catch (error) {
      console.error("[API v1] Heartbeat error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
