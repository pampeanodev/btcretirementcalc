import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ProjectionView } from "../../models/ProjectionView";
import { BITCOIN_SIGN } from "../../constants";
import ProjectionChart, { ChartUnit } from "./ProjectionChart";
import TableTab from "./tabs/TableTab";

const UNITS: { unit: ChartUnit; symbol: string; nameKey: string }[] = [
  { unit: "btc", symbol: BITCOIN_SIGN, nameKey: "chart.unit-btc" },
  { unit: "fiat", symbol: "$", nameKey: "chart.unit-fiat" },
];

/**
 * The ₿ / $ toggle lives here and only here. Putting one on each card would let
 * someone compare two strategies in different units without noticing.
 */
const StrategyDetail = ({ view }: { view: ProjectionView }) => {
  // The unit is the reader's choice, not the view's, so it survives a change of
  // strategy rather than resetting under them.
  const [t] = useTranslation();
  const [unit, setUnit] = useState<ChartUnit>("btc");

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border p-4">
      {/* Only `stack` has a unit to swap. The conservative strategy's `cash`
          chart plots dollars and bitcoin at once, so there is nothing to
          choose, and a control that changed nothing would be worse than none. */}
      {view.optimized && (
        <div className="flex gap-2" role="group" aria-label={t("chart.unit-group")}>
          {UNITS.map(({ unit: u, symbol, nameKey }) => (
            <button
              key={u}
              type="button"
              // The glyph alone is the visible label, and some screen readers
              // announce \u20bf as nothing at all — a silent button. The name
              // keeps the glyph, so it still contains the visible text, and adds
              // the word so there is something to say.
              aria-label={t(nameKey)}
              aria-pressed={unit === u}
              onClick={() => setUnit(u)}
              // The pressed state borrows StrategyCard's selected treatment —
              // bitcoin border over the soft tint — rather than filling with
              // `bg-bitcoin`. A solid fill needs a dark foreground to stay
              // readable, and `--color-bitcoin` is the one token that does not
              // move between themes, so nothing in the palette pairs with it in
              // both. The alternative was a literal `text-black`, which is the
              // colour rule this redesign exists to hold.
              className={`rounded-full border px-3 py-1 font-mono text-xs ${
                unit === u ? "border-bitcoin bg-bitcoin-soft" : "border-border text-ink-muted"
              }`}
            >
              {symbol}
            </button>
          ))}
        </div>
      )}

      {/* Two calls rather than one with ternary props: `unit` means something
          only on `stack`, and ProjectionChart's props are a discriminated union
          that a ternary cannot narrow. Same shape as StrategyCard. */}
      {view.optimized ? (
        <ProjectionChart view={view} variant="stack" unit={unit} />
      ) : (
        <ProjectionChart view={view} variant="cash" />
      )}

      <TableTab view={view} />
    </section>
  );
};

export default StrategyDetail;
