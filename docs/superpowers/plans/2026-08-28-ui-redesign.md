# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the calculator's interface around a side-by-side comparison of the two retirement strategies, in today's dollars, with a chart per strategy that can actually show its own data.

**Architecture:** Tailwind v4 supplies tokens, layout and responsive behaviour; shadcn/ui supplies the widgets as source in this repository. antd is removed — a spike measured its utilities as silently inert and its share of the bundle at 51.9%, against 2.1% for the application. The two calculators are not touched — present value is a separate transform applied at the presentation boundary, so the 28 existing tests stay a valid regression net for the money maths. New components are built alongside the old ones and switched over late, so the app boots at every commit.

**Tech Stack:** React 19, TypeScript 5.9, Vite 8 (Rolldown), Tailwind v4, shadcn/ui on `@base-ui/react`, chart.js + react-chartjs-2, vitest + jsdom + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-28-ui-redesign-design.md`

## Global Constraints

- TypeScript stays on `^5.9.3`. Do not bump it — `typescript-eslint` hard-throws on TS 7. See the README.
- `vite.config.ts` keeps `legacy.inconsistentCjsInterop: true`. Removing it breaks `use-local-storage` and takes the app down.
- The two calculator services are **not modified** by any task in this plan: `src/services/bitcoinRetirementCalculator.ts`, `src/services/bitcoinRetirementOptimizedCalculator.ts`.
- Every task ends green on: `npx tsc --noEmit`, `pnpm lint`, `pnpm test:run`. `test/build-smoke.spec.ts` must pass — it executes the real production bundle and is the only guard against bundler-level breakage.
- No component declares a literal colour. Colours come from tokens.
- `src/components/ui/` is shadcn's generated output and belongs to shadcn. Application components never go there — they go in `src/components/common/`. Editing a generated file is allowed and expected, but every edit carries a comment saying why, so a future regeneration diff shows what would be lost.
- Never define a token shadcn already owns: `--color-background`, `--color-foreground`, `--color-primary`, `--color-secondary`, `--color-muted`, `--color-accent`, `--color-destructive`, `--color-border`, `--color-input`, `--color-ring`, `--color-card`, `--color-popover`, `--color-chart-*`, `--color-sidebar-*`, `--radius-*`. Its `@theme inline` block is emitted after ours and wins the name silently. The bitcoin accent is `--color-bitcoin`.
- No `import ... from "antd"` in any file this plan leaves behind.
- Every converted (today's-dollars) figure on screen must expose its nominal counterpart. This is asserted, not reviewed.
- The page body never scrolls horizontally. Only the table may, inside its own container.
- Prettier config is authoritative: double quotes, semicolons, 2-space indent, print width 100, trailing commas. `shadcn add` writes in its own style and leaves the files it generates failing `prettier --check` — run `node_modules/.bin/prettier --write` over anything it created before committing.
- Commit after every task. Branch: `feat/ui-redesign` off `main`.

---

## File Structure

**Create:**

| File | Responsibility |
|---|---|
| `src/styles/theme.css` | Tailwind entry, `@theme` tokens, dark variant — **done, Task 1** |
| `src/components/ui/*` | shadcn's generated primitives — **done, Task 1**. Not hand-authored |
| `src/lib/utils.ts` | `cn()` — **done, Task 1** |
| `src/models/ProjectionView.ts` | `ProjectionPoint`, `ProjectionView` types |
| `src/services/presentValue.ts` | Discounting and the nominal→view transform |
| `src/components/common/StatTile.tsx` | Label, figure, optional nominal footnote |
| `src/components/common/ScrubField.tsx` | Number input merged with its slider |
| `src/components/Input/InputBar.tsx` | Grouped inputs, replaces `InputPanel` |
| `src/components/Results/ProjectionChart.tsx` | `cash` and `stack` variants |
| `src/components/Results/StrategyCard.tsx` | One strategy's headline + mini chart |
| `src/components/Results/StrategyComparison.tsx` | The two cards, selection state |
| `src/components/Results/StrategyDetail.tsx` | Full chart + table for the selection |

**Modify:** `vite.config.ts`, `src/main.tsx`, `src/App.tsx`, `src/components/Calculator.tsx`, `src/components/Results/tabs/TableTab.tsx`, `src/components/Misc/Donate.tsx`, `src/components/Misc/OnChain.tsx`, `src/components/Results/tabs/AnnualBudgetExplanation.tsx`, `test/App.spec.tsx`, `test/Donate.spec.tsx`.

**Delete (Task 12, once nothing imports them):** `src/components/Results/tabs/Summary.tsx`, `OptimizedSummary.tsx`, `Result.tsx`, `src/components/Results/InfoBox.tsx`, `src/components/Input/InputPanel.tsx`, and all seven `.scss` files.

**Remove from `package.json` (Task 12):** `antd`, `@ant-design/icons`, `sass`. Nothing may import from `antd` after that task.

---

### Task 1: shadcn/ui foundation — COMPLETE

Commits: `41813a5`, `15dee05`, `1a53f42`, `ff404d1`.

This task was planned as "Tailwind v4 alongside antd (spike + gate)". The spike ran and reported that they could not be reconciled safely, so the task became the antd → shadcn swap's foundation. What follows is the record, not work to redo.

**What the spike measured, in a browser, against a production build:**

- `bg-black` on a live `.ant-btn` left its computed background unchanged. 904 unlayered antd rules against 3 layered ones; unlayered CSS beats every layered rule regardless of specificity. Every Tailwind class on an antd component was inert, and failed silently.
- `<StyleProvider layer>` from `@ant-design/cssinjs` fixes it. It was implemented, then discarded with antd — the whole redesign would otherwise rest on a cascade arrangement whose failure mode is "nothing happens, no error".
- After the swap: `bg-bitcoin` on a Button computes to `rgb(246, 147, 26)`. The utility wins.
- Table under the constraint the app needs: 53 rows, `maxHeight 250px`, `clientHeight 248`, `scrollHeight 2001`, header `position: sticky; top: 0`, verified still pinned scrolled to age 56.
- Dark mode, popover anchoring, tab switching and the 420px layout all correct. Console clean on full reload.
- Bundle with both libraries present, by sourcemap attribution: antd 665 KB, whole shadcn stack 142 KB.

**Delivered:**

- Tailwind v4 via `@tailwindcss/vite`, preflight **imported** (shadcn requires it; the original "omit preflight" decision existed only to protect antd).
- `@/*` path alias in `tsconfig.json` and `vite.config.ts`.
- `components.json`, `src/lib/utils.ts`, and generated `src/components/ui/`: `button`, `input`, `label`, `popover`, `separator`, `slider`, `switch`, `table`, `tabs`, `tooltip`.
- `src/styles/theme.css` — Tailwind entry, `@theme` tokens, `@custom-variant dark` on `[data-theme]`.
- `Table` edited to accept `containerClassName`. A sticky header resolves against its nearest scrollport, and shadcn's wrapper div is always one, so the height cap must land there.
- shadcn's generated `.dark` block retargeted to `:root[data-theme="dark"]`, so one attribute drives both token sets.
- `data-theme` moved from a wrapper `div` to `document.documentElement` — the dark token block never matched before, and `body`'s own background cannot resolve a token declared on a descendant.
- `html * { font-family: monospace !important }` deleted from `App.scss`.
- The bitcoin accent renamed `--color-bitcoin`; shadcn's `@theme inline` owns `--color-accent` and would have won it silently.
- `test/tailwind-antd.spec.tsx` replaced by `test/ui-primitives.spec.tsx`.

**State at completion:** tsc 0, lint 0, 32/32 tests, build green.

**Known interim breakage, expected:** preflight now applies to the six surviving `.scss` files, which were written against no reset. The old UI degrades until each component is migrated. Not a defect; do not "fix" it outside the task that replaces the component.

---

### Task 2: VOID — deleted by the antd removal

Was: "Feed antd from the same tokens" — read the `@theme` custom properties back in TypeScript and hand them to antd's `ConfigProvider` `theme.token`, with a test enforcing that the two palettes agree.

There is no second theming system left to keep in sync. Tokens live in `theme.css` and nothing mirrors them. `src/styles/tokens.ts` is not created.

Numbering is deliberately preserved: later tasks and the ledger reference task numbers, and renumbering would invalidate those references for no gain.

---

### Task 3: Present value, outside the calculators

**Files:**
- Create: `src/models/ProjectionView.ts`
- Create: `src/services/presentValue.ts`
- Create: `test/presentValue.spec.ts`

**Interfaces:**
- Consumes: `CalculationResult` and `InputData` from `src/models/`
- Produces:
  - `toPresentValue(nominal: number, yearsFromNow: number, inflationRate: number): number`
  - `toProjectionView(result: CalculationResult, input: InputData): ProjectionView`
  - types `ProjectionPoint` and `ProjectionView`

- [ ] **Step 1: Write the failing test**

Create `test/presentValue.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { toPresentValue, toProjectionView } from "../src/services/presentValue";
import { calculateOptimal } from "../src/services/bitcoinRetirementOptimizedCalculator";
import { InputData } from "../src/models/InputData";

const INPUT: InputData = {
  currentAge: 30,
  currentSavingsInBitcoin: 1,
  annualBuyInFiat: 12_000,
  annualPriceGrowth: 20,
  lifeExpectancy: 83,
  desiredRetirementAnnualBudget: 100_000,
  optimized: true,
  inflationRate: 5,
};

describe("toPresentValue", () => {
  it("discounts by compounding inflation", () => {
    // 100000 * 1.05^15 = 207892.82, discounted back over the same 15 years
    expect(toPresentValue(207_892.82, 15, 5)).toBeCloseTo(100_000, 2);
  });

  it("is the identity at year zero", () => {
    expect(toPresentValue(4_242, 0, 5)).toBe(4_242);
  });

  it("is the identity when inflation is zero", () => {
    expect(toPresentValue(4_242, 30, 0)).toBe(4_242);
  });
});

describe("toProjectionView", () => {
  it("returns the desired budget unchanged in today's money", () => {
    // Indexing forward then discounting back by the same rate is a round trip,
    // so every year's real budget is the figure the user typed.
    const view = toProjectionView(calculateOptimal(INPUT, 79_350.17), INPUT);

    for (const point of view.points) {
      expect(point.annualBudgetReal).toBeCloseTo(INPUT.desiredRetirementAnnualBudget, 4);
    }
  });

  it("keeps the nominal figures alongside the real ones", () => {
    const view = toProjectionView(calculateOptimal(INPUT, 79_350.17), INPUT);
    const last = view.points[view.points.length - 1];

    expect(last.annualBudget).toBeGreaterThan(last.annualBudgetReal);
    expect(last.savingsFiat).toBeGreaterThan(last.savingsFiatReal);
  });

  it("emits one point per projected year and carries the retirement age", () => {
    const result = calculateOptimal(INPUT, 79_350.17);
    const view = toProjectionView(result, INPUT);

    expect(view.points).toHaveLength(INPUT.lifeExpectancy - INPUT.currentAge);
    expect(view.retirementAge).toBe(result.retirementAge);
    expect(view.canRetire).toBe(true);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node_modules/.bin/vitest run test/presentValue.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the types**

Create `src/models/ProjectionView.ts`:

```ts
export interface ProjectionPoint {
  key: number;
  year: number;
  age: number;
  bitcoinPrice: number;
  savingsBitcoin: number;
  /** Nominal value of the stack that year. */
  savingsFiat: number;
  /** Same figure in the purchasing power of today. */
  savingsFiatReal: number;
  bitcoinFlow: number;
  /** Nominal budget that year, indexed by inflation. */
  annualBudget: number;
  /** Same figure discounted back to today. */
  annualBudgetReal: number;
}

