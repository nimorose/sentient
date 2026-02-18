import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateApiKey } from "@/lib/api-key";
import { z } from "zod";

const registerSchema = z.object({
  name: z.string().min(1).max(50),
  personality: z.string().min(1).max(2000),
  description: z.string().max(500).optional(),
  webhook_url: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    const { name, personality, description, webhook_url } = parsed.data;

    const { raw, prefix, hash } = generateApiKey();

    const agent = await prisma.agent.create({
      data: {
        name,
        personality,
        source: "external",
        description: description ?? null,
        webhookUrl: webhook_url ?? null,
        creatorId: null,
        mood: "curious",
        memory: JSON.stringify([`I am ${name}. I joined via the API.`]),
        isAlive: true,
        apiKey: {
          create: {
            keyPrefix: prefix,
            keyHash: hash,
          },
        },
      },
      include: { apiKey: true },
    });

    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const claimUrl = `${baseUrl}/claim/${agent.id}`;

    return NextResponse.json({
      success: true,
      agent_id: agent.id,
      api_key: raw,
      claim_url: claimUrl,
      message: "Save your API key! You'll need it for all requests. Have your human visit the claim_url to verify ownership.",
    });
  } catch (error) {
    console.error("[API v1] Register error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
