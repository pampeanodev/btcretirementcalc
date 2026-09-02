import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ChartData, ChartOptions } from "chart.js";
import ProjectionChart, { buildSeries } from "../src/components/Results/ProjectionChart";
import type { ChartUnit, ChartVariant } from "../src/components/Results/ProjectionChart";
import { toProjectionView } from "../src/services/presentValue";
import { calculate } from "../src/services/bitcoinRetirementCalculator";
import { calculateOptimal } from "../src/services/bitcoinRetirementOptimizedCalculator";
import { InputData } from "../src/models/InputData";
import { ProjectionView } from "../src/models/ProjectionView";
import { toUsd } from "../src/constants";

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
    const after = (data: (number | null)[]): number[] => {
      const tail = data.slice(view.points.findIndex((p) => p.age === view.retirementAge));
      // Both series are strictly positive after retirement, so the log-axis
      // nulling never touches them. Pinned, because if it ever did the
      // comparisons below would be comparing against a hole.
      expect(tail.every((v) => v !== null)).toBe(true);
      return tail as number[];
    };

    const btc = after(buildSeries(view, "stack", "btc").datasets[0].data);
    const fiat = after(buildSeries(view, "stack", "fiat").datasets[0].data);

    expect(btc[btc.length - 1]).toBeLessThan(btc[0]);
    expect(fiat[fiat.length - 1]).toBeGreaterThan(fiat[0]);
  });

  it("cash plots the drawdown in today's money", () => {
    const view = conservativeView();
    const series = buildSeries(view, "cash");

    expect(series.datasets[0].label).toBe("$ savings");
    const cash = series.datasets[0].data.slice(
      view.points.findIndex((p) => p.age === view.retirementAge),
    ) as number[];
    expect(cash).toStrictEqual([...cash].sort((a, b) => b - a));
  });

  it("plots the converted savings, not the nominal ones", () => {
    // The assertion above passes on either series: the nominal drawdown falls
    // monotonically too. Only comparing against both figures separates them.
    const view = conservativeView();
    const series = buildSeries(view, "cash");

    expect(series.datasets[0].data).toStrictEqual(view.points.map((p) => p.savingsFiatReal));
    expect(series.datasets[0].data).not.toStrictEqual(view.points.map((p) => p.savingsFiat));
  });

  it("counts nothing as sold while the stack is still being bought", () => {
    const view = optimizedView();
    const sold = buildSeries(view, "stack", "btc").datasets[1].data;
    const retirementIndex = view.points.findIndex((p) => p.age === view.retirementAge);

    expect(sold.slice(0, retirementIndex).every((v) => v === null)).toBe(true);
    expect(sold[retirementIndex]).toBeGreaterThan(0);
  });

  it("nulls the pre-retirement withdrawals rather than plotting them as zero", () => {
    const view = optimizedView();
    const withdrawn = buildSeries(view, "stack", "fiat").datasets[1].data;
    const retirementIndex = view.points.findIndex((p) => p.age === view.retirementAge);

    // A log axis cannot place zero, and a zero would draw a line along the axis
    // asserting a withdrawal was made in a year when none was.
    expect(withdrawn.slice(0, retirementIndex).every((v) => v === null)).toBe(true);
    expect(withdrawn[retirementIndex]).toBeGreaterThan(0);
  });

  it("nulls the bitcoin sales too, though this axis could plot a zero", () => {
    // The linear bitcoin axis has no technical objection to a zero. This is the
    // honesty rule rather than the log-axis rule: a zero is a plotted claim that
    // a sale of nothing took place, which is a different statement from no sale
    // having happened at all. Both series now say the same thing the same way.
    const view = optimizedView();
    const sold = buildSeries(view, "stack", "btc").datasets[1].data;

    expect(sold[0]).toBeNull();
    expect(sold.some((v) => typeof v === "number" && v > 0)).toBe(true);
  });

  it("nulls a dollar series that a log axis could not plot at all", () => {
    // The only way any dollar figure goes non-positive: a user holding no
    // bitcoin who buys none. Measured across 4,608 input combinations, this is
    // the sole case — never negative, and a retiring pot never drains to zero.
    const barren: InputData = {
      ...INPUT,
      currentSavingsInBitcoin: 0,
      annualBuyInFiat: 0,
      optimized: false,
    };
    const view = toProjectionView(calculate(barren, PRICE), barren);

    expect(view.points.every((p) => p.savingsFiatReal === 0)).toBe(true);
    expect(buildSeries(view, "cash").datasets[0].data.every((v) => v === null)).toBe(true);
  });

  it("fills an area only where two series share an axis and a unit", () => {
    // Two translucent areas over scales with no relationship read as a
    // meaningful crossing where there is none.
    expect(buildSeries(conservativeView(), "cash").datasets.map((d) => d.fill)).toStrictEqual([
      "start",
      false,
    ]);
    // Same axis, same unit: a crossing there does mean something.
    expect(buildSeries(optimizedView(), "stack", "btc").datasets.map((d) => d.fill)).toStrictEqual([
      "origin",
      "origin",
    ]);
    // "start", not "origin": a log axis puts zero at negative infinity.
    expect(buildSeries(optimizedView(), "stack", "fiat").datasets.map((d) => d.fill)).toStrictEqual(
      ["start", "start"],
    );
  });
});