export interface ProjectionView {
  optimized: boolean;
  canRetire: boolean;
  retirementAge: number;
  savingsBitcoin: number;
  savingsFiat: number;
  savingsFiatReal: number;
  annualBudget: number;
  annualBudgetReal: number;
  bitcoinPriceAtRetirementAge: number;
  points: ProjectionPoint[];
}
```

- [ ] **Step 4: Write the implementation**

Create `src/services/presentValue.ts`:

```ts
import { CalculationResult } from "../models/CalculationResult";
import { InputData } from "../models/InputData";
import { ProjectionPoint, ProjectionView } from "../models/ProjectionView";
import { getInflationFactor } from "./calculationUtils";

/**
 * Converts a future amount into the purchasing power of today.
 *
 * The calculators index every figure forward by inflation; this undoes that for
 * display. It lives outside them on purpose — a bug here cannot corrupt the
 * retirement-age search, and their existing tests stay a valid regression net.
 */
export const toPresentValue = (nominal: number, yearsFromNow: number, inflationRate: number) =>
  nominal / Math.pow(getInflationFactor(inflationRate), yearsFromNow);

export const toProjectionView = (
  result: CalculationResult,
  input: InputData,
): ProjectionView => {
  const real = (nominal: number, age: number) =>
    toPresentValue(nominal, age - input.currentAge, input.inflationRate);

  const points: ProjectionPoint[] = result.dataSet.map((d) => ({
    key: d.key,
    year: d.year,
    age: d.age,
    bitcoinPrice: d.bitcoinPrice,
    savingsBitcoin: d.savingsBitcoin,
    savingsFiat: d.savingsFiat,
    savingsFiatReal: real(d.savingsFiat, d.age),
    bitcoinFlow: d.bitcoinFlow,
    annualBudget: d.annualRetirementBudget,
    annualBudgetReal: real(d.annualRetirementBudget, d.age),
  }));

  return {
    optimized: result.optimized,
    canRetire: result.canRetire,
    retirementAge: result.retirementAge,
    savingsBitcoin: result.savingsBitcoin,
    savingsFiat: result.savingsFiat,
    savingsFiatReal: real(result.savingsFiat, result.retirementAge),
    annualBudget: result.annualRetirementBudget,
    annualBudgetReal: real(result.annualRetirementBudget, result.retirementAge),
    bitcoinPriceAtRetirementAge: result.bitcoinPriceAtRetirementAge,
    points,
  };
};
```

- [ ] **Step 5: Run the tests**

Run: `node_modules/.bin/vitest run test/presentValue.spec.ts`
Expected: PASS

- [ ] **Step 6: Confirm the calculators are untouched**

Run: `git diff --stat src/services/bitcoinRetirementCalculator.ts src/services/bitcoinRetirementOptimizedCalculator.ts`
Expected: no output. If either file appears, revert it — the global constraints forbid it.

- [ ] **Step 7: Commit**

```bash
git add src/models/ProjectionView.ts src/services/presentValue.ts test/presentValue.spec.ts
git commit -m "feat: add present-value transform outside the calculators"
```

---

### Task 4: StatTile

**Files:**
- Create: `src/components/common/StatTile.tsx`
- Create: `test/StatTile.spec.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: `StatTile` with props `{ label: string; value: string; nominal?: string; size?: "hero" | "normal" }`

- [ ] **Step 1: Write the failing test**

The `nominal` prop is the disclosure requirement from the spec, so it is asserted here rather than left to review.

Create `test/StatTile.spec.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StatTile from "../src/components/common/StatTile";

describe("StatTile", () => {
  it("renders its label and value", () => {
    render(<StatTile label="Retirement age" value="43" />);

    expect(screen.getByText("Retirement age")).toBeInTheDocument();
    expect(screen.getByText("43")).toBeInTheDocument();
  });

  it("discloses the nominal figure when the value has been converted", () => {
    render(<StatTile label="Annual budget" value="$100,000" nominal="$1,327,495 in 2079" />);

    expect(screen.getByText("$1,327,495 in 2079")).toBeInTheDocument();
  });

  it("renders figures in the monospace face", () => {
    render(<StatTile label="Stack" value="₿1.845" />);

    expect(screen.getByText("₿1.845")).toHaveClass("font-mono");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node_modules/.bin/vitest run test/StatTile.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/components/common/StatTile.tsx`:

```tsx
interface StatTileProps {
  label: string;
  value: string;
  /** Set whenever `value` has been discounted, so the future amount stays visible. */
  nominal?: string;
  size?: "hero" | "normal";
}

const StatTile = ({ label, value, nominal, size = "normal" }: StatTileProps) => (
  <div className="flex flex-col gap-0.5 rounded-lg border border-border p-3">
    <span className="text-xs uppercase tracking-wide text-ink-muted">{label}</span>
    <span
      className={`font-mono font-bold leading-none ${size === "hero" ? "text-4xl" : "text-lg"}`}
    >
      {value}
    </span>
    {nominal && <span className="text-xs text-ink-muted">{nominal}</span>}
  </div>
);

export default StatTile;
```

- [ ] **Step 4: Run the tests**

Run: `node_modules/.bin/vitest run test/StatTile.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/common/StatTile.tsx test/StatTile.spec.tsx
git commit -m "feat: add StatTile with nominal disclosure"
```

---

### Task 5: ScrubField

**Files:**
- Create: `src/components/common/ScrubField.tsx`
- Create: `test/ScrubField.spec.tsx`
- Modify: `src/components/ui/slider.tsx` (forward a label to the thumb)

**Interfaces:**
- Consumes: `Input` and `Slider` from `src/components/ui/`
- Produces: `ScrubField` with props `{ label: string; name: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void }`

Three facts about the generated `Slider` were established by probing it, not assumed. Use them as written:

1. `aria-label` passed to `<Slider>` lands on the **Root**, which is `role="group"`. The native range input inside gets no accessible name at all.
2. `aria-label` passed to `Slider.Thumb` **does** reach that input. This is why Step 1 edits the generated component.
3. In jsdom the thumb carries `visibility: hidden`, because Base UI defers it until it has measured the control and jsdom has no layout engine. Any `getByRole("slider", ...)` therefore needs `{ hidden: true }`. This is a jsdom artifact; a browser exposes the input normally.

