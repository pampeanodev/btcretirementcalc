import { beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { initI18n } from "./test-utils";
import TableTab from "../src/components/Results/tabs/TableTab";
import { toProjectionView } from "../src/services/presentValue";
import { calculateOptimal } from "../src/services/bitcoinRetirementOptimizedCalculator";
import { calculate } from "../src/services/bitcoinRetirementCalculator";
import { InputData } from "../src/models/InputData";
import { ProjectionView } from "../src/models/ProjectionView";
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

/**
 * Real calculator output, not a hand-written fixture: the whole point of the
 * nominal column is that it discloses what the discounting did to figures this
 * app actually produces. `calculationUtils` seeds the projection from
 * `new Date().getFullYear()`, so nothing here may hardcode a year — every
 * expectation is derived from the same view the component is handed.
 */
const buildView = (): ProjectionView => toProjectionView(calculateOptimal(INPUT, 79_350.17), INPUT);

/** Holds nothing, buys nothing, wants a million a year: retirement never lands. */
const BROKE_INPUT: InputData = {
  ...INPUT,
  currentSavingsInBitcoin: 0,
  annualBuyInFiat: 0,
  desiredRetirementAnnualBudget: 1_000_000,
};

/**
 * The conservative strategy, whose retirement years look nothing like the
 * optimized one's: it liquidates the whole stack in the retirement year, so
 * `bitcoinFlow` is 0 for every year after it even though the retiree is drawing
 * a budget throughout. Any "is this a retirement year" rule keyed off the flow
 * passes on the optimized fixture and fails here.
 */
const buildConservativeView = (): ProjectionView =>
  toProjectionView(calculate({ ...INPUT, optimized: false }, 79_350.17), INPUT);

/** Column titles in the order they are rendered, left to right. */
const ALL_COLUMNS = [
  "Year",
  "Age",
  "₿ Price",
  "Savings (today)",
  "Savings (nominal)",
  "₿ Savings",
  "₿ flows",
  "Annual Budget",
];

const headerTitles = () => screen.getAllByRole("columnheader").map((h) => h.textContent);

/**
 * Position of a column, so a cell can be tied to the header above it. Throwing
 * rather than returning -1 keeps a missing column from silently reading the
 * last cell in the row.
 */
const columnIndex = (title: string) => {
  const titles = headerTitles();
  const index = titles.indexOf(title);
  if (index < 0) {
    throw new Error(`No column headed "${title}". Rendered: ${titles.join(" | ")}`);
  }
  return index;
};

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

describe("TableTab", () => {
  it("shows a nominal column beside the converted one", () => {
    render(<TableTab view={buildView()} />);

    expect(screen.getByRole("columnheader", { name: "Savings (today)" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Savings (nominal)" })).toBeInTheDocument();
  });

  it("puts a year's nominal savings in the row that carries its converted savings", () => {
    // Headers alone prove nothing — a table can label two columns "today" and
    // "nominal" and print the same number under both, or print them under each
    // other's heading. The rule is that one reader takes in both faces of the
    // SAME year's figure, so this asserts on cells resolved through the header
    // above them, inside one row identified by its year.
    const view = buildView();
    const { container } = render(<TableTab view={view} />);

    const point = view.points[10];
    const converted = toUsd(point.savingsFiatReal);
    const nominal = toUsd(point.savingsFiat);
    // Without this the test is vacuous whenever discounting is a no-op: a
    // component printing the nominal figure twice would satisfy both cells.
    expect(converted).not.toBe(nominal);

    const cells = within(bodyRows(container)[10]).getAllByRole("cell");

    expect(cells[columnIndex("Year")].textContent).toBe(String(point.year));
    expect(cells[columnIndex("Savings (today)")].textContent).toBe(converted);
    expect(cells[columnIndex("Savings (nominal)")].textContent).toBe(nominal);
  });

  it("renders every column against its own field", () => {
    const view = buildView();
    const { container } = render(<TableTab view={view} />);

    const point = view.points[10];
    const cells = within(bodyRows(container)[10]).getAllByRole("cell");
    const under = (title: string) => cells[columnIndex(title)].textContent;

    expect(under("Year")).toBe(String(point.year));
    expect(under("Age")).toBe(String(point.age));
    expect(under("₿ Price")).toBe(toUsd(point.bitcoinPrice));
    expect(under("₿ Savings")).toBe(point.savingsBitcoin.toFixed(8));
    expect(under("₿ flows")).toBe(point.bitcoinFlow.toFixed(8));
  });

  it("renders one row per projected year, in projection order", () => {
    const view = buildView();
    const { container } = render(<TableTab view={view} />);

    expect(view.points.length).toBeGreaterThan(1);

    const yearIndex = columnIndex("Year");
    const years = bodyRows(container).map(
      (row) => within(row).getAllByRole("cell")[yearIndex].textContent,
    );

    // Comparing the whole column pins the count AND the order AND the values.
    // A row count on its own passes for any 53 wrong rows.
    expect(years).toEqual(view.points.map((p) => String(p.year)));
  });

  it("shows the nominal indexed budget in the years it is actually drawn", () => {
    const view = buildView();
    const { container } = render(<TableTab view={view} />);

    const index = view.points.findIndex((p) => p.age >= view.retirementAge);
    const point = view.points[index];
    // Discounted back to today this figure is a flat line at the budget the
    // user typed — identical in all 53 rows — which is why only the nominal is
    // shown. Asserting they differ is what makes the next line mean something.
    expect(toUsd(point.annualBudget)).not.toBe(toUsd(point.annualBudgetReal));

    const cells = within(bodyRows(container)[index]).getAllByRole("cell");
    expect(cells[columnIndex("Age")].textContent).toBe(String(view.retirementAge));
    expect(cells[columnIndex("Annual Budget")].textContent).toBe(toUsd(point.annualBudget));
  });

  it("says the budget is not relevant before retirement rather than printing a zero", () => {
    const view = buildView();
    const { container } = render(<TableTab view={view} />);

    const index = view.points.findIndex((p) => p.age < view.retirementAge);
    const point = view.points[index];
    expect(point.age).toBeLessThan(view.retirementAge);

    const cell = within(bodyRows(container)[index]).getAllByRole("cell")[
      columnIndex("Annual Budget")
    ];

    expect(cell.textContent).toBe("Not relevant");
    // A zero claims the quantity was measured and came out empty. The
    // calculators do populate a hypothetical indexed budget for these years, so
    // printing either it or $0.00 would assert an income nobody receives.
    expect(cell.textContent).not.toBe(toUsd(0));
    expect(cell.textContent).not.toBe(toUsd(point.annualBudget));
  });

  it("keeps drawing the budget after the conservative strategy has sold its stack", () => {
    // The regression guard for the predicate: `bitcoinFlow < 0` is how the
    // chart spots a withdrawal, and copying it here would blank the budget for
    // every conservative year after retirement, when the retiree is spending
    // fiat and the flow is 0.
    const view = buildConservativeView();
    const { container } = render(<TableTab view={view} />);

    const index = view.points.findIndex((p) => p.age > view.retirementAge);
    const point = view.points[index];
    expect(point.bitcoinFlow).toBe(0);

    const cells = within(bodyRows(container)[index]).getAllByRole("cell");
    expect(cells[columnIndex("Annual Budget")].textContent).toBe(toUsd(point.annualBudget));
  });

  it("draws no budget at all when the projection never reaches retirement", () => {
    // `retirementAge: 0` is the calculators' "not found" sentinel, not an age,
    // and every age is >= 0 — so without the `canRetire` guard this table would
    // print a budget in all 53 rows for someone who never retires, rising to
    // $13,274,948 at 83. The same sentinel already had to be special-cased in
    // `presentValue.ts`; it is a trap the codebase has fallen into before.
    const view = toProjectionView(calculateOptimal(BROKE_INPUT, 79_350.17), BROKE_INPUT);
    expect(view.canRetire).toBe(false);
    expect(view.retirementAge).toBe(0);
    expect(view.points[0].annualBudget).toBeGreaterThan(0);

    const { container } = render(<TableTab view={view} />);

    const budgetIndex = columnIndex("Annual Budget");
    const budgets = bodyRows(container).map(
      (row) => within(row).getAllByRole("cell")[budgetIndex].textContent,
    );

    expect(budgets).toEqual(view.points.map(() => "Not relevant"));
  });

  it("takes its column titles from the locale rather than from English literals", async () => {
    // The app ships en, es and pt. A hardcoded title passes every other test in
    // this file, because they all run against the English bundle.
    const view = buildView();
    await i18next.changeLanguage("es");
    try {
      const { container } = render(<TableTab view={view} />);

      expect(headerTitles()).toEqual([
        "Año",
        "Edad",
        "Precio ₿",
        "Ahorros (hoy)",
        "Ahorros (nominal)",
        "Ahorros ₿",
        "flujos ₿",
        "Presupuesto anual",
      ]);

      // The not-relevant marker is body text, not a heading, and it is the one
      // translated string the component renders into a cell.
      const index = view.points.findIndex((p) => p.age < view.retirementAge);
      const cells = within(bodyRows(container)[index]).getAllByRole("cell");
      expect(cells[columnIndex("Presupuesto anual")].textContent).toBe("Irrelevante");
    } finally {
      // Unmount before switching back, so the re-render does not land outside
      // `act` in whatever test runs next.
      cleanup();
      await i18next.changeLanguage("en");
    }
  });

  it("hides a column when it is unchecked and restores it in place", async () => {
    const user = userEvent.setup();
    render(<TableTab view={buildView()} />);

    expect(headerTitles()).toEqual(ALL_COLUMNS);

    await user.click(screen.getByRole("button", { name: "Choose columns" }));
    await user.click(await screen.findByRole("checkbox", { name: "₿ Price" }));

    expect(headerTitles()).toEqual(ALL_COLUMNS.filter((title) => title !== "₿ Price"));

    await user.click(screen.getByRole("checkbox", { name: "₿ Price" }));

    // Back in its original position, not appended: the chooser records which
    // columns are shown, and the column order stays the table's own.
    expect(headerTitles()).toEqual(ALL_COLUMNS);
  });

  it("caps the scroll container rather than the table, and pins the header to it", () => {
    // jsdom parses no stylesheet, so the class is the only observable trace of
    // this here; that it actually sticks is confirmed in a browser against a
    // production build. The class assertion still earns its place — the cap
    // moving to the table, or to a wrapper outside the scrollport, silently
    // unsticks the header, and nothing else in the suite would notice.
    const view = buildView();
    const { container } = render(<TableTab view={view} />);

    const scrollport = container.querySelector('[data-slot="table-container"]');
    expect(scrollport).toHaveClass("max-h-[260px]");
    expect(container.querySelector('[data-slot="table"]')).not.toHaveClass("max-h-[260px]");

    for (const header of screen.getAllByRole("columnheader")) {
      expect(header).toHaveClass("sticky", "top-0");
    }
  });
});
