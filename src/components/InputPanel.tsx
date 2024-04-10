import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { InputData } from "../models/InputData";
import { Slider, InputNumber, Switch, Popover } from "antd";
import "./InputPanel.scss";
import { useTranslation } from "react-i18next";
import { QuestionCircleTwoTone } from "@ant-design/icons";
import ExplanatoryOverlay from "./ExplanatoryOverlay";
import { BITCOIN_COLOR } from "../constants";
interface InputPanelProps {
  onCalculate: (data: InputData) => void;
  clearChart: () => void;
}

const InputPanel = ({ onCalculate, clearChart }: InputPanelProps) => {
  const [currentAge, setCurrentAge] = useState<number>(30);
  const [currentSavings, setCurrentSavings] = useState<number>(0.1);
  const [annualDeposit, setAnnualDeposit] = useState<number>(0);
  const [bitcoinPriceAnnualGrowth, setBitcoinPriceAnnualGrowth] = useState<number>(12);
  const [lifeExpectancy, setLifeExpectancy] = useState<number>(86);
  const [desiredRetirementIncome, setDesiredRetirementIncome] = useState<number>(120000);
  const [inflationRate, setInflationRate] = useState<number>(2.0);
  const [optimized, setOptimized] = useState(false);
  const [t] = useTranslation();
  const btcBuyMin: number = 0;
  const btcBuyMax: number = 200000;
  const btcBuyStep: number = 100;
  const bitcoinSign: string = "₿";

  useEffect(() => {
    calculate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentAge,
    currentSavings,
    annualDeposit,
    bitcoinPriceAnnualGrowth,
    lifeExpectancy,
    desiredRetirementIncome,
    inflationRate,
    optimized,
  ]);

  const handleChange = (newValue: number, set: Dispatch<SetStateAction<number>>) => {
    if (isNaN(newValue)) {
      return;
    }
    clearChart();
    set(newValue);
  };
  const handleCurrentAgeChange = (newValue: number | null | undefined) => {
    if (!newValue) {
      return;
    }
    clearChart();
    if (newValue <= lifeExpectancy) {
      setCurrentAge(newValue);
    }
  };
  const handleLifeExpectancyChange = (newValue: number | null | undefined) => {
    if (!newValue) {
      return;
    }
    clearChart();
    if (newValue > currentAge) {
      setLifeExpectancy(newValue);
    }
  };
  const handleOptimizedSwitchChange = (checked: boolean) => {
    setOptimized(checked);
  };
  const calculate = () => {
    onCalculate({
      currentAge,
      currentSavingsInBitcoin: currentSavings,
      annualBuyInFiat: annualDeposit,
      annualPriceGrowth: bitcoinPriceAnnualGrowth,
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
            addonAfter={bitcoinSign}
            name="currentSavings"
            value={currentSavings}
            onChange={(n) => handleChange(n!, setCurrentSavings)}
          />
        </div>
        <div className="input-panel__inputs control">
          <label htmlFor="annualBuy">{t("input.annual-buy")}</label>
          <InputNumber
            name="annualBuy"
            className="input"
            formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            parser={(value) => value?.replace(/\$\s?|(,*)/g, "") as unknown as number}
            step={btcBuyStep}
            max={btcBuyMax}
            value={annualDeposit}
            addonAfter="$"
            onChange={(n) => handleChange(n!, setAnnualDeposit)}
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
            value={bitcoinPriceAnnualGrowth}
            onChange={(n) => handleChange(n!, setBitcoinPriceAnnualGrowth)}
          />
        </div>
        <div className="input-panel__inputs control">
          <label htmlFor="inflationRate">{t("input.inflation-rate")}</label>
          <InputNumber
            type="number"
            className="input"
            name="inflationRate"
            addonAfter={"%"}
            step={0.1}
            min={0}
            max={bitcoinPriceAnnualGrowth}
            value={inflationRate}
            onChange={(n) => handleChange(n!, setInflationRate)}
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
            onChange={(n) => handleChange(n!, setDesiredRetirementIncome)}
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
            onChange={(n) => handleChange(n, setAnnualDeposit)}
            value={typeof annualDeposit === "number" ? annualDeposit : 0}
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
            onChange={(n) => handleChange(n, setBitcoinPriceAnnualGrowth)}
            value={typeof bitcoinPriceAnnualGrowth === "number" ? bitcoinPriceAnnualGrowth : 0}
          />
        </div>
        <div className="input-panel__sliders switch">
          <span>{t("input.conservative")}</span>
          <Switch onChange={handleOptimizedSwitchChange} />
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