Note also that the range input exposes its bounds as native `min`/`max` attributes — **not** `aria-valuemin`/`aria-valuemax`. Assert the attributes that exist.

- [ ] **Step 1: Give the generated Slider a labelled thumb**

Edit `src/components/ui/slider.tsx`. Add `thumbLabel` to the props and pass it to every `Thumb`:

```tsx
function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  thumbLabel,
  ...props
}: SliderPrimitive.Root.Props & { thumbLabel?: string }) {
```

and on the `SliderPrimitive.Thumb` inside the map:

```tsx
<SliderPrimitive.Thumb
  data-slot="slider-thumb"
  key={index}
  // Base UI puts this on the native range input the thumb wraps. Without it
  // the input has no accessible name — `aria-label` on the Root only names
  // the wrapping role="group".
  aria-label={thumbLabel}
  className="..."   // unchanged
/>
```

Leave the rest of the file exactly as generated.

- [ ] **Step 2: Write the failing test**

Create `test/ScrubField.spec.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScrubField from "../src/components/common/ScrubField";

describe("ScrubField", () => {
  it("shows one accessible control for the value", () => {
    render(
      <ScrubField label="Annual buy" name="annualBuy" value={12000} min={0} max={200000} onChange={() => {}} />,
    );

    // jest-dom coerces a number input's value, so this is a number, not "12000".
    expect(screen.getByRole("spinbutton", { name: "Annual buy" })).toHaveValue(12000);
  });

  it("reports typed changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ScrubField label="Growth" name="growthRate" value={20} min={0} max={100} onChange={onChange} />,
    );

    const field = screen.getByRole("spinbutton", { name: "Growth" });
    await user.clear(field);
    await user.type(field, "35");

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[onChange.mock.calls.length - 1][0]).toBe(35);
  });

  it("gives the slider the same accessible name and bounds", () => {
    render(
      <ScrubField label="Growth" name="growthRate" value={20} min={0} max={100} onChange={() => {}} />,
    );

    // `hidden: true`: Base UI keeps the thumb at visibility:hidden until it
    // measures the control, which never happens in jsdom.
    const slider = screen.getByRole("slider", { name: "Growth", hidden: true });

    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "100");
    expect(slider).toHaveAttribute("aria-valuenow", "20");
  });
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `node_modules/.bin/vitest run test/ScrubField.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the implementation**

Create `src/components/common/ScrubField.tsx`:

```tsx
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

interface ScrubFieldProps {
  label: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

/**
 * A number input and its slider as one control.
 *
 * They used to live in separate blocks of the input panel, which read as two
 * unrelated controls for one value. Typing sets a figure; dragging teaches how
 * sensitive the projection is to it — both are wanted, together.
 */
const ScrubField = ({
  label,
  name,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: ScrubFieldProps) => {
  const emit = (next: number) => {
    if (Number.isNaN(next)) {
      return;
    }
    onChange(next);
  };

  return (
    <div className="rounded-lg border border-border px-3 pt-2 pb-1">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={name} className="text-xs text-ink-muted">
          {label}
        </label>
        <div className="flex items-baseline gap-1">
          <Input
            id={name}
            name={name}
            type="number"
            className="w-28 border-0 bg-transparent p-0 text-right font-mono shadow-none focus-visible:ring-0"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => emit(e.target.valueAsNumber)}
          />
          {unit && <span className="text-xs text-ink-muted">{unit}</span>}
        </div>
      </div>
      {/* The visible track is 4px. The negative margin buys a ~44px touch
          target without growing it — the thumb's own `after:-inset-2` is
          about 28px, which is under the guideline. */}
      <div className="-my-2 py-2">
        <Slider
          thumbLabel={label}
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={(next) => emit(Array.isArray(next) ? next[0] : next)}
        />
      </div>
      <div className="flex justify-between font-mono text-[10px] text-ink-muted">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

export default ScrubField;
```

- [ ] **Step 5: Run the tests**

Run: `node_modules/.bin/vitest run test/ScrubField.spec.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/common/ScrubField.tsx src/components/ui/slider.tsx test/ScrubField.spec.tsx
git commit -m "feat: add ScrubField merging a number input with its slider"
```

---

### Task 6: ProjectionChart

**Files:**
- Create: `src/components/Results/ProjectionChart.tsx`
- Create: `test/ProjectionChart.spec.tsx`
- Modify: `src/models/LineChartProps.ts` (delete — superseded)

**Interfaces:**
- Consumes: `ProjectionView` from Task 3
- Produces: `ProjectionChart` with props `{ view: ProjectionView; variant: "cash" | "stack"; unit?: "btc" | "fiat" }`, and `export const buildSeries(view, variant, unit)` returning `{ labels: string[]; datasets: {label: string; data: number[]}[] }`

`buildSeries` is exported separately so the mapping can be asserted without rendering a canvas — chart.js draws to a stubbed 2D context under jsdom and reveals nothing.

- [ ] **Step 1: Write the failing test**

Create `test/ProjectionChart.spec.tsx`:

```tsx
import { describe, expect, it } from "vitest";
import { buildSeries } from "../src/components/Results/ProjectionChart";
import { toProjectionView } from "../src/services/presentValue";
import { calculate } from "../src/services/bitcoinRetirementCalculator";
import { calculateOptimal } from "../src/services/bitcoinRetirementOptimizedCalculator";
import { InputData } from "../src/models/InputData";

const INPUT: InputData = {
  currentAge: 30,
  currentSavingsInBitcoin: 1,
  annualBuyInFiat: 12_000,
  annualPriceGrowth: 20,
  lifeExpectancy: 83,
  desiredRetirementAnnualBudget: 100_000,
  optimized: true,
  inflationRate: 5,
};
const PRICE = 79_350.17;

const optimizedView = () => toProjectionView(calculateOptimal(INPUT, PRICE), INPUT);
const conservativeView = () =>
  toProjectionView(calculate({ ...INPUT, optimized: false }, PRICE), {
    ...INPUT,
    optimized: false,
  });

describe("buildSeries", () => {
  it("labels one point per projected year", () => {
    const series = buildSeries(optimizedView(), "stack", "btc");

    expect(series.labels).toHaveLength(INPUT.lifeExpectancy - INPUT.currentAge);
    expect(series.labels[0]).toBe("31");
  });

  it("stack in btc plots the holdings and what is sold each year", () => {
    const view = optimizedView();
    const series = buildSeries(view, "stack", "btc");

    expect(series.datasets.map((d) => d.label)).toStrictEqual(["₿ held", "₿ sold"]);
    expect(series.datasets[0].data).toStrictEqual(view.points.map((p) => p.savingsBitcoin));
  });

  it("stack in fiat plots today's value of the same holdings", () => {
    const view = optimizedView();
    const series = buildSeries(view, "stack", "fiat");

    expect(series.datasets[0].data).toStrictEqual(view.points.map((p) => p.savingsFiatReal));
  });

  it("the two units move in opposite directions after retirement", () => {
    // This contrast is the lesson of the optimized strategy: fewer coins, more money.
    const view = optimizedView();
    const after = (data: number[]) =>
      data.slice(view.points.findIndex((p) => p.age === view.retirementAge));

    const btc = after(buildSeries(view, "stack", "btc").datasets[0].data);
    const fiat = after(buildSeries(view, "stack", "fiat").datasets[0].data);

    expect(btc[btc.length - 1]).toBeLessThan(btc[0]);
    expect(fiat[fiat.length - 1]).toBeGreaterThan(fiat[0]);
  });

  it("cash plots the drawdown in today's money", () => {
    const view = conservativeView();
    const series = buildSeries(view, "cash", "fiat");

    expect(series.datasets[0].label).toBe("$ savings");
    const cash = series.datasets[0].data.slice(
      view.points.findIndex((p) => p.age === view.retirementAge),
    );
    expect(cash).toStrictEqual([...cash].sort((a, b) => b - a));
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node_modules/.bin/vitest run test/ProjectionChart.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/components/Results/ProjectionChart.tsx`:

