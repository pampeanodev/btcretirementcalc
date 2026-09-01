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
and the manual SCSS overrides. The redesign removes the first of them outright —
see *Styling* — and folds the second into tokens.

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
| Component library | antd removed; shadcn/ui on Base UI, generated into the repo |

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

### Styling: Tailwind v4 + shadcn/ui, and antd is removed

antd is replaced by shadcn/ui. An earlier draft of this section kept antd and put
Tailwind alongside it; a spike proved that arrangement unworkable and the
measurements below replaced it.

**Why the switch.** Three findings, each measured on this repository rather than
assumed:

- *Utilities were silently inert on antd components.* Adding `bg-black` to a live
  `.ant-btn` left its computed background unchanged. antd 6 injects its runtime
  CSS unlayered, and unlayered CSS beats every layered rule regardless of
  specificity, so a `className` on an antd widget did nothing — with no error
  anywhere. `<StyleProvider layer>` fixes it, but the whole redesign would then
  rest on a cascade arrangement that fails silently the moment it regresses.
- *The antd surface is eight import lines across eight files, in 1153 lines of
  TSX,* and none of it uses the features that make antd hard to leave. The Table
  runs `pagination={false}`, `bordered`, `scroll={{ y: 250 }}` — no sorting, no
  filters, no virtualization. `InputNumber` uses `min`/`max`/`step`/`addonAfter`.
- *antd is 665 KB of a 1290 KB bundle (51.9%); the application it dresses is
  27 KB (2.1%).* Roughly 109 KB of that is `rc-tree`, `rc-select`, `rc-menu` and
  `rc-form`, which this app never imports — antd's `Table` pulls them in
  statically for the features it has disabled, so tree-shaking cannot remove
  them. The equivalent shadcn stack measures 142 KB.

The redesign rewrites this JSX regardless, so the marginal cost of the swap is
near zero now and large at any later point.

**What shadcn is here.** shadcn 4 generates components into `src/components/ui/`
built on `@base-ui/react` — Base UI, not Radix. Base UI 1.7.0 declares
`react: ^17 || ^18 || ^19`. The components are source in this repository, not a
dependency: they are edited directly when the design needs something the default
does not do.

Components generated: `button`, `input`, `label`, `popover`, `separator`,
`slider`, `switch`, `table`, `tabs`, `tooltip`. `QRCode` has no shadcn
equivalent and moves to `qrcode.react`.

`Table` is modified from its generated form to accept `containerClassName`. A
sticky header resolves against its nearest scrollport, and shadcn's wrapper div
is always one — `overflow-x: auto` forces `overflow-y` to compute to `auto` too —
so the height cap has to land on that div. Capping an outer wrapper does nothing.

**Preflight is imported.** This reverses the earlier draft, which skipped it
solely to stop it fighting antd's base styles. shadcn is built on it. The
consequence is that every surviving `.scss` file now styles against a reset that
did not apply when it was written, so the old UI degrades until each component is
migrated. That is expected interim breakage, not a defect.

**Token ownership is explicit.** shadcn emits an `@theme inline` block after this
app's `@theme`, so it wins any name they share. It owns `--color-background`,
`--color-foreground`, `--color-primary`, `--color-secondary`, `--color-muted`,
`--color-accent`, `--color-destructive`, `--color-border`, `--color-input`,
`--color-ring`, `--color-card`, `--color-popover`, `--color-chart-*`,
`--color-sidebar-*` and `--radius-*`.

This app therefore owns only names shadcn does not use:

```
src/styles/theme.css
  @theme {
    --color-bitcoin: #F6931A;        /* NOT --color-accent: shadcn owns that name */
    --color-bitcoin-soft: #F6931A1F;
    --color-surface, --color-surface-sunken
    --color-ink, --color-ink-muted
    --color-gain, --color-loss
    --font-sans, --font-mono
  }
```

Reusing a shadcn-owned name is a silent failure: the value is simply ignored and
the component renders in shadcn's neutral palette without erroring. Any new token
is checked against the list above.

**Typography.** `--font-sans` is Geist Variable, self-hosted through
`@fontsource-variable/geist`, so no external font request is made. `--font-mono`
stays the system stack (`ui-monospace`, `SF Mono`, `JetBrains Mono`, `Menlo`) and
costs zero bytes; a second webfont is weight this section just spent effort
removing. Sans carries headings and prose, mono carries figures, prices and table
cells, as decided above.

