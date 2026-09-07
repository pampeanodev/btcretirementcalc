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
    // Was 0.05 — a flat BTC average. This strategy now reports the budget in
    // fiat like the conservative one does; with no inflation it is the desired
    // budget unchanged.
    annualRetirementBudget: 100000.0,
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
    // Was 0.07 BTC. Reported in fiat now: 100000 * 1.02^33, the desired budget
    // indexed from age 30 to retirement at 63.
    annualRetirementBudget: 192223.14,
    // Was 100000.0, which never matched what the code produced — the field has
    // always held the *indexed* budget, and nothing asserted it.
    annualRetirementBudgetAtRetirementAge: 192223.14,
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
  expect(output.annualRetirementBudgetAtRetirementAge?.toFixed(2)).toBe(
    expectedCalculation.annualRetirementBudgetAtRetirementAge?.toFixed(2),
  );
});

/**
 * The two properties that define this strategy, pinned after an audit that went
 * looking for a reason the projection leaves so much bitcoin behind. Neither
 * found one — but both were unasserted, so a future change could break either
 * without a single test noticing.
 */
const AUDIT_INPUT: InputData = {
  currentAge: 30,
  lifeExpectancy: 86,
  currentSavingsInBitcoin: 1,
  annualBuyInFiat: 5_000,
  annualPriceGrowth: 20,
  inflationRate: 2,
  desiredRetirementAnnualBudget: 120_000,
  optimized: true,
};

test("sells exactly the bitcoin the retirement decision was made against", () => {
  for (const annualPriceGrowth of [10, 20, 30]) {
    const input = { ...AUDIT_INPUT, annualPriceGrowth };
    const result = calculateOptimal(input, 70_000);

    const sold = result.dataSet
      .filter((point) => point.bitcoinFlow < 0)
      .reduce((total, point) => total + -point.bitcoinFlow, 0);

    // Rebuilt from the inputs rather than from the result's own rows. Comparing
    // the sales against the numbers the drawdown used to make them is an
    // accounting identity that holds however much it sells; only a closed form
    // says whether the amount itself is right.
    //   price(k) = P0 * (1 + g)^k, budget(k) = B * (1 + i)^k, k years from now
    let expected = 0;
    for (let age = result.retirementAge; age <= input.lifeExpectancy; age++) {
      const k = age - input.currentAge;
      const price = 70_000 * Math.pow(1 + annualPriceGrowth / 100, k);
      const budget =
        input.desiredRetirementAnnualBudget * Math.pow(1 + input.inflationRate / 100, k);
      expected += budget / price;
    }
    expect(sold).toBeCloseTo(expected, 10);

    const stackAtRetirement = result.savingsBitcoin;
    const leftAtDeath = result.dataSet[result.dataSet.length - 1].savingsBitcoin;
    expect(sold + leftAtDeath).toBeCloseTo(stackAtRetirement, 10);

    // And what is left is never negative: the strategy cannot fund a year by
    // selling bitcoin it does not hold.
    expect(leftAtDeath).toBeGreaterThan(0);
    for (const point of result.dataSet) {
      expect(point.savingsBitcoin).toBeGreaterThanOrEqual(0);
    }
  }
});

test("retires at the earliest age that survives, not the first comfortable one", () => {
  for (const annualPriceGrowth of [10, 15, 20, 30]) {
    const input = { ...AUDIT_INPUT, annualPriceGrowth };
    const result = calculateOptimal(input, 70_000);
    const previousYear = result.dataSet.find((point) => point.age === result.retirementAge - 1);
    expect(previousYear).toBeDefined();

    // Retiring a year earlier has to fail. The stack left over at death is large
    // — up to 15% of the pot — which looks like the calculator waiting longer
    // than it needs to. It is not: the lifetime requirement falls by that much
    // every year, so crossing it once a year overshoots by roughly one year's
    // drop. This asserts the overshoot is granularity and not slack.
    const stackTheYearBefore = previousYear!.savingsBitcoin;
    const neededFromRetirement = result.dataSet
      .filter((point) => point.bitcoinFlow < 0)
      .reduce((total, point) => total + -point.bitcoinFlow, 0);
    // Plus the year before, which the dataSet holds as an accumulation row and
    // so never priced as a sale: retiring at A-1 means funding A-1 too.
    const costOfTheExtraYear = previousYear!.annualRetirementBudget / previousYear!.bitcoinPrice;
    expect(stackTheYearBefore).toBeLessThan(neededFromRetirement + costOfTheExtraYear);
  }
});
