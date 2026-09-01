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

  it("plots the converted savings, not the nominal ones", () => {
    // The assertion above passes on either series: the nominal drawdown falls
    // monotonically too. Only comparing against both figures separates them.
    const view = conservativeView();
    const series = buildSeries(view, "cash", "fiat");

    expect(series.datasets[0].data).toStrictEqual(view.points.map((p) => p.savingsFiatReal));
    expect(series.datasets[0].data).not.toStrictEqual(view.points.map((p) => p.savingsFiat));
  });

  it("counts nothing as sold while the stack is still being bought", () => {
    const view = optimizedView();
    const sold = buildSeries(view, "stack", "btc").datasets[1].data;
    const retirementIndex = view.points.findIndex((p) => p.age === view.retirementAge);

    expect(sold.slice(0, retirementIndex).every((v) => v === 0)).toBe(true);
    expect(sold[retirementIndex]).toBeGreaterThan(0);
  });
});

/**
 * chart.js gives up at "can't acquire context" under jsdom's stubbed canvas, so
 * a real render would swallow every configuration mistake silently. Capturing
 * the props handed to `Line` asserts the one thing jsdom can still see: exactly
 * what this component tells chart.js to draw.
 */
interface CapturedChart {
  data: ChartData<"line", number[], string>;
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

const renderChart = (view: ProjectionView, variant: ChartVariant, unit: ChartUnit) => {
  render(<ProjectionChart view={view} variant={variant} unit={unit} />);
  return chart.props as CapturedChart;
};

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

    const lines = afterBody(renderChart(view, "cash", "fiat").options)([{ dataIndex: 3 }]);

    expect(lines).toStrictEqual([`nominal ${toUsd(point.savingsFiat)} in ${point.year}`]);
  });

  it("names no withdrawal in a year where nothing was withdrawn", () => {
    const view = optimizedView();

    const lines = afterBody(renderChart(view, "stack", "fiat").options)([{ dataIndex: 0 }]);

    expect(lines).toHaveLength(1);
  });

  it("gives the stack a single axis and the cash view a second one", () => {
    const stack = renderChart(optimizedView(), "stack", "btc");
    // One unit at a time is how the stack's scale problem disappears rather
    // than being managed by a second axis.
    expect(stack.options?.scales?.btc).toBeUndefined();
    expect(stack.data.datasets.every((d) => d.yAxisID === "main")).toBe(true);

    const cash = renderChart(conservativeView(), "cash", "fiat");
    expect(cash.options?.scales?.btc).toBeDefined();
    expect(cash.data.datasets.map((d) => d.yAxisID)).toStrictEqual(["main", "btc"]);
  });

  it("labels each axis in the unit that axis is plotting", () => {
    const stack = renderChart(optimizedView(), "stack", "btc");
    expect(tickFormat(stack.options, "main")(1.6)).toBe("₿1.60");

    const cash = renderChart(conservativeView(), "cash", "fiat");
    expect(tickFormat(cash.options, "main")(7_143_126)).toBe("$7.1M");
    expect(tickFormat(cash.options, "btc")(1.6)).toBe("₿1.60");
  });

  it("formats each tooltip value in the unit that series is denominated in", () => {
    // Left alone chart.js prints the raw number: "$ value: 900127.169" beside
    // an axis reading $900K. Caught in a browser, not here — jsdom never gets
    // far enough to draw a tooltip.
    const cash = renderChart(conservativeView(), "cash", "fiat");
    const label = tooltipLabel(cash.options);

    expect(label({ datasetIndex: 0, parsed: { y: 900_127.169 } })).toBe("$ savings: 900,127");
    expect(label({ datasetIndex: 1, parsed: { y: 1.6232745 } })).toBe("₿ held: 1.6233");
    // A gap in the line reads as absent, never as a zero balance.
    expect(label({ datasetIndex: 0, parsed: { y: null } })).toBe("$ savings");
  });

  it("describes what it is plotting for a reader who cannot see the canvas", () => {
    renderChart(optimizedView(), "stack", "btc");

    expect(screen.getByRole("img", { name: /ages 31 to 83/ })).toHaveAccessibleName(
      /₿ held.*₿ sold/,
    );
  });
});
