import { LineChartProps } from "../models/LineChartProps";
import LineChart from "./LineChart";
import Summary from "./Summary";

interface ChartTabProps {
  bitcoinPrice: number;
  retirementAge: number;
  bitcoinPriceAtRetirement: number;
  annualBudget: number;
  totalSavings: number;
  chartProps: LineChartProps;
}

const ChartTab = ({
  bitcoinPrice,
  retirementAge,
  chartProps,
  bitcoinPriceAtRetirement,
  annualBudget,
  totalSavings,
}: ChartTabProps) => {
  return (
    <>
      <Summary
        retirementAge={retirementAge}
        totalSavings={totalSavings}
        bitcoinPriceAtRetirement={bitcoinPriceAtRetirement}
        annualBudget={annualBudget}
        bitcoinPrice={bitcoinPrice}
      ></Summary>
      <LineChart labels={chartProps.labels} datasets={chartProps.datasets} />
    </>
  );
};

export default ChartTab;
