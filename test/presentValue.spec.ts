import { describe, expect, it } from "vitest";
import { toPresentValue, toProjectionView } from "../src/services/presentValue";
import { calculateOptimal } from "../src/services/bitcoinRetirementOptimizedCalculator";
import { CalculationResult } from "../src/models/CalculationResult";
import { InputData } from "../src/models/InputData";

const INPUT: InputData = {
  currentAge: 30,
  currentSavingsInBitcoin: 1,
  annualBuyInFiat: 12_000,
  annualPriceGrowth: 20,
  lifeExpectancy: 83,
  desiredRetirementAnnualBudget: 100_000,
  optimized: true,
  inflationRate: 5,
};

describe("toPresentValue", () => {
  it("discounts by compounding inflation", () => {
    // 100000 * 1.05^15 = 207892.82, discounted back over the same 15 years
    expect(toPresentValue(207_892.82, 15, 5)).toBeCloseTo(100_000, 2);
  });

  it("is the identity at year zero", () => {
    expect(toPresentValue(4_242, 0, 5)).toBe(4_242);
  });

  it("is the identity when inflation is zero", () => {
    expect(toPresentValue(4_242, 30, 0)).toBe(4_242);
  });
});

describe("toProjectionView", () => {
  it("returns the desired budget unchanged in today's money", () => {
    // Indexing forward then discounting back by the same rate is a round trip,
    // so every year's real budget is the figure the user typed.
    const view = toProjectionView(calculateOptimal(INPUT, 79_350.17), INPUT);

    for (const point of view.points) {
      expect(point.annualBudgetReal).toBeCloseTo(INPUT.desiredRetirementAnnualBudget, 4);
    }
  });

  it("keeps the nominal figures alongside the real ones", () => {
    const view = toProjectionView(calculateOptimal(INPUT, 79_350.17), INPUT);
    const last = view.points[view.points.length - 1];

    expect(last.annualBudget).toBeGreaterThan(last.annualBudgetReal);
    expect(last.savingsFiat).toBeGreaterThan(last.savingsFiatReal);
  });

  it("reports no real figures when there is no retirement to discount to", () => {
    // retirementAge 0 is the calculators' "not found" sentinel, not an age.
    // Discounting to it passes a negative yearsFromNow, and a negative exponent
    // inflates instead of discounting: at age 30 and 5% these would come back as
    // 100000 * 1.05^30 = ~432194, in fields labelled as today's money.
    const unreachable: CalculationResult = {
      startingBitcoinPrice: 79_350.17,
      dataSet: [],
      retirementAge: 0,
      savingsBitcoin: 0,
      savingsFiat: 100_000,
      bitcoinPriceAtRetirementAge: 0,
      annualRetirementBudget: 100_000,
      optimized: true,
      canRetire: false,
    };

    const view = toProjectionView(unreachable, INPUT);

    expect(view.savingsFiatReal).toBe(0);
    expect(view.annualBudgetReal).toBe(0);
  });

  it("emits one point per projected year and carries the retirement age", () => {
    const result = calculateOptimal(INPUT, 79_350.17);
    const view = toProjectionView(result, INPUT);

    expect(view.points).toHaveLength(INPUT.lifeExpectancy - INPUT.currentAge);
    expect(view.retirementAge).toBe(result.retirementAge);
    expect(view.canRetire).toBe(true);
  });
});
