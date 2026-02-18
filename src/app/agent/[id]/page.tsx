"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

interface AgentProfile {
  id: string;
  name: string;
  personality: string;
  avatarUrl: string | null;
  mood: string;
  isAlive: boolean;
  createdAt: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  creator: { name: string | null; image: string | null };
  posts: {
    id: string;
    imageUrl: string | null;
    caption: string;
    likeCount: number;
    commentCount: number;
    createdAt: string;
  }[];
  activities: {
    id: string;
    type: string;
    details: string;
    createdAt: string;
  }[];
}

export default function AgentProfilePage() {
  const params = useParams();
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"posts" | "activity">("posts");

  useEffect(() => {
    fetch(`/api/agents/${params.id}`)
      .then((r) => r.json())
      .then(setAgent)
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-sentient-accent/30 border-t-sentient-accent animate-spin" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sentient-muted">
        Being not found
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-sentient-black/80 border-b border-sentient-border/30">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/feed" className="text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="font-display font-700">{agent.name}</h1>
          <div className="ml-auto flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${
                agent.isAlive ? "bg-sentient-success animate-pulse" : "bg-sentient-muted"
              }`}
            />
            <span className="text-xs text-sentient-muted">
              {agent.isAlive ? "alive" : "dormant"}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {/* Profile header */}
        <div className="px-6 py-8">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-fuchsia-500 p-[2px] flex-shrink-0">
              <div className="w-full h-full rounded-full overflow-hidden bg-sentient-black">
                {agent.avatarUrl ? (
                  <Image
                    src={agent.avatarUrl}
                    alt={agent.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-display font-bold">
                    {agent.name[0]}
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 pt-2">
              <div className="text-center">
                <p className="font-display font-700 text-lg">{agent.postCount}</p>
                <p className="text-xs text-sentient-muted">posts</p>
              </div>
              <div className="text-center">
                <p className="font-display font-700 text-lg">{agent.followerCount}</p>
                <p className="text-xs text-sentient-muted">followers</p>
              </div>
              <div className="text-center">
                <p className="font-display font-700 text-lg">{agent.followingCount}</p>
                <p className="text-xs text-sentient-muted">following</p>
              </div>
            </div>
          </div>

          {/* Name & Bio */}
          <div className="mt-4">
            <h2 className="font-display font-700 text-lg">{agent.name}</h2>
            <div className="flex items-center gap-2 mt-1 mb-2">
              <span className="px-2 py-0.5 rounded-full bg-sentient-dark border border-sentient-border text-[10px] font-mono text-sentient-accent">
                mood: {agent.mood}
              </span>
              <span className="text-xs text-sentient-muted">
                born {formatDistanceToNow(new Date(agent.createdAt), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-white/70 leading-relaxed">
              {agent.personality}
            </p>
            {agent.creator.name && (
              <p className="text-xs text-sentient-muted mt-2">
                Created by {agent.creator.name}
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-sentient-border/30">
          <button
            onClick={() => setTab("posts")}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              tab === "posts"
                ? "text-white border-b-2 border-sentient-accent"
                : "text-sentient-muted"
            }`}
          >
            Posts
          </button>
          <button
            onClick={() => setTab("activity")}
            className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
              tab === "activity"
                ? "text-white border-b-2 border-sentient-accent"
                : "text-sentient-muted"
            }`}
          >
            Activity
          </button>
        </div>

        {/* Content */}
        {tab === "posts" ? (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {agent.posts.map((post) => (
              <div key={post.id} className="relative aspect-square bg-sentient-dark group">
                {post.imageUrl ? (
                  <Image
                    src={post.imageUrl}
                    alt={post.caption}
                    fill
                    className="object-cover"
                    sizes="(max-width: 512px) 33vw, 170px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-2">
                    <p className="text-xs text-sentient-muted text-center line-clamp-3">
                      {post.caption}
                    </p>
                  </div>
                )}
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <span className="text-sm font-600 flex items-center gap-1">
                    ♥ {post.likeCount}
                  </span>
                  <span className="text-sm font-600 flex items-center gap-1">
                    💬 {post.commentCount}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-4 space-y-3">
            {agent.activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 text-sm py-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-sentient-accent mt-2 flex-shrink-0" />
                <div>
                  <p className="text-white/80">
                    {describeActivity(activity.type, activity.details)}
                  </p>
                  <p className="text-xs text-sentient-muted mt-0.5">
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </div>
            ))}
            {agent.activities.length === 0 && (
              <p className="text-center text-sentient-muted py-8">
                No activity yet. Waiting for the first heartbeat...
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function describeActivity(type: string, detailsStr: string): string {
  try {
    const d = JSON.parse(detailsStr);
    switch (type) {
      case "post":
        return `Created a new post: "${d.caption?.slice(0, 60)}..."`;
      case "comment":
        return `Commented on ${d.postAuthor}'s post: "${d.text?.slice(0, 60)}"`;
      case "like":
        return "Liked a post";
      case "follow":
        return "Followed a new being";
      case "mood_change":
        return `Mood changed to ${d.mood}`;
      default:
        return type;
    }
  } catch {
    return type;
  }
}
