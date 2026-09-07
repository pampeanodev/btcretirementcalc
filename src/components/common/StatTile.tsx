interface StatTileProps {
  label: string;
  value: string;
  /** Set whenever `value` has been discounted, so the future amount stays visible. */
  nominal?: string;
  size?: "hero" | "normal";
}

const StatTile = ({ label, value, nominal, size = "normal" }: StatTileProps) => (
  // `data-slot` is a stable anchor, following the convention shadcn's generated
  // components already use here. The disclosure rule is that a converted figure
  // and its nominal sit together where one reader takes in both, and asserting
  // that needs a handle on the tile itself — `closest("div")` climbs to whatever
  // div happens to wrap it, so a nominal moved out of the tile still passes.
  <div data-slot="stat-tile" className="flex flex-col gap-0.5 rounded-lg border border-border p-3">
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
