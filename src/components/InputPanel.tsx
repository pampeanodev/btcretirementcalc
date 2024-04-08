import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { CalculationData } from "../models/CalculationData";
import { Slider, InputNumber, Switch, Popover } from "antd";
import "./InputPanel.scss";
import { useTranslation } from "react-i18next";
import { QuestionCircleTwoTone } from "@ant-design/icons";
import ExplanatoryOverlay from "./ExplanatoryOverlay";
interface InputPanelProps {
  onCalculate: (data: CalculationData) => void;
  clearChart: () => void;
}

const InputPanel = ({ onCalculate, clearChart }: InputPanelProps) => {
  const [currentAge, setCurrentAge] = useState<number>(30);
  const [currentSavings, setCurrentSavings] = useState<number>(0.1);
  const [annualDeposit, setAnnualDeposit] = useState<number>(0);
  const [interestRate, setInterestRate] = useState<number>(12);
  const [lifeExpectancy, setLifeExpectancy] = useState<number>(86);
  const [desiredRetirementIncome, setDesiredRetirementIncome] = useState<number>(100000);
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
    interestRate,
    lifeExpectancy,
    desiredRetirementIncome,
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
      annualPriceGrowth: interestRate,
      lifeExpectancy: lifeExpectancy,
      desiredRetirementAnnualBudget: desiredRetirementIncome,
      optimized: optimized,
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
            step={btcBuyStep}
            max={btcBuyMax}
            value={annualDeposit}
            addonAfter="$"
            onChange={(n) => handleChange(n!, setAnnualDeposit)}
          />
        </div>
        <div className="input-panel__inputs control">
          <label htmlFor="interestRate">{t("input.growth-rate")}</label>
          <InputNumber
            type="number"
            className="input"
            name="interestRate"
            addonAfter={"%"}
            min={0}
            max={100}
            value={interestRate}
            onChange={(n) => handleChange(n!, setInterestRate)}
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
              200000: `$200K`,
            }}
            step={btcBuyStep}
            tooltip={{ color: "#f2a900", open: true, placement: "top" }}
            max={btcBuyMax}
            onChange={(n) => handleChange(n, setAnnualDeposit)}
            value={typeof annualDeposit === "number" ? annualDeposit : 0}
          />
          <label>{t("input.annual-buy")}</label>
        </div>
        <div className="slider">
          <Slider
            marks={{
              0: "0%",
              100: "100%",
            }}
            tooltip={{ color: "#f2a900", open: true, placement: "top" }}
            min={0}
            max={100}
            onChange={(n) => handleChange(n, setInterestRate)}
            value={typeof interestRate === "number" ? interestRate : 0}
          />
          <label>{t("input.growth-rate")}</label>
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
            <QuestionCircleTwoTone data-tooltip-id="my-tooltip-multiline" twoToneColor="#f2a900" />
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default InputPanel;
