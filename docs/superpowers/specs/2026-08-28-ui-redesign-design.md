# UI redesign and projection charts

Date: 2026-08-28
Status: approved for planning

## Problem

Three things are wrong with the current interface.

**The chart cannot show what it is asked to show.** Savings run to seven figures
while the stack is a fraction of a coin. On a shared linear axis one of the two
always flattens onto zero. The optimized strategy is worse still: its fiat value
compounds for fifty years, so the accumulation phase is invisible next to the
exponential tail.

**The numbers are nominal.** "$1,327,495 in 2079" is arithmetically correct and
tells a person nothing. Nothing on screen discloses that the figure is a future
amount rather than money as they understand it today.

**There is no hierarchy.** Seven inputs sit in a flat list. Six info boxes carry
identical visual weight, so the current bitcoin price competes with the answer
the user came for. Two sliders duplicate number inputs that already exist above
them. Colour is hardcoded in eight places across six SCSS files, dark mode is
hand-duplicated in `[data-theme='dark']` blocks per file, and
`html * { font-family: monospace !important }` overrides everything.

Underneath, two theming systems disagree: antd 6's `ConfigProvider` algorithm
and the manual SCSS overrides.

## Scope

A re-layout: new visual language, reorganised hierarchy, reworked charts, mobile
behaviour. Not a product rethink — no onboarding, no presets, no new inputs.

## Decisions

| Question | Decision |
|---|---|
| Depth | Re-layout: skin plus hierarchy plus mobile |
| Typography | Mono kept deliberately — figures, prices and tables. Sans for headings and prose |
| Currency | Today's dollars, with the nominal amount disclosed alongside |
| Optimized chart | Draining ₿ tank plus annual sales, with a ₿ / $ toggle |
| Conservative chart | Its own form: a cash tank that fills at liquidation and drains |
| Budget series | Not plotted — see below |
| Layout | Both strategies side by side; the strategy switch disappears |

### Why the budget is not a chart series

In today's dollars the annual budget is a flat line at exactly the figure the
user typed. Discounting by the same rate used to index it returns the input —
the line is tautological and teaches nothing.

What does inform is the pair: `$100,000 today = $1,327,495 in 2079`. That
belongs in the tooltip and the table, not as a horizontal rule across the plot.

### Why today's dollars, disclosed

Every monetary figure on screen is divided by `(1 + inflation) ^ (age - currentAge)`.
The budget then reads as the number the user asked for, and savings become
comparable to money they can imagine.

This must never be silent. Wherever a converted figure appears, the nominal
amount and the conversion are available — tooltip on the charts and stat tiles,
a dedicated column in the table. A user who does not understand that the app
discounted the number has been misled, not helped.

## Architecture

### The calculators do not change

`bitcoinRetirementCalculator.ts` and `bitcoinRetirementOptimizedCalculator.ts`
keep producing nominal values, and their 28 tests keep passing untouched. Present
value is a presentation concern and lives in a new module.

```
src/services/presentValue.ts
  toPresentValue(nominal, yearsFromNow, inflationRate) -> number
  toProjectionView(result: CalculationResult, input: InputData) -> ProjectionView
```

`ProjectionView` carries both faces of every figure:

```ts
interface ProjectionPoint {
  year: number;
  age: number;
  bitcoinPrice: number;        // nominal
  savingsBitcoin: number;
  savingsFiat: number;         // nominal
  savingsFiatReal: number;     // today's dollars
  bitcoinFlow: number;
  annualBudget: number;        // nominal
  annualBudgetReal: number;    // today's dollars
}
```

Keeping the transform outside the calculators means a bug in the discounting
cannot corrupt the retirement-age search, and the existing test suite stays a
valid regression net for the money maths.

### Both strategies are always computed

`Calculator.tsx` currently branches on `data.optimized` and computes one
strategy. It will compute both on every input change and hand each to its own
card. `InputData.optimized` stops selecting *what is calculated* and starts
selecting *which strategy's detail is expanded* — the `optimized` query
parameter keeps working, so shared links survive.

### Component structure

```
Calculator
  InputBar              compressed inputs, grouped
  StrategyComparison
    StrategyCard  x2    headline figure, supporting stats, mini chart
  StrategyDetail        table and full chart for the selected strategy
    ProjectionChart     variant: "cash" | "stack"
    TableTab
```

