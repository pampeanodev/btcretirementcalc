import { ProjectionView } from "../../models/ProjectionView";
import { toBtc, toUsd } from "../../constants";
import ProjectionChart from "./ProjectionChart";
import StatTile from "../common/StatTile";

interface StrategyCardProps {
  view: ProjectionView;
  title: string;
  caption: string;
  selected: boolean;
  onSelect: () => void;
}

const StrategyCard = ({ view, title, caption, selected, onSelect }: StrategyCardProps) => {
  const last = view.points[view.points.length - 1];

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex w-full flex-col gap-3 rounded-xl border p-4 text-left transition ${
        selected ? "border-bitcoin bg-bitcoin-soft" : "border-border"
      }`}
    >
      <div>
        <div className="text-xs uppercase tracking-wide text-ink-muted">{title}</div>
        <div className="font-mono text-3xl font-extrabold leading-none">
          {view.canRetire ? view.retirementAge : "—"}
        </div>
        <div className="text-xs text-ink-muted">{caption}</div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Stack at retirement" value={toBtc(view.savingsBitcoin)} />
        <StatTile
          label="Left at the end"
          value={toUsd(last ? last.savingsFiatReal : 0)}
          nominal={last ? `${toUsd(last.savingsFiat)} in ${last.year}` : undefined}
        />
      </div>

      <ProjectionChart
        view={view}
        variant={view.optimized ? "stack" : "cash"}
        unit={view.optimized ? "btc" : "fiat"}
        height={120}
      />
    </button>
  );
};

export default StrategyCard;
