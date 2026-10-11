import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  FileText,
  Layers,
  NotebookPen,
  Package,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StudioPipeline } from "@/components/marketing/studio-pipeline";
import { getCurrentUser } from "@/lib/data/auth";

/**
 * THE LANDING PAGE
 * ----------------
 * Every section earns its place by answering a question a crocheter actually has:
 *   Hero       -> what is this?
 *   Systems    -> what can it do for me?
 *   Pipeline   -> how does it work?
 *   Features   -> why is it better than a PDF pattern?
 *   Roadmap    -> what actually works today? (honesty is a feature)
 *
 * Server Component: no state, no interactivity beyond links, so it ships almost
 * no JavaScript.
 */
export default async function LandingPage() {
  const user = await getCurrentUser();
  const primaryHref = user ? "/dashboard" : "/signup";
  const primaryLabel = user ? "Open your studio" : "Start designing";

  return (
    <>
      {/* ---------------------------------------------------------------- Hero */}
      <section className="relative overflow-hidden">
        {/* A single very soft radial wash. No gradients-as-decoration elsewhere. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-40 h-[420px] bg-[radial-gradient(60%_60%_at_50%_0%,var(--accent-soft),transparent)] opacity-70"
        />

        <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-16 sm:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge tone="accent" className="mb-6">
              <Sparkles className="size-3" aria-hidden="true" />
              A design studio for crochet
            </Badge>

            <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
              Design it. Visualize it.{" "}
              <span className="text-accent">Crochet it.</span>
            </h1>

            <p className="mx-auto mt-6 max-w-xl text-lg text-ink-muted">
              Build a pattern as structured data, watch it become a shape in 3D,
              then work it round by round â€” without ever losing your place again.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="w-full sm:w-auto">
                <Link href={primaryHref}>
                  {primaryLabel}
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="secondary" size="lg" className="w-full sm:w-auto">
                <Link href="/#systems">Explore the studio</Link>
              </Button>
            </div>

            <p className="mt-4 text-xs text-ink-subtle">
              Free while in development Â· Your patterns stay private
            </p>
          </div>

          <div className="mx-auto mt-14 max-w-4xl">
            <StudioPipeline />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Systems */}
      <section id="systems" className="scroll-mt-20 border-t border-line bg-surface">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <SectionHeading
            eyebrow="Three systems, one design"
            title="Not a pattern blog. A studio."
            description="Most tools stop at the PDF. This one carries an idea all the way through to the finished object â€” and back again when you want to change it."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <SystemCard
              icon={<FileText className="size-5" aria-hidden="true" />}
              title="Pattern Maker"
              description="Write rounds as structured data â€” stitches, repeats, counts â€” not paragraphs. The app totals the stitches and flags arithmetic that does not add up."
              status="Working"
            />
            <SystemCard
              icon={<Boxes className="size-5" aria-hidden="true" />}
              title="3D Designer"
              description="Change a dimension and the preview moves with it. An illustrative model of the finished object, not a yarn-level simulation â€” and we say so."
              status="Working"
            />
            <SystemCard
              icon={<NotebookPen className="size-5" aria-hidden="true" />}
              title="Project Tracker"
              description="One tap to advance to the next round. Notes, photos and time are attached to the moment they happened, so progress survives a week away."
              status="Working"
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ Features */}
      <section id="features" className="scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <SectionHeading
            eyebrow="The details that matter"
            title="Built around how crochet actually works"
            description="Stitches are countable. That single fact is what lets this tool do things a generic design app cannot."
          />

          <div className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
            <Feature
              icon={<Layers className="size-5" aria-hidden="true" />}
              title="Rounds are data"
              body="Every step is structured, so the same data drives the written pattern, the stitch maths and the 3D preview."
            />
            <Feature
              icon={<BarChart3 className="size-5" aria-hidden="true" />}
              title="Live stitch totals"
              body="Count every round as you type. The number you see is computed, never typed by hand."
            />
            <Feature
              icon={<Package className="size-5" aria-hidden="true" />}
              title="Yarn inventory"
              body="Keep your stash with metres and weight per skein, and link yarns to the patterns that use them."
            />
            <Feature
              icon={<NotebookPen className="size-5" aria-hidden="true" />}
              title="Notes and photos"
              body="A timestamped history of the actual object: what you changed at round 15, and what it looked like."
            />
            <Feature
              icon={<Boxes className="size-5" aria-hidden="true" />}
              title="Versions, not overwrites"
              body="Save a version when you change a handle length. Compare later. Nothing is silently lost."
            />
            <Feature
              icon={<Sparkles className="size-5" aria-hidden="true" />}
              title="Built for one hand"
              body="Crochet mode is large targets, high contrast and one button. Designed for a phone resting beside your project."
            />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- Roadmap */}
      {/*
        This section exists on purpose. A tool that hides what it cannot do is
        worse than one that admits it. It also keeps us honest during the build.
      */}
      <section id="roadmap" className="scroll-mt-20 border-t border-line bg-surface-2">
        <div className="mx-auto w-full max-w-6xl px-5 py-20">
          <SectionHeading
            eyebrow="Honest status"
            title="What works today, and what does not yet"
            description="The line between a working feature and a planned one should never be blurry."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            <RoadmapColumn
              tone="success"
              title="In the studio now"
              items={[
                "Accounts and private projects",
                "Structured pattern editor with stitch maths",
                "Arithmetic validation of rounds",
                "3D parametric preview",
                "Round-by-round crochet mode",
                "Notes, photos, versions, yarn stash",
              ]}
            />
            <RoadmapColumn
              tone="warning"
              title="Next"
              items={[
                "Pattern generator for standard shapes",
                "Yarn requirement estimates",
                "Visual stitch grid per round",
                "Project analytics",
                "Sharing and public patterns",
              ]}
            />
            <RoadmapColumn
              tone="neutral"
              title="Research, not promises"
              items={[
                "AI assistant proposing reviewed changes",
                "Natural language â†’ structured design",
                "Stitch-level 3D yarn simulation",
                "Import from scanned patterns",
              ]}
            />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------- CTA */}
      <section className="border-t border-line">
        <div className="mx-auto w-full max-w-3xl px-5 py-24 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Your next project deserves better than a screenshot
          </h2>
          <p className="mx-auto mt-4 max-w-md text-ink-muted">
            Start with a structured pattern. End with an object you can hold â€” and
            a record of how you got there.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link href={primaryHref}>
              {primaryLabel}
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}

// --- local presentational pieces -------------------------------------------

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-medium uppercase tracking-widest text-accent">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-ink-muted">{description}</p>
    </div>
  );
}

function SystemCard({
  icon,
  title,
  description,
  status,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: string;
}) {
  return (
    <div className="rounded-xl border border-line bg-canvas p-6">
      <div className="flex items-center justify-between">
        <span className="flex size-10 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {icon}
        </span>
        <Badge tone="success">
          <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
          {status}
        </Badge>
      </div>
      <h3 className="mt-5 font-display text-xl font-semibold text-ink">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{description}</p>
    </div>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div>
      <span className="flex size-9 items-center justify-center rounded-lg bg-surface-3 text-ink-muted">
        {icon}
      </span>
      <h3 className="mt-4 font-medium text-ink">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{body}</p>
    </div>
  );
}

function RoadmapColumn({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "success" | "warning" | "neutral";
}) {
  const dotClass = {
    success: "bg-success",
    warning: "bg-warning",
    neutral: "bg-ink-subtle",
  }[tone];

  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2.5 text-sm text-ink-muted">
            <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
