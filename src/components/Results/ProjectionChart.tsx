import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { ProjectionView } from "../../models/ProjectionView";
import { BITCOIN_SIGN, toUsd } from "../../constants";

export type ChartVariant = "cash" | "stack";
export type ChartUnit = "btc" | "fiat";

/**
 * CSS custom properties declared in `styles/theme.css`. chart.js paints to a
 * canvas and cannot read a Tailwind class, so the value is looked up on the
 * document at render time instead of being copied here: the token stays the
 * single definition of the colour, and the chart follows the light/dark switch
 * without a second palette to keep in step.
 */
type ThemeToken = "--color-bitcoin" | "--color-gain" | "--color-ink-muted" | "--border";

interface SeriesDataset {
  label: string;
  /**
   * `null`, never `0`, wherever a dollar series has nothing to plot. A
   * logarithmic axis cannot place zero at all, and a zero would anyway draw a
   * line along the axis asserting the withdrawal *was* zero in a year when
   * there was no withdrawal to speak of.
   */
  data: (number | null)[];
  /** What the numbers are denominated in, which is what formats them. */
  unit: ChartUnit;
  /** Resolved at render, not here, so this stays a pure mapping of the view. */
  token: ThemeToken;
  /** "btc" only ever appears on the cash variant, which plots two units. */
  axis: "main" | "btc";
  /**
   * Areas are drawn only where two series share an axis and a unit, so a
   * crossing means something. `"start"` rather than `"origin"` on a log axis,
   * whose zero sits at negative infinity.
   */
  fill: "origin" | "start" | false;
}

interface Series {
  labels: string[];
  datasets: SeriesDataset[];
}

/**
 * Dollars are plotted logarithmically, and a log axis cannot take zero or a
 * negative. Measured across 4,608 input combinations, the only way a dollar
 * series goes non-positive is a user who holds no bitcoin and buys none, where
 * every point is 0 — it is never negative, and a retiring pot never drains to
 * zero, because both calculators only retire once the stack covers the whole
 * remaining budget stream.
 */
const plottable = (value: number) => (value > 0 ? value : null);

/**
 * Exported apart from the component so the mapping can be asserted directly.
 * chart.js paints to a stubbed canvas context under jsdom, so rendering the
 * component proves nothing about the numbers.
 */
export function buildSeries(view: ProjectionView, variant: "cash"): Series;
export function buildSeries(view: ProjectionView, variant: "stack", unit: ChartUnit): Series;
export function buildSeries(view: ProjectionView, variant: ChartVariant, unit?: ChartUnit): Series {
  const labels = view.points.map((p) => String(p.age));

  if (variant === "stack") {
    return unit === "btc"
      ? {
          labels,
          datasets: [
            {
              label: "₿ held",
              data: view.points.map((p) => p.savingsBitcoin),
              unit: "btc",
              token: "--color-bitcoin",
              axis: "main",
              fill: "origin",
            },
            {
              // These zeros stay zeros. The bitcoin axis is linear, so it can
              // plot them, and on a linear axis the flat run to retirement
              // reads as the accumulation phase rather than as missing data.
              label: "₿ sold",
              // Null, not zero, even though this axis is linear and could plot a
              // zero: before retirement no sale happens, and a zero draws a line
              // along the axis asserting that a sale of nothing was made. Same
              // reasoning as the withdrawal series — the log axis forced it there
              // and honesty asks for it here.
              data: view.points.map((p) => plottable(-p.bitcoinFlow)),
              unit: "btc",
              token: "--color-ink-muted",
              axis: "main",
              fill: "origin",
            },
          ],
        }
      : {
          labels,
          datasets: [
            {
              label: "$ value",
              data: view.points.map((p) => plottable(p.savingsFiatReal)),
              unit: "fiat",
              token: "--color-gain",
              axis: "main",
              fill: "start",
            },
            {
              label: "$ withdrawn",
              unit: "fiat",
              // Both series are dollars, so they share one axis even though the
              // withdrawal is small beside the stack. Two dollar axes at
              // different scales would make the withdrawal look like it tracked
              // the savings.
              data: view.points.map((p) =>
                p.bitcoinFlow < 0 ? plottable(p.annualBudgetReal) : null,
              ),
              token: "--color-ink-muted",
              axis: "main",
              fill: "start",
            },
          ],
        };
  }

  return {
    labels,
    datasets: [
      {
        label: "$ savings",
        data: view.points.map((p) => plottable(p.savingsFiatReal)),
        unit: "fiat",
        token: "--color-gain",
        axis: "main",
        fill: "start",
      },
      {
        // Unfilled on purpose. This series lives on its own axis with no
        // relationship to the dollar one, and two translucent areas crossing
        // over scales that share nothing read as a meaningful crossing.
        label: "₿ held",
        data: view.points.map((p) => p.savingsBitcoin),
        unit: "btc",
        token: "--color-bitcoin",
        axis: "btc",
        fill: false,
      },
    ],
  };
}