New components:

- **`StatTile`** replaces `InfoBox`. One label, one figure, an optional nominal
  footnote, and a size variant so the hero figure can outrank the rest.
- **`StrategyCard`** owns one strategy's summary and mini chart. Selecting it
  drives `StrategyDetail`.
- **`ProjectionChart`** takes a `ProjectionView`, a variant, and a `unit`.
  - `stack` (optimized): ₿ held as a filled area draining from retirement, and
    ₿ sold each year as a second area below it. Switching `unit` to fiat swaps
    the series for value in today's dollars, where the same tank *rises* instead
    of draining.
  - The ₿ / $ control lives only on the detail chart. Cards render minis at a
    fixed unit — ₿ for optimized, fiat for conservative — because two toggles on
    one screen invites comparing two strategies in different units without
    noticing.
  - `cash` (conservative): fiat cash as the filled area — near zero, stepping up
    at liquidation, then draining — with ₿ held as a thin line that ends at the
    cut.
- **`InputGroup`** wraps labelled sets: *About you*, *Your bitcoin*,
  *Assumptions*, *Goal*.
- **`ScrubField`** is the merged number-input-plus-track control described under
  *Sliders* below. `InputGroup` composes `ScrubField` and plain number inputs
  interchangeably.

`Summary` and `OptimizedSummary` are deleted; they differ only in `toUsd` vs
`toBtc` and both are superseded by `StrategyCard`.

### Styling: Tailwind v4 alongside antd

Tailwind v4 via `@tailwindcss/vite`, verified against this toolchain: the plugin
declares `vite: ^5.2.0 || ^6 || ^7 || ^8` and we are on Vite 8.

Tailwind v4 is CSS-first — its `@theme` block *is* a set of CSS custom
properties, and utilities are generated from them. That collapses two things the
original draft kept apart: the token system and the utility system become one
file.

```
src/styles/theme.css
  @theme {
    --color-accent: #F6931A;
    --color-surface: …;
    --font-mono: …;
    --spacing-*, --radius-*, --text-*
  }
```

The same custom properties are read back in TypeScript and passed to antd's
`ConfigProvider` `theme.token`. One source of truth; the two theming systems stop
disagreeing.

**Preflight is not imported.** Tailwind's base reset fights antd's own base
styles, so we import `tailwindcss/theme` and `tailwindcss/utilities` and skip
`tailwindcss/preflight`. The few resets we actually want are declared explicitly.

Division of labour: Tailwind owns layout, spacing, typography and responsive
behaviour. antd keeps the complex widgets — `Table`, `Slider`, `InputNumber`,
`Popover`, `QRCode`, `Switch`, `Tabs`, `Spin` — themed through `ConfigProvider`.
Component SCSS files are deleted as their rules move to utilities; `theme.css`
and any genuinely component-scoped styles are all that remain.

`html * { font-family: monospace !important }` is deleted. Mono becomes a
deliberate `font-mono` on figures, prices and table cells.

Bootstrap 3's alert palette (`#3c763d`, `#31708f`, `#a94442`) goes. Bitcoin
orange `#F6931A` stays as the single accent.

### Responsive

The app has two media queries today, at 800px and 700px, which do not agree with
each other. There is no breakpoint scale. The comparison layout makes this
load-bearing rather than cosmetic: two cards side by side must collapse.

Tailwind's default breakpoints are adopted as-is rather than invented. Behaviour
per region:

| Region | Small | Medium | Large |
|---|---|---|---|
| Input bar | one column | two columns | single row above the results |
| Strategy cards | stacked, selected one first | side by side | side by side |
| Detail chart | full width, shorter aspect | full width | full width |
| Table | horizontal scroll inside its own container | scroll | full |

The page body never scrolls horizontally. The table is the only element allowed
to, and it does so inside its own overflow container.

Touch: `ScrubField`'s track needs a hit area of at least 44px on touch pointers,
which antd's `Slider` does not give by default — it is enlarged with a
transparent padded wrapper rather than by growing the visible track.

Dark mode continues to key off `[data-theme]` on the root, which `useLocalStorage`
already drives, so Tailwind's `dark:` variant is configured to that attribute
rather than to `prefers-color-scheme`. The OS preference still seeds the initial
value, exactly as today.

