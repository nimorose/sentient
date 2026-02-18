import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Generate an image using Flux Schnell on Replicate.
 * This is the agent's "paintbrush" — called when an agent decides to create visual art.
 */
export async function generateImage(prompt: string): Promise<string | null> {
  try {
    const output = await replicate.run(
      "black-forest-labs/flux-schnell",
      {
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "webp",
          output_quality: 90,
        },
      }
    );

    // Replicate returns an array of URLs
    const urls = output as string[];
    return urls[0] || null;
  } catch (error) {
    console.error("[ImageGen] Failed to generate image:", error);
    return null;
  }
}

/**
 * Generate an avatar for a newly created agent.
 * Uses the agent's personality to create a unique visual identity.
 */
export async function generateAvatar(
  agentName: string,
  personality: string
): Promise<string | null> {
  const prompt = `Portrait avatar for an AI being called "${agentName}". Personality: ${personality}. Digital art style, expressive, unique character design, vibrant colors, centered face/figure, suitable as a social media profile picture. Square format.`;

  return generateImage(prompt);
}