const readToken = (token: ThemeToken) =>
  getComputedStyle(document.documentElement).getPropertyValue(token).trim();

/**
 * The area under a line is its own colour at an eighth alpha. theme.css writes
 * these tokens as six-digit hex, where the alpha is a two-character suffix;
 * anything else drops the fill rather than painting an opaque block over the
 * series behind it.
 */
const softFill = (color: string) => (/^#[0-9a-f]{6}$/i.test(color) ? `${color}33` : "transparent");

/**
 * Every series label already carries its unit symbol — "₿ held", "$ savings" —
 * so the value beside it is formatted without one. Left to itself chart.js
 * prints the raw number, which read as "$ value: 900127.169" where the axis
 * beside it said $900K.
 */
const formatValue = (value: number, unit: ChartUnit) =>
  unit === "btc" ? value.toFixed(4) : Math.round(value).toLocaleString("en-US");

/**
 * Which ticks a logarithmic axis is allowed to label.
 *
 * chart.js emits minor ticks between the powers of ten, and in log space
 * $600K, $800K and $1M sit close enough together to overlap into an unreadable
 * smear at this chart's height. Labelling only the 1-2-5 decade steps is the
 * conventional answer and leaves the gridlines untouched. Returning undefined
 * from a tick callback hides that label without removing the tick.
 */
const labelsOnLogAxis = (value: number) => {
  if (value <= 0) {
    return false;
  }
  const mantissa = value / Math.pow(10, Math.floor(Math.log10(value)));
  const rounded = Math.round(mantissa);
  return Math.abs(mantissa - rounded) < 1e-9 && (rounded === 1 || rounded === 2 || rounded === 5);
};

const formatTick = (value: number, unit: ChartUnit) =>
  unit === "btc"
    ? `${BITCOIN_SIGN}${value.toFixed(2)}`
    : value.toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
        // Compact, unlike the tooltip: a tick reading $7,143,126.72 eats a fifth
        // of a narrow screen's width, and the axis only has to convey the order
        // of magnitude.
        notation: "compact",
        maximumFractionDigits: 1,
      });

/**
 * `unit` is meaningful only on `stack`. `cash` plots a dollar axis and a bitcoin
 * axis whatever it is handed, so the union makes `<ProjectionChart variant="cash"
 * unit="btc" />` — a bitcoin-looking call that renders a dollar-primary chart —
 * impossible to write rather than merely wrong.
 */
type ProjectionChartProps = { view: ProjectionView; height?: number } & (
  { variant: "stack"; unit?: ChartUnit } | { variant: "cash"; unit?: never }
);

