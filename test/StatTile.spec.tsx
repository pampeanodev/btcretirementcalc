import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import StatTile from "../src/components/common/StatTile";

describe("StatTile", () => {
  it("renders its label and value", () => {
    render(<StatTile label="Retirement age" value="43" />);

    expect(screen.getByText("Retirement age")).toBeInTheDocument();
    expect(screen.getByText("43")).toBeInTheDocument();
  });

  it("discloses the nominal figure when the value has been converted", () => {
    render(<StatTile label="Annual budget" value="$100,000" nominal="$1,327,495 in 2079" />);

    expect(screen.getByText("$1,327,495 in 2079")).toBeInTheDocument();
  });

  it("renders no nominal line when the value was never converted", () => {
    const { container } = render(<StatTile label="Retirement age" value="43" />);

    // A component that rendered the nominal span unconditionally would pass
    // every other test in this file. An unexplained second line under a figure
    // nobody converted is the disclosure rule running backwards: it tells the
    // reader a transform happened when none did.
    expect(container.querySelectorAll("span")).toHaveLength(2);
  });
});

// Deliberately not tested here: that the hero size is larger than the normal
// one, and that figures render in the monospace face. jsdom parses no
// stylesheet, so the only thing available to assert is that a class string is
// present in an attribute — which passes when the class is there and the
// styling is broken, and fails when someone renames a token and nothing is
// broken at all. That is a change detector, not a test. Both properties are
// checked by eye in the browser pass.
