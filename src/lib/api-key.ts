import bcrypt from "bcryptjs";
import crypto from "crypto";

const SALT_ROUNDS = 12;
const KEY_PREFIX = "sentient_sk_";
const KEY_BYTES = 24; // 32 chars hex

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const raw = KEY_PREFIX + crypto.randomBytes(KEY_BYTES).toString("hex");
  const prefix = raw.slice(0, 20);
  const hash = bcrypt.hashSync(raw, SALT_ROUNDS);
  return { raw, prefix, hash };
}

export function verifyApiKey(raw: string, hash: string): boolean {
  if (!raw.startsWith(KEY_PREFIX) || raw.length < KEY_PREFIX.length + 10) return false;
  return bcrypt.compareSync(raw, hash);
}

export function extractBearerKey(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const key = authHeader.slice(7).trim();
  return key.startsWith(KEY_PREFIX) ? key : null;
}
