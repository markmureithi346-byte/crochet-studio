"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Eye,
  Pencil,
  Plus,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { RoundRow, AddStepButton } from "@/components/pattern/round-row";
import { StitchDiagram } from "@/components/pattern/stitch-diagram";
import { LayoutGrid, Rows3, BookOpen } from "lucide-react";
import { ValidationBar } from "@/components/pattern/validation-bar";
import { SectionRail } from "@/components/pattern/section-rail";
import {
  PatternDetailsForm,
  type MaterialDraft,
  type PatternDetails,
} from "@/components/pattern/pattern-details-form";
import {
  formatRow,
  resultingCount,
  type PatternStep,
  type StitchStep,
} from "@/lib/engine/stitch-math";
import { validateRows } from "@/lib/engine/validate";
import { isStitchCode } from "@/lib/crochet/stitches";
import { savePatternAction, saveVersionAction } from "@/app/(app)/patterns/actions";
import { cn } from "@/lib/utils";

/**
 * THE PATTERN EDITOR — v2
 * =======================
 * WHAT CHANGED AND WHY
 *
 * 1. FLAT, NOT BOXED. Rounds are lines separated by hairlines, not cards inside
 *    cards. A 40-round pattern used to render 40 nested boxes; it now reads as
 *    one document, which is what a pattern actually is.
 *
 * 2. ALWAYS ANSWERS "WHERE AM I?". A sticky rail shows the current section and
 *    "round 14 of 31" as you scroll, with clickable section jumps and a thin
 *    progress rule. This was the biggest usability complaint, and it cost one
 *    IntersectionObserver to fix.
 *
 * 3. EVERYTHING IS ACTUALLY EDITABLE. Round notes, materials, gauge, hook,
 *    dimensions and difficulty were previously read-only or wired to a hidden
 *    input. All of them now save.
 *
 * 4. THE STITCH COUNT MOVES WITH YOU. Each row shows its resulting count and,
 *    when the count changes, the delta (+6) — so shaping is visible at a glance
 *    instead of something you have to compute.
 *
 * 5. VALIDATION QUIET BY DEFAULT. One line, expanded on demand, loud only when
 *    there is an actual error. See ValidationBar.
 *
 * Read mode is a separate rendering, not the editor with inputs hidden: a
 * printed pattern has different needs (no affordances, roomier spacing) from a
 * form.
 */

interface DraftRow {
  id?: string;
  label: string;
  notes: string;
  expectedStitches: number | null;
  steps: PatternStep[];
}

interface DraftSection {
  id?: string;
  name: string;
  rows: DraftRow[];
}

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved"; rows: number; stitches: number }
  | { status: "error"; message: string };

type ViewMode = "read" | "edit";

/**
 * How much of the pattern to show.
 *
 * `written` is the pattern as printed. `visual` is the same rounds drawn.
 * `both` puts them side by side, which is where the two halves of this tool
 * finally meet: you read "6 INC" and simultaneously see six places where one
 * stitch became two.
 */
type Representation = "written" | "visual" | "both";

