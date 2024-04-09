import { CalculationResult } from "../src/models/CalculationResult";
import { calculate } from "../src/services/bitcoinRetirementCalculator";
import { expect, test } from "vitest";
import { expectedOutput } from "./output.ts";
import { testInput, testInputWithInflation } from "./input.ts";

test("Calculate should give expected results", () => {
  const expectedCalculation: CalculationResult = expectedOutput;

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

test("Calculation with 10 percent inflation should give expected results", () => {
  const expectedCalculation: CalculationResult = {
    startingBitcoinPrice: 70000,
    dataSet: [],
    retirementAge: 68,
    savingsBitcoin: 1.27807575,
    savingsFiat: 3346390.91,
    bitcoinPriceAtRetirementAge: 2618304.041,
    annualRetirementBudget: 223092.73,
  };

  const output = calculate(testInputWithInflation, expectedCalculation.startingBitcoinPrice);
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
