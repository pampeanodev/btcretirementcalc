import { AnnualBitcoinPrice } from "../models/AnnualBitcoinPrice";
import { InputData } from "../models/InputData";

export const getGrowthFactor = (annualPriceGrowth: number) => {
  const growthRate = annualPriceGrowth / 100;
  const growthFactor = 1 + growthRate;
  return growthFactor;
};

export const getInflationFactor = (annualInflation: number) => {
  const inflationRate = annualInflation / 100;
  const inflationFactor = 1 + inflationRate;
  return inflationFactor;
};
export const calculateBitcoinPriceHistory = (
  input: InputData,
  bitcoinPrice: number,
  growthFactor: number,
  inflationFactor: number,
  /**
   * Defaults to the current year, which is what the app wants and what both
   * calculators rely on — they call this with four arguments.
   *
   * It is a parameter so the year sequence can be asserted against a fixed
   * value. Left implicit, every projected year moves on 1 January and any test
   * naming one starts failing on a date nobody changed anything on.
   */
  startYear: number = new Date().getFullYear(),
) => {
  let year = startYear;
  const priceHistory: AnnualBitcoinPrice[] = [];
  let currentAnnualBudget = input.desiredRetirementAnnualBudget;

  for (let age = input.currentAge + 1; age <= input.lifeExpectancy; age++) {
    year++;
    currentAnnualBudget = currentAnnualBudget * inflationFactor;
    bitcoinPrice = bitcoinPrice * growthFactor;
    priceHistory.push({
      year,
      age,
      bitcoinPriceIndexed: bitcoinPrice,
      desiredAnnualBudgetIndexed: currentAnnualBudget,
    });
  }
  return priceHistory;
};