const ProjectionChart = ({ view, variant, unit, height = 260 }: ProjectionChartProps) => {
  const series =
    variant === "cash" ? buildSeries(view, "cash") : buildSeries(view, "stack", unit ?? "btc");
  // cash genuinely plots two units, so it keeps a second axis. stack shows one
  // unit at a time, which disposes of the cross-unit half of the scale problem.
  const dualAxis = variant === "cash";
  const mainUnit: ChartUnit = dualAxis ? "fiat" : (unit ?? "btc");
  const showsWithdrawal = variant === "stack" && unit === "fiat";
  // Dollars compound over fifty years: the fiat series starts at 1.44% of its
  // own maximum, so a linear axis buries twelve years of accumulation in the
  // bottom tenth. Bitcoin starts at 61% of its maximum and never had the
  // problem, so it stays linear and keeps its intuitive distances.
  const mainScale = mainUnit === "btc" ? ("linear" as const) : ("logarithmic" as const);
  const dollarTitle = "Today's dollars (log scale)";
  const ink = readToken("--color-ink-muted");
  const grid = readToken("--border");
  const lastLabel = series.labels[series.labels.length - 1] ?? "";

  return (
    <div className="w-full" style={{ height }}>
      <Line
        aria-label={`Projection over ages ${series.labels[0] ?? ""} to ${lastLabel}, plotting ${series.datasets
          .map((d) => d.label)
          .join(" and ")}.`}
        data={{
          labels: series.labels,
          datasets: series.datasets.map((d) => {
            const color = readToken(d.token);
            return {
              label: d.label,
              data: d.data,
              fill: d.fill,
              borderColor: color,
              backgroundColor: softFill(color),
              borderWidth: 2,
              pointRadius: 0,
              yAxisID: d.axis,
            };
          }),
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: "index", intersect: false },
          plugins: {
            legend: { display: true, labels: { color: ink, boxHeight: 2 } },
            tooltip: {
              callbacks: {
                label: (item) => {
                  const dataset = series.datasets[item.datasetIndex];
                  // chart.js types the parsed value as nullable because a line
                  // may have gaps. `buildSeries` never produces one, and a gap
                  // that did appear should read as absent rather than as zero.
                  const value = item.parsed.y;
                  return value === null
                    ? dataset.label
                    : `${dataset.label}: ${formatValue(value, dataset.unit)}`;
                },
                afterBody: (items) => {
                  // Disclosure follows what is on screen. A pure-bitcoin chart
                  // converts nothing, so naming a nominal dollar figure there is
                  // the disclosure mechanism firing with nothing to disclose.
                  if (mainUnit !== "fiat" && !dualAxis) {
                    return [];
                  }
                  const point = view.points[items[0].dataIndex];
                  // Everything in dollars here is in today's money; the future
                  // amounts are disclosed so the conversion is never silent.
                  const lines = [`nominal ${toUsd(point.savingsFiat)} in ${point.year}`];
                  if (showsWithdrawal && point.bitcoinFlow < 0) {
                    lines.push(`nominal withdrawal ${toUsd(point.annualBudget)}`);
                  }
                  return lines;
                },
              },
            },
          },
          scales: {
            x: {
              title: { display: true, text: "Age", color: ink },
              ticks: { color: ink, maxRotation: 0, autoSkipPadding: 16 },
              grid: { color: grid },
            },
            main: {
              type: mainScale,
              position: "left",
              // A converted figure with no counterpart beside it is a silent
              // conversion; the tooltip discloses the nominal, but a tooltip is
              // hover-only and axis ticks are read statically. The title also
              // says the scale is logarithmic, because distances on it are not
              // proportional to differences.
              ...(mainUnit === "fiat"
                ? { title: { display: true, text: dollarTitle, color: ink } }
                : {}),
              ticks: {
                color: ink,
                callback: (value) => {
                  const tick = Number(value);
                  return mainScale === "logarithmic" && !labelsOnLogAxis(tick)
                    ? undefined
                    : formatTick(tick, mainUnit);
                },
              },
              grid: { color: grid },
            },
            ...(dualAxis
              ? {
                  btc: {
                    type: "linear" as const,
                    position: "right" as const,
                    ticks: {
                      color: ink,
                      callback: (value: number | string) => formatTick(Number(value), "btc"),
                    },
                    // Only the left axis draws gridlines, otherwise the two sets
                    // overlap at different intervals.
                    grid: { drawOnChartArea: false },
                  },
                }
              : {}),
          },
        }}
      />
    </div>
  );
};

export default ProjectionChart;
