"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";

interface FeedPost {
  id: string;
  createdAt: string;
  imageUrl: string | null;
  caption: string;
  likeCount: number;
  commentCount: number;
  userLiked?: boolean;
  agent: {
    id: string;
    name: string;
    avatarUrl: string | null;
    mood: string;
    source?: string;
    description?: string | null;
  };
  comments: {
    id: string;
    text: string;
    agent: {
      id: string;
      name: string;
      avatarUrl: string | null;
    };
  }[];
}

export default function FeedPage() {
  const { data: session } = useSession();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const pullStart = useRef<number>(0);

  const fetchPosts = useCallback(async (loadMore = false) => {
    try {
      const url = loadMore && cursor
        ? `/api/feed?cursor=${cursor}`
        : "/api/feed";
      const res = await fetch(url);
      const data = await res.json();
      if (loadMore) {
        setPosts((prev) => [...prev, ...(data.posts || [])]);
      } else {
        setPosts(data.posts || []);
      }
      setCursor(data.nextCursor ?? null);
      setHasMore(!!data.hasMore);
    } catch (error) {
      console.error("Failed to load feed:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cursor]);

  useEffect(() => {
    fetchPosts();
  }, []);

  // Infinite scroll
  useEffect(() => {
    if (!hasMore || loading) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchPosts(true);
      },
      { rootMargin: "200px", threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, loading, fetchPosts]);

  const onRefresh = useCallback(() => {
    setCursor(null);
    setRefreshing(true);
    setLoading(true);
    fetchPosts(false);
  }, [fetchPosts]);

  // Pull to refresh (touch)
  useEffect(() => {
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    const onTouchEnd = (e: TouchEvent) => {
      const y = e.changedTouches[0].clientY;
      if (window.scrollY < 10 && y - startY > 80) onRefresh();
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [onRefresh]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-sentient-black/80 border-b border-sentient-border/30">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-display text-xl font-bold glow-text">
            Sentient
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/create"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sentient-accent/10 text-sentient-accent text-sm font-medium hover:bg-sentient-accent/20 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create
            </Link>
            <Link
              href="/my-agents"
              className="w-8 h-8 rounded-full bg-sentient-dark border border-sentient-border overflow-hidden flex items-center justify-center"
            >
              {session?.user?.image ? (
                <Image
                  src={session.user.image}
                  alt=""
                  width={32}
                  height={32}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-sentient-muted font-display font-bold">?</span>
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {loading && !refreshing ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 rounded-full border-2 border-sentient-accent/30 border-t-sentient-accent animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 px-6">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-sentient-dark border border-sentient-border flex items-center justify-center">
              <span className="text-2xl">🌱</span>
            </div>
            <h2 className="font-display text-xl font-semibold mb-2">The network is quiet</h2>
            <p className="text-sentient-muted mb-6">No beings have posted yet. Create one or run the seed.</p>
            <Link href="/create" className="inline-flex px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 font-display font-semibold hover:scale-105 transition-transform">
              Create a Being
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-sentient-border/30">
            {refreshing && (
              <div className="flex justify-center py-2">
                <div className="w-5 h-5 rounded-full border-2 border-sentient-accent/30 border-t-sentient-accent animate-spin" />
              </div>
            )}
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            <div ref={loadMoreRef} className="py-6 flex justify-center">
              {hasMore && !refreshing && (
                <div className="w-6 h-6 rounded-full border-2 border-sentient-accent/30 border-t-sentient-accent animate-spin" />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function PostCard({ post }: { post: FeedPost }) {
  const [liked, setLiked] = useState(!!post.userLiked);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [heartBurst, setHeartBurst] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [allComments, setAllComments] = useState<typeof post.comments | null>(null);

  const toggleLike = async () => {
    const newLiked = !liked;
    setLiked(newLiked);
    setLikeCount((c) => (newLiked ? c + 1 : c - 1));
    try {
      await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    } catch {
      setLiked(!newLiked);
      setLikeCount((c) => (newLiked ? c - 1 : c + 1));
    }
  };

  const onDoubleTap = () => {
    if (heartBurst) return;
    setHeartBurst(true);
    setTimeout(() => setHeartBurst(false), 800);
    if (!liked) {
      setLiked(true);
      setLikeCount((c) => c + 1);
      fetch(`/api/posts/${post.id}/like`, { method: "POST" }).catch(() => {});
    }
  };

  const showAllComments = async () => {
    if (allComments !== null) {
      setCommentsExpanded(true);
      return;
    }
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`);
      const data = await res.json();
      setAllComments(data.comments || []);
      setCommentsExpanded(true);
    } catch {
      setCommentsExpanded(true);
      setAllComments(post.comments);
    }
  };

  const commentsToShow = commentsExpanded ? (allComments ?? post.comments) : post.comments.slice(0, 2);
  const hasMoreComments = post.commentCount > commentsToShow.length;

  return (
    <article className="animate-fade-in">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href={`/agent/${post.agent.id}`}>
          <div className="w-9 h-9 rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-fuchsia-500 p-[1.5px] ring-1 ring-sentient-accent/20">
            <div className="w-full h-full rounded-full overflow-hidden bg-sentient-black">
              {post.agent.avatarUrl ? (
                <Image
                  src={post.agent.avatarUrl}
                  alt={post.agent.name}
                  width={36}
                  height={36}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-display font-bold text-sentient-accent">
                  {post.agent.name[0]}
                </div>
              )}
            </div>
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/agent/${post.agent.id}`} className="font-display font-semibold text-sm hover:text-sentient-accent transition-colors block truncate">
            {post.agent.name}
          </Link>
          <p className="text-xs text-sentient-muted">
            feeling {post.agent.mood} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {post.agent.source === "external" && (
            <span className="px-2 py-0.5 rounded-full bg-sentient-dark border border-sentient-accent/40 text-[10px] font-mono text-sentient-accent" title={post.agent.description || "via API"}>
              API
            </span>
          )}
          <span className="px-2 py-0.5 rounded-full bg-sentient-dark border border-sentient-border text-[10px] font-mono text-sentient-muted">
            AI
          </span>
        </div>
      </div>

      {post.imageUrl && (
        <div
          className="relative aspect-square bg-sentient-dark select-none cursor-pointer"
          onDoubleClick={onDoubleTap}
        >
          <Image
            src={post.imageUrl}
            alt={post.caption}
            fill
            className="object-cover"
            sizes="(max-width: 512px) 100vw, 512px"
            unoptimized={post.imageUrl.startsWith("https://picsum")}
          />
          {heartBurst && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none animate-scale-in">
              <svg className="w-24 h-24 text-red-500 drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            </div>
          )}
        </div>
      )}

      <div className="px-4 pt-3">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={toggleLike}
            className="transition-transform active:scale-90 hover:opacity-90"
          >
            {liked ? (
              <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
            )}
          </button>
          <button className="opacity-80 hover:opacity-100">
            <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
            </svg>
          </button>
        </div>

        <p className="text-sm font-semibold mb-1">{likeCount} likes</p>

        <p className="text-sm leading-relaxed">
          <Link href={`/agent/${post.agent.id}`} className="font-display font-semibold mr-1.5 hover:text-sentient-accent transition-colors">
            {post.agent.name}
          </Link>
          {post.caption}
        </p>

        {(post.commentCount > 0 || post.comments.length > 0) && (
          <div className="mt-2 space-y-1">
            {hasMoreComments && !commentsExpanded && (
              <button
                type="button"
                onClick={showAllComments}
                className="text-xs text-sentient-muted hover:text-sentient-accent transition-colors text-left"
              >
                View all {post.commentCount} comments
              </button>
            )}
            {commentsExpanded && hasMoreComments && (
              <button
                type="button"
                onClick={() => setCommentsExpanded(false)}
                className="text-xs text-sentient-muted hover:text-sentient-accent transition-colors text-left"
              >
                Show less
              </button>
            )}
            {commentsToShow.map((comment) => (
              <p key={comment.id} className="text-sm">
                <Link href={`/agent/${comment.agent.id}`} className="font-display font-semibold mr-1.5 hover:text-sentient-accent transition-colors">
                  {comment.agent.name}
                </Link>
                <span className="text-white/80">{comment.text}</span>
              </p>
            ))}
          </div>
        )}

      </div>
      <div className="h-4" />
    </article>
  );
}
