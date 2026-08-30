import { CalculationResult } from "../models/CalculationResult";
import { InputData } from "../models/InputData";
import { ProjectionPoint, ProjectionView } from "../models/ProjectionView";
import { getInflationFactor } from "./calculationUtils";

/**
 * Converts a future amount into the purchasing power of today.
 *
 * The calculators index every figure forward by inflation; this undoes that for
 * display. It lives outside them on purpose — a bug here cannot corrupt the
 * retirement-age search, and their existing tests stay a valid regression net.
 */
export const toPresentValue = (nominal: number, yearsFromNow: number, inflationRate: number) =>
  nominal / Math.pow(getInflationFactor(inflationRate), yearsFromNow);

export const toProjectionView = (result: CalculationResult, input: InputData): ProjectionView => {
  const real = (nominal: number, age: number) =>
    toPresentValue(nominal, age - input.currentAge, input.inflationRate);

  // A result that never reaches retirement reports `retirementAge: 0`, which is
  // the calculators' "not found" sentinel rather than an age. Discounting to it
  // would pass a negative `yearsFromNow`, and a negative exponent multiplies
  // instead of dividing: at age 30 and 5% inflation the figure comes back 4.3x
  // larger, in a field the UI presents as today's money. There is no retirement
  // to discount to, so the answer is 0 — which is what the nominal figures
  // beside it already hold in this case.
  const realAtRetirement = (nominal: number) =>
    result.canRetire ? real(nominal, result.retirementAge) : 0;

  const points: ProjectionPoint[] = result.dataSet.map((d) => ({
    key: d.key,
    year: d.year,
    age: d.age,
    bitcoinPrice: d.bitcoinPrice,
    savingsBitcoin: d.savingsBitcoin,
    savingsFiat: d.savingsFiat,
    savingsFiatReal: real(d.savingsFiat, d.age),
    bitcoinFlow: d.bitcoinFlow,
    annualBudget: d.annualRetirementBudget,
    annualBudgetReal: real(d.annualRetirementBudget, d.age),
  }));

  return {
    optimized: result.optimized,
    canRetire: result.canRetire,
    retirementAge: result.retirementAge,
    savingsBitcoin: result.savingsBitcoin,
    savingsFiat: result.savingsFiat,
    savingsFiatReal: realAtRetirement(result.savingsFiat),
    annualBudget: result.annualRetirementBudget,
    annualBudgetReal: realAtRetirement(result.annualRetirementBudget),
    bitcoinPriceAtRetirementAge: result.bitcoinPriceAtRetirementAge,
    points,
  };
};
