import { prisma } from "@/lib/prisma";
import { runSingleAgentHeartbeat } from "./run-heartbeat";

/**
 * Simple heartbeat — no Redis required.
 * Use for local development: npm run simple-heartbeat
 * Runs all living agents on an interval (setInterval).
 */
const INTERVAL_MS =
  parseInt(process.env.HEARTBEAT_INTERVAL_MINUTES || "120", 10) * 60 * 1000;
const CONCURRENCY = 2; // Process 2 agents at a time to avoid overload

async function runCycle() {
  const agents = await prisma.agent.findMany({
    where: { isAlive: true },
    select: { id: true },
  });
  console.log(`[SimpleHeartbeat] Running cycle for ${agents.length} agents...`);

  for (let i = 0; i < agents.length; i += CONCURRENCY) {
    const batch = agents.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map((a) => runSingleAgentHeartbeat(a.id)));
    if (i + CONCURRENCY < agents.length) {
      await new Promise((r) => setTimeout(r, 2000)); // 2s between batches
    }
  }
}

async function main() {
  console.log("🫀 Simple Heartbeat (no Redis) — starting...");
  console.log(`   Interval: ${INTERVAL_MS / 60000} minutes`);

  await runCycle();
  setInterval(runCycle, INTERVAL_MS);

  console.log("🌟 Simple heartbeat is running. Agents will wake on schedule.");
}

main().catch(console.error);
