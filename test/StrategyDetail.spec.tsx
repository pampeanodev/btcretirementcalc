import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { initI18n } from "./test-utils";
import StrategyDetail from "../src/components/Results/StrategyDetail";
import { toProjectionView } from "../src/services/presentValue";
import { calculateOptimal } from "../src/services/bitcoinRetirementOptimizedCalculator";
import { calculate } from "../src/services/bitcoinRetirementCalculator";
import { InputData } from "../src/models/InputData";
import { ProjectionView } from "../src/models/ProjectionView";
import { BITCOIN_SIGN, toUsd } from "../src/constants";

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

/** Holds nothing, buys nothing, wants a million a year: retirement never lands. */
const BROKE_INPUT: InputData = {
  ...INPUT,
  currentSavingsInBitcoin: 0,
  annualBuyInFiat: 0,
  desiredRetirementAnnualBudget: 1_000_000,
};

const CONSERVATIVE_INPUT: InputData = { ...INPUT, optimized: false };

const optimizedView = (): ProjectionView => toProjectionView(calculateOptimal(INPUT, PRICE), INPUT);
const conservativeView = (): ProjectionView =>
  toProjectionView(calculate(CONSERVATIVE_INPUT, PRICE), CONSERVATIVE_INPUT);
const brokeView = (): ProjectionView =>
  toProjectionView(calculateOptimal(BROKE_INPUT, PRICE), BROKE_INPUT);

/**
 * Only chart.js's React wrapper is stubbed; `ProjectionChart` itself is the real
 * component, so its series and its accessible name are still the thing under
 * test. The stub exists because chart.js cannot survive what this component
 * does: its first render fails softly under jsdom's stubbed 2D context ("can't
 * acquire context"), and the SECOND — every unit swap here — dereferences that
 * missing context and throws out of the effect.
 *
 * The real wrapper hard-codes `role="img"` on its canvas and spreads the
 * remaining props onto it; this mirrors that, as `ProjectionChart.spec` does.
 */
vi.mock("react-chartjs-2", () => ({
  Line: (props: { "aria-label"?: string }) => (
    <canvas role="img" aria-label={props["aria-label"]} />
  ),
}));

/**
 * What the chart is actually plotting, which is the only thing the toggle is
 * for. `ProjectionChart` names its series in the canvas's accessible name, so
 * the unit in force is observable through a role rather than through a class or
 * a captured prop.
 */
const chart = () => screen.getByRole("img", { name: /^Projection over ages/ });

const bodyRows = (container: HTMLElement) => {
  const body = container.querySelector('[data-slot="table-body"]');
  if (!body) {
    throw new Error("No table body rendered");
  }
  return within(body as HTMLElement).getAllByRole("row");
};

beforeAll(async () => {
  await initI18n();
});

