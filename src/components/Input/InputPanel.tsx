import { useEffect, useState } from "react";
import { InputData } from "../../models/InputData";
import { Slider, InputNumber, Switch, Popover } from "antd";
import "./InputPanel.scss";
import { useTranslation } from "react-i18next";
import { QuestionCircleTwoTone } from "@ant-design/icons";
import ExplanatoryOverlay from "./ExplanatoryOverlay";
import { BITCOIN_COLOR, BITCOIN_SIGN } from "../../constants";
import { useSearchParams } from "react-router-dom";

interface InputPanelProps {
  onCalculate: (data: InputData) => void;
  clearChart: () => void;
}

const InputPanel = ({ onCalculate, clearChart }: InputPanelProps) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [currentAge, setCurrentAge] = useState<number>(
    parseInt(searchParams.get("currentAge") || "30"),
  );
  const [currentSavings, setCurrentSavings] = useState<number>(
    parseFloat(searchParams.get("currentSavings") ?? "0.1"),
  );
  const [annualBuy, setAnnualBuy] = useState<number>(
    parseInt(searchParams.get("annualBuy") ?? "0"),
  );
  const [bitcoinCagr, setBitcoinPriceAnnualGrowth] = useState<number>(
    parseInt(searchParams.get("bitcoinCagr") ?? "12"),
  );
  const [lifeExpectancy, setLifeExpectancy] = useState<number>(
    parseInt(searchParams.get("lifeExpectancy") ?? "86"),
  );
  const [desiredRetirementIncome, setDesiredRetirementIncome] = useState<number>(
    parseInt(searchParams.get("desiredRetirementIncome") ?? "120000"),
  );
  const [inflationRate, setInflationRate] = useState<number>(
    parseFloat(searchParams.get("inflationRate") ?? "2.0"),
  );
  const [optimized, setOptimized] = useState<boolean>(
    searchParams.get("optimized") == "true" ? true : false,
  );
  const [t] = useTranslation();
  const btcBuyMin: number = 0;
  const btcBuyMax: number = 200000;
  const btcBuyStep: number = 100;

  useEffect(() => {
    initQueryString();
    calculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentAge,
    currentSavings,
    annualBuy,
    bitcoinCagr,
    lifeExpectancy,
    desiredRetirementIncome,
    inflationRate,
    optimized,
  ]);

  const initQueryString = () => {
    setSearchParams({
      currentAge: currentAge.toString(),
      lifeExpectancy: lifeExpectancy.toString(),
      currentSavings: currentSavings.toString(),
      annualBuy: annualBuy.toString(),
      bitcoinCagr: bitcoinCagr.toString(),
      desiredRetirementIncome: desiredRetirementIncome.toString(),
      inflationRate: inflationRate.toString(),
      optimized: optimized.toString(),
    });
  };

  const handleCurrentSavingsChange = (newValue: number | null | undefined) => {
    if (!newValue) {
      return;
    }
    clearChart();
    setCurrentSavings(newValue);
    setSearchParams({ currentSavings: currentSavings.toString() });
  };

  const handleAnnualBuyChange = (newValue: number | null | undefined) => {
    if (!newValue) {
      return;
    }
    clearChart();
    setAnnualBuy(newValue);
    setSearchParams({ annualBuy: annualBuy.toString() });
  };

  const handleBitcoinPriceGrowthChange = (newValue: number | null | undefined) => {
    if (!newValue) {
      return;
    }
    clearChart();
    setBitcoinPriceAnnualGrowth(newValue);
    setSearchParams({ bitcoinCagr: bitcoinCagr.toString() });
  };

  const handleInflationRateChange = (newValue: number | null | undefined) => {
    if (!newValue) {
      return;
    }
    clearChart();
    setInflationRate(newValue);
    setSearchParams({ inflationRate: inflationRate.toString() });
  };

  const handleDesiredRetirementIncomeChange = (newValue: number | null | undefined) => {
    if (!newValue) {
      return;
    }
    clearChart();
    setDesiredRetirementIncome(newValue);
    setSearchParams({ desiredRetirementIncome: desiredRetirementIncome.toString() });
  };

  const handleCurrentAgeChange = (newValue: number | null | undefined) => {
    if (!newValue) {
      return;
    }
    clearChart();
    if (newValue <= lifeExpectancy) {
      setCurrentAge(newValue);
      setSearchParams({ currentAge: newValue.toString() });
    }
  };
  const handleLifeExpectancyChange = (newValue: number | null | undefined) => {
    if (!newValue) {
      return;
    }
    clearChart();
    if (newValue > currentAge) {
      setLifeExpectancy(newValue);
      setSearchParams({ lifeExpectancy: newValue.toString() });
    }
  };
  const handleOptimizedSwitchChange = (checked: boolean) => {
    setOptimized(checked);
    setSearchParams({ optimized: checked.toString() });
  };
  const calculate = () => {
    onCalculate({
      currentAge,
      currentSavingsInBitcoin: currentSavings,
      annualBuyInFiat: annualBuy,
      annualPriceGrowth: bitcoinCagr,
      lifeExpectancy: lifeExpectancy,
      desiredRetirementAnnualBudget: desiredRetirementIncome,
      optimized: optimized,
      inflationRate: inflationRate,
    });
  };

  return (
    <div className="input-panel">
      <div className="input-panel__inputs">
        <div className="input-panel__inputs control">
          <label htmlFor="currentAge">{t("input.current-age")}</label>
          <InputNumber
            className="input"
            type="number"
            name="currentAge"
            max={150}
            value={currentAge}
            onChange={handleCurrentAgeChange}
          />
        </div>
        <div className="input-panel__inputs control">
          <label htmlFor="lifeExpectancy">{t("input.life-expectancy")}</label>
          <InputNumber
            className="input"
            type="number"
            name="lifeExpectancy"
            value={lifeExpectancy}
            onChange={handleLifeExpectancyChange}
          />
        </div>
        <div className="input-panel__inputs control">
          <label htmlFor="currentSavings">{t("input.savings-btc")}</label>
          <InputNumber
            className="input"
            step={0.01}
            addonAfter={BITCOIN_SIGN}
            name="currentSavings"
            value={currentSavings}
            onChange={handleCurrentSavingsChange}
          />
        </div>
        <div className="input-panel__inputs control">
          <label htmlFor="annualBuy">{t("input.annual-buy")}</label>
          <InputNumber
            name="annualBuy"
            className="input"
            step={btcBuyStep}
            max={btcBuyMax}
            value={annualBuy}
            addonAfter="$"
            onChange={handleAnnualBuyChange}
          />
        </div>
        <div className="input-panel__inputs control">
          <label htmlFor="growthRate">{t("input.growth-rate")}</label>
          <InputNumber
            type="number"
            className="input"
            name="growthRate"
            addonAfter={"%"}
            min={0}
            max={100}
            value={bitcoinCagr}
            onChange={handleBitcoinPriceGrowthChange}
          />
        </div>
        <div className="input-panel__inputs control">
          <label htmlFor="inflationRate">{t("input.inflation-rate")}</label>
          <InputNumber
            type="number"
            className="input"
            name="inflationRate"
            parser={(value) => parseFloat(value ?? "0").toFixed(1) as unknown as number}
            addonAfter={"%"}
            step={0.1}
            min={0}
            max={bitcoinCagr}
            value={inflationRate}
            onChange={handleInflationRateChange}
          />
        </div>
        <div className="input-panel__inputs control">
          <label htmlFor="desiredRetirementIncome">{t("input.desired-total-savings")}</label>
          <InputNumber
            className="input"
            type="number"
            addonAfter="$"
            name="desiredRetirementIncome"
            value={desiredRetirementIncome}
            onChange={handleDesiredRetirementIncomeChange}
          />
        </div>
      </div>
      <div className="input-panel__sliders">
        <div className="slider">
          <Slider
            marks={{
              0: `$${btcBuyMin}`,
              100000: t("slider.annual-buy"),
              200000: `$200K`,
            }}
            step={btcBuyStep}
            tooltip={{ color: BITCOIN_COLOR, open: true, placement: "top" }}
            max={btcBuyMax}
            onChange={handleAnnualBuyChange}
            value={typeof annualBuy === "number" ? annualBuy : 0}
          />
        </div>
        <div className="slider">
          <Slider
            marks={{
              0: "0%",
              50: t("slider.growth-rate"),
              100: "100%",
            }}
            tooltip={{ color: BITCOIN_COLOR, open: true, placement: "top" }}
            min={0}
            max={100}
            onChange={handleBitcoinPriceGrowthChange}
            value={typeof bitcoinCagr === "number" ? bitcoinCagr : 0}
          />
        </div>
        <div className="input-panel__sliders switch">
          <span>{t("input.conservative")}</span>
          <Switch checked={optimized} onChange={handleOptimizedSwitchChange} />
          <span> {t("input.optimized")}</span>
          <Popover
            zIndex={2000}
            content={<ExplanatoryOverlay />}
            title={t("mode-explanation.title")}
            trigger="click"
          >
            <QuestionCircleTwoTone
              data-tooltip-id="my-tooltip-multiline"
              twoToneColor={BITCOIN_COLOR}
            />
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default InputPanel;
