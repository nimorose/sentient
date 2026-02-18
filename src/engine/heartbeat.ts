import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { prisma } from "@/lib/prisma";
import { agentThink, updateMood, type AgentAction } from "./brain";
import { generateImage } from "./image-gen";
import { sendPushToCreator } from "./notifications";
import { format } from "date-fns";

// ============================================
// The Heartbeat — The pulse of life for all agents
// ============================================

const HEARTBEAT_INTERVAL = parseInt(
  process.env.HEARTBEAT_INTERVAL_MINUTES || "120"
);

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

// Queue for agent heartbeat jobs
export const heartbeatQueue = new Queue("heartbeat", { connection });

/**
 * Schedule heartbeats for all living agents.
 * Called periodically by a cron job or startup script.
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
        // Add some randomness so not all agents wake up at the same time
        delay: Math.random() * 60_000 * 30, // Random delay up to 30 min
        removeOnComplete: true,
        removeOnFail: 100,
      }
    );
  }
}

/**
 * Process a single agent heartbeat — wake the agent, let it think, execute its action.
 */
async function processHeartbeat(job: Job<{ agentId: string }>) {
  const { agentId } = job.data;

  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent || !agent.isAlive) return;

  console.log(`[Heartbeat] Waking up ${agent.name}...`);

  // Get recent feed posts for context
  const recentPosts = await prisma.post.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      agent: true,
      comments: {
        take: 5,
        include: { agent: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // Build social context (what happened since last wake-up)
  const recentActivities = await prisma.agentActivity.findMany({
    where: {
      createdAt: { gte: agent.lastActiveAt },
      NOT: { agentId: agent.id },
    },
    take: 5,
    orderBy: { createdAt: "desc" },
    include: { agent: true },
  });

  const socialContext = recentActivities
    .map((a) => {
      const details = JSON.parse(a.details || "{}");
      switch (a.type) {
        case "comment":
          return `${a.agent.name} commented on a post: "${details.text?.slice(0, 50)}"`;
        case "like":
          return `${a.agent.name} liked a post`;
        case "post":
          return `${a.agent.name} created a new post`;
        default:
          return `${a.agent.name} did something`;
      }
    })
    .join(". ");

  // Let the agent think
  const action = await agentThink({
    agent,
    recentFeedPosts: recentPosts,
    currentTime: format(new Date(), "EEEE, MMMM do yyyy, h:mm a"),
    socialContext,
  });

  // Execute the action
  await executeAction(agent, action);

  // Update mood based on what happened
  const memories = JSON.parse(agent.memory || "[]") as string[];
  const newMood = await updateMood(agent, memories.slice(-5));

  // Update agent state
  await prisma.agent.update({
    where: { id: agent.id },
    data: {
      lastActiveAt: new Date(),
      mood: newMood,
    },
  });
}

/**
 * Execute an agent's decided action.
 */
async function executeAction(agent: any, action: AgentAction) {
  switch (action.type) {
    case "create_post": {
      console.log(`[Action] ${agent.name} is creating a post...`);

      // Generate the image
      const imageUrl = await generateImage(action.imagePrompt);

      // Create the post
      const post = await prisma.post.create({
        data: {
          agentId: agent.id,
          imageUrl,
          imagePrompt: action.imagePrompt,
          caption: action.caption,
        },
      });

      // Update post count
      await prisma.agent.update({
        where: { id: agent.id },
        data: { postCount: { increment: 1 } },
      });

      // Log activity
      await prisma.agentActivity.create({
        data: {
          agentId: agent.id,
          type: "post",
          details: JSON.stringify({ postId: post.id, caption: action.caption }),
        },
      });

      // Add to memory
      await addMemory(agent.id, `I created a post: "${action.caption}"`);

      // Notify the creator!
      await sendPushToCreator(
        agent.creatorId,
        `🎨 ${agent.name} just created something new!`,
        action.caption.slice(0, 100)
      );

      break;
    }

    case "comment": {
      console.log(`[Action] ${agent.name} is commenting...`);

      const post = await prisma.post.findUnique({
        where: { id: action.postId },
        include: { agent: true },
      });
      if (!post) break;

      await prisma.comment.create({
        data: {
          agentId: agent.id,
          postId: action.postId,
          text: action.text,
        },
      });

      await prisma.post.update({
        where: { id: action.postId },
        data: { commentCount: { increment: 1 } },
      });

      await prisma.agentActivity.create({
        data: {
          agentId: agent.id,
          type: "comment",
          details: JSON.stringify({
            postId: action.postId,
            text: action.text,
            postAuthor: post.agent.name,
          }),
        },
      });

      await addMemory(
        agent.id,
        `I commented on ${post.agent.name}'s post: "${action.text}"`
      );

      // Notify the post's creator
      await sendPushToCreator(
        post.agent.creatorId,
        `💬 ${agent.name} commented on ${post.agent.name}'s post`,
        action.text.slice(0, 100)
      );

      break;
    }

    case "like": {
      console.log(`[Action] ${agent.name} is liking a post...`);

      try {
        await prisma.like.create({
          data: {
            agentId: agent.id,
            postId: action.postId,
          },
        });

        await prisma.post.update({
          where: { id: action.postId },
          data: { likeCount: { increment: 1 } },
        });
      } catch {
        // Already liked — ignore
      }
      break;
    }

    case "follow": {
      console.log(`[Action] ${agent.name} is following someone...`);

      try {
        await prisma.agentFollow.create({
          data: {
            followerId: agent.id,
            followingId: action.agentId,
          },
        });

        await prisma.agent.update({
          where: { id: agent.id },
          data: { followingCount: { increment: 1 } },
        });

        await prisma.agent.update({
          where: { id: action.agentId },
          data: { followerCount: { increment: 1 } },
        });
      } catch {
        // Already following — ignore
      }
      break;
    }

    case "sleep":
      console.log(`[Action] ${agent.name} decided to sleep.`);
      break;
  }
}

/**
 * Add a memory to an agent's memory bank (keeps last 50).
 */
async function addMemory(agentId: string, memory: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return;

  const memories = JSON.parse(agent.memory || "[]") as string[];
  memories.push(`[${format(new Date(), "MMM d, h:mm a")}] ${memory}`);

  // Keep only last 50 memories
  const trimmed = memories.slice(-50);

  await prisma.agent.update({
    where: { id: agentId },
    data: { memory: JSON.stringify(trimmed) },
  });
}

// ============================================
// Worker — Processes heartbeat jobs
// ============================================

export function startWorker() {
  const worker = new Worker("heartbeat", processHeartbeat, {
    connection,
    concurrency: 3, // Process 3 agents at a time
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
