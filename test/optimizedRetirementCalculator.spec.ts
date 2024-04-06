import { CalculationResult } from "../src/models/CalculationResult";
import { expect, test } from "vitest";
import { optimizedOutput } from "./output-optimized";
import { calculateOptimal } from "../src/services/bitcoinRetirementOptimalCalculator.ts";
import { testInput } from "./input.ts";

test("should process input correctly", () => {
  const expectedCalculation: CalculationResult = optimizedOutput;
  const output = calculateOptimal(testInput, expectedCalculation.startingBitcoinPrice);
  expect(output.retirementAge).toBe(expectedCalculation.retirementAge);
  expect(output.savingsBitcoin.toFixed(8)).toBe(expectedCalculation.savingsBitcoin.toFixed(8));
  expect(output.savingsFiat.toFixed(2)).toBe(expectedCalculation.savingsFiat.toFixed(2));
  expect(output.bitcoinPriceAtRetirementAge.toFixed(3)).toBe(
    expectedCalculation.bitcoinPriceAtRetirementAge.toFixed(3),
  );
  expect(output.annualRetirementBudget.toFixed(2)).toBe(expectedCalculation.annualRetirementBudget.toFixed(2));
});
