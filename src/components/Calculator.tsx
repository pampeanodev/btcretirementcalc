import { useState } from "react";
import "chart.js/auto";
import "./Calculator.scss";
import { useBitcoinPrice } from "../hooks/useBitcoinPrice";
import InputPanel from "./InputPanel";
import { InputData } from "../models/InputData";
import { useTranslation } from "react-i18next";
import ChartTab from "./ChartTab";
import { Spin, Tabs, TabsProps } from "antd";
import { LineChartProps, LineChartData } from "../models/LineChartProps";
import TableTab from "./TableTab";
import { TableOutlined, AreaChartOutlined } from "@ant-design/icons";
import { AnnualTrackingData, CalculationResult } from "../models/CalculationResult";
import { calculateOptimal } from "../services/bitcoinRetirementOptimizedCalculator";
import { calculate } from "../services/bitcoinRetirementCalculator";
import { BITCOIN_COLOR } from "../constants";

const Calculator = () => {
  const [savingsBitcoin, setSavingsBitcoin] = useState<number>(0);
  const [savingsFiat, setSavingsFiat] = useState<number>(0);
  const [retirementAge, setRetirementAge] = useState<number>(0);
  const [annualBudget, setAnnualBudget] = useState<number>(0);
  const [bitcoinPriceAtRetirement, setBitcoinPriceAtRetirement] = useState<number>(0);
  const [chartData, setChartData] = useState<LineChartProps>();
  const [tableData, setTableData] = useState<AnnualTrackingData[]>([]);
  const [optimized, setOptimized] = useState<boolean>(false);
  const [canRetire, setCanRetire] = useState<boolean>(false);
  const [t] = useTranslation();

  const interval = 1000 * 60 * 10;
  const btcPrice = useBitcoinPrice(interval);

  const clearChart = () => {
    setChartData(undefined);
  };

  const getChartLabels = (start: number, end: number) => {
    const years = Array.from(new Array(end - start));
    return years.map((_, i) => (i + start + 1).toString());
  };

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
      children: (
        <TableTab
          startingBitcoinPrice={btcPrice!}
          retirementAge={retirementAge}
          annualRetirementBudget={annualBudget}
          bitcoinPriceAtRetirementAge={bitcoinPriceAtRetirement}
          savingsFiat={savingsFiat}
          dataSet={tableData!}
          savingsBitcoin={savingsBitcoin}
          optimized={optimized}
          canRetire={canRetire}
        />
      ),
    },
  ];

  const setChartProps = (fiatDataSet: number[], btcDataSet: number[], labels: string[]) => {
    const dataSets: LineChartData[] = [];
    if (fiatDataSet.length) {
      dataSets.push({
        label: "USD",
        fill: undefined,
        borderColor: "darkGreen",
        backgroundColor: "green",
        data: fiatDataSet,
      });
    }
    if (btcDataSet.length) {
      dataSets.push({
        label: "BTC",
        fill: undefined,
        borderColor: BITCOIN_COLOR,
        backgroundColor: "orange",
        data: btcDataSet,
      });
    }

    setChartData({ labels, datasets: dataSets });
  };

  const refreshCalculations = (data: InputData) => {
    const calculationResult = data.optimized
      ? calculateOptimal(data, btcPrice!)
      : calculate(data, btcPrice!);

    setRetirementAge(calculationResult.retirementAge);
    setSavingsFiat(calculationResult.savingsFiat);
    setSavingsBitcoin(calculationResult.savingsBitcoin);
    setBitcoinPriceAtRetirement(calculationResult.bitcoinPriceAtRetirementAge);
    setAnnualBudget(calculationResult.annualRetirementBudget);
    setOptimized(data.optimized);
    setCanRetire(calculationResult.canRetire);

    setTableData(calculationResult.dataSet);

    updateChartWithAfterRetirementData(calculationResult, data);
  };

  function updateChartWithAfterRetirementData(
    calculationResult: CalculationResult,
    data: InputData,
  ) {
    const btcDataSet = calculationResult.dataSet.map((item) => item.savingsBtc);
    const fiatDataSet = data.optimized
      ? []
      : calculationResult.dataSet.map((item) => item.savingsFiat);

    setChartProps(fiatDataSet, btcDataSet, getChartLabels(data.currentAge, data.lifeExpectancy));
  }

  return (
    <>
      {btcPrice && btcPrice > 0 ? (
        <div className="calculator">
          <InputPanel
            onCalculate={(data: InputData) => refreshCalculations(data)}
            clearChart={clearChart}
          ></InputPanel>
          <div className="calculator__result">
            {chartData && tableData && <Tabs defaultActiveKey="1" items={tabs} />}
          </div>
        </div>
      ) : (
        <Spin fullscreen />
      )}
    </>
  );
};

export default Calculator;
