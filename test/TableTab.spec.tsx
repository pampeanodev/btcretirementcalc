import { beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { initI18n } from "./test-utils";
import TableTab from "../src/components/Results/tabs/TableTab";
import { toProjectionView } from "../src/services/presentValue";
import { calculateOptimal } from "../src/services/bitcoinRetirementOptimizedCalculator";
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

/** Column titles in the order they are rendered, left to right. */
const ALL_COLUMNS = [
  "Year",
  "Age",
  "₿ Price",
  "Savings (today)",
  "Savings (nominal)",
  "₿ Savings",
  "₿ flows",
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
