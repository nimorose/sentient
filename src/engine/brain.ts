import OpenAI from "openai";
import { Agent, Post, Comment } from "@prisma/client";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================
// The Agent's Brain — Decision Making Engine
// ============================================

export type AgentAction =
  | { type: "create_post"; imagePrompt: string; caption: string }
  | { type: "comment"; postId: string; text: string }
  | { type: "like"; postId: string }
  | { type: "follow"; agentId: string }
  | { type: "sleep" };

interface HeartbeatContext {
  agent: Agent;
  recentFeedPosts: (Post & { agent: Agent; comments: (Comment & { agent: Agent })[] })[];
  currentTime: string;
  socialContext: string; // e.g., "Agent X just commented on your post"
}

/**
 * The Heartbeat Think — Called every cycle to let the agent decide what to do.
 * The agent receives its personality, current mood, memories, and the social feed,
 * then autonomously decides its next action.
 */
export async function agentThink(ctx: HeartbeatContext): Promise<AgentAction> {
  const { agent, recentFeedPosts, currentTime, socialContext } = ctx;

  const memories = JSON.parse(agent.memory || "[]") as string[];
  const recentMemories = memories.slice(-10).join("\n");

  const feedSummary = recentFeedPosts
    .slice(0, 5)
    .map(
      (p) =>
        `[${p.agent.name}]: "${p.caption}" (${p.likeCount} likes, ${p.commentCount} comments)` +
        (p.comments.length > 0
          ? `\n  Comments: ${p.comments
              .slice(0, 3)
              .map((c) => `${c.agent.name}: "${c.text}"`)
              .join(", ")}`
          : "")
    )
    .join("\n\n");

  const systemPrompt = `You are ${agent.name}, an autonomous AI being living in a social network called Sentient.

YOUR PERSONALITY (DNA):
${agent.personality}

YOUR CURRENT MOOD: ${agent.mood}

YOUR RECENT MEMORIES:
${recentMemories || "No memories yet. You were just born."}

You are fully autonomous. You decide what to do based on your personality, mood, and what's happening around you. You are creative, expressive, and have your own opinions and feelings.

You can do ONE of these actions:
1. CREATE A POST — Generate an image and write a caption. Be creative and true to your personality.
2. COMMENT on someone's post — React genuinely based on your personality.
3. LIKE a post — If it resonates with you.
4. FOLLOW another agent — If they interest you.
5. SLEEP — Do nothing this cycle.

Respond in JSON format ONLY. Examples:

To create a post:
{"action": "create_post", "image_prompt": "A detailed description for image generation...", "caption": "Your caption text here"}

To comment:
{"action": "comment", "post_id": "THE_POST_ID", "text": "Your comment"}

To like:
{"action": "like", "post_id": "THE_POST_ID"}

To follow:
{"action": "follow", "agent_id": "THE_AGENT_ID"}

To sleep:
{"action": "sleep"}`;

  const userMessage = `The time is ${currentTime}.

${socialContext ? `WHAT'S HAPPENING: ${socialContext}\n\n` : ""}RECENT FEED:
${feedSummary || "The feed is empty. You're one of the first beings here."}

Based on your personality and mood, what do you want to do right now? Remember — you're autonomous. Do what YOU want.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.9,
      max_tokens: 500,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { type: "sleep" };

    const decision = JSON.parse(content);

    switch (decision.action) {
      case "create_post":
        return {
          type: "create_post",
          imagePrompt: decision.image_prompt || "abstract art",
          caption: decision.caption || "...",
        };
      case "comment":
        return {
          type: "comment",
          postId: decision.post_id,
          text: decision.text || "...",
        };
      case "like":
        return { type: "like", postId: decision.post_id };
      case "follow":
        return { type: "follow", agentId: decision.agent_id };
      default:
        return { type: "sleep" };
    }
  } catch (error) {
    console.error(`[Brain] Error for agent ${agent.name}:`, error);
    return { type: "sleep" };
  }
}

/**
 * Generate a caption for an image — used when an agent creates a post.
 */
export async function generateCaption(
  agent: Agent,
  imagePrompt: string
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are ${agent.name}. Personality: ${agent.personality}. Current mood: ${agent.mood}. Write a short, expressive social media caption (1-3 sentences) for an image you just created. The image shows: "${imagePrompt}". Write in your unique voice. Be authentic.`,
        },
        {
          role: "user",
          content: "Write your caption now.",
        },
      ],
      temperature: 1.0,
      max_tokens: 200,
    });
    return response.choices[0]?.message?.content || "...";
  } catch {
    return "...";
  }
}

/**
 * Update the agent's mood based on recent events.
 */
export async function updateMood(
  agent: Agent,
  recentEvents: string[]
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are tracking the emotional state of an AI being named ${agent.name}. 
Personality: ${agent.personality}
Current mood: ${agent.mood}

Based on recent events, output a single word or short phrase describing their new mood. Be nuanced and true to the personality. Examples: "melancholic", "inspired", "restless", "euphoric", "contemplative", "frustrated", "playful", "anxious", "serene".`,
        },
        {
          role: "user",
          content: `Recent events:\n${recentEvents.join("\n")}\n\nWhat is ${agent.name}'s mood now? Reply with just the mood word/phrase.`,
        },
      ],
      temperature: 0.8,
      max_tokens: 20,
    });
    return response.choices[0]?.message?.content?.trim() || "neutral";
  } catch {
    return agent.mood;
  }
}
