# UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the calculator's interface around a side-by-side comparison of the two retirement strategies, in today's dollars, with a chart per strategy that can actually show its own data.

**Architecture:** Tailwind v4 supplies tokens, layout and responsive behaviour; antd keeps the complex widgets and is themed from the same tokens. The two calculators are not touched — present value is a separate transform applied at the presentation boundary, so the 28 existing tests stay a valid regression net for the money maths. New components are built alongside the old ones and switched over late, so the app boots at every commit.

**Tech Stack:** React 19, TypeScript 5.9, Vite 8 (Rolldown), antd 6, Tailwind v4, chart.js + react-chartjs-2, vitest + jsdom + React Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-28-ui-redesign-design.md`

## Global Constraints

- TypeScript stays on `^5.9.3`. Do not bump it — `typescript-eslint` hard-throws on TS 7. See the README.
- `vite.config.ts` keeps `legacy.inconsistentCjsInterop: true`. Removing it breaks `use-local-storage` and takes the app down.
- The two calculator services are **not modified** by any task in this plan: `src/services/bitcoinRetirementCalculator.ts`, `src/services/bitcoinRetirementOptimizedCalculator.ts`.
- Every task ends green on: `npx tsc --noEmit`, `pnpm lint`, `pnpm test:run`. `test/build-smoke.spec.ts` must pass — it executes the real production bundle and is the only guard against bundler-level breakage.
- No component declares a literal colour. Colours come from tokens.
- Every converted (today's-dollars) figure on screen must expose its nominal counterpart. This is asserted, not reviewed.
- The page body never scrolls horizontally. Only the table may, inside its own container.
- Prettier config is authoritative: double quotes, semicolons, 2-space indent, print width 100, trailing commas.
- Commit after every task. Branch: `feat/ui-redesign` off `main`.

---

## File Structure

**Create:**

| File | Responsibility |
|---|---|
| `src/styles/theme.css` | Tailwind entry, `@theme` tokens, dark variant |
| `src/styles/tokens.ts` | Same palette in TS, for antd's `ConfigProvider` |
| `src/models/ProjectionView.ts` | `ProjectionPoint`, `ProjectionView` types |
| `src/services/presentValue.ts` | Discounting and the nominal→view transform |
| `src/components/ui/StatTile.tsx` | Label, figure, optional nominal footnote |
| `src/components/ui/ScrubField.tsx` | Number input merged with its slider |
| `src/components/Input/InputBar.tsx` | Grouped inputs, replaces `InputPanel` |
| `src/components/Results/ProjectionChart.tsx` | `cash` and `stack` variants |
| `src/components/Results/StrategyCard.tsx` | One strategy's headline + mini chart |
| `src/components/Results/StrategyComparison.tsx` | The two cards, selection state |
| `src/components/Results/StrategyDetail.tsx` | Full chart + table for the selection |

**Modify:** `vite.config.ts`, `src/main.tsx`, `src/App.tsx`, `src/components/Calculator.tsx`, `src/components/Results/tabs/TableTab.tsx`, `test/App.spec.tsx`.

**Delete (Task 13, once nothing imports them):** `src/components/Results/tabs/Summary.tsx`, `OptimizedSummary.tsx`, `Result.tsx`, `src/components/Results/InfoBox.tsx`, `src/components/Input/InputPanel.tsx`, and every `.scss` file except none — all seven go.

---

### Task 1: Tailwind v4 alongside antd (spike + gate)

This is the gate the spec calls for. If antd's widgets break under Tailwind and cannot be reconciled here, stop and fall back to SCSS-plus-tokens; every later task's design survives, only the styling mechanism changes.

**Files:**
- Modify: `vite.config.ts`
- Create: `src/styles/theme.css`
- Modify: `src/main.tsx`
- Modify: `package.json` (dependency)

**Interfaces:**
- Consumes: nothing
- Produces: Tailwind utilities available in every component; `src/styles/theme.css` imported once from `main.tsx`

- [ ] **Step 1: Install Tailwind**

```bash
pnpm add -D tailwindcss@^4.3.3 @tailwindcss/vite@^4.3.3
```

- [ ] **Step 2: Register the plugin**

In `vite.config.ts`, add the import and put `tailwindcss()` after `react()`. Leave the `legacy` and `test` blocks exactly as they are.

```ts
import tailwindcss from "@tailwindcss/vite";
// ...
  plugins: [react(), tailwindcss()],
