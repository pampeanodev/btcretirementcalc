import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBitcoinPrice } from "../hooks/useBitcoinPrice";
import { InputData } from "../models/InputData";
import { calculate } from "../services/bitcoinRetirementCalculator";
import { calculateOptimal } from "../services/bitcoinRetirementOptimizedCalculator";
import { toProjectionView } from "../services/presentValue";
import InputBar from "./Input/InputBar";
import StrategyComparison, { StrategyKey } from "./Results/StrategyComparison";
import StrategyDetail from "./Results/StrategyDetail";

const REFRESH_INTERVAL_MS = 1000 * 60 * 10;

const Calculator = () => {
  const [input, setInput] = useState<InputData>();
  const [selected, setSelected] = useState<StrategyKey>("optimized");
  const [t] = useTranslation();
  const btcPrice = useBitcoinPrice(REFRESH_INTERVAL_MS);

  // Both strategies are computed on every change now. The switch used to pick
  // which one to calculate; the comparison shows both, so it picks which one
  // the detail panel expands.
  //
  // Derived, not stored. The pair is a pure function of the inputs and the
  // price, and `useBitcoinPrice` refetches every ten minutes, so both belong in
  // the dependency list — recomputing only on an input change would leave the
  // projections built on a price the app has stopped displaying. Holding them
  // in state and filling them from an effect would render one frame of stale
  // figures on every change, which is what `react-hooks/set-state-in-effect`
  // is pointing at.
  const projections = useMemo(() => {
    if (!input || !btcPrice || btcPrice <= 0) {
      return undefined;
    }
    return {
      conservative: toProjectionView(calculate({ ...input, optimized: false }, btcPrice), input),
      optimized: toProjectionView(calculateOptimal({ ...input, optimized: true }, btcPrice), input),
    };
  }, [input, btcPrice]);

  if (!btcPrice || btcPrice <= 0) {
    return (
      <div
        role="status"
        aria-label={t("app.loading")}
        className="flex min-h-[60vh] items-center justify-center"
      >
        <Loader2 className="size-8 animate-spin text-ink-muted" />
      </div>
    );
  }

  const selectedView = projections?.[selected];

  return (
    <div className="flex flex-col gap-4">
      {/* `setInput` directly: InputBar's effect depends on the primitive input
          values, so it fires once per real change, not once per render. */}
      <InputBar onCalculate={setInput} />

      {projections && (
        <>
          <StrategyComparison
            conservative={projections.conservative}
            optimized={projections.optimized}
            selected={selected}
            onSelect={setSelected}
          />
          {selectedView?.canRetire ? (
            <StrategyDetail view={selectedView} />
          ) : (
            // Both lines, as the old CannotRetire panel had them. The second is
            // the same string in all three locales on purpose — it is an idiom,
            // not a missing translation.
            <div className="flex flex-col gap-1 py-8 text-center italic">
              <p>{t("cannot-retire.text")}</p>
              <p>{t("cannot-retire.text2")}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Calculator;