/**
 * chart.js gives up at "can't acquire context" under jsdom's stubbed canvas, so
 * a real render would swallow every configuration mistake silently. Capturing
 * the props handed to `Line` asserts the one thing jsdom can still see: exactly
 * what this component tells chart.js to draw.
 */
interface CapturedChart {
  data: ChartData<"line", (number | null)[], string>;
  options?: ChartOptions<"line">;
  "aria-label"?: string;
}

const chart = vi.hoisted(() => ({ props: undefined as unknown }));

vi.mock("react-chartjs-2", () => ({
  Line: (props: CapturedChart) => {
    chart.props = props;
    // The real component hard-codes role="img" on the canvas and spreads the
    // remaining props onto it; this mirrors that.
    return <canvas role="img" aria-label={props["aria-label"]} />;
  },
}));

// Deliberately not the values in theme.css. A component that hard-coded the
// real hexes would pass against the real palette and fail here, which is the
// whole point of asserting against a token at all.
const TOKENS: Record<string, string> = {
  "--color-bitcoin": "#111111",
  "--color-gain": "#222222",
  "--color-ink-muted": "#333333",
  "--border": "#444444",
};

function renderChart(view: ProjectionView, variant: "cash"): CapturedChart;
function renderChart(view: ProjectionView, variant: "stack", unit: ChartUnit): CapturedChart;
function renderChart(view: ProjectionView, variant: ChartVariant, unit?: ChartUnit) {
  render(
    variant === "cash" ? (
      <ProjectionChart view={view} variant="cash" />
    ) : (
      <ProjectionChart view={view} variant="stack" unit={unit ?? "btc"} />
    ),
  );
  return chart.props as CapturedChart;
}

/**
 * chart.js types both callbacks with a `this` binding and parameters the
 * implementations here never read, which cannot be supplied from a test. The
 * casts narrow to the shape actually invoked; the real signatures are still
 * checked where the callbacks are written.
 */
const afterBody = (options?: ChartOptions<"line">) =>
  options?.plugins?.tooltip?.callbacks?.afterBody as (
    items: { dataIndex: number }[],
  ) => string[] | undefined;

const tickFormat = (options: ChartOptions<"line"> | undefined, axis: "main" | "btc") =>
  options?.scales?.[axis]?.ticks?.callback as (value: number) => string | undefined;

const tooltipLabel = (options?: ChartOptions<"line">) =>
  options?.plugins?.tooltip?.callbacks?.label as (item: {
    datasetIndex: number;
    parsed: { y: number | null };
  }) => string;

