export interface LineChartData {
  label: string;
  fill: "start" | undefined;
  data: number[];
  borderColor: string;
  backgroundColor: string;
}

export interface LineChartProps {
  labels: string[];
  datasets: LineChartData[];
}