### Charts

`react-chartjs-2` and `chart.js` are already in the tree and handle filled
areas, dual axes and custom tooltips. No new charting dependency.

The dual-axis configuration added while fixing #53 stays available for the
`cash` variant, which genuinely plots two units. The `stack` variant plots one
unit at a time, so its scale problem disappears rather than being managed.

## Sliders: merged, not removed

`annualBuy` and `growthRate` each have a slider *and* a number input today. They
are not redundant — they are different affordances. Typing sets a value; dragging
teaches sensitivity, which is most of why someone opens a retirement calculator.

The comparison layout strengthens the case rather than weakening it: dragging one
slider moves *both* strategy cards, so the user watches the gap between retiring
at 57 and at 43 open and close in real time. That is the product's central
question answered by a gesture.

The actual defect is placement. The inputs live in `.input-panel__inputs` and the
sliders in `.input-panel__sliders`, a separate block further down, so two
controls for one value read as two unrelated controls.

They merge into a single `ScrubField`: label and numeric input on one row, track
directly beneath, in one bordered group. One control, two ways to drive it,
roughly the height the number input occupies today.

`ScrubField` is used for the parameters where sensitivity is worth feeling —
`annualBuy`, `growthRate`, `inflationRate` and `desiredRetirementIncome`.
`currentAge` and `lifeExpectancy` keep plain number inputs; their plausible range
is narrow and dragging buys nothing.

## Testing

The 28 existing tests stay. The calculator specs are untouched by construction.
`build-smoke.spec.ts` is untouched. `App.spec.tsx` needs its queries updated for
the new structure — the assertions themselves (mounts, theme persists, calculator
renders a result) still hold.

New coverage:

- `presentValue.spec.ts` — discounting is exact and round-trips: indexing a
  budget forward and discounting it back returns the input.
- `ProjectionChart` — the mapped series match the projection, the ₿ / $ toggle
  swaps units, and the conservative variant's cash series is monotonically
  decreasing after liquidation.
- `StrategyComparison` — both strategies render, and the optimized retirement
  age is never later than the conservative one.
- Disclosure — every converted figure exposes its nominal counterpart. This is
  the one that protects the user from a silent transformation, so it is asserted
  and not left to review.

Accessibility, currently absent: both `Switch` components lack an accessible
name, which is why the existing theme test scopes its query by class. The new
components carry proper labels and roles, and the tests query by role.

**Responsive is not testable in jsdom.** It has no layout engine, so a passing
component test says nothing about whether the cards actually sit side by side.
Verification is a browser pass over the production build at the breakpoints in
the table above, checking each region's stated behaviour and that the body never
scrolls horizontally. This is a checklist in the plan, not an automated
assertion — claiming otherwise would repeat the mistake that shipped #51.

## Risks

**The comparison layout changes the information architecture.** It is the
outer edge of "re-layout". If it proves too dense on small screens the cards
stack and the detail collapses under the selected one — that is the mobile
behaviour anyway, so the fallback is a narrowing, not a redesign.

**Discounting is a modelling opinion.** Presenting today's dollars as the primary
figure asserts that the user's inflation input describes their personal cost of
living. The disclosure requirement above exists because of this.

**Chart work is where the effort concentrates.** Two variants plus a unit toggle
plus tooltips is most of the build. If the schedule slips, the `cash` variant can
ship as the dual-axis chart that exists today, and only the `stack` variant is
new.

**Tailwind and antd have to coexist.** Skipping preflight is the known
mitigation, but antd 6 renders through CSS-in-JS with generated class names, so
a utility and a component style can still collide in ways that only show at
runtime. The first task in the plan is a spike that puts Tailwind in front of the
existing UI and confirms antd's `Table`, `Slider` and `Popover` still render
correctly — before any redesign work depends on it. If they cannot be reconciled,
the fallback is the SCSS-plus-tokens approach this section replaced, and only the
styling mechanism changes; every design decision above survives.

**A new build plugin, one week after a build plugin took production down.**
`@tailwindcss/vite` declares Vite 8 support and that was checked rather than
assumed, but `build-smoke.spec.ts` is what actually proves the bundle boots.
It runs on every suite, so the guard is already in place.
