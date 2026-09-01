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
  data: number[];
  /** What the numbers are denominated in, which is what formats them. */
  unit: ChartUnit;
  /** Resolved at render, not here, so this stays a pure mapping of the view. */
  token: ThemeToken;
  /** "btc" only ever appears on the cash variant, which plots two units. */
  axis: "main" | "btc";
}

interface Series {
  labels: string[];
  datasets: SeriesDataset[];
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
            {
              label: "₿ held",
              data: view.points.map((p) => p.savingsBitcoin),
              unit: "btc",
              token: "--color-bitcoin",
              axis: "main",
            },
            {
              label: "₿ sold",
              data: view.points.map((p) => Math.max(0, -p.bitcoinFlow)),
              unit: "btc",
              token: "--color-ink-muted",
              axis: "main",
            },
          ],
        }
      : {
          labels,
          datasets: [
            {
              label: "$ value",
              data: view.points.map((p) => p.savingsFiatReal),
              unit: "fiat",
              token: "--color-gain",
              axis: "main",
            },
            {
              label: "$ withdrawn",
              unit: "fiat",
              // Both series are dollars, so they share one axis even though the
              // withdrawal is small beside the stack. Two dollar axes at
              // different scales would make the withdrawal look like it tracked
              // the savings.
              data: view.points.map((p) => (p.bitcoinFlow < 0 ? p.annualBudgetReal : 0)),
              token: "--color-ink-muted",
              axis: "main",
            },
          ],
        };
  }

  return {
    labels,
    datasets: [
      {
        label: "$ savings",
        data: view.points.map((p) => p.savingsFiatReal),
        unit: "fiat",
        token: "--color-gain",
        axis: "main",
      },
      {
        label: "₿ held",
        data: view.points.map((p) => p.savingsBitcoin),
        unit: "btc",
        token: "--color-bitcoin",
        axis: "btc",
      },
    ],
  };
};

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

interface ProjectionChartProps {
  view: ProjectionView;
  variant: ChartVariant;
  unit?: ChartUnit;
  height?: number;
}

const ProjectionChart = ({ view, variant, unit = "btc", height = 260 }: ProjectionChartProps) => {
  const series = buildSeries(view, variant, unit);
  // cash genuinely plots two units, so it keeps a second axis. stack shows one
  // unit at a time, which is how its scale problem disappears rather than
  // being managed.
  const dualAxis = variant === "cash";
  const mainUnit: ChartUnit = dualAxis ? "fiat" : unit;
  const showsWithdrawal = variant === "stack" && unit === "fiat";
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
              fill: "origin" as const,
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
                  const point = view.points[items[0].dataIndex];
                  // Everything on screen is in today's money; the future amounts
                  // are disclosed here so the conversion is never silent.
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
              type: "linear",
              position: "left",
              ticks: { color: ink, callback: (value) => formatTick(Number(value), mainUnit) },
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
