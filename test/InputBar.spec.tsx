import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18next from "i18next";
import { useLocation } from "react-router-dom";
import { initI18n, renderWithRouter } from "./test-utils";
import InputBar from "../src/components/Input/InputBar";

beforeAll(async () => {
  await initI18n();
});

/**
 * Every control is queried by the accessible name a screen reader would announce,
 * which for all seven is the translated visible label — measured, not assumed:
 * the wrapping `<label>` names the plain boxes ("Current age:", the colon
 * included, and not the box's own value), and ScrubField's htmlFor/id pairing
 * names the four scrub controls. Hardcoding an English name anywhere, in an
 * `aria-label` or in ScrubField's `label` prop, breaks these queries — which is
 * the point of writing them this way.
 */
const CURRENT_AGE = "Current age:";
const LIFE_EXPECTANCY = "Life expectancy:";
const BITCOIN_HELD = "Amount of ₿itcoin you hodl:";
const ANNUAL_BUY = "Annual estimated buy:";
const GROWTH_RATE = "Price annual growth:";
const INFLATION_RATE = "Annual inflation:";
const DESIRED_INCOME = "Desired annual retirement income:";

/**
 * The query string is the shared-link contract, so a few tests below assert what
 * lands in it. Rendered beside the bar rather than read off the router, because
 * a memory router keeps its location to itself.
 */
const QueryString = () => <output aria-label="query string">{useLocation().search}</output>;

const params = () => new URLSearchParams(screen.getByLabelText("query string").textContent ?? "");

const lastCall = (onCalculate: ReturnType<typeof vi.fn>) =>
  onCalculate.mock.calls[onCalculate.mock.calls.length - 1][0];

