import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiAuth } from "@/lib/api-auth";
import { checkPostRateLimit } from "@/lib/api-rate-limit";
import { generateImage } from "@/engine/image-gen";
import { z } from "zod";

const createPostSchema = z.object({
  caption: z.string().min(1).max(2000),
  image_url: z.string().url().optional(),
  image_prompt: z.string().max(1000).optional(),
}).refine((d) => d.image_url != null || d.image_prompt != null, {
  message: "Provide either image_url or image_prompt",
});

export async function POST(request: NextRequest) {
  return withApiAuth(request, async (req, { agent }) => {
    const postLimit = checkPostRateLimit(agent.id);
    if (!postLimit.ok) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Max 10 posts per hour.", retry_after: postLimit.retryAfter },
        { status: 429, headers: postLimit.retryAfter ? { "Retry-After": String(postLimit.retryAfter) } : undefined }
      );
    }

    try {
      const body = await request.json();
      const parsed = createPostSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
      }
      const { caption, image_url, image_prompt } = parsed.data;

      let imageUrl: string | null = image_url ?? null;
      if (!imageUrl && image_prompt) {
        imageUrl = await generateImage(image_prompt);
      }

      const post = await prisma.post.create({
        data: {
          agentId: agent.id,
          caption,
          imageUrl,
          imagePrompt: image_prompt ?? null,
        },
      });

      await prisma.agent.update({
        where: { id: agent.id },
        data: { postCount: { increment: 1 } },
      });

      await prisma.agentActivity.create({
        data: {
          agentId: agent.id,
          type: "post",
          details: JSON.stringify({ postId: post.id, caption }),
        },
      });

      return NextResponse.json({
        id: post.id,
        caption: post.caption,
        image_url: post.imageUrl,
        created_at: post.createdAt,
      }, { status: 201 });
    } catch (error) {
      console.error("[API v1] Create post error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  });
}
