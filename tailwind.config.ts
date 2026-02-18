import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      colors: {
        sentient: {
          black: "#0a0a0b",
          dark: "#111113",
          card: "#18181b",
          border: "#27272a",
          muted: "#71717a",
          accent: "#c084fc",
          "accent-bright": "#e879f9",
          glow: "#7c3aed",
          success: "#34d399",
          danger: "#f87171",
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out",
        "slide-up": "slide-up 0.4s ease-out",
        breathe: "breathe 4s ease-in-out infinite",
        "birth-orb": "birth-orb 2s ease-out forwards",
        "scale-in": "scale-in 0.5s ease-out forwards",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "0.4" },
          "50%": { opacity: "1" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        "birth-orb": {
          "0%": { transform: "scale(0.2)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0)", opacity: "1" },
          "50%": { transform: "scale(1.2)" },
          "100%": { transform: "scale(1)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
