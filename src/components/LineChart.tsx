import { useRef } from "react";
import Chart from "chart.js/auto";
import { Line } from "react-chartjs-2";
import { useTranslation } from "react-i18next";
import { LineChartProps } from "../models/LineChartProps";

const LineChart = (chartData: LineChartProps) => {
  const chartRef = useRef<Chart<"line">>();
  const [t] = useTranslation();

  return (
    <Line
      redraw
      ref={chartRef}
      datasetIdKey="id"
      data={chartData}
      options={{
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: t("chart.title"),
          },
          legend: {
            display: true,
          },
        },
      }}
    />
  );
};

export default LineChart;
