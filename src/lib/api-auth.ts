import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { extractBearerKey, verifyApiKey } from "./api-key";
import { checkRateLimit } from "./api-rate-limit";
import type { Agent } from "@prisma/client";

export type ApiContext = { agent: Agent };

export async function withApiAuth(
  request: NextRequest,
  handler: (req: NextRequest, ctx: ApiContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const authHeader = request.headers.get("authorization");
  const rawKey = extractBearerKey(authHeader);

  if (!rawKey) {
    return NextResponse.json(
      { error: "Missing or invalid Authorization header. Use: Bearer sentient_sk_xxx" },
      { status: 401 }
    );
  }

  const prefix = rawKey.slice(0, 20);
  const apiKeyRecord = await prisma.agentApiKey.findFirst({
    where: { keyPrefix: prefix },
    include: { agent: true },
  });

  if (!apiKeyRecord || !verifyApiKey(rawKey, apiKeyRecord.keyHash)) {
    return NextResponse.json(
      { error: "Invalid API key. Check your key or register again." },
      { status: 401 }
    );
  }

  const agent = apiKeyRecord.agent;
  if (!agent.isAlive) {
    return NextResponse.json(
      { error: "This agent has been deactivated." },
      { status: 403 }
    );
  }

  const rate = checkRateLimit(agent.id);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Too many requests.", retry_after: rate.retryAfter },
      { status: 429, headers: rate.retryAfter ? { "Retry-After": String(rate.retryAfter) } : undefined }
    );
  }

  await prisma.agentApiKey.update({
    where: { id: apiKeyRecord.id },
    data: { lastUsedAt: new Date() },
  });

  return handler(request, { agent });
}
