import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

interface ScrubFieldProps {
  label: string;
  name: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

/**
 * A number input and its slider as one control.
 *
 * They used to live in separate blocks of the input panel, which read as two
 * unrelated controls for one value. Typing sets a figure; dragging teaches how
 * sensitive the projection is to it — both are wanted, together.
 */
const ScrubField = ({
  label,
  name,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: ScrubFieldProps) => {
  const emit = (next: number) => {
    if (Number.isNaN(next)) {
      return;
    }
    onChange(next);
  };

  return (
    <div className="rounded-lg border border-border px-3 pt-2 pb-1">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={name} className="text-xs text-ink-muted">
          {label}
        </label>
        <div className="flex items-baseline gap-1">
          <Input
            id={name}
            name={name}
            type="number"
            className="w-28 border-0 bg-transparent p-0 text-right font-mono shadow-none focus-visible:ring-0"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => emit(e.target.valueAsNumber)}
          />
          {unit && <span className="text-xs text-ink-muted">{unit}</span>}
        </div>
      </div>
      {/* The visible track is 4px. The negative margin buys a ~44px touch
          target without growing it — the thumb's own `after:-inset-2` is
          about 28px, which is under the guideline. */}
      <div className="-my-2 py-2">
        <Slider
          thumbLabel={label}
          value={[value]}
          min={min}
          max={max}
          step={step}
          onValueChange={(next) => emit(Array.isArray(next) ? next[0] : next)}
        />
      </div>
      <div className="flex justify-between font-mono text-[10px] text-ink-muted">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
};

export default ScrubField;
