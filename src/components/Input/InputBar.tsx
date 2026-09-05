import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { InputData } from "../../models/InputData";
import ScrubField from "../common/ScrubField";

const num = (params: URLSearchParams, key: string, fallback: number) => {
  const raw = params.get(key);
  // Blank counts as absent. `Number("")` and `Number(" ")` are 0, not NaN, so a
  // link ending `?currentAge=` would otherwise read as a real zero and put a
  // newborn through the projection instead of falling back to the default.
  const parsed = raw === null || raw.trim() === "" ? NaN : Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
};

interface NumberFieldProps {
  label: string;
  value: number;
  min: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}

/**
 * The three values the design spec keeps as plain boxes: age and life
 * expectancy, whose range is too narrow for dragging to teach anything, and the
 * bitcoin holding, which has no plausible upper bound to put a track against.
 *
 * The draft is the same device ScrubField uses, and it is not optional here
 * either. These boxes are controlled by a number this component derives from the
 * query string, and a half-typed value is not a number: emptying the box reports
 * NaN, the parent refuses it, and React then restores the previous DOM value
 * after the change event. The box cannot be emptied, and the next keystrokes
 * append to the old number — clearing "0.5" and typing "0.25" leaves 0.5025,
 * measured, not supposed. Holding what was typed until blur is what stops that.
 *
 * The box is named by the `<label>` wrapping it, so its accessible name is the
 * translated text on screen. It carries no `aria-label`: one would override that
 * name with a string that never translates, leaving a pt or es reader with a
 * name that has nothing to do with what they can see.
 */
const NumberField = ({ label, value, min, max, step, onChange }: NumberFieldProps) => {
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      {label}
      <Input
        type="number"
        className="w-28 text-right font-mono"
        min={min}
        max={max}
        step={step}
        value={draft ?? String(value)}
        // NaN reaches `onChange` mid-edit by design; `set` is the single place
        // that decides a non-number never lands in the query string.
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(e.target.valueAsNumber);
        }}
        onBlur={() => setDraft(null)}
      />
    </label>
  );
};

const InputBar = ({ onCalculate }: { onCalculate: (data: InputData) => void }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [t] = useTranslation();

  const currentAge = num(searchParams, "currentAge", 30);
  const lifeExpectancy = num(searchParams, "lifeExpectancy", 86);
  const currentSavings = num(searchParams, "currentSavings", 0.5);
  const annualBuy = num(searchParams, "annualBuy", 0);
  const bitcoinCagr = num(searchParams, "bitcoinCagr", 20);
  const inflationRate = num(searchParams, "inflationRate", 2);
  const desiredRetirementIncome = num(searchParams, "desiredRetirementIncome", 120_000);

  const set = (key: string, value: number) => {
    // An emptied number input reports NaN. Ignore it rather than writing
    // "NaN" into the query string, which would break shared links.
    if (!Number.isFinite(value)) {
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.set(key, String(value));
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    onCalculate({
      currentAge,
      lifeExpectancy,
      currentSavingsInBitcoin: currentSavings,
      annualBuyInFiat: annualBuy,
      annualPriceGrowth: bitcoinCagr,
      inflationRate,
      desiredRetirementAnnualBudget: desiredRetirementIncome,
      optimized: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentAge,
    lifeExpectancy,
    currentSavings,
    annualBuy,
    bitcoinCagr,
    inflationRate,
    desiredRetirementIncome,
  ]);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs uppercase tracking-wide text-ink-muted">
          {t("input.group-you")}
        </legend>
        <NumberField
          label={t("input.current-age")}
          min={0}
          max={120}
          value={currentAge}
          onChange={(v) => set("currentAge", v)}
        />
        <NumberField
          label={t("input.life-expectancy")}
          min={1}
          max={130}
          value={lifeExpectancy}
          onChange={(v) => set("lifeExpectancy", v)}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs uppercase tracking-wide text-ink-muted">
          {t("input.group-bitcoin")}
        </legend>
        <NumberField
          label={t("input.savings-btc")}
          min={0}
          step={0.01}
          value={currentSavings}
          onChange={(v) => set("currentSavings", v)}
        />
        <ScrubField
          label={t("input.annual-buy")}
          name="annualBuy"
          value={annualBuy}
          min={0}
          max={200_000}
          step={100}
          unit="$"
          onChange={(v) => set("annualBuy", v)}
        />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-xs uppercase tracking-wide text-ink-muted">
          {t("input.group-assumptions")}
        </legend>
        <ScrubField
          label={t("input.growth-rate")}
          name="bitcoinCagr"
          value={bitcoinCagr}
          min={0}
          max={100}
          unit="%"
          onChange={(v) => set("bitcoinCagr", v)}
        />
        <ScrubField
          label={t("input.inflation-rate")}
          name="inflationRate"
          value={inflationRate}
          min={0}
          max={50}
          step={0.5}
          unit="%"
          onChange={(v) => set("inflationRate", v)}
        />
        <ScrubField
          label={t("input.desired-total-savings")}
          name="desiredRetirementIncome"
          value={desiredRetirementIncome}
          min={0}
          max={400_000}
          step={1000}
          unit="$"
          onChange={(v) => set("desiredRetirementIncome", v)}
        />
      </fieldset>
    </div>
  );
};

export default InputBar;
