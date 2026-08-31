import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

    // A keystroke appends to the controlled value: this parent never feeds the
    // new number back, so React keeps restoring "20" between keys.
    await user.type(field, "5");
    expect(onChange).toHaveBeenLastCalledWith(205);

    // A whole figure typed over the field arrives as a number, not a string.
    // fireEvent rather than user.clear(): an emptied number input reads as NaN,
    // which ScrubField refuses to emit, so React restores the controlled value
    // and later keystrokes append to it. A number input also exposes no
    // selection API, so select-all-and-replace is not available either.
    fireEvent.change(field, { target: { value: "35" } });
    expect(onChange).toHaveBeenLastCalledWith(35);
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
