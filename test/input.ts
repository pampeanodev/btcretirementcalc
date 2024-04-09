import { InputData } from "../src/models/InputData";

export const testInput: InputData = {
  currentAge: 30,
  currentSavingsInBitcoin: 1,
  annualBuyInFiat: 2000,
  annualPriceGrowth: 10,
  lifeExpectancy: 83,
  desiredRetirementAnnualBudget: 100000,
  optimized: false,
  inflationRate: 0,
};

export const testInputWithInflation: InputData = {
  currentAge: 30,
  currentSavingsInBitcoin: 1,
  annualBuyInFiat: 2000,
  annualPriceGrowth: 10,
  lifeExpectancy: 83,
  desiredRetirementAnnualBudget: 100000,
  optimized: false,
  inflationRate: 2,
};
