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
) => {
  let year = new Date().getFullYear();
  const priceHistory: AnnualBitcoinPrice[] = [];
  let currentAnnualBudget = input.desiredRetirementAnnualBudget;

  for (let age = input.currentAge + 1; age <= input.lifeExpectancy; age++) {
    year++;
    currentAnnualBudget = currentAnnualBudget * inflationFactor;
    bitcoinPrice = bitcoinPrice * growthFactor;
    priceHistory.push({ year, age, bitcoinPrice, desiredAnnualBudget: currentAnnualBudget });
  }
  return priceHistory;
};
