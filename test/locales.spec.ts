import { describe, expect, it } from "vitest";
import en from "../src/locales/en.json";
import es from "../src/locales/es.json";
import pt from "../src/locales/pt.json";
import { buildSeries, SERIES_LABEL_KEYS } from "../src/components/Results/ProjectionChart";
import { toProjectionView } from "../src/services/presentValue";
import { calculateOptimal } from "../src/services/bitcoinRetirementOptimizedCalculator";
import { InputData } from "../src/models/InputData";

/**
 * The redesign rewrote most of the UI, and every rewritten component had to be
 * given its copy back one key at a time. A key added to `en.json` and forgotten
 * in the other two does not fail anything: i18next falls back to English, so a
 * Spanish reader silently gets an English label and every test still passes,
 * because the tests run in English.
 *
 * These compare key sets rather than render anything, which is the only way to
 * catch a translation that was never written.
 */
const LOCALES = { es, pt };

describe("locales", () => {
  it("covers every English key in Spanish and Portuguese", () => {
    const expected = Object.keys(en).sort();

    for (const [lang, bundle] of Object.entries(LOCALES)) {
      const missing = expected.filter((key) => !(key in bundle));
      expect(missing, `${lang}.json is missing keys`).toEqual([]);
    }
  });

  it("carries no key the English bundle has dropped", () => {
    // The other direction, and not symmetric with the one above: a key deleted
    // from `en.json` when its component went leaves dead weight in the other
    // two, which is how a file grows entries nothing has read in years.
    for (const [lang, bundle] of Object.entries(LOCALES)) {
      const orphans = Object.keys(bundle).filter((key) => !(key in en));
      expect(orphans, `${lang}.json has keys en.json does not`).toEqual([]);
    }
  });

  it("has a translation key for every series label the chart can emit", () => {
    // `buildSeries` is a pure mapping, so its labels are fixed identifiers that
    // ProjectionChart turns into text through SERIES_LABEL_KEYS. A label with no
    // entry does not fail: i18next hands back the key it was given, which IS the
    // English label, so it renders correctly in English and never translates.
    // Two of the five were sitting like that when this test was written.
    const input: InputData = {
      currentAge: 30,
      lifeExpectancy: 86,
      currentSavingsInBitcoin: 1,
      annualBuyInFiat: 12_000,
      annualPriceGrowth: 20,
      inflationRate: 2,
      desiredRetirementAnnualBudget: 100_000,
      optimized: true,
    };
    const view = toProjectionView(calculateOptimal(input, 70_000), input);

    const emitted = new Set(
      [
        buildSeries(view, "cash"),
        buildSeries(view, "stack", "btc"),
        buildSeries(view, "stack", "fiat"),
      ].flatMap((series) => series.datasets.map((d) => d.label)),
    );
    expect(emitted.size).toBeGreaterThan(3);

    for (const label of emitted) {
      expect(SERIES_LABEL_KEYS, `no key for series label "${label}"`).toHaveProperty(label);
      expect(en, `${SERIES_LABEL_KEYS[label]} missing from en.json`).toHaveProperty(
        SERIES_LABEL_KEYS[label],
      );
    }
  });

  it("leaves no value empty", () => {
    for (const [lang, bundle] of Object.entries({ en, ...LOCALES })) {
      const blank = Object.entries(bundle)
        .filter(([, value]) => typeof value !== "string" || value.trim() === "")
        .map(([key]) => key);
      expect(blank, `${lang}.json has empty values`).toEqual([]);
    }
  });
});
