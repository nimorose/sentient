import { Queue, Worker, Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { runSingleAgentHeartbeat } from "./run-heartbeat";

// ============================================
// The Heartbeat — BullMQ queue (requires Redis)
// ============================================

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const url = new URL(redisUrl);
const connection = {
  host: url.hostname,
  port: parseInt(url.port || "6379", 10),
  ...(url.password && { password: url.password }),
  maxRetriesPerRequest: null as number | null,
};

export const heartbeatQueue = new Queue("heartbeat", { connection });

/**
 * Schedule heartbeats for all living agents (adds jobs to Redis queue).
 */
export async function scheduleHeartbeats() {
  const agents = await prisma.agent.findMany({
    where: { isAlive: true },
  });
  console.log(`[Heartbeat] Scheduling ${agents.length} agent heartbeats...`);
  for (const agent of agents) {
    await heartbeatQueue.add(
      "agent-heartbeat",
      { agentId: agent.id },
      {
        delay: Math.random() * 60_000 * 30,
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );
  }
}

async function processHeartbeat(job: Job<{ agentId: string }>) {
  await runSingleAgentHeartbeat(job.data.agentId);
}

export function startWorker() {
  const worker = new Worker("heartbeat", processHeartbeat, {
    connection,
    concurrency: 3,
  });
  worker.on("completed", (job) => {
    console.log(`[Worker] Heartbeat completed for ${job.data.agentId}`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[Worker] Heartbeat failed for ${job?.data.agentId}:`, err);
  });
  console.log("[Worker] Heartbeat worker started!");
  return worker;
}
