import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScrubField from "../src/components/common/ScrubField";

describe("ScrubField", () => {
  it("shows one accessible control for the value", () => {
    render(
      <ScrubField
        label="Annual buy"
        name="annualBuy"
        value={12000}
        min={0}
        max={200000}
        onChange={() => {}}
      />,
    );

    // jest-dom coerces a number input's value, so this is a number, not "12000".
    expect(screen.getByRole("spinbutton", { name: "Annual buy" })).toHaveValue(12000);
  });

  it("reports typed changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ScrubField
        label="Growth"
        name="growthRate"
        value={20}
        min={0}
        max={100}
        onChange={onChange}
      />,
    );

    const field = screen.getByRole("spinbutton", { name: "Growth" });
    await user.clear(field);
    await user.type(field, "35");

    expect(onChange).toHaveBeenCalled();
    expect(onChange.mock.calls[onChange.mock.calls.length - 1][0]).toBe(35);
  });

  it("can be emptied mid-edit without reporting a non-number", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ScrubField
        label="Growth"
        name="growthRate"
        value={20}
        min={0}
        max={100}
        onChange={onChange}
      />,
    );

    const field = screen.getByRole("spinbutton", { name: "Growth" });
    await user.clear(field);

    // Without the draft the field would snap back to 20 here and the next
    // keystrokes would append to it.
    expect(field).toHaveValue(null);
    expect(onChange).not.toHaveBeenCalled();
    expect(onChange.mock.calls.every(([reported]) => Number.isFinite(reported))).toBe(true);

    // Leaving the field resyncs it with the value the parent still holds.
    await user.tab();
    expect(field).toHaveValue(20);
  });

  it("clears a stale draft when the slider moves", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ScrubField
        label="Growth"
        name="growthRate"
        value={20}
        min={0}
        max={100}
        onChange={onChange}
      />,
    );

    const field = screen.getByRole("spinbutton", { name: "Growth" });
    const slider = screen.getByRole("slider", { hidden: true });

    await user.clear(field);
    await user.type(field, "9");
    expect(field).toHaveValue(9);

    // Keyboard rather than a pointer drag: jsdom has no layout, so Base UI
    // cannot resolve a pointer position into a value, but the range input's
    // own arrow keys move it.
    slider.focus();
    await user.keyboard("{ArrowRight}");

    expect(onChange).toHaveBeenLastCalledWith(21);
    // The box must not go on showing the stale "9". This parent holds value at
    // 20, so it resyncs to that.
    expect(field).toHaveValue(20);
  });

  it("gives the slider the same accessible name and bounds", () => {
    render(
      <ScrubField
        label="Growth"
        name="growthRate"
        value={20}
        min={0}
        max={100}
        onChange={() => {}}
      />,
    );

    // `hidden: true`: Base UI keeps the thumb at visibility:hidden until it
    // measures the control, which never happens in jsdom.
    const slider = screen.getByRole("slider", { hidden: true });

    // Asserted as an attribute, not as `{ name: "Growth" }`. The accessible
    // name of a node inside a visibility:hidden subtree computes to "", and
    // `hidden: true` only re-admits the node to the role query — it does not
    // restore its name. In a browser the thumb is visible and this aria-label
    // is the input's accessible name.
    expect(slider).toHaveAttribute("aria-label", "Growth");
    expect(slider).toHaveAttribute("min", "0");
    expect(slider).toHaveAttribute("max", "100");
    expect(slider).toHaveAttribute("aria-valuenow", "20");
  });
});
