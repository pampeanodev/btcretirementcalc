import { AreaChartOutlined, TableOutlined } from "@ant-design/icons";
import { Tabs, TabsProps } from "antd";
import ChartTab from "./ChartTab";
import { LineChartProps } from "../../../models/LineChartProps";
import { useTranslation } from "react-i18next";
import TableTab from "./TableTab";
import { ProjectionView } from "../../../models/ProjectionView";
import Summary from "./Summary";
import OptimizedSummary from "./OptimizedSummary";
import CannotRetire from "./CannotRetire";

type Props = {
  btcPrice: number;
  retirementAge: number;
  annualBudget: number;
  bitcoinPriceAtRetirement: number;
  savingsBitcoin: number;
  chartData: LineChartProps;
  view: ProjectionView;
  optimized: boolean;
  canRetire: boolean;
};

const Result = ({
  btcPrice,
  retirementAge,
  annualBudget,
  bitcoinPriceAtRetirement,
  savingsBitcoin,
  chartData,
  view,
  optimized,
  canRetire,
}: Props) => {
  const [t] = useTranslation();

  const tabs: TabsProps["items"] = [
    {
      key: "1",
      label: t("calculator.chart-view"),
      icon: <AreaChartOutlined />,
      children: (
        <ChartTab
          bitcoinPrice={btcPrice!}
          retirementAge={retirementAge}
          annualBudget={annualBudget}
          bitcoinPriceAtRetirement={bitcoinPriceAtRetirement}
          totalSavings={savingsBitcoin}
          chartProps={chartData!}
        />
      ),
    },
    {
      key: "2",
      label: t("calculator.table-view"),
      icon: <TableOutlined />,
      children: <TableTab view={view} />,
    },
  ];
  if (!canRetire) {
    return <CannotRetire></CannotRetire>;
  }
  return (
    <>
      {optimized ? (
        <OptimizedSummary
          retirementAge={retirementAge}
          totalSavings={savingsBitcoin}
          bitcoinPriceAtRetirement={bitcoinPriceAtRetirement}
          annualBudget={annualBudget}
          bitcoinPrice={btcPrice}
        ></OptimizedSummary>
      ) : (
        <Summary
          retirementAge={retirementAge}
          totalSavings={savingsBitcoin}
          bitcoinPriceAtRetirement={bitcoinPriceAtRetirement}
          annualBudget={annualBudget}
          bitcoinPrice={btcPrice}
        ></Summary>
      )}

      <Tabs defaultActiveKey="1" items={tabs} />
    </>
  );
};

export default Result;
