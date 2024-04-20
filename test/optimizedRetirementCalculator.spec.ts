import { CalculationResult } from "../src/models/CalculationResult";
import { expect, test } from "vitest";
import { calculateOptimal } from "../src/services/bitcoinRetirementOptimizedCalculator.ts";
import { InputData } from "../src/models/InputData.ts";

test("should process input correctly", () => {
  const expectedCalculation: CalculationResult = {
    startingBitcoinPrice: 70000,
    retirementAge: 56,
    savingsBitcoin: 1.259344,
    savingsFiat: 1050635.89,
    bitcoinPriceAtRetirementAge: 834272.358,
    annualRetirementBudget: 0.05,
    dataSet: [],
    optimized: true,
    canRetire: true,
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

  const output = calculateOptimal(testInput, expectedCalculation.startingBitcoinPrice);
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
});

test("Calculation with 2 percent inflation should give expected results", () => {
  const expectedCalculation: CalculationResult = {
    startingBitcoinPrice: 70000,
    dataSet: [],
    retirementAge: 63,
    savingsBitcoin: 1.33177087,
    savingsFiat: 2165140.88,
    bitcoinPriceAtRetirementAge: 1625760.809,
    annualRetirementBudget: 0.07,
    annualRetirementBudgetAtRetirementAge: 100000.0,
    optimized: true,
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
  const output = calculateOptimal(testInputWithInflation, expectedCalculation.startingBitcoinPrice);
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
});