describe("InputBar", () => {
  it("emits the current inputs on mount", async () => {
    const onCalculate = vi.fn();
    renderWithRouter(<InputBar onCalculate={onCalculate} />);

    await waitFor(() => expect(onCalculate).toHaveBeenCalled());
    expect(onCalculate.mock.calls[0][0]).toMatchObject({ currentAge: 30, lifeExpectancy: 86 });
  });

  it("emits the value the user typed, not one appended to the old one", async () => {
    const user = userEvent.setup();
    const onCalculate = vi.fn();
    renderWithRouter(<InputBar onCalculate={onCalculate} />);
    await waitFor(() => expect(onCalculate).toHaveBeenCalled());

    const field = screen.getByRole("spinbutton", { name: CURRENT_AGE });
    await user.clear(field);
    await user.type(field, "40");

    // The box is controlled by a number derived from the query string, and an
    // emptied box is not a number. Without a draft held through the edit, React
    // restores "30" after the rejected change and these keystrokes land on the
    // end of it: the field reads 3040 and the projection is run for a
    // 3040-year-old. Asserting only that onCalculate fired again cannot tell the
    // two apart.
    await waitFor(() => expect(lastCall(onCalculate).currentAge).toBe(40));
    expect(field).toHaveValue(40);
  });

  it("reads its starting values from the query string", async () => {
    const onCalculate = vi.fn();
    renderWithRouter(<InputBar onCalculate={onCalculate} />, ["/?currentAge=45"]);

    await waitFor(() => expect(onCalculate).toHaveBeenCalled());
    expect(onCalculate.mock.calls[0][0].currentAge).toBe(45);
  });

  it("carries every shared-link parameter into the inputs it emits", async () => {
    const onCalculate = vi.fn();
    renderWithRouter(<InputBar onCalculate={onCalculate} />, [
      "/?currentAge=41&lifeExpectancy=90&currentSavings=2.25&annualBuy=5000" +
        "&bitcoinCagr=30&inflationRate=3.5&desiredRetirementIncome=150000",
    ]);

    await waitFor(() => expect(onCalculate).toHaveBeenCalled());
    // Every parameter given a value distinct from its default and from the
    // others, so a renamed key, a swapped pair or a dropped field all show up.
    expect(onCalculate.mock.calls[0][0]).toEqual({
      currentAge: 41,
      lifeExpectancy: 90,
      currentSavingsInBitcoin: 2.25,
      annualBuyInFiat: 5000,
      annualPriceGrowth: 30,
      inflationRate: 3.5,
      desiredRetirementAnnualBudget: 150000,
      // The strategy is no longer chosen here; Calculator selects it.
      optimized: false,
    });
  });

  it("falls back to the default when a parameter is not a number", async () => {
    const onCalculate = vi.fn();
    renderWithRouter(<InputBar onCalculate={onCalculate} />, [
      "/?currentAge=abc&bitcoinCagr=twenty",
    ]);

    await waitFor(() => expect(onCalculate).toHaveBeenCalled());
    // A hand-edited or truncated link must not put NaN through the calculator.
    expect(onCalculate.mock.calls[0][0]).toMatchObject({ currentAge: 30, annualPriceGrowth: 20 });
  });

  it("falls back to the default when a parameter is present but blank", async () => {
    const onCalculate = vi.fn();
    renderWithRouter(<InputBar onCalculate={onCalculate} />, [
      "/?currentAge=&inflationRate=%20",
    ]);

    await waitFor(() => expect(onCalculate).toHaveBeenCalled());
    // Blank is the case a plain `Number()` gets wrong rather than loudly: it
    // reads "" and " " as 0, so a truncated link would quietly project a
    // newborn with zero inflation instead of using the defaults.
    expect(onCalculate.mock.calls[0][0]).toMatchObject({ currentAge: 30, inflationRate: 2 });
  });

  it("puts each control in the group its legend names", async () => {
    const onCalculate = vi.fn();
    renderWithRouter(<InputBar onCalculate={onCalculate} />);
    await waitFor(() => expect(onCalculate).toHaveBeenCalled());

    // The grouping is the task: seven controls in a flat list read as seven
    // unrelated ones. A `<fieldset>` exposes role group named by its `<legend>`,
    // so containment is assertable without touching a class or the DOM shape.
    const grouped = (legend: string, control: string) =>
      expect(screen.getByRole("group", { name: legend })).toContainElement(
        screen.getByRole("spinbutton", { name: control }),
      );

    grouped("About you", CURRENT_AGE);
    grouped("About you", LIFE_EXPECTANCY);
    grouped("Your bitcoin", BITCOIN_HELD);
    grouped("Your bitcoin", ANNUAL_BUY);
    grouped("Assumptions and goal", GROWTH_RATE);
    grouped("Assumptions and goal", INFLATION_RATE);
    grouped("Assumptions and goal", DESIRED_INCOME);
  });

  it("renders its labels and legends in the reader's language", async () => {
    const onCalculate = vi.fn();
    renderWithRouter(<InputBar onCalculate={onCalculate} />);
    await waitFor(() => expect(onCalculate).toHaveBeenCalled());

    await act(async () => {
      await i18next.changeLanguage("pt");
    });
    try {
      // ScrubField names its input from the `label` prop it is given, so a
      // hardcoded English label there is not a name/visible mismatch — it is a
      // control that never translates at all, in any locale, for every reader.
      expect(screen.getByRole("spinbutton", { name: "Compra Anual estimada:" })).toHaveValue(0);
      expect(screen.getByRole("spinbutton", { name: "Idade atual:" })).toHaveValue(30);
      expect(screen.getByRole("group", { name: "Sobre você" })).toContainElement(
        screen.getByRole("spinbutton", { name: "Idade atual:" }),
      );
      expect(screen.getByRole("group", { name: "Seu bitcoin" })).toContainElement(
        screen.getByRole("spinbutton", { name: "Compra Anual estimada:" }),
      );
      expect(screen.getByRole("group", { name: "Premissas e objetivo" })).toContainElement(
        screen.getByRole("spinbutton", { name: "Taxa de inflação anual:" }),
      );

      // Nothing English is left behind: a control keeping its English name would
      // mean a label that ignores the language rather than one that translates.
      expect(screen.queryByRole("spinbutton", { name: CURRENT_AGE })).toBeNull();
      expect(screen.queryByRole("spinbutton", { name: ANNUAL_BUY })).toBeNull();
      expect(screen.queryByRole("group", { name: "About you" })).toBeNull();
    } finally {
      await act(async () => {
        await i18next.changeLanguage("en");
      });
    }
  });

  it("writes each control back to its own parameter", async () => {
    const user = userEvent.setup();
    const onCalculate = vi.fn();
    renderWithRouter(
      <>
        <InputBar onCalculate={onCalculate} />
        <QueryString />
      </>,
    );
    await waitFor(() => expect(onCalculate).toHaveBeenCalled());

    // Asserted after each control rather than once at the end: emitting on a
    // change is per-value work — one missing effect dependency and that control
    // alone goes quiet until some other control is touched — and a single
    // assertion after the last edit would see every value in place regardless.
    const fields = [
      { name: CURRENT_AGE, typed: "41", param: "currentAge", emitted: "currentAge" },
      { name: LIFE_EXPECTANCY, typed: "90", param: "lifeExpectancy", emitted: "lifeExpectancy" },
      {
        name: BITCOIN_HELD,
        typed: "2.25",
        param: "currentSavings",
        emitted: "currentSavingsInBitcoin",
      },
      { name: ANNUAL_BUY, typed: "5000", param: "annualBuy", emitted: "annualBuyInFiat" },
      { name: GROWTH_RATE, typed: "30", param: "bitcoinCagr", emitted: "annualPriceGrowth" },
      { name: INFLATION_RATE, typed: "3.5", param: "inflationRate", emitted: "inflationRate" },
      {
        name: DESIRED_INCOME,
        typed: "150000",
        param: "desiredRetirementIncome",
        emitted: "desiredRetirementAnnualBudget",
      },
    ];
    for (const { name, typed, param, emitted } of fields) {
      const field = screen.getByRole("spinbutton", { name });
      await user.clear(field);
      await user.type(field, typed);

      await waitFor(() => expect(lastCall(onCalculate)[emitted]).toBe(Number(typed)));
      expect(params().get(param)).toBe(typed);
    }

    // Read back through the URL, which is what a shared link carries.
    expect(Object.fromEntries(params())).toEqual({
      currentAge: "41",
      lifeExpectancy: "90",
      currentSavings: "2.25",
      annualBuy: "5000",
      bitcoinCagr: "30",
      inflationRate: "3.5",
      desiredRetirementIncome: "150000",
    });
    expect(lastCall(onCalculate)).toEqual({
      currentAge: 41,
      lifeExpectancy: 90,
      currentSavingsInBitcoin: 2.25,
      annualBuyInFiat: 5000,
      annualPriceGrowth: 30,
      inflationRate: 3.5,
      desiredRetirementAnnualBudget: 150000,
      optimized: false,
    });
  });

  it("leaves the last real number in the query string when a box is emptied", async () => {
    const user = userEvent.setup();
    const onCalculate = vi.fn();
    renderWithRouter(
      <>
        <InputBar onCalculate={onCalculate} />
        <QueryString />
      </>,
    );
    await waitFor(() => expect(onCalculate).toHaveBeenCalled());

    const field = screen.getByRole("spinbutton", { name: CURRENT_AGE });
    await user.clear(field);
    await user.type(field, "44");
    await waitFor(() => expect(params().get("currentAge")).toBe("44"));

    await user.clear(field);

    // The box may sit empty mid-edit, but "NaN" must never reach the URL: it
    // travels in shared links, and a link carrying it would silently reset to
    // the default for whoever opened it.
    expect(field).toHaveValue(null);
    expect(params().get("currentAge")).toBe("44");
    expect(lastCall(onCalculate).currentAge).toBe(44);
  });
});
