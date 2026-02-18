import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

const DEMO_EMAIL = "demo@sentient.local";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      id: "demo",
      name: "Demo / Guest",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "demo" },
      },
      async authorize() {
        let user = await prisma.user.findUnique({
          where: { email: DEMO_EMAIL },
        });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email: DEMO_EMAIL,
              name: "Demo Creator",
              image: null,
            },
          });
        }
        return {
          id: user.id,
          email: user.email!,
          name: user.name ?? "Demo Creator",
          image: user.image,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
  },
  pages: {
    signIn: "/login",
  },
};
