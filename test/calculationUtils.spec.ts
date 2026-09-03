import { describe, expect, it } from "vitest";
import {
  calculateBitcoinPriceHistory,
  getGrowthFactor,
  getInflationFactor,
} from "../src/services/calculationUtils";
import { InputData } from "../src/models/InputData";

// This module had no tests of its own, and it is where every projected row's
// year, price and budget comes from. Both calculators are downstream of it, so
// a fault here corrupts both strategies at once while their own suites keep
// asserting end results that still look plausible.

const INPUT: InputData = {
  currentAge: 30,
  currentSavingsInBitcoin: 1,
  annualBuyInFiat: 12_000,
  annualPriceGrowth: 20,
  lifeExpectancy: 35,
  desiredRetirementAnnualBudget: 100_000,
  optimized: false,
  inflationRate: 5,
};

const history = (startYear?: number) =>
  calculateBitcoinPriceHistory(
    INPUT,
    100_000,
    getGrowthFactor(INPUT.annualPriceGrowth),
    getInflationFactor(INPUT.inflationRate),
    startYear,
  );

describe("getGrowthFactor / getInflationFactor", () => {
  it("turn a percentage into the multiplier that compounds it", () => {
    expect(getGrowthFactor(20)).toBeCloseTo(1.2, 10);
    expect(getInflationFactor(5)).toBeCloseTo(1.05, 10);
  });

  it("leave a value untouched at zero percent", () => {
    // A factor of 0 rather than 1 here would zero every projection instead of
    // leaving it flat, and the failure would look like a calculator bug.
    expect(getGrowthFactor(0)).toBe(1);
    expect(getInflationFactor(0)).toBe(1);
  });
});

describe("calculateBitcoinPriceHistory", () => {
  it("runs one row per year of life ahead, ages and years advancing together", () => {
    const rows = history(2030);

    expect(rows).toHaveLength(INPUT.lifeExpectancy - INPUT.currentAge);
    expect(rows[0]).toMatchObject({ year: 2031, age: 31 });
    expect(rows[rows.length - 1]).toMatchObject({ year: 2035, age: 35 });
    // Pins the pairing itself, not just the endpoints: an off-by-one in either
    // loop variable alone would still satisfy the two assertions above.
    expect(rows.every((row) => row.year - row.age === 2000)).toBe(true);
  });

  it("compounds the price by growth and the budget by inflation, not the reverse", () => {
    // The one fault this file exists to catch. Swapping the two factors leaves
    // every downstream figure plausible — prices and budgets both still rise —
    // so the calculators' own tests would stay green on wrong numbers.
    const rows = history(2030);

    expect(rows[0].bitcoinPriceIndexed).toBeCloseTo(100_000 * 1.2, 6);
    expect(rows[4].bitcoinPriceIndexed).toBeCloseTo(100_000 * Math.pow(1.2, 5), 6);

    expect(rows[0].desiredAnnualBudgetIndexed).toBeCloseTo(100_000 * 1.05, 6);
    expect(rows[4].desiredAnnualBudgetIndexed).toBeCloseTo(100_000 * Math.pow(1.05, 5), 6);
  });

  it("starts from the current year when no start year is given", () => {
    // Asserted against the clock rather than a literal, so this test does not
    // become the very 1 January failure the parameter exists to prevent.
    const thisYear = new Date().getFullYear();

    expect(history()[0].year).toBe(thisYear + 1);
  });

  it("produces no rows for someone already past their life expectancy", () => {
    const rows = calculateBitcoinPriceHistory(
      { ...INPUT, currentAge: 90, lifeExpectancy: 85 },
      100_000,
      getGrowthFactor(20),
      getInflationFactor(5),
      2030,
    );

    expect(rows).toStrictEqual([]);
  });
});
