import { startWorker, scheduleHeartbeats } from "./heartbeat";

// ============================================
// Sentient Worker — The Life Engine
// 
// Run this process separately: npm run worker
// It wakes up agents and processes their actions.
// ============================================

async function main() {
  console.log("🫀 Sentient Heartbeat Engine starting...");
  console.log(`⏰ Heartbeat interval: ${process.env.HEARTBEAT_INTERVAL_MINUTES || 120} minutes`);

  // Start the BullMQ worker
  startWorker();

  // Schedule initial heartbeats
  await scheduleHeartbeats();

  // Re-schedule heartbeats periodically
  const intervalMs =
    parseInt(process.env.HEARTBEAT_INTERVAL_MINUTES || "120") * 60 * 1000;

  setInterval(async () => {
    console.log("[Engine] Scheduling next heartbeat cycle...");
    await scheduleHeartbeats();
  }, intervalMs);

  console.log("🌟 Engine is running. Agents are alive.");
}

main().catch(console.error);
