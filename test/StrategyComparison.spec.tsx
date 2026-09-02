import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StrategyComparison from "../src/components/Results/StrategyComparison";
import { toProjectionView } from "../src/services/presentValue";
import { calculate } from "../src/services/bitcoinRetirementCalculator";
import { calculateOptimal } from "../src/services/bitcoinRetirementOptimizedCalculator";
import { InputData } from "../src/models/InputData";
import { toUsd } from "../src/constants";

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
const PRICE = 79_350.17;

const views = () => ({
  conservative: toProjectionView(calculate({ ...INPUT, optimized: false }, PRICE), INPUT),
  optimized: toProjectionView(calculateOptimal(INPUT, PRICE), INPUT),
});

describe("StrategyComparison", () => {
  it("shows both strategies at once", () => {
    const { conservative, optimized } = views();
    render(
      <StrategyComparison
        conservative={conservative}
        optimized={optimized}
        selected="optimized"
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /sell everything/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sell what you need/i })).toBeInTheDocument();
    expect(screen.getByText(String(conservative.retirementAge))).toBeInTheDocument();
    expect(screen.getByText(String(optimized.retirementAge))).toBeInTheDocument();
  });

  it("marks the selected strategy for assistive tech", () => {
    const { conservative, optimized } = views();
    render(
      <StrategyComparison
        conservative={conservative}
        optimized={optimized}
        selected="optimized"
        onSelect={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /sell what you need/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    // The unselected card is asserted too. Without this a card that hard-coded
    // aria-pressed={true} passes every test in this file, and a screen reader
    // announces both strategies as chosen — the one thing the attribute exists
    // to disambiguate.
    expect(screen.getByRole("button", { name: /sell everything/i })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("reports a selection change", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    const { conservative, optimized } = views();
    render(
      <StrategyComparison
        conservative={conservative}
        optimized={optimized}
        selected="optimized"
        onSelect={onSelect}
      />,
    );

    await user.click(screen.getByRole("button", { name: /sell everything/i }));

    expect(onSelect).toHaveBeenCalledWith("conservative");
  });

  it("discloses the nominal figure beside the converted one", () => {
    const { conservative, optimized } = views();
    render(
      <StrategyComparison
        conservative={conservative}
        optimized={optimized}
        selected="optimized"
        onSelect={() => {}}
      />,
    );

    const last = optimized.points[optimized.points.length - 1];

    // Guards the guard. If these two ever coincide, the assertions below would
    // pass without any conversion having happened, and the test would be
    // proving nothing.
    expect(Math.round(last.savingsFiatReal)).not.toBe(Math.round(last.savingsFiat));

    // The spec's disclosure rule: a discounted figure never appears without the
    // future amount it came from. Asserted here, on a real projection, because
    // StatTile's own tests only prove the tile CAN carry a nominal — not that a
    // converted figure ever actually gets one.
    //
    // Scoped to the tile, not the page. The rule is that the two sit together
    // where one reader sees both; asserting each exists somewhere would pass
    // with the converted figure on one card and its nominal on the other.
    const nominal = screen.getByText(`${toUsd(last.savingsFiat)} in ${last.year}`);
    const tile = nominal.closest('[data-slot="stat-tile"]');

    expect(tile).not.toBeNull();
    expect(within(tile as HTMLElement).getByText(toUsd(last.savingsFiatReal))).toBeInTheDocument();
  });
});
