import { LineChartProps } from "../../../models/LineChartProps";
import LineChart from "./LineChart";

interface ChartTabProps {
  bitcoinPrice: number;
  retirementAge: number;
  bitcoinPriceAtRetirement: number;
  annualBudget: number;
  totalSavings: number;
  chartProps: LineChartProps;
}

const ChartTab = ({ chartProps }: ChartTabProps) => {
  return (
    <>
      <LineChart labels={chartProps.labels} datasets={chartProps.datasets} />
    </>
  );
};

export default ChartTab;