export function PatternEditor({
  pattern,
}: {
  pattern: {
    id: string;
    name: string;
    description: string;
    category: string;
    difficulty: string;
    hookSizeMm: number | null;
    yarnWeight: string | null;
    finishedWidthCm: number | null;
    finishedHeightCm: number | null;
    gaugeStitches: number | null;
    gaugeRows: number | null;
    totalStitches: number;
    versions: Array<{ id: string; version: number; label: string; createdAt: Date }>;
    materials: Array<{ id: string; label: string; detail: string; quantity: string }>;
    sections: Array<{
      id: string;
      name: string;
      rows: Array<{
        id: string;
        label: string;
        sortOrder: number;
        totalStitches: number;
        expectedStitches: number | null;
        notes: string;
        steps: Array<{
          type: string;
          stitchCode: string | null;
          count: number;
          groupJson: string | null;
          note: string;
        }>;
      }>;
    }>;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(pattern.name);
  const [description, setDescription] = useState(pattern.description);
  const [mode, setMode] = useState<ViewMode>("read");
  const [representation, setRepresentation] = useState<Representation>("written");
  const [showDetails, setShowDetails] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });

  const [details, setDetails] = useState<PatternDetails>({
    category: pattern.category,
    difficulty: pattern.difficulty,
    hookSizeMm: pattern.hookSizeMm,
    yarnWeight: pattern.yarnWeight,
    finishedWidthCm: pattern.finishedWidthCm,
    finishedHeightCm: pattern.finishedHeightCm,
    gaugeStitches: pattern.gaugeStitches,
    gaugeRows: pattern.gaugeRows,
  });

  const [materials, setMaterials] = useState<MaterialDraft[]>(
    pattern.materials.map((material) => ({
      label: material.label,
      detail: material.detail,
      quantity: material.quantity,
    })),
  );

  const [sections, setSections] = useState<DraftSection[]>(() =>
    pattern.sections.map((section) => ({
      id: section.id,
      name: section.name,
      rows: section.rows.map((row) => ({
        id: row.id,
        label: row.label,
        notes: row.notes,
        expectedStitches: row.expectedStitches,
        steps: row.steps.map(toStep),
      })),
    })),
  );

  /**
   * Stitch count per row, carried across sections exactly as crochet does —
   * ARMS picks up where BODY left off. Computed once and shared by the rows,
   * the validation and the size estimate, so they can never disagree.
   */
  const runningCounts = useMemo(() => {
    const result: Array<Map<string, { total: number; previous: number | null }>> = [];
    let running: number | null = null;

    for (const section of sections) {
      const perRow = new Map<string, { total: number; previous: number | null }>();
      for (const row of section.rows) {
        const key = row.id ?? `new-${result.length}-${perRow.size}`;
        const total: number =
          running === null
            ? row.steps.reduce((sum, step) => sum + producedOf(step), 0)
            : resultingCount(running, row.steps);
        perRow.set(key, { total, previous: running });
        running = total;
      }
      result.push(perRow);
    }
    return result;
  }, [sections]);

  const validation = useMemo(
    () =>
      validateRows(
        sections.flatMap((section) =>
          section.rows.map((row) => ({
            id: row.id,
            label: row.label,
            steps: row.steps,
            expectedStitches: row.expectedStitches,
          })),
        ),
      ),
    [sections],
  );

  const issueLevelByRowId = useMemo(() => {
    const map = new Map<string, "error" | "warning">();
    for (const issue of validation.issues) {
      if (!issue.rowId) continue;
      if (issue.level === "error") map.set(issue.rowId, "error");
      else if (issue.level === "warning" && !map.has(issue.rowId)) map.set(issue.rowId, "warning");
    }
    return map;
  }, [validation.issues]);

  const totalRounds = sections.reduce((sum, section) => sum + section.rows.length, 0);
  const finalCount =
    sections.at(-1)?.rows.at(-1) != null
      ? [...runningCounts].at(-1)?.get(
          [...(sections.at(-1)?.rows ?? [])].at(-1)!.id ?? "",
        )?.total ?? 0
      : 0;

  // --- mutations ---------------------------------------------------------
  function updateRow(sectionIndex: number, rowIndex: number, patch: Partial<DraftRow>) {
    setSaveState({ status: "idle" });
    setSections((current) =>
      current.map((section, sIndex) =>
        sIndex !== sectionIndex
          ? section
          : {
              ...section,
              rows: section.rows.map((row, rIndex) =>
                rIndex === rowIndex ? { ...row, ...patch } : row,
              ),
            },
      ),
    );
  }

  function addRow(sectionIndex: number) {
    setSections((current) =>
      current.map((section, sIndex) => {
        if (sIndex !== sectionIndex) return section;
        return {
          ...section,
          rows: [
            ...section.rows,
            {
              label: `Round ${section.rows.length + 1}`,
              notes: "",
              expectedStitches: null,
              steps: [{ type: "STITCH", stitch: "SC", count: 1 }],
            },
          ],
        };
      }),
    );
  }

  function duplicateRow(sectionIndex: number, rowIndex: number) {
    setSections((current) =>
      current.map((section, sIndex) => {
        if (sIndex !== sectionIndex) return section;
        const source = section.rows[rowIndex];
        const copy: DraftRow = {
          label: source.label,
          notes: source.notes,
          expectedStitches: source.expectedStitches,
          steps: structuredClone(source.steps),
        };
        const rows = [...section.rows];
        rows.splice(rowIndex + 1, 0, copy);
        return { ...section, rows };
      }),
    );
  }

  function deleteRow(sectionIndex: number, rowIndex: number) {
    setSections((current) =>
      current.map((section, sIndex) =>
        sIndex !== sectionIndex
          ? section
          : { ...section, rows: section.rows.filter((_, rIndex) => rIndex !== rowIndex) },
      ),
    );
  }

  function addSection() {
    setSections((current) => [
      ...current,
      {
        name: `SECTION ${current.length + 1}`,
        rows: [
          {
            label: "Round 1",
            notes: "",
            expectedStitches: null,
            steps: [{ type: "STITCH", stitch: "CH", count: 1 }],
          },
        ],
      },
    ]);
  }

  function deleteSection(sectionIndex: number) {
    setSections((current) => current.filter((_, index) => index !== sectionIndex));
  }

  // --- save --------------------------------------------------------------
  function handleSave() {
    setSaveState({ status: "saving" });
    startTransition(async () => {
      const result = await savePatternAction({
        patternId: pattern.id,
        name,
        description,
        details,
        sections,
        materials,
      });

      if (!result.ok) {
        setSaveState({ status: "error", message: result.error ?? "Could not save." });
        return;
      }
      setSaveState({
        status: "saved",
        rows: result.totalRows ?? 0,
        stitches: result.totalStitches ?? 0,
      });
      // Pull authoritative row ids back from the server.
      router.refresh();
    });
  }

  function handleSaveVersion() {
    startTransition(async () => {
      await saveVersionAction({
        patternId: pattern.id,
        label: `Saved ${new Date().toLocaleDateString()}`,
        notes: "",
      });
      router.refresh();
    });
  }

  // Ctrl/Cmd+S saves, as in any editor.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (mode === "edit") handleSave();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, sections, name, description, details, materials]);

  const railSections = sections.map((section, index) => ({
    id: section.id ?? `section-${index}`,
    name: section.name,
    rowCount: section.rows.length,
  }));

  return (
    <div className="min-w-0">
      {/* ---- Toolbar: thin, sticky, out of the way ---- */}
      <div className="sticky top-16 z-30 -mx-4 border-b border-line bg-canvas/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-lg border border-line bg-surface p-0.5">
            <Button
              variant={mode === "read" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMode("read")}
              aria-pressed={mode === "read"}
            >
              <Eye aria-hidden="true" />
              Read
            </Button>
            <Button
              variant={mode === "edit" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setMode("edit")}
              aria-pressed={mode === "edit"}
            >
              <Pencil aria-hidden="true" />
              Edit
            </Button>
          </div>

          {/* Written / Visual switch — spec section 12. */}
          <div className="flex gap-0.5 rounded-lg border border-line bg-surface p-0.5">
            <Button
              variant={representation === "written" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setRepresentation("written")}
              aria-pressed={representation === "written"}
              title="Written pattern"
            >
              <Rows3 aria-hidden="true" />
              <span className="hidden sm:inline">Written</span>
            </Button>
            <Button
              variant={representation === "visual" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setRepresentation("visual")}
              aria-pressed={representation === "visual"}
              title="Stitch diagram"
            >
              <LayoutGrid aria-hidden="true" />
              <span className="hidden sm:inline">Visual</span>
            </Button>
            <Button
              variant={representation === "both" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setRepresentation("both")}
              aria-pressed={representation === "both"}
              title="Written and diagram together"
            >
              <BookOpen aria-hidden="true" />
              <span className="hidden sm:inline">Both</span>
            </Button>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <SaveIndicator state={saveState} />
            {mode === "edit" ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails((value) => !value)}
                  aria-expanded={showDetails}
                >
                  <Settings2 aria-hidden="true" />
                  Spec
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSaveVersion} disabled={isPending}>
                  Save version
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={isPending || validation.errorCount > 0}
                  title={validation.errorCount > 0 ? "Fix the arithmetic errors first" : "Ctrl+S"}
                >
                  <Save aria-hidden="true" />
                  {isPending ? "Saving…" : "Save"}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* ---- Where am I ---- */}
      <SectionRail sections={railSections} totalRounds={totalRounds} />

      {/* ---- Title ---- */}
      <div className="mt-5 space-y-2">
        {mode === "edit" ? (
          <>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-label="Pattern name"
              className="h-11 border-transparent bg-transparent px-0 text-lg font-medium hover:border-line"
            />
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-label="Pattern description"
              placeholder="What is this pattern? Anything about shaping, gauge or finishing."
              className="min-h-16 border-transparent bg-transparent px-0"
            />
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">{name}</h1>
            {description ? <p className="max-w-2xl text-sm text-ink-muted">{description}</p> : null}
          </>
        )}
      </div>

      {/* ---- Spec sheet ---- */}
      {mode === "edit" && showDetails ? (
        <Card className="mt-5 p-5">
          <PatternDetailsForm
            details={details}
            materials={materials}
            onDetailsChange={(patch) => {
              setDetails((current) => ({ ...current, ...patch }));
              setSaveState({ status: "idle" });
            }}
            onMaterialsChange={setMaterials}
          />
        </Card>
      ) : null}

      {/* ---- Validation ---- */}
      <div className="mt-5">
        <ValidationBar
          validation={validation}
          onJump={(rowId) => {
            setMode("edit");
            document.getElementById(`row-${rowId}`)?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }}
        />
      </div>

      {/* ---- Summary strip ---- */}
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <SummaryItem label="Rounds" value={String(totalRounds)} />
        <SummaryItem label="Finished count" value={`${finalCount} st`} />
        {details.gaugeStitches && details.gaugeRows ? (
          <SummaryItem
            label="Estimate"
            value={`≈ ${Math.round((finalCount / details.gaugeStitches) * 10)} × ${Math.round(
              (totalRounds / details.gaugeRows) * 10,
            )} cm`}
            hint="from your gauge"
          />
        ) : (
          <SummaryItem label="Estimate" value="—" hint="set a gauge for a size" muted />
        )}
      </dl>

      {/* ---- The pattern ---- */}
      {mode === "read" ? (
        <ReadMode sections={sections} runningCounts={runningCounts} representation={representation} />
      ) : (
        <div className="mt-6 space-y-8">
          {sections.map((section, sectionIndex) => (
            <section key={section.id ?? `section-${sectionIndex}`} className="space-y-2">
              {/* Scroll-margin so the rail does not cover the heading. */}
              <div
                id={section.id ?? `section-${sectionIndex}`}
                className="scroll-mt-32 flex items-center gap-2 border-b border-line-strong pb-1.5"
              >
                {mode === "edit" ? (
                  <>
                    <Input
                      value={section.name}
                      onChange={(event) =>
                        setSections((current) =>
                          current.map((entry, i) =>
                            i === sectionIndex ? { ...entry, name: event.target.value } : entry,
                          ),
                        )
                      }
                      aria-label="Section name"
                      className="h-8 w-40 border-transparent bg-transparent px-1.5 font-mono text-xs font-semibold uppercase tracking-widest hover:border-line"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      onClick={() => deleteSection(sectionIndex)}
                      disabled={sections.length === 1}
                      aria-label={`Delete section ${section.name}`}
                      title={
                        sections.length === 1
                          ? "A pattern needs at least one section"
                          : "Delete section"
                      }
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </>
                ) : (
                  <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-ink">
                    {section.name}
                  </h2>
                )}
                <span className="ml-auto font-stitch text-xs text-ink-subtle">
                  {section.rows.length} round{section.rows.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="rounded-lg border border-line bg-surface px-1 sm:px-2">
                {section.rows.map((row, rowIndex) => {
                  const key = row.id ?? `new-${sectionIndex}-${rowIndex}`;
                  const counts = runningCounts[sectionIndex]?.get(key);
                  return (
                    <div key={key} id={row.id ? `row-${row.id}` : undefined}>
                      <RoundRow
                        label={row.label}
                        steps={row.steps}
                        notes={row.notes}
                        previousTotal={counts?.previous ?? null}
                        expanded={expandedRow === key}
                        issueLevel={row.id ? issueLevelByRowId.get(row.id) : undefined}
                        isFirst={rowIndex === 0}
                        isLast={rowIndex === section.rows.length - 1}
                        onToggle={() =>
                          setExpandedRow((current) => (current === key ? null : key))
                        }
                        onChange={(patch) => updateRow(sectionIndex, rowIndex, patch)}
                        onDelete={() => deleteRow(sectionIndex, rowIndex)}
                        onDuplicate={() => duplicateRow(sectionIndex, rowIndex)}
                      />
                    </div>
                  );
                })}
              </div>

              {mode === "edit" ? (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => addRow(sectionIndex)}>
                    <Plus aria-hidden="true" />
                    Add round
                  </Button>
                </div>
              ) : null}
            </section>
          ))}

          {mode === "edit" ? (
            <Button variant="outline" size="sm" onClick={addSection}>
              <Plus aria-hidden="true" />
              Add section
            </Button>
          ) : null}
        </div>
      )}

      {/* ---- Versions ---- */}
      {pattern.versions.length > 0 ? (
        <section className="mt-10">
          <h2 className="mb-2 font-mono text-xs font-semibold uppercase tracking-widest text-ink-subtle">
            Version history
          </h2>
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {pattern.versions.map((version) => (
              <li key={version.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="text-ink">
                  Version {version.version}
                  {version.label ? <span className="text-ink-muted"> — {version.label}</span> : null}
                </span>
                <span className="text-xs text-ink-subtle">
                  {new Date(version.createdAt).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/**
 * READ MODE — a printed pattern on screen.
 *
 * Rendered separately rather than by hiding the editor's inputs, because the two
 * have genuinely different jobs. Reading wants: no affordances, roomier leading,
 * and the stitch count treated as a fact rather than a field.
 */
function ReadMode({
  sections,
  runningCounts,
  representation,
}: {
  sections: DraftSection[];
  runningCounts: Array<Map<string, { total: number; previous: number | null }>>;
  representation: Representation;
}) {
  const showWritten = representation !== "visual";
  const showVisual = representation !== "written";

  return (
    <div className="mt-8 max-w-3xl space-y-10">
      {sections.map((section, sectionIndex) => (
        <section key={section.id ?? sectionIndex}>
          <h2 className="border-b border-line-strong pb-1 font-mono text-xs font-semibold uppercase tracking-widest text-ink">
            {section.name}
          </h2>

          {section.rows.length === 0 ? (
            <p className="mt-3 text-sm text-ink-subtle">No rounds in this section yet.</p>
          ) : (
            <ol>
              {section.rows.map((row, rowIndex) => {
                const key = row.id ?? `new-${sectionIndex}-${rowIndex}`;
                const counts = runningCounts[sectionIndex]?.get(key);
                const previous = counts?.previous ?? null;

                // In "both" the diagram sits beside the text on wide screens and
                // under it on narrow ones, so the layout never gets squeezed.
                return (
                  <li
                    key={key}
                    className="flex flex-col gap-3 border-b border-line/50 py-4 last:border-b-0 lg:flex-row lg:items-start lg:gap-6"
                  >
                    <div className="flex min-w-0 flex-1 items-baseline gap-4">
                      <span className="w-24 shrink-0 font-stitch text-xs text-ink-subtle">
                        {row.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        {showWritten ? (
                          <span className="font-stitch text-[15px] leading-relaxed text-ink">
                            {formatRow(row.steps) || "—"}
                          </span>
                        ) : null}
                        {row.notes ? (
                          <p className="mt-1 text-xs text-ink-muted">{row.notes}</p>
                        ) : null}
                      </div>
                      <span className="shrink-0 font-stitch text-xs text-ink-subtle">
                        {counts?.total ?? 0} st
                      </span>
                    </div>

                    {showVisual ? (
                      <div className="shrink-0 lg:w-[45%]">
                        <StitchDiagram
                          input={{ label: row.label, steps: row.steps, previousTotal: previous }}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ))}
    </div>
  );
}

// --- pieces ----------------------------------------------------------------

function SummaryItem({
  label,
  value,
  hint,
  muted,
}: {
  label: string;
  value: string;
  hint?: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-xs text-ink-subtle">{label}</dt>
      <dd className={cn("font-stitch text-sm font-medium", muted ? "text-ink-subtle" : "text-ink")}>
        {value}
      </dd>
      {hint ? <span className="text-[11px] text-ink-subtle">{hint}</span> : null}
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state.status === "saved") {
    return (
      <span className="hidden items-center gap-1.5 text-xs text-success sm:inline-flex">
        <Check className="size-3.5" aria-hidden="true" />
        Saved · {state.rows} rounds
      </span>
    );
  }
  if (state.status === "error") {
    return (
      <span role="alert" className="hidden max-w-xs text-xs text-danger sm:inline">
        {state.message}
      </span>
    );
  }
  return null;
}

/** Loops produced by a step — mirrors the engine, used only for the first row. */
function producedOf(step: PatternStep): number {
  const CATALOG: Record<string, number> = {
    CH: 1, TCH: 0, SLST: 0, MR: 1, SC: 1, HDC: 1, DC: 1, TR: 1, INC: 2, DEC: 1,
    BLO: 1, FLO: 1, SK: 0, BOB: 1, PUF: 1, SH: 5, CL: 4,
  };
  if (step.type === "STITCH") return step.count * (CATALOG[step.stitch] ?? 1);
  return step.count * step.steps.reduce((sum, child) => sum + child.count * (CATALOG[child.stitch] ?? 1), 0);
}

/** DB step rows -> engine steps, narrowing stitch codes safely. */
function toStep(step: {
  type: string;
  stitchCode: string | null;
  count: number;
  groupJson: string | null;
  note: string;
}): PatternStep {
  if (step.type === "GROUP") {
    let children: StitchStep[] = [];
    try {
      const parsed: unknown = step.groupJson ? JSON.parse(step.groupJson) : [];
      if (Array.isArray(parsed)) {
        children = parsed.flatMap((entry): StitchStep[] => {
          if (typeof entry !== "object" || entry === null) return [];
          const record = entry as { stitch?: unknown; count?: unknown };
          if (typeof record.stitch !== "string" || !isStitchCode(record.stitch)) return [];
          if (typeof record.count !== "number") return [];
          return [{ type: "STITCH", stitch: record.stitch, count: record.count }];
        });
      }
    } catch {
      children = [];
    }
    return { type: "GROUP", count: step.count, steps: children };
  }

  const code = step.stitchCode && isStitchCode(step.stitchCode) ? step.stitchCode : "SC";
  return { type: "STITCH", stitch: code, count: step.count };
}

export { Label, AddStepButton };