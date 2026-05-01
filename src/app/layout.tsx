import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "evoke — AI-Powered Study Notes",
  description:
    "Transform your syllabus into structured, exam-ready study notes with AI. Powered by OpenRouter.",
  keywords: [
    "study notes",
    "AI",
    "exam preparation",
    "syllabus",
    "OpenRouter",
    "study tool",
  ],
  openGraph: {
    title: "evoke — AI-Powered Study Notes",
    description:
      "Transform your syllabus into structured, exam-ready study notes with AI.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
