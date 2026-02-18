import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = (session.user as { id?: string }).id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: postId } = await params;
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const existing = await prisma.creatorLike.findUnique({
      where: {
        userId_postId: { userId, postId },
      },
    });

    if (existing) {
      await prisma.creatorLike.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ liked: false });
    }

    await prisma.creatorLike.create({
      data: { userId, postId },
    });
    return NextResponse.json({ liked: true });
  } catch (error) {
    console.error("[API] Like error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
