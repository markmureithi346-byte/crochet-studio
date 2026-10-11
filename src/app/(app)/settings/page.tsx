import { Bot, Lock, Palette, User2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/data/auth";
import { prisma } from "@/lib/db";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { signOutAction } from "@/app/(auth)/actions";
import { AI_ROADMAP } from "@/lib/ai/patch-schema";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();

  const [patternCount, projectCount, yarnCount] = await Promise.all([
    prisma.pattern.count({ where: { userId: user.id } }),
    prisma.project.count({ where: { userId: user.id } }),
    prisma.yarn.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Settings</h1>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User2 className="size-4" aria-hidden="true" />
            Your account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Row label="Name" value={user.name} />
          <Row label="Email" value={user.email ?? "—"} />
          <Row label="Patterns" value={String(patternCount)} />
          <Row label="Projects" value={String(projectCount)} />
          <Row label="Yarns" value={String(yarnCount)} />
          <form action={signOutAction}>
            <Button variant="secondary" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="size-4" aria-hidden="true" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <p className="text-sm text-ink-muted">
            Crochet mode has its own dark toggle for late-night sessions.
          </p>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="size-4" aria-hidden="true" />
            Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-ink-muted">
          <p>
            Every pattern and project you create is private to your account. There
            is no setting that publishes anything, and no public page can be
            reached without an authenticated ownership check.
          </p>
          <p>
            Uploaded photos are served through an authorised route, so a copied URL
            is useless to anyone else.
          </p>
        </CardContent>
      </Card>

      {/* The honest roadmap lives in the app, not just the README. */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="size-4" aria-hidden="true" />
            AI assistant — architecture ready, not switched on
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-ink-muted">
            The patch schema that an assistant must produce is written, validated
            and tested. No model is connected, so nothing here can change your
            patterns. When it is switched on, it will propose changes for your
            approval rather than making them.
          </p>
          <ul className="space-y-2">
            {AI_ROADMAP.map((item) => (
              <li key={item.title} className="flex items-start gap-2.5 text-sm">
                <Badge tone={item.status === "ready" ? "success" : "warning"} className="shrink-0">
                  {item.status === "ready" ? "Ready" : "Planned"}
                </Badge>
                <span className="text-ink-muted">
                  <span className="font-medium text-ink">{item.title}</span> — {item.detail}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}
