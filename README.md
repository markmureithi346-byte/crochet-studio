# Crochet Studio

> Design it. Visualize it. Crochet it.

A design studio for crocheters: write patterns as structured data, preview them in
3D, then work them round by round without losing your place.

---

## Status

Everything below is **implemented and verified**, not mocked. The commands in
[Verification](#verification) were all run against this code.

| Area | What works |
|---|---|
| **Accounts** | Email/password auth (bcrypt cost 12), JWT sessions, per-user data isolation proven by test |
| **Pattern Studio** | Structured row editor (stitches + repeat groups), live stitch maths, arithmetic validation, version snapshots |
| **Written ↔ visual** | Every round can be read as notation or drawn as a stitch diagram — circular rounds become rings, increases are drawn as two stitches coming out of one |
| **Crochet engine** | Stitch catalogue with `consumes`/`produces` per stitch, `resultingCount`, validation, gauge maths, yarn estimation, pattern generator |
| **Pattern generator** | 6 constructions (panel, bag with circular base, cylinder, ring, cone, sphere) with stated assumptions |
| **3D Designer** | 7 parametric shapes, live resize, colour, camera presets, lazy-loaded Three.js, saved per pattern |
| **Project tracker** | Projects from a pattern or scratch, round-by-round completion, undo, status, timer |
| **Crochet Mode** | One round at a time, huge type, thumb-reachable button, one-tap undo, own dark toggle, completion celebration |
| **Notes & photos** | Timestamped notes, photo upload to an authorised route with type/size validation |
| **Yarn inventory** | Stash with weight, metres, quantity, totals |
| **Analytics** | Time, stitches, streaks and per-project progress — derived live, no invented metrics |
| **AI assistant** | Patch schema + validation + tests. **No model connected.** Cannot change anything yet |

### Deliberately not built

- Public sharing / community feed. The schema supports it; the UI says why it isn't switched on.
- Real AI. The contract and guard rails exist and are tested; there is no API key and no model call.
- PDF/photo import. Genuinely unreliable, not attempted.
- Stitch-level 3D simulation. The viewport is an illustrative preview of the finished object and is labelled as such.

---

## Getting started

```bash
npm install
cp .env.example .env.local     # then generate AUTH_SECRET
npx prisma migrate dev
npm run db:seed
npm run dev                    # http://localhost:3000
```

Generate a real auth secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Demo accounts

| Email | Password | Shows |
|---|---|---|
| `demo@crochet.studio` | `demo1234` | 5 patterns, 5 projects with real progress, yarn stash, notes, timers |
| `maya@crochet.studio` | `demo1234` | Separate private data — proves user isolation |

---

## Verification

Every claim in the table above is backed by a command you can re-run.

```bash
npm run typecheck     # 0 errors
npm run lint          # 0 errors
npm test              # 87 tests
npm run build         # 16 routes
npm run db:verify     # 126 pattern rows, 0 inconsistencies
npm run check:generator   # every generated shape is workable crochet
npm run check:writes      # write-path integrity (13 checks)
npm run check:render      # editor renders with real data
npm run check:visual      # stitch diagrams in a real browser
npm run check:isolation   # multi-user isolation over real HTTP
```

The last three drive a running dev server (`npm run dev`).

### If the buttons do nothing

Check the address bar. Next 16 blocks dev client chunks from hosts that are not
explicitly allowed, and the page renders fine while React never hydrates — which
looks exactly like a broken app rather than a config problem. Use `localhost`
(not `127.0.0.1`, not your LAN IP), or add the host to `allowedDevOrigins` in
`next.config.ts`.

`check:writes` proves the thing that matters most: **editing a pattern you have
already started crocheting cannot destroy your progress.** It attempts to delete
a completed round and confirms the save is refused.

`check:generator` guards a class of bug that shipped and was invisible in unit
tests: a generated circle that shrinks, a base increase that grows by one
stitch instead of six, or bag sides that do not match the count the base ended
on. None of those throw an error — they just produce a pattern nobody can
follow.

### Known data issue

If you generated patterns before the generator was fixed, one of them may have
an impossible base. `npm run db:verify` will point at it by name. Delete and
regenerate it.

---

## Architecture

```
                  CROCHET STUDIO
                        │
       ┌────────────────┼────────────────┐
       │                │                │
   PATTERN          3D DESIGNER     PROJECT TRACKER
    ENGINE                │                │
       │                  │                │
       └──────────────────┼────────────────┘
                          │
                      DATABASE
                          │
                    AI ASSISTANT (contract only)
```

One idea drives it: **a design's numbers are the single source of truth**, and
the pattern engine, the 3D preview and the yarn estimate are all derived from
them. Change a dimension once, every view follows.

### The stitch model — the idea worth learning

Every stitch declares two integers:

```
consumes  — loops taken from the round below
produces  — loops left in the row above
```

From those alone the entire app derives every count:

```
rowTotal  = Σ(produces × count)
netChange = Σ((produces − consumes) × count)
resulting = previous − consumed + produced
```

That is why this app can check a pattern's arithmetic without guessing. It is
integer maths on a model that is true by construction.

**The subtlety that catches everyone:** `produced` is *not* the stitch count. A
round of `6 × (5 SC + 1 DEC)` produces 36 loops but consumes 42, so it leaves
**30** stitches — not 36. `resultingCount()` exists for exactly this reason, and
there is a test pinning it down.

### Folder layout

```
src/
├── app/
│   ├── (marketing)/       landing page — public
│   ├── (auth)/            login, signup, auth Server Actions
│   ├── (app)/             signed-in shell: dashboard, patterns, projects,
│   │                      crochet, designer, library, yarn, analytics, settings
│   ├── files/[...path]/   authorised photo serving
│   └── globals.css        ALL design tokens
├── components/            ui/ · marketing/ · app/ · auth/ · pattern/ ·
│                          project/ · designer/ · three/ · yarn/
├── lib/
│   ├── crochet/stitches.ts   ← stitch catalogue (source of truth)
│   ├── engine/               stitch-math · validate · dimensions · yarn ·
│   │                         generate · rows   (all pure, all tested)
│   ├── design/shapes.ts      parametric shape registry (no THREE import)
│   ├── ai/patch-schema.ts    assistant contract + guard rails
│   ├── data/                 repositories — every one takes a userId
│   ├── validation/           Zod schemas shared with the client
│   ├── db.ts · env.ts · storage.ts · utils.ts
├── proxy.ts               optimistic auth redirect (UX, not security)
└── tests/                 engine + AI contract unit tests
prisma/schema.prisma      15 models, provider-portable
scripts/                  verification scripts (see above)
```

### Decisions worth understanding

**Rows are data, not text.** A round is `steps[]` of `{ stitch, count }`. No
parser to break on `"6sc"`, no ambiguity.

**Provider-portable schema.** SQLite has no enums, `Json` or `Decimal`, so those
are validated strings and integers. Moving to PostgreSQL is 2 lines:

```bash
# prisma/schema.prisma:  provider = "postgresql"
# .env:                  postgresql://user:pass@localhost:5432/crochet_studio
npx prisma migrate dev
```

**`proxy.ts` is UX; `requireUser()` is security.** Server Actions POST to the
page they render on, so a matcher change can silently remove proxy coverage.
Every action re-checks, and `check:isolation` proves it.

**Validation runs in the browser for feedback and on the server for truth.** The
browser never decides what gets saved.

**3D performance.** `frameloop="demand"` (idle costs ~0% CPU), DPR clamped to
1.75, code-drawn texture (no download), lazy-loaded so text patterns never fetch
Three.js.

**Denormalised totals are deliberate.** `Pattern.totalStitches` is stored *and*
recomputed on every save: the tracker needs fast aggregates, correctness still
comes from the engine.

---

## Honest limitations

- **3D is illustrative.** Correct silhouette, proportions and colour. Not a
  simulation of stitches or yarn strands.
- **Gauge is an estimate** until you measure a swatch. Every dimension inherits
  that uncertainty and the UI says so.
- **Yarn estimates are ranges** (±20–25%), never single numbers, always labelled.
- **Validation covers arithmetic only.** It cannot know if your shaping looks
  right or your tension is even. It will not pretend to.
- **The generator handles standard constructions only.** Shaped garments and
  motifs are out of scope, and it says so rather than inventing a pattern.
- **SQLite for development** because local Postgres could not spawn backends in
  the build environment. Your install is fine in a normal terminal.
