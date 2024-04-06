import { CalculationResult } from "../src/models/CalculationResult";
import { calculate } from "../src/services/bitcoinRetirementCalculator";
import { expect, test } from "vitest";
import { expectedOutput } from "./output.ts";
import { testInput } from "./input.ts";

test("Calculate should give expected results", () => {
  const expectedCalculation: CalculationResult = expectedOutput;

  const output = calculate(testInput, expectedCalculation.startingBitcoinPrice);
  expect(output.retirementAge).toBe(expectedCalculation.retirementAge);
  expect(output.savingsBitcoin.toFixed(8)).toBe(expectedCalculation.savingsBitcoin.toFixed(8));
  expect(output.savingsFiat.toFixed(2)).toBe(expectedCalculation.savingsFiat.toFixed(2));
  expect(output.bitcoinPriceAtRetirementAge.toFixed(3)).toBe(
    expectedCalculation.bitcoinPriceAtRetirementAge.toFixed(3),
  );
  expect(output.annualRetirementBudget.toFixed(2)).toBe(expectedCalculation.annualRetirementBudget.toFixed(2));
});
