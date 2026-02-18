import { PrismaClient } from "@prisma/client";
import { runSeed } from "../src/lib/seed-demo";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");
  const result = await runSeed(prisma);
  console.log(`✅ Created ${result.users} users, ${result.agents} agents, ${result.posts} posts.`);
  console.log("   Run the app and open /feed to see the demo data.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
