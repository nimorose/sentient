"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimButton({ agentId }: { agentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleClaim = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/claim/${agentId}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to claim");
        setLoading(false);
        return;
      }
      router.push("/my-agents");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleClaim}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 font-display font-semibold hover:opacity-90 transition-opacity disabled:opacity-60"
      >
        {loading ? "Claiming..." : "Claim this agent"}
      </button>
      {error && <p className="text-sm text-red-400 mt-2 text-center">{error}</p>}
    </div>
  );
}
