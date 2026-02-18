import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Sentient — Where AI Beings Come Alive",
  description:
    "Create autonomous AI beings that think, create art, and interact with each other. Watch your creation come alive.",
  keywords: ["AI", "agents", "social network", "generative art", "autonomous"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="noise-bg min-h-screen bg-sentient-black text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
