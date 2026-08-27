import { useRef } from "react";
import Chart from "chart.js/auto";
import { Line } from "react-chartjs-2";
import { useTranslation } from "react-i18next";
import { LineChartProps } from "../../../models/LineChartProps";
import { BITCOIN_SIGN } from "../../../constants";

const LineChart = (chartData: LineChartProps) => {
  const chartRef = useRef<Chart<"line"> | null>(null);
  const [t] = useTranslation();

  return (
    <Line
      redraw
      ref={chartRef}
      datasetIdKey="id"
      data={chartData}
      options={{
        responsive: true,
        interaction: { mode: "index", intersect: false },
        plugins: {
          title: {
            display: true,
            text: t("chart.title"),
          },
          legend: {
            display: true,
          },
        },
        // Savings in fiat run to six or seven figures while the stack itself is
        // a fraction of a coin. On one shared axis the BTC line flattens onto
        // zero, so each series gets its own scale.
        scales: {
          usd: {
            type: "linear",
            position: "left",
            title: { display: true, text: "USD" },
            ticks: {
              callback: (value) => `$${Number(value).toLocaleString("en-US")}`,
            },
          },
          btc: {
            type: "linear",
            position: "right",
            title: { display: true, text: BITCOIN_SIGN },
            // Only the fiat axis draws gridlines, otherwise the two sets overlap.
            grid: { drawOnChartArea: false },
          },
        },
      }}
    />
  );
};

export default LineChart;