describe("StrategyDetail", () => {
  it("swaps the chart's unit when the toggle is pressed, and back again", async () => {
    const user = userEvent.setup();
    render(<StrategyDetail view={optimizedView()} />);

    const btc = screen.getByRole("button", { name: BITCOIN_SIGN });
    const fiat = screen.getByRole("button", { name: "$" });

    // One labelled group, not two loose buttons: a reader who cannot see them
    // side by side is otherwise given no reason to think the second button has
    // anything to do with the first.
    const group = screen.getByRole("group", { name: "Chart unit" });
    expect(within(group).getByRole("button", { name: BITCOIN_SIGN })).toBe(btc);
    expect(within(group).getByRole("button", { name: "$" })).toBe(fiat);

    // The starting state is asserted too, and so is the button that was NOT
    // clicked. Checking only that the clicked button ends up pressed passes on
    // a pair hard-coding aria-pressed={true}, which announces both units as
    // chosen — the one thing the attribute is there to disambiguate.
    expect(btc).toHaveAttribute("aria-pressed", "true");
    expect(fiat).toHaveAttribute("aria-pressed", "false");
    // And the chart is asserted, not just the button. A panel that ignored its
    // own state and always asked for bitcoin satisfies every aria-pressed
    // assertion above while the toggle does nothing at all.
    expect(chart()).toHaveAccessibleName(/plotting ₿ held and ₿ sold\.$/);

    await user.click(fiat);

    expect(fiat).toHaveAttribute("aria-pressed", "true");
    expect(btc).toHaveAttribute("aria-pressed", "false");
    expect(chart()).toHaveAccessibleName(/plotting \$ value and \$ withdrawn\.$/);

    // Back, because a handler that only ever sets fiat passes everything above.
    await user.click(btc);

    expect(btc).toHaveAttribute("aria-pressed", "true");
    expect(fiat).toHaveAttribute("aria-pressed", "false");
    expect(chart()).toHaveAccessibleName(/plotting ₿ held and ₿ sold\.$/);
  });

  it("offers no unit toggle for the conservative strategy", () => {
    // Its cash chart genuinely plots two units at once, so there is nothing to
    // swap.
    render(<StrategyDetail view={conservativeView()} />);

    expect(screen.queryByRole("button", { name: "$" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: BITCOIN_SIGN })).not.toBeInTheDocument();
    // Absence on its own is satisfied by a panel that rendered nothing at all.
    // The cash chart being there is what makes the missing toggle the right
    // answer rather than a hole.
    expect(chart()).toHaveAccessibleName(/plotting \$ savings and ₿ held\.$/);
  });

  it("follows the view it is handed rather than the one it first rendered", async () => {
    // The panel expands whichever card is selected, so the view changes under a
    // mounted component. A panel that read `view.optimized` once — into
    // useState, or into a ref — keeps the toggle over a cash chart that has no
    // unit to give it.
    const user = userEvent.setup();
    const { rerender } = render(<StrategyDetail view={optimizedView()} />);
    await user.click(screen.getByRole("button", { name: "$" }));

    rerender(<StrategyDetail view={conservativeView()} />);

    expect(screen.queryByRole("button", { name: "$" })).not.toBeInTheDocument();
    expect(chart()).toHaveAccessibleName(/plotting \$ savings and ₿ held\.$/);

    rerender(<StrategyDetail view={optimizedView()} />);

    // The unit is the reader's choice, not the view's, so it survives the trip
    // through a strategy that had no toggle to show it.
    expect(screen.getByRole("button", { name: "$" })).toHaveAttribute("aria-pressed", "true");
    expect(chart()).toHaveAccessibleName(/plotting \$ value and \$ withdrawn\.$/);
  });

  it("shows the year-by-year table for the same view, nominal beside converted", () => {
    const view = optimizedView();
    const { container } = render(<StrategyDetail view={view} />);

    const point = view.points[10];
    const converted = toUsd(point.savingsFiatReal);
    const nominal = toUsd(point.savingsFiat);
    // Without this the row below is satisfied by a table printing one figure
    // twice, and the disclosure rule would be asserted by a tautology.
    expect(converted).not.toBe(nominal);

    // Scoped to the row, not the page: the rule is that both faces of the SAME
    // year's figure reach one reader together. Two matches anywhere on a
    // fifty-three row table prove nothing about which years they belong to.
    const row = bodyRows(container)[10];

    expect(within(row).getByText(String(point.year))).toBeInTheDocument();
    expect(within(row).getByText(converted)).toBeInTheDocument();
    expect(within(row).getByText(nominal)).toBeInTheDocument();
  });

  it("renders a projection that never reaches retirement", async () => {
    // No fixture above produces one, and `retirementAge` is 0 there rather than
    // an age — the calculators' "not found" sentinel. Anything that located the
    // retirement year in `points` to slice a chart or caption a panel throws
    // here and nowhere else in this file.
    const user = userEvent.setup();
    const view = brokeView();
    expect(view.canRetire).toBe(false);
    expect(view.retirementAge).toBe(0);

    const { container } = render(<StrategyDetail view={view} />);

    expect(chart()).toHaveAccessibleName(/plotting ₿ held and ₿ sold\.$/);
    await user.click(screen.getByRole("button", { name: "$" }));
    expect(chart()).toHaveAccessibleName(/plotting \$ value and \$ withdrawn\.$/);

    expect(
      within(bodyRows(container)[0]).getByText(String(view.points[0].year)),
    ).toBeInTheDocument();
  });
});
