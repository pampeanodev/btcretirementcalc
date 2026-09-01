import { ProjectionView } from "../../models/ProjectionView";
import StrategyCard from "./StrategyCard";

export type StrategyKey = "conservative" | "optimized";

interface StrategyComparisonProps {
  conservative: ProjectionView;
  optimized: ProjectionView;
  selected: StrategyKey;
  onSelect: (which: StrategyKey) => void;
}

const StrategyComparison = ({
  conservative,
  optimized,
  selected,
  onSelect,
}: StrategyComparisonProps) => (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
    <StrategyCard
      view={conservative}
      title="Sell everything at retirement"
      caption="cash drawn down from the sale"
      selected={selected === "conservative"}
      onSelect={() => onSelect("conservative")}
    />
    <StrategyCard
      view={optimized}
      title="Sell what you need"
      caption="keep holding, sell a slice each year"
      selected={selected === "optimized"}
      onSelect={() => onSelect("optimized")}
    />
  </div>
);

export default StrategyComparison;