```tsx
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { ProjectionView } from "../../models/ProjectionView";
import { toUsd } from "../../constants";
import { palette } from "../../styles/tokens";

export type ChartVariant = "cash" | "stack";
export type ChartUnit = "btc" | "fiat";

interface Series {
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

/**
 * Exported apart from the component so the mapping can be asserted directly.
 * chart.js paints to a stubbed canvas context under jsdom, so rendering the
 * component proves nothing about the numbers.
 */
export const buildSeries = (
  view: ProjectionView,
  variant: ChartVariant,
  unit: ChartUnit,
): Series => {
  const labels = view.points.map((p) => String(p.age));

  if (variant === "stack") {
    return unit === "btc"
      ? {
          labels,
          datasets: [
            { label: "₿ held", data: view.points.map((p) => p.savingsBitcoin) },
            { label: "₿ sold", data: view.points.map((p) => Math.max(0, -p.bitcoinFlow)) },
          ],
        }
      : {
          labels,
          datasets: [
            { label: "$ value", data: view.points.map((p) => p.savingsFiatReal) },
            { label: "$ withdrawn", data: view.points.map((p) => (p.bitcoinFlow < 0 ? p.annualBudgetReal : 0)) },
          ],
        };
  }

  return {
    labels,
    datasets: [
      { label: "$ savings", data: view.points.map((p) => p.savingsFiatReal) },
      { label: "₿ held", data: view.points.map((p) => p.savingsBitcoin) },
    ],
  };
};

interface ProjectionChartProps {
  view: ProjectionView;
  variant: ChartVariant;
  unit?: ChartUnit;
  height?: number;
}

const ProjectionChart = ({ view, variant, unit = "btc", height = 260 }: ProjectionChartProps) => {
  const series = buildSeries(view, variant, unit);
  const fills = [palette.light.accent, "#2f9e6e"];
  // cash genuinely plots two units, so it keeps a second axis. stack shows one
  // unit at a time, which is how its scale problem disappears rather than
  // being managed.
  const dualAxis = variant === "cash";

  return (
    <div style={{ height }}>
      <Line
        data={{
          labels: series.labels,
          datasets: series.datasets.map((d, i) => ({
            ...d,
            fill: "origin" as const,
            borderColor: i === 0 ? fills[0] : fills[1],
            backgroundColor: `${i === 0 ? fills[0] : fills[1]}33`,
            borderWidth: 2,
            pointRadius: 0,
            yAxisID: dualAxis && i === 1 ? "btc" : "main",
          })),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: true },
            tooltip: {
              callbacks: {
                afterBody: (items) => {
                  const point = view.points[items[0].dataIndex];
                  // Everything on screen is in today's money; the future amount
                  // is disclosed here so the conversion is never silent.
                  return `nominal ${toUsd(point.savingsFiat)} in ${point.year}`;
                },
              },
            },
          },
          scales: {
            main: {
              type: "linear",
              position: "left",
              ticks: {
                callback: (v) => (unit === "btc" && !dualAxis ? `₿${Number(v).toFixed(2)}` : toUsd(Number(v))),
              },
            },
            ...(dualAxis
              ? { btc: { type: "linear" as const, position: "right" as const, grid: { drawOnChartArea: false } } }
              : {}),
          },
        }}
      />
    </div>
  );
};

export default ProjectionChart;
```

- [ ] **Step 4: Run the tests**

Run: `node_modules/.bin/vitest run test/ProjectionChart.spec.tsx`
Expected: PASS

- [ ] **Step 5: Verify the whole suite still passes**

Run: `npx tsc --noEmit && pnpm lint && pnpm test:run`
Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/components/Results/ProjectionChart.tsx test/ProjectionChart.spec.tsx
git commit -m "feat: add ProjectionChart with cash and stack variants"
```

---

### Task 7: StrategyCard and StrategyComparison

**Files:**
- Create: `src/components/Results/StrategyCard.tsx`
- Create: `src/components/Results/StrategyComparison.tsx`
- Create: `test/StrategyComparison.spec.tsx`

**Interfaces:**
- Consumes: `ProjectionView`, `StatTile`, `ProjectionChart`
- Produces:
  - `StrategyCard` props `{ view: ProjectionView; title: string; selected: boolean; onSelect: () => void }`
  - `StrategyComparison` props `{ conservative: ProjectionView; optimized: ProjectionView; selected: "conservative" | "optimized"; onSelect: (which: "conservative" | "optimized") => void }`

- [ ] **Step 1: Write the failing test**

Create `test/StrategyComparison.spec.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StrategyComparison from "../src/components/Results/StrategyComparison";
import { toProjectionView } from "../src/services/presentValue";
import { calculate } from "../src/services/bitcoinRetirementCalculator";
import { calculateOptimal } from "../src/services/bitcoinRetirementOptimizedCalculator";
import { InputData } from "../src/models/InputData";

const INPUT: InputData = {
  currentAge: 30,
  currentSavingsInBitcoin: 1,
  annualBuyInFiat: 12_000,
  annualPriceGrowth: 20,
  lifeExpectancy: 83,
  desiredRetirementAnnualBudget: 100_000,
  optimized: true,
  inflationRate: 5,
};
const PRICE = 79_350.17;

const views = () => ({
  conservative: toProjectionView(calculate({ ...INPUT, optimized: false }, PRICE), INPUT),
  optimized: toProjectionView(calculateOptimal(INPUT, PRICE), INPUT),
});

describe("StrategyComparison", () => {
  it("shows both strategies at once", () => {
    const { conservative, optimized } = views();
    render(
      <StrategyComparison
        conservative={conservative}
        optimized={optimized}
        selected="optimized"
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /sell everything/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sell what you need/i })).toBeInTheDocument();
    expect(screen.getByText(String(conservative.retirementAge))).toBeInTheDocument();
    expect(screen.getByText(String(optimized.retirementAge))).toBeInTheDocument();
  });

  it("marks the selected strategy for assistive tech", () => {
    const { conservative, optimized } = views();
    render(
      <StrategyComparison
        conservative={conservative}
        optimized={optimized}
        selected="optimized"
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /sell what you need/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("reports a selection change", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { conservative, optimized } = views();
    render(
      <StrategyComparison
        conservative={conservative}
        optimized={optimized}
        selected="optimized"
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("button", { name: /sell everything/i }));

    expect(onSelect).toHaveBeenCalledWith("conservative");
  });

  it("discloses the nominal figure beside the converted one", () => {
    const { conservative, optimized } = views();
    render(
      <StrategyComparison
        conservative={conservative}
        optimized={optimized}
        selected="optimized"
        onSelect={() => {}}
      />,
    );

    const last = optimized.points[optimized.points.length - 1];

    // Guards the guard. If these two ever coincide, the assertions below would
    // pass without any conversion having happened, and the test would be
    // proving nothing.
    expect(Math.round(last.savingsFiatReal)).not.toBe(Math.round(last.savingsFiat));

    // The spec's disclosure rule: a discounted figure never appears without the
    // future amount it came from. Asserted here, on a real projection, because
    // StatTile's own tests only prove the tile CAN carry a nominal — not that a
    // converted figure ever actually gets one.
    expect(screen.getAllByText(toUsd(last.savingsFiatReal)).length).toBeGreaterThan(0);
    expect(screen.getByText(`${toUsd(last.savingsFiat)} in ${last.year}`)).toBeInTheDocument();
  });
});
```

Add `toUsd` to the imports at the top of the file:

```tsx
import { toUsd } from "../src/constants";
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node_modules/.bin/vitest run test/StrategyComparison.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write StrategyCard**

Create `src/components/Results/StrategyCard.tsx`:

```tsx
import { ProjectionView } from "../../models/ProjectionView";
import { toBtc, toUsd } from "../../constants";
import ProjectionChart from "./ProjectionChart";
import StatTile from "../common/StatTile";

interface StrategyCardProps {
  view: ProjectionView;
  title: string;
  caption: string;
  selected: boolean;
  onSelect: () => void;
}

const StrategyCard = ({ view, title, caption, selected, onSelect }: StrategyCardProps) => {
  const last = view.points[view.points.length - 1];

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition ${
        selected ? "border-bitcoin bg-bitcoin-soft" : "border-border"
      }`}
    >
      <div>
        <div className="text-xs uppercase tracking-wide text-ink-muted">{title}</div>
        <div className="font-mono text-3xl font-extrabold leading-none">
          {view.canRetire ? view.retirementAge : "—"}
        </div>
        <div className="text-xs text-ink-muted">{caption}</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Stack at retirement" value={toBtc(view.savingsBitcoin)} />
        <StatTile
          label="Left at the end"
          value={toUsd(last ? last.savingsFiatReal : 0)}
          nominal={last ? `${toUsd(last.savingsFiat)} in ${last.year}` : undefined}
        />
      </div>

      <ProjectionChart
        view={view}
        variant={view.optimized ? "stack" : "cash"}
        unit={view.optimized ? "btc" : "fiat"}
        height={120}
      />
    </button>
  );
};

export default StrategyCard;
```

- [ ] **Step 4: Write StrategyComparison**

Create `src/components/Results/StrategyComparison.tsx`. The grid is where the responsive rule from the spec lands: stacked below `md`, side by side from `md` up.

```tsx
import { ProjectionView } from "../../models/ProjectionView";
import StrategyCard from "./StrategyCard";

export type StrategyKey = "conservative" | "optimized";

interface StrategyComparisonProps {
  conservative: ProjectionView;
  optimized: ProjectionView;
  selected: StrategyKey;
  onSelect: (which: StrategyKey) => void;
}

