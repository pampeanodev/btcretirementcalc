import { useState } from "react";
import "chart.js/auto";
import "./Calculator.scss";
import { useBitcoinPrice } from "../hooks/useBitcoinPrice";
import InputPanel from "./Input/InputPanel";
import { InputData } from "../models/InputData";
import { Spin } from "antd";
import { LineChartProps, LineChartData } from "../models/LineChartProps";
import { CalculationResult } from "../models/CalculationResult";
import { ProjectionView } from "../models/ProjectionView";
import { calculateOptimal } from "../services/bitcoinRetirementOptimizedCalculator";
import { calculate } from "../services/bitcoinRetirementCalculator";
import { toProjectionView } from "../services/presentValue";
import { BITCOIN_COLOR } from "../constants";
import Result from "./Results/tabs/Result";

const Calculator = () => {
  const [savingsBitcoin, setSavingsBitcoin] = useState<number>(0);
  const [retirementAge, setRetirementAge] = useState<number>(0);
  const [annualBudget, setAnnualBudget] = useState<number>(0);
  const [bitcoinPriceAtRetirement, setBitcoinPriceAtRetirement] = useState<number>(0);
  const [chartData, setChartData] = useState<LineChartProps>();
  // The table needs the discounted figures beside the nominal ones, and only
  // this component holds both halves the conversion needs — the result and the
  // InputData that produced it — so the view is built here and passed down.
  const [view, setView] = useState<ProjectionView>();
  const [optimized, setOptimized] = useState<boolean>(false);
  const [canRetire, setCanRetire] = useState<boolean>(false);

  const interval = 1000 * 60 * 10;
  const btcPrice = useBitcoinPrice(interval);

  const clearChart = () => {
    setChartData(undefined);
  };

  const getChartLabels = (start: number, end: number) => {
    const years = Array.from(new Array(end - start));
    return years.map((_, i) => (i + start + 1).toString());
  };

  const setChartProps = (fiatDataSet: number[], btcDataSet: number[], labels: string[]) => {
    const dataSets: LineChartData[] = [];
    if (fiatDataSet.length) {
      dataSets.push({
        label: "USD",
        fill: undefined,
        borderColor: "darkGreen",
        backgroundColor: "green",
        data: fiatDataSet,
        yAxisID: "usd",
      });
    }
    if (btcDataSet.length) {
      dataSets.push({
        label: "BTC",
        fill: undefined,
        borderColor: BITCOIN_COLOR,
        backgroundColor: "orange",
        data: btcDataSet,
        yAxisID: "btc",
      });
    }

    setChartData({ labels, datasets: dataSets });
  };

  const refreshCalculations = (data: InputData) => {
    const calculationResult = data.optimized
      ? calculateOptimal(data, btcPrice!)
      : calculate(data, btcPrice!);

    setRetirementAge(calculationResult.retirementAge);
    setSavingsBitcoin(calculationResult.savingsBitcoin);
    setBitcoinPriceAtRetirement(calculationResult.bitcoinPriceAtRetirementAge);
    setAnnualBudget(calculationResult.annualRetirementBudget);
    setOptimized(data.optimized);
    setCanRetire(calculationResult.canRetire);

    setView(toProjectionView(calculationResult, data));

    updateChartWithAfterRetirementData(calculationResult, data);
  };

  function updateChartWithAfterRetirementData(
    calculationResult: CalculationResult,
    data: InputData,
  ) {
    const btcDataSet = calculationResult.dataSet.map((item) => item.savingsBitcoin);
    // The fiat series used to be dropped in optimized mode, because savingsFiat
    // held the yearly withdrawal there instead of the remaining stack and drew a
    // line that rose while savings fell. It means remaining savings in both
    // strategies now, so both can be plotted.
    const fiatDataSet = calculationResult.dataSet.map((item) => item.savingsFiat);

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
            {chartData && view && (
              <Result
                btcPrice={btcPrice}
                retirementAge={retirementAge}
                annualBudget={annualBudget}
                bitcoinPriceAtRetirement={bitcoinPriceAtRetirement}
                savingsBitcoin={savingsBitcoin}
                chartData={chartData}
                view={view}
                optimized={optimized}
                canRetire={canRetire}
              />
            )}
          </div>
        </div>
      ) : (
        <Spin fullscreen />
      )}
    </>
  );
};

export default Calculator;
