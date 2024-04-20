import { CalculationResult } from "../src/models/CalculationResult";
import { calculate } from "../src/services/bitcoinRetirementCalculator";
import { expect, test } from "vitest";
import { InputData } from "../src/models/InputData.ts";

test("Calculate should give expected results", () => {
  const expectedCalculation = {
    startingBitcoinPrice: 70000,
    retirementAge: 64,
    savingsBitcoin: 1.27341235,
    savingsFiat: 2277290.29,
    bitcoinPriceAtRetirementAge: 1788336.89,
    annualRetirementBudget: 119857.38,
    dataSet: [],
  };
  const testInput: InputData = {
    currentAge: 30,
    currentSavingsInBitcoin: 1,
    annualBuyInFiat: 2000,
    annualPriceGrowth: 10,
    lifeExpectancy: 83,
    desiredRetirementAnnualBudget: 100000,
    optimized: false,
    inflationRate: 0,
  };

  const output = calculate(testInput, expectedCalculation.startingBitcoinPrice);
  expect(output.retirementAge).toBe(expectedCalculation.retirementAge);
  expect(output.savingsBitcoin.toFixed(8)).toBe(expectedCalculation.savingsBitcoin.toFixed(8));
  expect(output.savingsFiat.toFixed(2)).toBe(expectedCalculation.savingsFiat.toFixed(2));
  expect(output.bitcoinPriceAtRetirementAge.toFixed(3)).toBe(
    expectedCalculation.bitcoinPriceAtRetirementAge.toFixed(3),
  );
  expect(output.annualRetirementBudget.toFixed(2)).toBe(
    expectedCalculation.annualRetirementBudget.toFixed(2),
  );
});

test("Calculation with 2 percent inflation should give expected results", () => {
  const expectedCalculation: CalculationResult = {
    startingBitcoinPrice: 70000,
    dataSet: [],
    retirementAge: 69,
    savingsBitcoin: 1.34361637,
    savingsFiat: 3869795.8,
    bitcoinPriceAtRetirementAge: 2880134.445,
    annualRetirementBudget: 276413.99,
    annualRetirementBudgetAtRetirementAge: 216474.48,
    optimized: false,
    canRetire: true,
  };
  const testInputWithInflation: InputData = {
    currentAge: 30,
    currentSavingsInBitcoin: 1,
    annualBuyInFiat: 2000,
    annualPriceGrowth: 10,
    lifeExpectancy: 83,
    desiredRetirementAnnualBudget: 100000,
    optimized: false,
    inflationRate: 2,
  };
  const output = calculate(testInputWithInflation, expectedCalculation.startingBitcoinPrice);
  expect(output.canRetire).toBe(expectedCalculation.canRetire);
  expect(output.retirementAge).toBe(expectedCalculation.retirementAge);
  expect(output.savingsBitcoin.toFixed(8)).toBe(expectedCalculation.savingsBitcoin.toFixed(8));
  expect(output.savingsFiat.toFixed(2)).toBe(expectedCalculation.savingsFiat.toFixed(2));
  expect(output.bitcoinPriceAtRetirementAge.toFixed(3)).toBe(
    expectedCalculation.bitcoinPriceAtRetirementAge.toFixed(3),
  );
  expect(output.annualRetirementBudget.toFixed(2)).toBe(
    expectedCalculation.annualRetirementBudget.toFixed(2),
  );
  expect(output.annualRetirementBudgetAtRetirementAge?.toFixed(2)).toBe(
    expectedCalculation.annualRetirementBudgetAtRetirementAge?.toFixed(2),
  );
});
