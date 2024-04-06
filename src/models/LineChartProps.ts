export interface LineChartData {
  label: string;
  fill: "start" | undefined;
  data: number[];
}

export interface LineChartProps {
  labels: string[];
  datasets: LineChartData[];
}