describe("ProjectionChart", () => {
  beforeEach(() => {
    // theme.css never loads in jsdom, so the tokens are declared by hand.
    for (const [name, value] of Object.entries(TOKENS)) {
      document.documentElement.style.setProperty(name, value);
    }
  });

  it("paints each series from a theme token rather than a literal colour", () => {
    const props = renderChart(optimizedView(), "stack", "btc");

    expect(props.data.datasets[0].borderColor).toBe(TOKENS["--color-bitcoin"]);
    expect(props.data.datasets[1].borderColor).toBe(TOKENS["--color-ink-muted"]);
    // The area fill is the same token at an eighth alpha, not a second colour.
    expect(props.data.datasets[0].backgroundColor).toBe(`${TOKENS["--color-bitcoin"]}33`);
  });

  it("re-reads the tokens so a theme switch repaints it", () => {
    document.documentElement.style.setProperty("--color-bitcoin", "#abcdef");

    const props = renderChart(optimizedView(), "stack", "btc");

    // A palette captured once at module load would still be on #111111 here.
    expect(props.data.datasets[0].borderColor).toBe("#abcdef");
  });

  it("discloses the nominal figure behind every converted one", () => {
    const view = optimizedView();
    const index = view.points.findIndex((p) => p.age === view.retirementAge) + 4;
    const point = view.points[index];

    const lines = afterBody(renderChart(view, "stack", "fiat").options)([{ dataIndex: index }]);

    expect(lines).toStrictEqual([
      `nominal ${toUsd(point.savingsFiat)} in ${point.year}`,
      `nominal withdrawal ${toUsd(point.annualBudget)}`,
    ]);
  });

  it("discloses the nominal stack on the variants that plot no withdrawal", () => {
    const view = conservativeView();
    const point = view.points[3];

    const lines = afterBody(renderChart(view, "cash").options)([{ dataIndex: 3 }]);

    expect(lines).toStrictEqual([`nominal ${toUsd(point.savingsFiat)} in ${point.year}`]);
  });

  it("names no withdrawal in a year where nothing was withdrawn", () => {
    const view = optimizedView();
    const point = view.points[0];

    const lines = afterBody(renderChart(view, "stack", "fiat").options)([{ dataIndex: 0 }]);

    // Asserting the exact line rather than the count: `toHaveLength(1)` passes
    // for any single line, including a wrong one, so it would not notice the
    // withdrawal text being swapped in for the stack text.
    expect(lines).toStrictEqual([`nominal ${toUsd(point.savingsFiat)} in ${point.year}`]);
  });

  it("gives the stack a single axis and the cash view a second one", () => {
    const stack = renderChart(optimizedView(), "stack", "btc");
    // One unit at a time is how the stack's scale problem disappears rather
    // than being managed by a second axis.
    expect(stack.options?.scales?.btc).toBeUndefined();
    expect(stack.data.datasets.every((d) => d.yAxisID === "main")).toBe(true);

    const cash = renderChart(conservativeView(), "cash");
    expect(cash.options?.scales?.btc).toBeDefined();
    expect(cash.data.datasets.map((d) => d.yAxisID)).toStrictEqual(["main", "btc"]);
  });

  it("labels each axis in the unit that axis is plotting", () => {
    const stack = renderChart(optimizedView(), "stack", "btc");
    expect(tickFormat(stack.options, "main")(1.6)).toBe("₿1.60");

    const cash = renderChart(conservativeView(), "cash");
    // A 1-2-5 step, because the dollar axis is logarithmic and only labels those.
    expect(tickFormat(cash.options, "main")(5_000_000)).toBe("$5M");
    expect(tickFormat(cash.options, "btc")(1.6)).toBe("₿1.60");
  });

  it("formats each tooltip value in the unit that series is denominated in", () => {
    // Left alone chart.js prints the raw number: "$ value: 900127.169" beside
    // an axis reading $900K. Caught in a browser, not here — jsdom never gets
    // far enough to draw a tooltip.
    const cash = renderChart(conservativeView(), "cash");
    const label = tooltipLabel(cash.options);

    expect(label({ datasetIndex: 0, parsed: { y: 900_127.169 } })).toBe("$ savings: 900,127");
    expect(label({ datasetIndex: 1, parsed: { y: 1.6232745 } })).toBe("₿ held: 1.6233");
    // A gap in the line reads as absent, never as a zero balance.
    expect(label({ datasetIndex: 0, parsed: { y: null } })).toBe("$ savings");
  });

  it("plots dollars logarithmically and bitcoin linearly", () => {
    // The fiat series starts at 1.44% of its own maximum, so a linear axis
    // buries twelve years of accumulation in the bottom tenth. Bitcoin starts
    // at 61% of its maximum and keeps its intuitive distances.
    expect(renderChart(optimizedView(), "stack", "fiat").options?.scales?.main?.type).toBe(
      "logarithmic",
    );
    expect(renderChart(optimizedView(), "stack", "btc").options?.scales?.main?.type).toBe("linear");

    const cash = renderChart(conservativeView(), "cash").options;
    expect(cash?.scales?.main?.type).toBe("logarithmic");
    expect(cash?.scales?.btc?.type).toBe("linear");
  });

  it("labels only the 1-2-5 steps of a log axis, so the ticks stay readable", () => {
    // Seen in a browser: chart.js's minor log ticks put $600K, $800K and $1M
    // close enough together to overlap into a smear.
    const format = tickFormat(renderChart(optimizedView(), "stack", "fiat").options, "main");

    expect(format(100_000)).toBe("$100K");
    expect(format(200_000)).toBe("$200K");
    expect(format(500_000)).toBe("$500K");
    expect(format(1_000_000)).toBe("$1M");
    expect(format(600_000)).toBeUndefined();
    expect(format(800_000)).toBeUndefined();
    expect(format(300_000)).toBeUndefined();
  });

  it("labels every tick on a linear axis, which does not crowd", () => {
    const stack = renderChart(optimizedView(), "stack", "btc");
    // The same filter on the bitcoin axis would blank most of its ticks.
    expect(tickFormat(stack.options, "main")(0.6)).toBe("₿0.60");
    expect(tickFormat(stack.options, "main")(0.8)).toBe("₿0.80");
  });

  it("says whose dollars they are, on every dollar axis", () => {
    // The tooltip disclosure is hover-only; axis ticks are read statically.
    const title = (options?: ChartOptions<"line">, axis: "main" | "btc" = "main") =>
      options?.scales?.[axis]?.title;

    expect(title(renderChart(optimizedView(), "stack", "fiat").options)).toMatchObject({
      display: true,
      text: "Today's dollars (log scale)",
    });
    expect(title(renderChart(conservativeView(), "cash").options)).toMatchObject({
      display: true,
      text: "Today's dollars (log scale)",
    });
    // Nothing on the bitcoin axes is converted, so neither carries the claim.
    expect(title(renderChart(optimizedView(), "stack", "btc").options)).toBeUndefined();
    expect(title(renderChart(conservativeView(), "cash").options, "btc")).toBeUndefined();
  });

  it("discloses nothing on a chart where nothing is converted", () => {
    const view = optimizedView();

    // stack/btc plots holdings and coins sold. Neither is inflation-adjusted,
    // so naming a nominal dollar figure is the disclosure mechanism firing
    // where there is nothing to disclose.
    expect(afterBody(renderChart(view, "stack", "btc").options)([{ dataIndex: 20 }])).toStrictEqual(
      [],
    );
  });

  it("describes what it is plotting for a reader who cannot see the canvas", () => {
    renderChart(optimizedView(), "stack", "btc");

    expect(screen.getByRole("img", { name: /ages 31 to 83/ })).toHaveAccessibleName(
      /₿ held.*₿ sold/,
    );
  });
});
