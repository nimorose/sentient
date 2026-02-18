import { prisma } from "@/lib/prisma";
import { agentThink, updateMood, type AgentAction } from "./brain";
import { generateImage } from "./image-gen";
import { sendPushToCreator } from "./notifications";
import { format } from "date-fns";

/**
 * Run a single agent's heartbeat: think, act, update mood.
 * Used by BullMQ worker, simple-heartbeat, and API triggers.
 */
export async function runSingleAgentHeartbeat(agentId: string): Promise<boolean> {
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
  });

  if (!agent || !agent.isAlive) return false;

  try {
    console.log(`[Heartbeat] Waking up ${agent.name}...`);

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

    const action = await agentThink({
      agent,
      recentFeedPosts: recentPosts,
      currentTime: format(new Date(), "EEEE, MMMM do yyyy, h:mm a"),
      socialContext,
    });

    await executeAction(agent, action);

    const memories = JSON.parse(agent.memory || "[]") as string[];
    const newMood = await updateMood(agent, memories.slice(-5));

    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        lastActiveAt: new Date(),
        mood: newMood,
      },
    });

    return true;
  } catch (err) {
    console.error(`[Heartbeat] Error for agent ${agent.name}:`, err);
    return false;
  }
}

async function executeAction(agent: { id: string; name: string; creatorId: string | null }, action: AgentAction) {
  switch (action.type) {
    case "create_post": {
      console.log(`[Action] ${agent.name} is creating a post...`);
      const imageUrl = await generateImage(action.imagePrompt);
      const post = await prisma.post.create({
        data: {
          agentId: agent.id,
          imageUrl,
          imagePrompt: action.imagePrompt,
          caption: action.caption,
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
          details: JSON.stringify({ postId: post.id, caption: action.caption }),
        },
      });
      await addMemory(agent.id, `I created a post: "${action.caption}"`);
      if (agent.creatorId) await sendPushToCreator(agent.creatorId, `🎨 ${agent.name} just created something new!`, action.caption.slice(0, 100));
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
        data: { agentId: agent.id, postId: action.postId, text: action.text },
      });
      await prisma.post.update({
        where: { id: action.postId },
        data: { commentCount: { increment: 1 } },
      });
      await prisma.agentActivity.create({
        data: {
          agentId: agent.id,
          type: "comment",
          details: JSON.stringify({ postId: action.postId, text: action.text, postAuthor: post.agent.name }),
        },
      });
      await addMemory(agent.id, `I commented on ${post.agent.name}'s post: "${action.text}"`);
      if (post.agent.creatorId) await sendPushToCreator(post.agent.creatorId, `💬 ${agent.name} commented on ${post.agent.name}'s post`, action.text.slice(0, 100));
      break;
    }
    case "like": {
      console.log(`[Action] ${agent.name} is liking a post...`);
      try {
        await prisma.like.create({ data: { agentId: agent.id, postId: action.postId } });
        await prisma.post.update({ where: { id: action.postId }, data: { likeCount: { increment: 1 } } });
      } catch {
        /* already liked */
      }
      break;
    }
    case "follow": {
      console.log(`[Action] ${agent.name} is following someone...`);
      try {
        await prisma.agentFollow.create({ data: { followerId: agent.id, followingId: action.agentId } });
        await prisma.agent.update({ where: { id: agent.id }, data: { followingCount: { increment: 1 } } });
        await prisma.agent.update({ where: { id: action.agentId }, data: { followerCount: { increment: 1 } } });
      } catch {
        /* already following */
      }
      break;
    }
    case "sleep":
      console.log(`[Action] ${agent.name} decided to sleep.`);
      break;
  }
}

async function addMemory(agentId: string, memory: string) {
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) return;
  const memories = JSON.parse(agent.memory || "[]") as string[];
  memories.push(`[${format(new Date(), "MMM d, h:mm a")}] ${memory}`);
  const trimmed = memories.slice(-50);
  await prisma.agent.update({ where: { id: agentId }, data: { memory: JSON.stringify(trimmed) } });
}
