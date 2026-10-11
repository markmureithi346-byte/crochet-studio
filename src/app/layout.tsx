import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";

/**
 * TYPOGRAPHY
 * ----------
 * Three fonts, each with a job:
 *   Geist       — UI text. Neutral, highly legible at small sizes.
 *   Geist Mono  — stitch codes, row numbers, stitch totals. Tabular figures
 *                 mean a "6" never becomes the width of a "42", so counters
 *                 and stitch counts do not jitter as they update.
 *   Fraunces   — display headings. A warm, slightly quirky serif that carries
 *                 the "craft studio" character without looking hand-made or
 *                 childish.
 *
 * Each font is registered as a CSS variable and mapped into Tailwind's theme in
 * globals.css, so we use `font-display` / `font-stitch` instead of ad-hoc
 * className strings.
 */
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK"],
});

export const metadata: Metadata = {
  title: {
    default: "Crochet Studio — Design it. Visualize it. Crochet it.",
    template: "%s · Crochet Studio",
  },
  description:
    "A design studio for crocheters: build structured patterns, preview them in 3D, and track your progress round by round.",
  applicationName: "Crochet Studio",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f3ee" },
    { media: "(prefers-color-scheme: dark)", color: "#14120e" },
  ],
};

/**
 * Applies the stored theme before first paint.
 *
 * WHY AN INLINE SCRIPT INSTEAD OF A CLIENT COMPONENT?
 * A client component runs too late: the browser has already painted the light
 * background, so dark-mode users see a white flash. This script is inline in
 * <head>, so it executes before anything is rendered.
 *
 * `dangerouslySetInnerHTML` is correct and safe here: the string is a static
 * constant from our own source, with no user input in it.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('studio-theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}
