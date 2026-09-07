import { useTranslation } from "react-i18next";
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
}: StrategyComparisonProps) => {
  const [t] = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <StrategyCard
        view={conservative}
        title={t("strategy.conservative-title")}
        caption={t("strategy.conservative-caption")}
        selected={selected === "conservative"}
        onSelect={() => onSelect("conservative")}
      />
      <StrategyCard
        view={optimized}
        title={t("strategy.optimized-title")}
        caption={t("strategy.optimized-caption")}
        selected={selected === "optimized"}
        onSelect={() => onSelect("optimized")}
      />
    </div>
  );
};

export default StrategyComparison;
