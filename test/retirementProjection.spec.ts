import { describe, expect, it } from "vitest";
import { calculate } from "../src/services/bitcoinRetirementCalculator";
import { calculateOptimal } from "../src/services/bitcoinRetirementOptimizedCalculator";
import { InputData } from "../src/models/InputData";
import { CalculationResult } from "../src/models/CalculationResult";

/**
 * Invariants for the two retirement strategies.
 *
 * Conservative sells the entire stack at retirement and spends down cash.
 * Optimized keeps holding and sells only what each year's budget needs.
 *
 * These projections feed a chart and a table directly, so every row has to mean
 * the same thing as every other row in its column — that is what most of these
 * cover, and it is where the bugs were.
 */
const BASE: InputData = {
  currentAge: 30,
  currentSavingsInBitcoin: 1,
  annualBuyInFiat: 12_000,
  annualPriceGrowth: 20,
  lifeExpectancy: 38,
  desiredRetirementAnnualBudget: 50_000,
  optimized: false,
  inflationRate: 5,
};
const PRICE = 100_000;

const conservative = (over: Partial<InputData> = {}) =>
  calculate({ ...BASE, ...over, optimized: false }, PRICE);
const optimized = (over: Partial<InputData> = {}) =>
  calculateOptimal({ ...BASE, ...over, optimized: true }, PRICE);

const accumulationRows = (r: CalculationResult) => r.dataSet.filter((d) => d.age < r.retirementAge);
const retirementRows = (r: CalculationResult) => r.dataSet.filter((d) => d.age >= r.retirementAge);

const strategies: [string, (over?: Partial<InputData>) => CalculationResult][] = [
  ["conservative", conservative],
  ["optimized", optimized],
];

describe("shared projection invariants", () => {
  it.each(strategies)("%s emits one row per projected year", (_name, run) => {
    const result = run();

    // Calculator.tsx labels the chart with one entry per year from currentAge+1
    // through lifeExpectancy. A mismatch silently shifts every point.
    expect(result.dataSet).toHaveLength(BASE.lifeExpectancy - BASE.currentAge);
  });

  it.each(strategies)("%s values every accumulation row at its own holdings", (_name, run) => {
    const result = run();

    // savingsFiat and savingsBitcoin sit in the same row of the same table, so
    // they must describe the same instant. Conservative computed the fiat value
    // before that year's purchase and the bitcoin balance after it.
    for (const row of accumulationRows(result)) {
      expect(row.savingsFiat).toBeCloseTo(row.savingsBitcoin * row.bitcoinPrice, 6);
    }
  });

  it.each(strategies)("%s funds every year from retirement to life expectancy", (_name, run) => {
    const result = run();

    // The budget divisor was lifeExpectancy - retirementAge while the projection
    // actually spends across one more row than that.
    expect(retirementRows(result)).toHaveLength(BASE.lifeExpectancy - result.retirementAge + 1);
  });

  it.each(strategies)("%s reports no retirement age when unreachable", (_name, run) => {
    const result = run({ currentSavingsInBitcoin: 0.001, annualBuyInFiat: 0 });

    // The calculators used different sentinels (0 vs lifeExpectancy), so reading
    // retirementAge without checking canRetire gave a plausible-looking lie.
    expect(result.canRetire).toBe(false);
    expect(result.retirementAge).toBe(0);
  });

  it.each(strategies)("%s never reports a non-finite budget", (_name, run) => {
    // Retiring in the final projected year left a zero divisor.
    const result = run({ lifeExpectancy: BASE.currentAge + 1, currentSavingsInBitcoin: 50 });

    expect(Number.isFinite(result.annualRetirementBudget)).toBe(true);
  });
});

describe("conservative strategy", () => {
  it("sells the whole stack at retirement and draws down cash", () => {
    const result = conservative();
    const rows = retirementRows(result);

    expect(rows[0].bitcoinFlow).toBeCloseTo(-result.savingsBitcoin, 8);
    expect(rows.every((r) => r.savingsBitcoin === 0)).toBe(true);

    const fiat = rows.map((r) => r.savingsFiat);
    expect(fiat).toStrictEqual([...fiat].sort((a, b) => b - a));
    expect(fiat[fiat.length - 1]).toBeGreaterThanOrEqual(0);
  });

  it("splits the liquidated stack across every funded year", () => {
    const result = conservative();

    expect(result.annualRetirementBudget).toBeCloseTo(
      result.savingsFiat / retirementRows(result).length,
      6,
    );
  });
});

describe("optimized strategy", () => {
  it("sells only what each year's budget needs", () => {
    const result = optimized();

    for (const row of retirementRows(result)) {
      expect(-row.bitcoinFlow * row.bitcoinPrice).toBeCloseTo(row.annualRetirementBudget, 6);
    }
  });

  it("reports remaining savings, not the yearly withdrawal, during retirement", () => {
    const result = optimized();
    const rows = retirementRows(result);

    // savingsFiat switched meaning at retirement, from portfolio value to the
    // amount sold that year. The table column reads "accumulated savings", so it
    // drew a rising line while the stack was actually draining.
    for (const row of rows) {
      expect(row.savingsFiat).toBeCloseTo(row.savingsBitcoin * row.bitcoinPrice, 6);
    }

    const fiat = rows.map((r) => r.savingsFiat);
    expect(fiat).toStrictEqual([...fiat].sort((a, b) => b - a));
  });

  it("reports the budget in fiat, matching the first funded year", () => {
    const result = optimized();

    // Was accumulatedSavingsBitcoin / years — a flat BTC average that matched
    // neither the currency the user asked in nor the declining sales the model
    // actually performs.
    expect(result.annualRetirementBudget).toBeCloseTo(
      retirementRows(result)[0].annualRetirementBudget,
      6,
    );
  });

  it("retires no later than selling everything up front", () => {
    // Holding through retirement can only help while bitcoin outpaces inflation.
    expect(optimized().retirementAge).toBeLessThanOrEqual(conservative().retirementAge);
  });
});
