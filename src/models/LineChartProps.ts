export interface LineChartData {
  label: string;
  fill: "start" | undefined;
  data: number[];
  borderColor: string;
  backgroundColor: string;
  /** Which of the chart's two y axes this series belongs to. */
  yAxisID: "usd" | "btc";
}

export interface LineChartProps {
  labels: string[];
  datasets: LineChartData[];
}
