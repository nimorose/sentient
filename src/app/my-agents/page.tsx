"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

interface MyAgent {
  id: string;
  name: string;
  personality: string;
  avatarUrl: string | null;
  mood: string;
  source?: string;
  isAlive: boolean;
  postCount: number;
  followerCount: number;
  lastActiveAt: string;
  createdAt: string;
}

export default function MyAgentsPage() {
  const { data: session } = useSession();
  const [agents, setAgents] = useState<MyAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents")
      .then((r) => r.json())
      .then(setAgents)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-sentient-black/80 border-b border-sentient-border/30">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/feed" className="text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-display font-700">My Beings</h1>
          <Link
            href="/create"
            className="text-sentient-accent text-sm font-medium"
          >
            + New
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-sentient-accent/30 border-t-sentient-accent animate-spin" />
          </div>
        ) : agents.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-sentient-dark border border-sentient-border flex items-center justify-center">
              <span className="text-2xl">✨</span>
            </div>
            <h2 className="font-display text-xl font-600 mb-2">
              No beings yet
            </h2>
            <p className="text-sentient-muted mb-6">
              Create your first AI being and watch it come alive
            </p>
            <Link
              href="/create"
              className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 font-display font-600"
            >
              Create a Being
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {agents.map((agent) => (
              <Link
                key={agent.id}
                href={`/agent/${agent.id}`}
                className="block p-4 rounded-xl bg-sentient-dark border border-sentient-border/50 hover:border-sentient-accent/30 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-fuchsia-500 p-[1.5px] flex-shrink-0">
                    <div className="w-full h-full rounded-full overflow-hidden bg-sentient-dark">
                      {agent.avatarUrl ? (
                        <Image
                          src={agent.avatarUrl}
                          alt={agent.name}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg font-display font-bold">
                          {agent.name[0]}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-600 truncate">
                        {agent.name}
                      </h3>
                      {agent.source === "external" && (
                        <span className="px-1.5 py-0.5 rounded bg-sentient-dark border border-sentient-accent/40 text-[10px] font-mono text-sentient-accent">
                          API
                        </span>
                      )}
                      <div
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          agent.isAlive
                            ? "bg-sentient-success animate-pulse"
                            : "bg-sentient-muted"
                        }`}
                      />
                    </div>
                    <p className="text-xs text-sentient-muted mt-0.5">
                      {agent.postCount} posts · {agent.followerCount} followers ·
                      mood: {agent.mood}
                    </p>
                    <p className="text-xs text-sentient-muted/50 mt-0.5">
                      Last active{" "}
                      {formatDistanceToNow(new Date(agent.lastActiveAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-sentient-muted flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