const StrategyComparison = ({
  conservative,
  optimized,
  selected,
  onSelect,
}: StrategyComparisonProps) => (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
    <StrategyCard
      view={conservative}
      title="Sell everything at retirement"
      caption="cash drawn down from the sale"
      selected={selected === "conservative"}
      onSelect={() => onSelect("conservative")}
    />
    <StrategyCard
      view={optimized}
      title="Sell what you need"
      caption="keep holding, sell a slice each year"
      selected={selected === "optimized"}
      onSelect={() => onSelect("optimized")}
    />
  </div>
);

export default StrategyComparison;
```

- [ ] **Step 5: Run the tests**

Run: `node_modules/.bin/vitest run test/StrategyComparison.spec.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/Results/StrategyCard.tsx src/components/Results/StrategyComparison.tsx test/StrategyComparison.spec.tsx
git commit -m "feat: add the side-by-side strategy comparison"
```

---

### Task 8: The table discloses nominal figures

**Files:**
- Modify: `src/components/Results/tabs/TableTab.tsx` (whole file)
- Delete: `src/components/Results/tabs/TableTab.scss`
- Create: `test/TableTab.spec.tsx`

**Interfaces:**
- Consumes: `ProjectionView`; `Table`, `Popover`, `Button`, `Checkbox`, `Label` from `src/components/ui/`
- Produces: `TableTab` props change from `CalculationResult` to `{ view: ProjectionView }`

antd's `Table` took a `columns` array and rendered itself. shadcn's is plain table markup, so the column definitions stay as data — they still drive the column chooser — but the rows are mapped explicitly. That is more lines and no lost behaviour: the only antd `Table` features this app used were `pagination={false}`, `bordered` and `scroll={{ y }}`.

`scroll={{ y: 260 }}` becomes `containerClassName="max-h-[260px]"` plus `sticky top-0` on the header cells. The cap must land on the container, not the table — see the comment in `src/components/ui/table.tsx`.

- [ ] **Step 1: Write the failing test**

Create `test/TableTab.spec.tsx`:

```tsx
import { beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { initI18n } from "./test-utils";
import TableTab from "../src/components/Results/tabs/TableTab";
import { toProjectionView } from "../src/services/presentValue";
import { calculateOptimal } from "../src/services/bitcoinRetirementOptimizedCalculator";
import { InputData } from "../src/models/InputData";

const INPUT: InputData = {
  currentAge: 30,
  currentSavingsInBitcoin: 1,
  annualBuyInFiat: 12_000,
  annualPriceGrowth: 20,
  lifeExpectancy: 83,
  desiredRetirementAnnualBudget: 100_000,
  optimized: true,
  inflationRate: 5,
};

beforeAll(async () => {
  await initI18n();
});

describe("TableTab", () => {
  it("shows a nominal column beside the converted one", () => {
    const view = toProjectionView(calculateOptimal(INPUT, 79_350.17), INPUT);
    render(<TableTab view={view} />);

    // Both faces of the figure are present, so the discounting is never silent.
    expect(screen.getByRole("columnheader", { name: /savings \(today\)/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /savings \(nominal\)/i })).toBeInTheDocument();
  });

  it("renders one row per projected year", () => {
    const view = toProjectionView(calculateOptimal(INPUT, 79_350.17), INPUT);
    const { container } = render(<TableTab view={view} />);

    const body = container.querySelector('[data-slot="table-body"]')!;
    expect(within(body as HTMLElement).getAllByRole("row")).toHaveLength(view.points.length);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node_modules/.bin/vitest run test/TableTab.spec.tsx`
Expected: FAIL — `TableTab` still takes `CalculationResult`.

- [ ] **Step 3: Rewrite TableTab**

Replace the whole of `src/components/Results/tabs/TableTab.tsx`. Delete the `./TableTab.scss` import; its rules become utilities.

```tsx
import { useState } from "react";
import { Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ProjectionPoint, ProjectionView } from "../../../models/ProjectionView";
import { toUsd } from "../../../constants";

interface Column {
  key: string;
  title: string;
  /** Rendered cell. Mono is applied here, per column, rather than table-wide. */
  render: (p: ProjectionPoint) => React.ReactNode;
}

const TableTab = ({ view }: { view: ProjectionView }) => {
  const [t] = useTranslation();

  const columns: Column[] = [
    { key: "year", title: t("table.year"), render: (p) => p.year },
    { key: "age", title: t("table.age"), render: (p) => p.age },
    {
      key: "bitcoinPrice",
      title: t("table.bitcoin-price"),
      render: (p) => <span className="font-mono">{toUsd(p.bitcoinPrice)}</span>,
    },
    {
      key: "savingsFiatReal",
      title: "Savings (today)",
      render: (p) => <span className="font-mono">{toUsd(p.savingsFiatReal)}</span>,
    },
    {
      key: "savingsFiat",
      title: "Savings (nominal)",
      render: (p) => (
        <span className="font-mono text-ink-muted">{toUsd(p.savingsFiat)}</span>
      ),
    },
    {
      key: "savingsBitcoin",
      title: t("table.accumulated-savings-btc"),
      render: (p) => <span className="font-mono">{p.savingsBitcoin.toFixed(8)}</span>,
    },
    {
      key: "bitcoinFlow",
      title: t("table.you-bought"),
      render: (p) => <span className="font-mono">{p.bitcoinFlow.toFixed(8)}</span>,
    },
  ];

  const [shownKeys, setShownKeys] = useState(columns.map((c) => c.key));
  const shown = columns.filter((c) => shownKeys.includes(c.key));

  const toggle = (key: string, on: boolean) =>
    setShownKeys((keys) => (on ? [...keys, key] : keys.filter((k) => k !== key)));

  return (
    <div className="space-y-2">
      <Table
        containerClassName="max-h-[260px] rounded-md border"
        className="border-separate border-spacing-0"
      >
        <TableHeader>
          <TableRow>
            {shown.map((c) => (
              <TableHead
                key={c.key}
                className="sticky top-0 z-10 border-b bg-background whitespace-nowrap"
              >
                {c.title}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {view.points.map((p) => (
            <TableRow key={p.year}>
              {shown.map((c) => (
                <TableCell key={c.key} className="border-b whitespace-nowrap">
                  {c.render(p)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex justify-end">
        <Popover>
          <PopoverTrigger
            render={
              <Button variant="outline" size="icon" aria-label="Choose columns">
                <Settings2 />
              </Button>
            }
          />
          <PopoverContent align="end" className="w-56">
            <p className="mb-2 text-sm font-medium">{t("table.config.title")}</p>
            <div className="flex flex-col gap-2">
              {columns.map((c) => (
                <div key={c.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`col-${c.key}`}
                    checked={shownKeys.includes(c.key)}
                    onCheckedChange={(on) => toggle(c.key, Boolean(on))}
                  />
                  <Label htmlFor={`col-${c.key}`} className="text-sm font-normal">
                    {c.title}
                  </Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default TableTab;
```

- [ ] **Step 4: Run the tests**

Run: `node_modules/.bin/vitest run test/TableTab.spec.tsx`
Expected: PASS

- [ ] **Step 5: Delete the orphaned stylesheet**

```bash
rm src/components/Results/tabs/TableTab.scss
```

- [ ] **Step 6: Browser check**

Build and preview. Confirm the header stays pinned while the body scrolls, the column chooser opens and hides a column, and the table — not the page — is what scrolls horizontally at 420px.

- [ ] **Step 7: Commit**

```bash
git add -A src/components/Results/tabs test/TableTab.spec.tsx
git commit -m "feat: show nominal savings beside the converted column"
```

---

### Task 9: StrategyDetail

**Files:**
- Create: `src/components/Results/StrategyDetail.tsx`
- Create: `test/StrategyDetail.spec.tsx`

**Interfaces:**
- Consumes: `ProjectionView`, `ProjectionChart`, `TableTab`
- Produces: `StrategyDetail` props `{ view: ProjectionView }`

- [ ] **Step 1: Write the failing test**

Create `test/StrategyDetail.spec.tsx`:

```tsx
import { beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { initI18n } from "./test-utils";
import StrategyDetail from "../src/components/Results/StrategyDetail";
import { toProjectionView } from "../src/services/presentValue";
import { calculateOptimal } from "../src/services/bitcoinRetirementOptimizedCalculator";
import { calculate } from "../src/services/bitcoinRetirementCalculator";
import { InputData } from "../src/models/InputData";

const INPUT: InputData = {
  currentAge: 30,
  currentSavingsInBitcoin: 1,
  annualBuyInFiat: 12_000,
  annualPriceGrowth: 20,
  lifeExpectancy: 83,
  desiredRetirementAnnualBudget: 100_000,
  optimized: true,
  inflationRate: 5,
};

beforeAll(async () => {
  await initI18n();
});

describe("StrategyDetail", () => {
  it("offers the unit toggle for the optimized strategy", async () => {
    const user = userEvent.setup();
    render(<StrategyDetail view={toProjectionView(calculateOptimal(INPUT, 79_350.17), INPUT)} />);

    const fiat = screen.getByRole("button", { name: "$" });
    await user.click(fiat);

    expect(fiat).toHaveAttribute("aria-pressed", "true");
  });

  it("offers no unit toggle for the conservative strategy", () => {
    // Its cash chart genuinely plots two units at once, so there is nothing to swap.
    render(
      <StrategyDetail
        view={toProjectionView(calculate({ ...INPUT, optimized: false }, 79_350.17), INPUT)}
      />,
    );

    expect(screen.queryByRole("button", { name: "$" })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node_modules/.bin/vitest run test/StrategyDetail.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/components/Results/StrategyDetail.tsx`:

```tsx
import { useState } from "react";
import { ProjectionView } from "../../models/ProjectionView";
import ProjectionChart, { ChartUnit } from "./ProjectionChart";
import TableTab from "./tabs/TableTab";

/**
 * The ₿ / $ toggle lives here and only here. Putting one on each card would let
 * someone compare two strategies in different units without noticing.
 */
const StrategyDetail = ({ view }: { view: ProjectionView }) => {
  const [unit, setUnit] = useState<ChartUnit>("btc");

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
      {view.optimized && (
        <div className="flex gap-2" role="group" aria-label="Chart unit">
          {(["btc", "fiat"] as const).map((u) => (
            <button
              key={u}
              type="button"
              aria-pressed={unit === u}
              onClick={() => setUnit(u)}
              className={`rounded-full px-3 py-1 font-mono text-xs ${
                unit === u
                  ? "bg-bitcoin text-black"
                  : "border border-border text-ink-muted"
              }`}
            >
              {u === "btc" ? "₿" : "$"}
            </button>
          ))}
        </div>
      )}

      <ProjectionChart
        view={view}
        variant={view.optimized ? "stack" : "cash"}
        unit={view.optimized ? unit : "fiat"}
      />

      <TableTab view={view} />
    </section>
  );
};

export default StrategyDetail;
```

- [ ] **Step 4: Run the tests**

Run: `node_modules/.bin/vitest run test/StrategyDetail.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Results/StrategyDetail.tsx test/StrategyDetail.spec.tsx
git commit -m "feat: add StrategyDetail with the unit toggle"
```

---

### Task 10: InputBar

**Files:**
- Create: `src/components/Input/InputBar.tsx`
- Create: `test/InputBar.spec.tsx`

**Interfaces:**
- Consumes: `ScrubField`, `useSearchParams`
- Produces: `InputBar` props `{ onCalculate: (data: InputData) => void }` — the same contract `InputPanel` had, minus `clearChart`

- [ ] **Step 1: Write the failing test**

Create `test/InputBar.spec.tsx`:

```tsx
import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { initI18n, renderWithRouter } from "./test-utils";
import InputBar from "../src/components/Input/InputBar";

beforeAll(async () => {
  await initI18n();
});

describe("InputBar", () => {
  it("emits the current inputs on mount", async () => {
    const onCalculate = vi.fn();
    renderWithRouter(<InputBar onCalculate={onCalculate} />);

    await waitFor(() => expect(onCalculate).toHaveBeenCalled());
    expect(onCalculate.mock.calls[0][0]).toMatchObject({ currentAge: 30, lifeExpectancy: 86 });
  });

  it("re-emits when a value changes", async () => {
    const user = userEvent.setup();
    const onCalculate = vi.fn();
    renderWithRouter(<InputBar onCalculate={onCalculate} />);
    await waitFor(() => expect(onCalculate).toHaveBeenCalled());
    const before = onCalculate.mock.calls.length;

    const field = screen.getByRole("spinbutton", { name: /current age/i });
    await user.clear(field);
    await user.type(field, "40");

    await waitFor(() => expect(onCalculate.mock.calls.length).toBeGreaterThan(before));
  });

  it("reads its starting values from the query string", async () => {
    const onCalculate = vi.fn();
    renderWithRouter(<InputBar onCalculate={onCalculate} />, ["/?currentAge=45"]);

    await waitFor(() => expect(onCalculate).toHaveBeenCalled());
    expect(onCalculate.mock.calls[0][0].currentAge).toBe(45);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node_modules/.bin/vitest run test/InputBar.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/components/Input/InputBar.tsx`. Port the query-string state from `InputPanel.tsx:17-42` verbatim — the defaults and parameter names must not change or shared links break. `optimized` is no longer read here; it moves to `Calculator` as a selection.

```tsx
import { useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { InputData } from "../../models/InputData";
import ScrubField from "../common/ScrubField";

const num = (params: URLSearchParams, key: string, fallback: number) => {
  const raw = params.get(key);
  const parsed = raw === null ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const InputBar = ({ onCalculate }: { onCalculate: (data: InputData) => void }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [t] = useTranslation();

  const currentAge = num(searchParams, "currentAge", 30);
  const lifeExpectancy = num(searchParams, "lifeExpectancy", 86);
  const currentSavings = num(searchParams, "currentSavings", 0.5);
  const annualBuy = num(searchParams, "annualBuy", 0);
  const bitcoinCagr = num(searchParams, "bitcoinCagr", 20);
  const inflationRate = num(searchParams, "inflationRate", 2);
  const desiredRetirementIncome = num(searchParams, "desiredRetirementIncome", 120_000);

  const set = (key: string, value: number) => {
    // An emptied number input reports NaN. Ignore it rather than writing
    // "NaN" into the query string, which would break shared links.
    if (!Number.isFinite(value)) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set(key, String(value));
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    onCalculate({
      currentAge,
      lifeExpectancy,
      currentSavingsInBitcoin: currentSavings,
      annualBuyInFiat: annualBuy,
      annualPriceGrowth: bitcoinCagr,
      inflationRate,
      desiredRetirementAnnualBudget: desiredRetirementIncome,
      optimized: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentAge,
    lifeExpectancy,
    currentSavings,
    annualBuy,
    bitcoinCagr,
    inflationRate,
    desiredRetirementIncome,
  ]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs uppercase tracking-wide text-ink-muted">
          About you
        </legend>
        <label className="flex items-center justify-between gap-2 text-xs">
          {t("input.current-age")}
          <Input
            type="number"
            aria-label="Current age"
            className="w-28 text-right font-mono"
            min={0}
            max={120}
            value={currentAge}
            onChange={(e) => set("currentAge", e.target.valueAsNumber)}
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-xs">
          {t("input.life-expectancy")}
          <Input
            type="number"
            aria-label="Life expectancy"
            className="w-28 text-right font-mono"
            min={1}
            max={130}
            value={lifeExpectancy}
            onChange={(e) => set("lifeExpectancy", e.target.valueAsNumber)}
          />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs uppercase tracking-wide text-ink-muted">
          Your bitcoin
        </legend>
        <label className="flex items-center justify-between gap-2 text-xs">
          {t("input.savings-btc")}
          <Input
            type="number"
            aria-label="Bitcoin held"
            className="w-28 text-right font-mono"
            min={0}
            step={0.01}
            value={currentSavings}
            onChange={(e) => set("currentSavings", e.target.valueAsNumber)}
          />
        </label>
        <ScrubField
          label="Annual buy"
          name="annualBuy"
          value={annualBuy}
          min={0}
          max={200_000}
          step={100}
          unit="$"
          onChange={(v) => set("annualBuy", v)}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs uppercase tracking-wide text-ink-muted">
          Assumptions and goal
        </legend>
        <ScrubField
          label="Price annual growth"
          name="bitcoinCagr"
          value={bitcoinCagr}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => set("bitcoinCagr", v)}
        />
        <ScrubField
          label="Annual inflation"
          name="inflationRate"
          value={inflationRate}
          min={0}
          max={50}
          step={0.5}
          unit="%"
          onChange={(v) => set("inflationRate", v)}
        />
        <ScrubField
          label="Desired annual income"
          name="desiredRetirementIncome"
          value={desiredRetirementIncome}
          min={0}
          max={400_000}
          step={1000}
          unit="$"
          onChange={(v) => set("desiredRetirementIncome", v)}
        />
      </fieldset>
    </div>
  );
};

export default InputBar;
```

- [ ] **Step 4: Run the tests**

Run: `node_modules/.bin/vitest run test/InputBar.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/Input/InputBar.tsx test/InputBar.spec.tsx
git commit -m "feat: add InputBar with grouped inputs and scrub fields"
```

---

### Task 11: Switch Calculator over to both strategies

This is the task where the new UI replaces the old one. Everything before it was additive.

**Files:**
- Modify: `src/components/Calculator.tsx` (whole file)
- Modify: `test/App.spec.tsx`

**Interfaces:**
- Consumes: `InputBar`, `StrategyComparison`, `StrategyDetail`, `toProjectionView`
- Produces: nothing downstream

- [ ] **Step 1: Rewrite Calculator**

Replace the whole of `src/components/Calculator.tsx`:

```tsx
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBitcoinPrice } from "../hooks/useBitcoinPrice";
import { InputData } from "../models/InputData";
import { ProjectionView } from "../models/ProjectionView";
import { calculate } from "../services/bitcoinRetirementCalculator";
import { calculateOptimal } from "../services/bitcoinRetirementOptimizedCalculator";
import { toProjectionView } from "../services/presentValue";
import InputBar from "./Input/InputBar";
import StrategyComparison, { StrategyKey } from "./Results/StrategyComparison";
import StrategyDetail from "./Results/StrategyDetail";

const REFRESH_INTERVAL_MS = 1000 * 60 * 10;

const Calculator = () => {
  const [input, setInput] = useState<InputData>();
  const [conservative, setConservative] = useState<ProjectionView>();
  const [optimized, setOptimized] = useState<ProjectionView>();
  const [selected, setSelected] = useState<StrategyKey>("optimized");
  const [t] = useTranslation();
  const btcPrice = useBitcoinPrice(REFRESH_INTERVAL_MS);

  // Both strategies are computed on every change now. The switch used to pick
  // which one to calculate; the comparison shows both, so it picks which one
  // the detail panel expands.
  //
  // The projections derive from the inputs AND the price, and `useBitcoinPrice`
  // refetches every ten minutes. Recomputing only when the inputs change would
  // leave both projections built on a price the app has stopped displaying, so
  // the last input is held in state and the effect depends on both.
  useEffect(() => {
    if (!input || !btcPrice || btcPrice <= 0) {
      return;
    }
    setConservative(toProjectionView(calculate({ ...input, optimized: false }, btcPrice), input));
    setOptimized(toProjectionView(calculateOptimal({ ...input, optimized: true }, btcPrice), input));
  }, [input, btcPrice]);

  if (!btcPrice || btcPrice <= 0) {
    return (
      <div
        role="status"
        aria-label="Loading the bitcoin price"
        className="flex min-h-[60vh] items-center justify-center"
      >
        <Loader2 className="size-8 animate-spin text-ink-muted" />
      </div>
    );
  }

  const selectedView = selected === "optimized" ? optimized : conservative;

  return (
    <div className="flex flex-col gap-4">
      {/* `setInput` directly: InputBar's effect depends on the primitive input
          values, so it fires once per real change, not once per render. */}
      <InputBar onCalculate={setInput} />

      {conservative && optimized && (
        <>
          <StrategyComparison
            conservative={conservative}
            optimized={optimized}
            selected={selected}
            onSelect={setSelected}
          />
          {selectedView?.canRetire ? (
            <StrategyDetail view={selectedView} />
          ) : (
            <p className="py-8 text-center italic">{t("cannot-retire.text")}</p>
          )}
        </>
      )}
    </div>
  );
};

export default Calculator;
```

- [ ] **Step 2: Update App.spec.tsx queries**

In `test/App.spec.tsx`, the calculator test queries `"Your retirement age:"`, which no longer exists. Replace that test body with:

```tsx
  it("renders both strategies with a retirement result", async () => {
    renderWithRouter(<App />);

    await screen.findByText("Bitcoin Retirement Calculator");

    expect(await screen.findByRole("button", { name: /sell everything/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sell what you need/i })).toBeInTheDocument();
  });
```

The theme tests scope their switch query with `title.closest(".title")`. That still works — App's header is unchanged by this task.

- [ ] **Step 3: Run the whole suite**

Run: `npx tsc --noEmit && pnpm lint && pnpm test:run`
Expected: green. If `Result.tsx`, `Summary.tsx` or `OptimizedSummary.tsx` now fail to compile because nothing passes them props, leave them — Task 12 deletes them.

- [ ] **Step 4: Browser check at three widths**

```bash
pnpm build && pnpm preview
```

At roughly 1440px, 900px and 390px confirm: cards side by side above `md` and stacked below; the input grid reflows 3 → 2 → 1 columns; the table scrolls inside its own container; and the page body never scrolls horizontally. Fix what you find now, in this task.

- [ ] **Step 5: Commit**

```bash
git add src/components/Calculator.tsx test/App.spec.tsx
git commit -m "feat: compute both strategies and show them side by side"
```

---

### Task 12: Delete what the redesign replaced, and remove antd

This task ends with zero `antd` imports and zero `.scss` files. It is wide but mechanical: everything it touches has already been superseded, except the four small call sites in Step 4.

**Files:**
- Delete: `src/components/Results/tabs/Result.tsx`, `Summary.tsx`, `OptimizedSummary.tsx`
- Delete: `src/components/Results/InfoBox.tsx`, `InfoBox.scss`
- Delete: `src/components/Input/InputPanel.tsx`, `InputPanel.scss`
- Delete: `src/models/LineChartProps.ts`, `src/components/Results/tabs/LineChart.tsx`, `ChartTab.tsx`
- Delete: `src/App.scss`, `src/components/Calculator.scss`, `Donate.scss`, `ExplanatoryOverlay.scss`
- Create: `src/components/common/BrandIcons.tsx`
- Modify: `src/App.tsx`, `src/components/Misc/Donate.tsx`, `src/components/Misc/OnChain.tsx`, `src/components/Results/tabs/AnnualBudgetExplanation.tsx`, `src/components/Input/ExplanatoryOverlay.tsx`
- Modify: `package.json`

- [ ] **Step 1: Confirm nothing imports what is about to go**

```bash
grep -rn "InfoBox\|OptimizedSummary\|InputPanel\|LineChartProps\|ChartTab" src --include='*.tsx' --include='*.ts'
```

Expected: no hits outside the files being deleted.

- [ ] **Step 2: Delete**

```bash
git rm src/components/Results/tabs/Result.tsx src/components/Results/tabs/Summary.tsx \
       src/components/Results/tabs/OptimizedSummary.tsx src/components/Results/tabs/ChartTab.tsx \
       src/components/Results/tabs/LineChart.tsx src/components/Results/InfoBox.tsx \
       src/components/Results/InfoBox.scss src/components/Input/InputPanel.tsx \
       src/components/Input/InputPanel.scss src/models/LineChartProps.ts \
       src/App.scss src/components/Calculator.scss
```

- [ ] **Step 3: Add the QR dependency and the brand marks**

`QRCode` is the one antd component with no shadcn equivalent.

```bash
pnpm add qrcode.react
```

`lucide-react` 1.x removed brand icons — there is no `Github` and no `Twitter` export. Verify before reaching for one:

```bash
node --input-type=module -e 'import * as L from "lucide-react"; console.log("Github" in L, "Moon" in L)'
```

Expected: `false true`.

The two marks in the signature row become inline SVG. Create `src/components/common/BrandIcons.tsx` exactly as below — the path data is from simple-icons (`siGithub.path`, `siX.path`, v15) and is reproduced here so no dependency is added for two one-off marks:

```tsx
/**
 * Brand marks as inline SVG. lucide dropped brand icons in 1.x, and each of
 * these is used once, so a package for them is not worth carrying.
 * Path data: simple-icons, slugs `github` and `x`.
 */
const GITHUB_PATH =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12";

const X_PATH =
  "M14.234 10.162 22.977 0h-2.072l-7.591 8.824L7.251 0H.258l9.168 13.343L.258 24H2.33l8.016-9.318L16.749 24h6.993zm-2.837 3.299-.929-1.329L3.076 1.56h3.182l5.965 8.532.929 1.329 7.754 11.09h-3.182z";

const BrandIcon = ({ d, className = "" }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={`size-4 fill-current ${className}`}>
    <path d={d} />
  </svg>
);

export const GithubIcon = (props: { className?: string }) => (
  <BrandIcon d={GITHUB_PATH} {...props} />
);

export const XIcon = (props: { className?: string }) => <BrandIcon d={X_PATH} {...props} />;
```

Both are decorative — each sits inside an `<a>` that gets its own `aria-label` in Step 4, so `aria-hidden` on the SVG is correct and the link is what a screen reader announces.

- [ ] **Step 4: Port the four remaining antd call sites**

`src/components/Misc/OnChain.tsx` — `QRCodeCanvas`, not `QRCodeSVG`. `test/Donate.spec.tsx` asserts `.donate-content canvas`, and switching to SVG breaks it:

```tsx
import { QRCodeCanvas } from "qrcode.react";

const OnChain = () => (
  <QRCodeCanvas value="bc1q8y92hwx02nxs5p6qkdm2322vvh55h3wkqpnrye" size={256} />
);

export default OnChain;
```

`src/components/Misc/Donate.tsx` — keep the `donate-content` class name; the test scopes to it. Delete the `./Donate.scss` import; its one rule becomes the utilities below:

```tsx
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import DonateOnChain from "./OnChain";

const Donate = () => {
  const [t] = useTranslation();

  return (
    <Popover>
      <PopoverTrigger render={<Button size="sm">{t("donate.donate")}</Button>} />
      <PopoverContent align="start" side="top" className="w-auto">
        <PopoverTitle className="mb-2 text-sm font-medium">
          {t("donate.qrcode.title")}
        </PopoverTitle>
        <div className="donate-content flex min-h-[270px] min-w-[270px] flex-col items-center justify-center">
          <DonateOnChain />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default Donate;
```

`src/components/Results/tabs/AnnualBudgetExplanation.tsx` — the trigger was a bare icon with no accessible name. It becomes a real button:

```tsx
import { CircleHelp } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

const AnnualBudgetExplanation = () => {
  const [t] = useTranslation();

  return (
    <Popover>
      <PopoverTrigger
        render={
          <button type="button" aria-label={t("annual-budget-explanation.title")}>
            <CircleHelp className="size-4 text-bitcoin" />
          </button>
        }
      />
      <PopoverContent className="max-w-[400px]">
        <PopoverTitle className="mb-2 font-extrabold underline">
          {t("annual-budget-explanation.title")}
        </PopoverTitle>
        <div>{t("annual-budget.explanation.text")}</div>
      </PopoverContent>
    </Popover>
  );
};

export default AnnualBudgetExplanation;
```

`src/App.tsx` — drop `ConfigProvider` and `theme` entirely; tokens do that job now. The `.title` class name stays, because `test/App.spec.tsx` scopes its switch query to it.

```tsx
import { useTranslation } from "react-i18next";
import { useLayoutEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import useLocalStorage from "use-local-storage";
import { Switch } from "@/components/ui/switch";
import { GithubIcon, XIcon } from "@/components/common/BrandIcons";
import Calculator from "./components/Calculator";
import Donate from "./components/Misc/Donate";

function App() {
  const [t] = useTranslation();
  const defaultDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [, setUserTheme] = useLocalStorage("theme", defaultDark ? "dark" : "light");
  const [useDarkMode, setUseDarkMode] = useState(defaultDark);

  useLayoutEffect(() => {
    // `data-theme` lives on <html>: theme.css resolves its dark tokens against
    // `:root[data-theme="dark"]`, and <body>'s own background cannot read a
    // token declared on one of its descendants.
    const nextTheme = useDarkMode ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);
    setUserTheme(nextTheme);
  }, [setUserTheme, useDarkMode]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4">
        <div className="title flex items-center justify-center gap-2 py-4 text-2xl">
          <img src="/bitcoin-logo2.png" width="40" alt="" />
          <span>{t("app.title")}</span>
          <span className="flex items-center gap-1.5">
            <Sun className="size-4" aria-hidden="true" />
            <Switch
              aria-label={t("app.theme-toggle")}
              checked={useDarkMode}
              onCheckedChange={setUseDarkMode}
            />
            <Moon className="size-4" aria-hidden="true" />
          </span>
        </div>

        <Calculator />

        <div className="flex items-center justify-end gap-1.5 py-4 text-sm font-medium">
          <span>by</span>
          <a target="blank" href="https://github.com/pampeanodev">
            @pampeanodev
          </a>
          <a target="blank" href="https://x.com/pampeanodev" aria-label="X">
            <XIcon />
          </a>
          <a
            target="blank"
            href="https://primal.net/p/npub16r9fy3936x9pf9sk020zt48ntpp809lk9xf5wldzhlqu7x8y3t9shy8j7x"
            aria-label="Nostr"
          >
            <img src="https://nostr.how/images/nostrich-150.webp" width={16} alt="" />
          </a>
          <a
            target="_blank"
            href="https://github.com/pampeanodev/btcretirementcalc"
            aria-label="GitHub"
          >
            <GithubIcon />
          </a>
          <Donate />
        </div>
      </div>
    </div>
  );
}

export default App;
```

`document.body.classList` no longer carries `dark` — nothing reads it once `App.scss` is gone.

Add `"app.theme-toggle"` to all three locale files — `en.json`, `es.json`, `pt.json`.

**Write it as a flat key, exactly like every existing one.** These files use literal dotted key names, not nested objects:

```json
"app.title": "Bitcoin Retirement Calculator",
"app.theme-toggle": "Dark mode",
```

Nesting it as `{ "app": { "theme-toggle": … } }` does not resolve against this setup, and the failure is confusing — the UI renders the key string itself and the Task 13 test reports a missing element rather than a missing translation.

**The English value must be exactly `Dark mode`**, because Task 13 queries the switch by that accessible name. Translate `es.json` and `pt.json` properly rather than copying the English across: only `en.json` is load-bearing for the test, and the other two are what a Spanish or Portuguese reader actually hears from a screen reader.

- [ ] **Step 5: Port the last stylesheet and delete the rest**

`ExplanatoryOverlay.scss` holds one rule: `.explanatory-overlay` becomes `max-w-[400px]` on the element in `src/components/Input/ExplanatoryOverlay.tsx`. Then:

```bash
git rm src/components/Misc/Donate.scss src/components/Input/ExplanatoryOverlay.scss
find src -name '*.scss'
```

Expected: no output.

- [ ] **Step 6: Remove antd**

```bash
pnpm remove antd @ant-design/icons sass
```

`sass` goes with the last `.scss` file. If `pnpm remove` reports any of them missing, that is fine — confirm with the check in Step 7 rather than reinstalling.

- [ ] **Step 7: Prove it is gone**

```bash
grep -rn "from \"antd\"\|from \"@ant-design" src test
find src -name '*.scss'
node -e 'const p=require("./package.json");const bad=["antd","@ant-design/icons","sass"].filter(k=>p.dependencies?.[k]||p.devDependencies?.[k]);console.log(bad.length?"STILL PRESENT: "+bad.join(", "):"clean")'
```

All three must come back empty / `clean`.

- [ ] **Step 8: Run the whole suite**

Run: `npx tsc --noEmit && pnpm lint && pnpm test:run`
Expected: green. `test/build-smoke.spec.ts` is the one that matters here — removing a dependency this large is exactly the change that breaks a bundle without breaking a unit test.

- [ ] **Step 9: Measure what it bought**

```bash
pnpm build
```

Record the bundle size in the commit message. It was 1290 KB with antd; the projection is roughly 800 KB. If it did not drop by at least 400 KB, something still pulls antd in — find it before committing.

- [ ] **Step 10: Browser check**

Preview the production build. The whole app, not one component: header and theme toggle, both strategy cards, the detail chart, the table with its column chooser, and the donate popover with its QR canvas. This is the first build with no antd in it at all.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "refactor: remove antd and delete what the redesign replaced"
```

---

### Task 13: Accessibility and the final responsive pass

**Files:**
- Modify: `test/App.spec.tsx`

The theme switch already carries `aria-label={t("app.theme-toggle")}` — Task 12 added it when it ported `App.tsx` off antd. Confirm the English value resolves to `Dark mode` before changing the test:

```bash
grep -rn "theme-toggle" src/locales
```

- [ ] **Step 1: Simplify the test that worked around its absence**

In `test/App.spec.tsx`, the theme toggle test scopes by `.title` because the switches had no names. Replace that query:

```tsx
    await user.click(screen.getByRole("switch", { name: "Dark mode" }));
```

and drop the `header`/`within` lines and the now-unused `within` import.

- [ ] **Step 2: Run the suite**

Run: `npx tsc --noEmit && pnpm lint && pnpm test:run`
Expected: green.

- [ ] **Step 3: Full browser pass**

```bash
pnpm build && pnpm preview
```

Walk the checklist at 1440px, 900px and 390px, in both themes:

- cards side by side above `md`, stacked below, selected one still reachable
- input grid reflows 3 → 2 → 1
- the ₿ / $ toggle appears only on the optimized detail
- the table scrolls inside its container; the body does not scroll horizontally
- tooltips disclose the nominal figure
- dark mode: no unreadable text, no white boxes on the dark ground
- drag a scrub field and watch both cards move

Fix what you find, then re-run the suite.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "fix: settle the accessibility and responsive passes"
```

---

## Self-Review

**Spec coverage:** Tailwind, preflight and the shadcn foundation → Task 1 (complete). Task 2 is void — there is no second theming system to feed once antd is gone. Removing antd entirely → Task 12. Present value outside the calculators → Task 3. StatTile → 4. ScrubField and the merged sliders → 5. Both chart variants and the unit toggle → 6 and 9. Both strategies computed → 11. Comparison layout → 7. Nominal disclosure → 4 (tile), 6 (tooltip), 8 (table column). Responsive per-region → 11 and 13. Deleting `Summary`/`OptimizedSummary`/SCSS → 12. Accessibility → 13.

**Known gap:** the spec's `InputGroup` component is not built as a separate file; Task 10 uses `<fieldset>` directly, which carries the grouping semantics natively and needs no wrapper. This is a deliberate simplification, not an omission.

**Type consistency:** `ProjectionView`/`ProjectionPoint` defined in Task 3 and consumed unchanged in 6, 7, 8, 9, 11. `ChartUnit` exported from `ProjectionChart` in Task 6 and imported in Task 9. `StrategyKey` exported from `StrategyComparison` in Task 7 and imported in Task 11. `toProjectionView(result, input)` keeps the same two-argument shape everywhere.