```

- [ ] **Step 3: Create the stylesheet without preflight**

Create `src/styles/theme.css`. Preflight is deliberately not imported — it resets the base styles antd relies on.

```css
/* Preflight is deliberately omitted: it fights antd's own base styles. */
@import "tailwindcss/theme.css" layer(theme);
@import "tailwindcss/utilities.css" layer(utilities);

/* Dark mode keys off the [data-theme] attribute that useLocalStorage already
   drives in App.tsx, not off prefers-color-scheme. */
@custom-variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

@theme {
  --color-accent: #f6931a;
  --color-accent-soft: #f6931a1f;

  --color-surface: #ffffff;
  --color-surface-sunken: #f5f5f5;
  --color-border: #e3e3e3;
  --color-ink: #1f2023;
  --color-ink-muted: #63666b;

  --color-gain: #2f9e6e;
  --color-loss: #c0483f;

  --font-mono: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace;
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}

:root[data-theme="dark"] {
  --color-surface: #2c2c2d;
  --color-surface-sunken: #1f2023;
  --color-border: #383739;
  --color-ink: #dadada;
  --color-ink-muted: #9a9ca1;
}

body {
  background-color: var(--color-surface-sunken);
  color: var(--color-ink);
  font-family: var(--font-sans);
}
```

- [ ] **Step 4: Import it once, before App's own styles**

In `src/main.tsx`, add as the first import:

```ts
import "./styles/theme.css";
```

- [ ] **Step 5: Prove antd still renders — write the probe test**

antd's `Table`, `Slider` and `Popover` are the three most style-sensitive widgets in the app. Create `test/tailwind-antd.spec.tsx`:

```tsx
import { beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Popover, Slider, Table } from "antd";
import { initI18n } from "./test-utils";

beforeAll(async () => {
  await initI18n();
});

