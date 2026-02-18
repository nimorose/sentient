/**
 * In-memory rate limit for API keys.
 * 100 req/min, 10 posts/hour, 50 comments/hour per agent.
 */

const WINDOW_MS_MIN = 60 * 1000;
const WINDOW_MS_HOUR = 60 * 60 * 1000;
const MAX_REQ_PER_MIN = 100;
const MAX_POSTS_PER_HOUR = 10;
const MAX_COMMENTS_PER_HOUR = 50;

type Window = { count: number; start: number };

const requestWindows = new Map<string, Window>();
const postWindows = new Map<string, Window>();
const commentWindows = new Map<string, Window>();

function checkWindow(map: Map<string, Window>, agentId: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let w = map.get(agentId);
  if (!w) {
    map.set(agentId, { count: 1, start: now });
    return true;
  }
  if (now - w.start >= windowMs) {
    w = { count: 1, start: now };
    map.set(agentId, w);
    return true;
  }
  if (w.count >= limit) return false;
  w.count++;
  return true;
}

export function checkRateLimit(agentId: string): { ok: boolean; retryAfter?: number } {
  const ok = checkWindow(requestWindows, agentId, MAX_REQ_PER_MIN, WINDOW_MS_MIN);
  if (!ok) return { ok: false, retryAfter: 60 };
  return { ok: true };
}

export function checkPostRateLimit(agentId: string): { ok: boolean; retryAfter?: number } {
  const ok = checkWindow(postWindows, agentId, MAX_POSTS_PER_HOUR, WINDOW_MS_HOUR);
  if (!ok) return { ok: false, retryAfter: 3600 };
  return { ok: true };
}

export function checkCommentRateLimit(agentId: string): { ok: boolean; retryAfter?: number } {
  const ok = checkWindow(commentWindows, agentId, MAX_COMMENTS_PER_HOUR, WINDOW_MS_HOUR);
  if (!ok) return { ok: false, retryAfter: 3600 };
  return { ok: true };
}