`html * { font-family: monospace !important }` is deleted. Mono becomes a
deliberate `font-mono` where it belongs.

Bootstrap 3's alert palette (`#3c763d`, `#31708f`, `#a94442`) goes. Bitcoin
orange `#F6931A` stays as the single accent.

**Dark mode is one switch.** shadcn generates its dark tokens under `.dark`;
that block is retargeted to `:root[data-theme="dark"]`, the same attribute the
`@custom-variant dark` and `useLocalStorage` already drive. Two token systems,
one trigger.

Division of labour: Tailwind owns layout, spacing, typography and responsive
behaviour. shadcn owns widget behaviour and accessibility. Component SCSS files
are deleted as their rules move to utilities; `theme.css` is all that remains.

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

Touch: `ScrubField`'s track needs a hit area of at least 44px on touch pointers.
shadcn's generated `Slider` gives its thumb a `after:absolute after:-inset-2`
pseudo-element, which is about 28px — not enough. The track is enlarged with a
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
unit at a time, which disposes of the *cross-unit* half of the scale problem.

**Dollar axes are logarithmic; bitcoin axes stay linear.** Plotting one unit at
a time does nothing about the second half of the problem — that fifty years of
compounding bury the accumulation phase. Measured against the real calculators
on the optimized strategy, the fiat series spans 102,686 to 7,143,130: the start
sits at 1.44% of the maximum and the retirement year at 10.23%, so twelve years
of accumulation occupy the bottom tenth of a linear axis. That is the exact
complaint this redesign exists to answer, and discounting to today's dollars
does not touch it — inflation is removed, the growth rate is not.

The bitcoin series has no such problem (0.076 to 1.845, starting at 61% of its
maximum) and stays linear.

Two consequences follow, and both are requirements rather than details:

- **A logarithmic axis cannot plot zero or a negative.** The "sold each year"
  and "withdrawn" series are structurally zero for the whole accumulation phase,
  and a drained conservative pot can reach zero at the end of life. Those points
  become `null`, not `0`. This is more honest as well as necessary: before
  retirement there is no withdrawal, and a zero draws a line along the axis
  asserting that the withdrawal *was* zero.
- **A log axis must say so.** Distances on it are not proportional to
  differences, and a reader who misses that misreads the chart badly. The axis
  is labelled, and it carries the "Today's dollars" title required below.

### Every dollar axis says whose dollars they are

The tooltip discloses the nominal figure beside the converted one, but a tooltip
is hover-only. Axis ticks are converted figures shown with no counterpart, so a
dollar axis carries the title `Today's dollars`. Without it a reader taking in
the chart statically has no way to know the figures are inflation-adjusted,
while the same reader looking at a `StatTile` gets the nominal inline.

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

**Responsive is checked by hand, in a browser, as we go.** jsdom has no layout
engine, so a passing component test says nothing about whether the cards actually
sit side by side. No automated assertion is written for it — claiming coverage
there would repeat the mistake that shipped #51.

Instead every phase that touches layout ends with a browser pass at the
breakpoints in the table above, and what it finds gets fixed inside that phase
rather than collected for the end. The table is the reference for what each
region should do; the one hard rule carried across all of them is that the body
never scrolls horizontally.

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

**~~Tailwind and antd have to coexist.~~** Resolved by removing antd. The spike
this risk called for was run and reported that they could *not* be reconciled
safely: utilities on antd components were inert, and the fix left the redesign
resting on a cascade arrangement that fails silently. See *Styling* above.

**The component library is now source in this repository.** shadcn components are
copied in, not installed, so upstream fixes do not arrive automatically and local
edits — `Table`'s `containerClassName`, the retargeted dark block — must be
re-applied by hand if a component is ever regenerated. This is the trade the
model makes deliberately; the mitigation is that each local edit carries a
comment saying why it exists, so a regeneration diff shows what was lost.

**Removing antd is a wide change with a narrow test net.** Eleven widgets across
eight files go at once, and jsdom cannot tell whether the replacements *look*
right. `build-smoke.spec.ts` proves the bundle still boots; everything visual is
checked by hand in a browser, per the Testing section. The migration is therefore
sequenced so the app compiles and renders at every step rather than being broken
across several.

**A new build plugin, one week after a build plugin took production down.**
`@tailwindcss/vite` declares Vite 8 support and that was checked rather than
assumed, but `build-smoke.spec.ts` is what actually proves the bundle boots.
It runs on every suite, so the guard is already in place.