describe("antd under Tailwind", () => {
  it("renders a Table with its rows", () => {
    render(
      <Table
        dataSource={[{ key: 1, age: 43 }]}
        columns={[{ title: "Age", dataIndex: "age", key: "age" }]}
        pagination={false}
      />,
    );

    expect(screen.getByText("Age")).toBeInTheDocument();
    expect(screen.getByText("43")).toBeInTheDocument();
  });

  it("renders a Slider with its handle", () => {
    const { container } = render(<Slider min={0} max={100} defaultValue={20} />);

    expect(container.querySelector(".ant-slider-handle")).not.toBeNull();
  });

  it("opens a Popover", async () => {
    const user = userEvent.setup();
    render(
      <Popover content={<span>panel body</span>} title="panel" trigger="click">
        <button>open</button>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "open" }));

    expect(await screen.findByText("panel body")).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run the probe**

Run: `pnpm test:run`
Expected: PASS, and `build-smoke.spec.ts` still passes — that one executes the real bundle, so it is what proves the Tailwind plugin did not break the build.

- [ ] **Step 7: Browser check**

```bash
pnpm build && pnpm preview
```

Open the preview. Confirm the calculator still renders, the table has borders and padding, the sliders drag, and the donate popover opens. jsdom cannot see any of this — that is why this step exists.

**Gate:** if any widget is visibly broken and not fixable by adjusting the import layers, stop and report. Do not proceed to Task 2.

- [ ] **Step 8: Commit**

```bash
git add vite.config.ts package.json pnpm-lock.yaml src/styles/theme.css src/main.tsx test/tailwind-antd.spec.tsx
git commit -m "build: add Tailwind v4 alongside antd, without preflight"
```

---

### Task 2: Feed antd from the same tokens

**Files:**
- Create: `src/styles/tokens.ts`
- Create: `test/tokens.spec.ts`
- Modify: `src/App.tsx:32-36` (the `ConfigProvider` theme prop)

**Interfaces:**
- Consumes: `src/styles/theme.css` from Task 1
- Produces: `export const palette` and `export const antdTokens(isDark: boolean)` from `src/styles/tokens.ts`

- [ ] **Step 1: Write the failing test**

The risk is drift: two files holding the same hex values that silently diverge. The test parses the CSS and compares, so drift fails the build rather than being caught in review.

Create `test/tokens.spec.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { palette } from "../src/styles/tokens";

const css = readFileSync(resolve(import.meta.dirname, "../src/styles/theme.css"), "utf8");

const cssVar = (name: string, block: "light" | "dark") => {
  const source =
    block === "light"
      ? css.slice(css.indexOf("@theme"), css.indexOf(':root[data-theme="dark"]'))
      : css.slice(css.indexOf(':root[data-theme="dark"]'));
  const match = source.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return match ? match[1].trim() : undefined;
};

describe("tokens", () => {
  it("keeps the TypeScript palette in step with theme.css", () => {
    expect(palette.light.accent).toBe(cssVar("color-accent", "light"));
    expect(palette.light.surface).toBe(cssVar("color-surface", "light"));
    expect(palette.light.ink).toBe(cssVar("color-ink", "light"));
    expect(palette.dark.surface).toBe(cssVar("color-surface", "dark"));
    expect(palette.dark.ink).toBe(cssVar("color-ink", "dark"));
  });

  it("hands antd a token object for each theme", () => {
    expect(antdTokensFor(false).colorPrimary).toBe(palette.light.accent);
    expect(antdTokensFor(true).colorBgContainer).toBe(palette.dark.surface);
  });
});
```

Add the import for `antdTokensFor` at the top alongside `palette`:

```ts
import { antdTokensFor, palette } from "../src/styles/tokens";
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node_modules/.bin/vitest run test/tokens.spec.ts`
Expected: FAIL — `src/styles/tokens.ts` does not exist.

- [ ] **Step 3: Write the implementation**

Create `src/styles/tokens.ts`:

```ts
/**
 * The same palette as `theme.css`, in a form antd's ConfigProvider can consume.
 * `test/tokens.spec.ts` parses the CSS and fails if the two drift apart.
 */
export const palette = {
  light: {
    accent: "#f6931a",
    surface: "#ffffff",
    surfaceSunken: "#f5f5f5",
    border: "#e3e3e3",
    ink: "#1f2023",
    inkMuted: "#63666b",
  },
  dark: {
    accent: "#f6931a",
    surface: "#2c2c2d",
    surfaceSunken: "#1f2023",
    border: "#383739",
    ink: "#dadada",
    inkMuted: "#9a9ca1",
  },
} as const;

export const antdTokensFor = (isDark: boolean) => {
  const p = isDark ? palette.dark : palette.light;
  return {
    colorPrimary: p.accent,
    colorBgContainer: p.surface,
    colorBorder: p.border,
    colorText: p.ink,
    colorTextSecondary: p.inkMuted,
    fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
  };
};
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `node_modules/.bin/vitest run test/tokens.spec.ts`
Expected: PASS

- [ ] **Step 5: Wire it into ConfigProvider**

In `src/App.tsx`, replace the `theme` prop:

```tsx
<ConfigProvider
  theme={{
    algorithm: useDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: antdTokensFor(useDarkMode),
  }}
>
```

Add the import: `import { antdTokensFor } from "./styles/tokens";`

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && pnpm lint && pnpm test:run`
Expected: all green, 32 tests.

- [ ] **Step 7: Commit**

```bash
git add src/styles/tokens.ts test/tokens.spec.ts src/App.tsx
git commit -m "feat: drive antd's theme from the same tokens as Tailwind"
```

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
- Create: `src/components/ui/StatTile.tsx`
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
import StatTile from "../src/components/ui/StatTile";

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

Create `src/components/ui/StatTile.tsx`:

```tsx
interface StatTileProps {
  label: string;
  value: string;
  /** Set whenever `value` has been discounted, so the future amount stays visible. */
  nominal?: string;
  size?: "hero" | "normal";
}

const StatTile = ({ label, value, nominal, size = "normal" }: StatTileProps) => (
  <div className="flex flex-col gap-0.5 rounded-lg border border-[--color-border] p-3">
    <span className="text-xs uppercase tracking-wide text-[--color-ink-muted]">{label}</span>
    <span
      className={`font-mono font-bold leading-none ${size === "hero" ? "text-4xl" : "text-lg"}`}
    >
      {value}
    </span>
    {nominal && <span className="text-xs text-[--color-ink-muted]">{nominal}</span>}
  </div>
);

export default StatTile;
```

- [ ] **Step 4: Run the tests**

Run: `node_modules/.bin/vitest run test/StatTile.spec.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/StatTile.tsx test/StatTile.spec.tsx
git commit -m "feat: add StatTile with nominal disclosure"
```

---

### Task 5: ScrubField

**Files:**
- Create: `src/components/ui/ScrubField.tsx`
- Create: `test/ScrubField.spec.tsx`

**Interfaces:**
- Consumes: nothing
- Produces: `ScrubField` with props `{ label: string; name: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void }`

- [ ] **Step 1: Write the failing test**

Create `test/ScrubField.spec.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScrubField from "../src/components/ui/ScrubField";

describe("ScrubField", () => {
  it("shows one accessible control for the value", () => {
    render(
      <ScrubField label="Annual buy" name="annualBuy" value={12000} min={0} max={200000} onChange={() => {}} />,
    );

    expect(screen.getByRole("spinbutton", { name: "Annual buy" })).toHaveValue("12000");
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

    const slider = screen.getByRole("slider", { name: "Growth" });
    expect(slider).toHaveAttribute("aria-valuemin", "0");
    expect(slider).toHaveAttribute("aria-valuemax", "100");
    expect(slider).toHaveAttribute("aria-valuenow", "20");
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node_modules/.bin/vitest run test/ScrubField.spec.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/components/ui/ScrubField.tsx`. The wrapper around the slider is what gives it a 44px touch target without growing the visible track.

```tsx
import { InputNumber, Slider } from "antd";

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
  const emit = (next: number | null) => {
    if (next === null || Number.isNaN(next)) {
      return;
    }
    onChange(next);
  };

  return (
    <div className="rounded-lg border border-[--color-border] px-3 pt-2 pb-1">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={name} className="text-xs text-[--color-ink-muted]">
          {label}
        </label>
        <InputNumber
          id={name}
          name={name}
          aria-label={label}
          className="font-mono"
          value={value}
          min={min}
          max={max}
          step={step}
          suffix={unit}
          variant="borderless"
          onChange={emit}
        />
      </div>
      <div className="-my-2 py-2">
        <Slider
          aria-label={label}
          value={value}
          min={min}
          max={max}
          step={step}
          tooltip={{ open: false }}
          onChange={emit}
        />
      </div>
      <div className="flex justify-between font-mono text-[10px] text-[--color-ink-muted]">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

export default ScrubField;
```

- [ ] **Step 4: Run the tests**

Run: `node_modules/.bin/vitest run test/ScrubField.spec.tsx`
Expected: PASS. If antd's `Slider` does not forward `aria-label`, wrap it in a `<div role="group" aria-label={label}>` and query within that instead — adjust the test to match what the widget actually renders, and note it in the commit.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/ScrubField.tsx test/ScrubField.spec.tsx
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
});
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
import StatTile from "../ui/StatTile";

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
        selected ? "border-[--color-accent] bg-[--color-accent-soft]" : "border-[--color-border]"
      }`}
    >
      <div>
        <div className="text-xs uppercase tracking-wide text-[--color-ink-muted]">{title}</div>
        <div className="font-mono text-3xl font-extrabold leading-none">
          {view.canRetire ? view.retirementAge : "—"}
        </div>
        <div className="text-xs text-[--color-ink-muted]">{caption}</div>
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
- Create: `test/TableTab.spec.tsx`

**Interfaces:**
- Consumes: `ProjectionView`
- Produces: `TableTab` props change from `CalculationResult` to `{ view: ProjectionView }`

- [ ] **Step 1: Write the failing test**

Create `test/TableTab.spec.tsx`:

```tsx
import { beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
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
    expect(screen.getByText(/savings \(today\)/i)).toBeInTheDocument();
    expect(screen.getByText(/savings \(nominal\)/i)).toBeInTheDocument();
  });

  it("renders one row per projected year", () => {
    const view = toProjectionView(calculateOptimal(INPUT, 79_350.17), INPUT);
    const { container } = render(<TableTab view={view} />);

    const rows = container.querySelectorAll(".ant-table-tbody tr[data-row-key]");
    expect(rows).toHaveLength(view.points.length);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `node_modules/.bin/vitest run test/TableTab.spec.tsx`
Expected: FAIL — `TableTab` still takes `CalculationResult`.

- [ ] **Step 3: Rewrite TableTab**

Replace the whole of `src/components/Results/tabs/TableTab.tsx`. Keep the existing column-toggle popover; change the data source to `ProjectionView` and add the nominal column. Delete the `./TableTab.scss` import and move its two rules to utilities.

```tsx
import { Button, Checkbox, CheckboxOptionType, Popover, Table, TableProps } from "antd";
import { useState } from "react";
import { SettingOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { ProjectionPoint, ProjectionView } from "../../../models/ProjectionView";
import { toUsd } from "../../../constants";

const TableTab = ({ view }: { view: ProjectionView }) => {
  const [t] = useTranslation();

  const columns: TableProps<ProjectionPoint>["columns"] = [
    { title: t("table.year"), dataIndex: "year", key: "year", width: "5rem" },
    { title: t("table.age"), dataIndex: "age", key: "age", width: "4rem" },
    {
      title: t("table.bitcoin-price"),
      dataIndex: "bitcoinPrice",
      key: "bitcoinPrice",
      render: (n: number) => <span className="font-mono">{toUsd(n)}</span>,
    },
    {
      title: "Savings (today)",
      dataIndex: "savingsFiatReal",
      key: "savingsFiatReal",
      render: (n: number) => <span className="font-mono">{toUsd(n)}</span>,
    },
    {
      title: "Savings (nominal)",
      dataIndex: "savingsFiat",
      key: "savingsFiat",
      render: (n: number) => (
        <span className="font-mono text-[--color-ink-muted]">{toUsd(n)}</span>
      ),
    },
    {
      title: t("table.accumulated-savings-btc"),
      dataIndex: "savingsBitcoin",
      key: "savingsBitcoin",
      render: (n: number) => <span className="font-mono">{n.toFixed(8)}</span>,
    },
    {
      title: t("table.you-bought"),
      dataIndex: "bitcoinFlow",
      key: "bitcoinFlow",
      render: (n: number) => <span className="font-mono">{n.toFixed(8)}</span>,
    },
  ];

  const [checkedList, setCheckedList] = useState(columns.map((c) => c.key as string));
  const options = columns.map(({ key, title }) => ({ label: title, value: key }));
  const shown = columns.map((c) => ({ ...c, hidden: !checkedList.includes(c.key as string) }));

  return (
    <div className="overflow-x-auto">
      <Table
        rowKey="key"
        dataSource={view.points}
        columns={shown}
        pagination={false}
        bordered
        scroll={{ y: 260 }}
        footer={() => (
          <div className="flex justify-end">
            <Popover
              trigger="click"
              placement="topRight"
              title={t("table.config.title")}
              content={
                <Checkbox.Group
                  className="flex max-w-40 flex-col"
                  value={checkedList}
                  options={options as CheckboxOptionType[]}
                  onChange={(v) => setCheckedList(v as string[])}
                />
              }
            >
              <Button aria-label="Choose columns" icon={<SettingOutlined />} />
            </Popover>
          </div>
        )}
      />
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

- [ ] **Step 6: Commit**

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
    <section className="flex flex-col gap-3 rounded-xl border border-[--color-border] p-4">
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
                  ? "bg-[--color-accent] text-black"
                  : "border border-[--color-border] text-[--color-ink-muted]"
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
import { InputNumber } from "antd";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { InputData } from "../../models/InputData";
import ScrubField from "../ui/ScrubField";

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
        <legend className="text-xs uppercase tracking-wide text-[--color-ink-muted]">
          About you
        </legend>
        <label className="flex items-center justify-between gap-2 text-xs">
          {t("input.current-age")}
          <InputNumber
            aria-label="Current age"
            className="font-mono"
            min={0}
            max={120}
            value={currentAge}
            onChange={(v) => v !== null && set("currentAge", v)}
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-xs">
          {t("input.life-expectancy")}
          <InputNumber
            aria-label="Life expectancy"
            className="font-mono"
            min={1}
            max={130}
            value={lifeExpectancy}
            onChange={(v) => v !== null && set("lifeExpectancy", v)}
          />
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs uppercase tracking-wide text-[--color-ink-muted]">
          Your bitcoin
        </legend>
        <label className="flex items-center justify-between gap-2 text-xs">
          {t("input.savings-btc")}
          <InputNumber
            aria-label="Bitcoin held"
            className="font-mono"
            min={0}
            step={0.01}
            value={currentSavings}
            onChange={(v) => v !== null && set("currentSavings", v)}
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
        <legend className="text-xs uppercase tracking-wide text-[--color-ink-muted]">
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
import { useState } from "react";
import { Spin } from "antd";
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
  const [conservative, setConservative] = useState<ProjectionView>();
  const [optimized, setOptimized] = useState<ProjectionView>();
  const [selected, setSelected] = useState<StrategyKey>("optimized");
  const [t] = useTranslation();
  const btcPrice = useBitcoinPrice(REFRESH_INTERVAL_MS);

  // Both strategies are computed on every change now. The switch used to pick
  // which one to calculate; the comparison shows both, so it picks which one
  // the detail panel expands.
  const refresh = (data: InputData) => {
    if (!btcPrice) {
      return;
    }
    setConservative(toProjectionView(calculate({ ...data, optimized: false }, btcPrice), data));
    setOptimized(toProjectionView(calculateOptimal({ ...data, optimized: true }, btcPrice), data));
  };

  if (!btcPrice || btcPrice <= 0) {
    return <Spin fullscreen />;
  }

  const selectedView = selected === "optimized" ? optimized : conservative;

  return (
    <div className="flex flex-col gap-4">
      <InputBar onCalculate={refresh} />

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

### Task 12: Delete what the redesign replaced

**Files:**
- Delete: `src/components/Results/tabs/Result.tsx`, `Summary.tsx`, `OptimizedSummary.tsx`
- Delete: `src/components/Results/InfoBox.tsx`, `InfoBox.scss`
- Delete: `src/components/Input/InputPanel.tsx`, `InputPanel.scss`
- Delete: `src/models/LineChartProps.ts`, `src/components/Results/tabs/LineChart.tsx`, `ChartTab.tsx`
- Delete: `src/App.scss`, `src/components/Calculator.scss`
- Modify: `src/App.tsx`, `src/components/Misc/Donate.tsx`, `src/components/Input/ExplanatoryOverlay.tsx`

- [ ] **Step 1: Confirm nothing imports them**

```bash
grep -rn "InfoBox\|OptimizedSummary\|InputPanel\|LineChartProps\|ChartTab\|Result\b" src --include=*.tsx --include=*.ts
```

Expected: no hits outside the files being deleted. If `Result` still appears, it is `CalculationResult` — check the match before acting.

- [ ] **Step 2: Delete**

```bash
git rm src/components/Results/tabs/Result.tsx src/components/Results/tabs/Summary.tsx \
       src/components/Results/tabs/OptimizedSummary.tsx src/components/Results/tabs/ChartTab.tsx \
       src/components/Results/tabs/LineChart.tsx src/components/Results/InfoBox.tsx \
       src/components/Results/InfoBox.scss src/components/Input/InputPanel.tsx \
       src/components/Input/InputPanel.scss src/models/LineChartProps.ts \
       src/App.scss src/components/Calculator.scss
```

- [ ] **Step 3: Port App.tsx to utilities**

Remove `import "./App.scss";` from `src/App.tsx` and replace the layout classes. The `.title` class must stay as a class name — `test/App.spec.tsx` scopes its switch query to `.title`.

```tsx
    <div data-theme={userTheme} className="min-h-screen">
      {/* ... ConfigProvider ... */}
        <div className="mx-auto max-w-6xl px-4">
          <div className="title flex items-center justify-center gap-2 py-4 text-2xl">
```

and the signature row:

```tsx
          <div className="flex items-center justify-end gap-1.5 py-4 text-sm font-medium">
```

- [ ] **Step 4: Port the two remaining stylesheets**

`Donate.scss` and `ExplanatoryOverlay.scss` hold one rule each. Replace the imports with utilities on the elements — `.donate-content` becomes `flex min-h-[270px] min-w-[270px] flex-col items-center justify-center`, `.explanatory-overlay` becomes `max-w-[400px]`, its title `font-extrabold underline`. Then delete both files.

Note: `test/Donate.spec.tsx` asserts `document.querySelector(".donate-content canvas")`. Keep the `donate-content` class name on the wrapper alongside the utilities, or update that assertion — either is fine, but the test must pass.

- [ ] **Step 5: Verify nothing is left**

```bash
find src -name "*.scss"
```

Expected: no output.

- [ ] **Step 6: Run the whole suite**

Run: `npx tsc --noEmit && pnpm lint && pnpm test:run`
Expected: green.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "refactor: delete the components and stylesheets the redesign replaced"
```

---

### Task 13: Accessibility and the final responsive pass

**Files:**
- Modify: `src/App.tsx` (theme switch label)
- Modify: `test/App.spec.tsx`

- [ ] **Step 1: Give the theme switch an accessible name**

In `src/App.tsx`, add to the `Switch`:

```tsx
                aria-label="Dark mode"
```

- [ ] **Step 2: Simplify the test that worked around its absence**

In `test/App.spec.tsx`, the theme toggle test scopes by `.title` because the switches had no names. Replace that query:

```tsx
    await user.click(screen.getByRole("switch", { name: "Dark mode" }));
```

and drop the `header`/`within` lines and the now-unused `within` import.

- [ ] **Step 3: Run the suite**

Run: `npx tsc --noEmit && pnpm lint && pnpm test:run`
Expected: green.

- [ ] **Step 4: Full browser pass**

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

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: label the theme switch and settle the responsive pass"
```

---

## Self-Review

**Spec coverage:** Tailwind and preflight → Task 1. Tokens feeding antd → Task 2. Present value outside the calculators → Task 3. StatTile → 4. ScrubField and the merged sliders → 5. Both chart variants and the unit toggle → 6 and 9. Both strategies computed → 11. Comparison layout → 7. Nominal disclosure → 4 (tile), 6 (tooltip), 8 (table column). Responsive per-region → 11 and 13. Deleting `Summary`/`OptimizedSummary`/SCSS → 12. Accessibility → 13.

**Known gap:** the spec's `InputGroup` component is not built as a separate file; Task 10 uses `<fieldset>` directly, which carries the grouping semantics natively and needs no wrapper. This is a deliberate simplification, not an omission.

**Type consistency:** `ProjectionView`/`ProjectionPoint` defined in Task 3 and consumed unchanged in 6, 7, 8, 9, 11. `ChartUnit` exported from `ProjectionChart` in Task 6 and imported in Task 9. `StrategyKey` exported from `StrategyComparison` in Task 7 and imported in Task 11. `toProjectionView(result, input)` keeps the same two-argument shape everywhere.
