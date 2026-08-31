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

  it("sizes the hero figure larger than a normal one", () => {
    render(<StatTile label="Annual budget" value="$100,000" size="hero" />);

    expect(screen.getByText("$100,000")).toHaveClass("text-4xl");
  });

  it("renders figures in the monospace face", () => {
    render(<StatTile label="Stack" value="₿1.845" />);

    expect(screen.getByText("₿1.845")).toHaveClass("font-mono");
  });
});
