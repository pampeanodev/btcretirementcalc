interface StatTileProps {
  label: string;
  value: string;
  /** Set whenever `value` has been discounted, so the future amount stays visible. */
  nominal?: string;
  size?: "hero" | "normal";
}

const StatTile = ({ label, value, nominal, size = "normal" }: StatTileProps) => (
  <div className="flex flex-col gap-0.5 rounded-lg border border-border p-3">
    <span className="text-xs uppercase tracking-wide text-ink-muted">{label}</span>
    <span
      className={`font-mono font-bold leading-none ${size === "hero" ? "text-4xl" : "text-lg"}`}
    >
      {value}
    </span>
    {nominal && <span className="text-xs text-ink-muted">{nominal}</span>}
  </div>
);

export default StatTile;
