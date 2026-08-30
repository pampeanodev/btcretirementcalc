import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// What this file does NOT cover, deliberately: whether a Tailwind utility beats
// a component's own style. jsdom parses no stylesheet and Tailwind generates no
// CSS here, so any assertion about computed style would pass without proving
// anything. That property is the entire reason antd was dropped, and it is
// verified in a browser against a production build instead — `bg-bitcoin` on a
// Button computing to rgb(246, 147, 26). See the spec's Styling section.

describe("shadcn primitives", () => {
  it("renders a Table with its rows", () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Age</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>43</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );

    expect(screen.getByRole("columnheader", { name: "Age" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "43" })).toBeInTheDocument();
  });

  it("caps the scroll container rather than the table", () => {
    // Guards the local edit to the generated component. A sticky header resolves
    // against its nearest scrollport, which is this wrapper div, so the height
    // cap has to reach it. Regenerating table.tsx would drop the prop and the
    // header would stop sticking with nothing else failing.
    const { container } = render(
      <Table containerClassName="max-h-[250px]" className="w-full" />,
    );

    const wrapper = container.querySelector('[data-slot="table-container"]');
    expect(wrapper).toHaveClass("max-h-[250px]");
    expect(container.querySelector("table")).not.toHaveClass("max-h-[250px]");
  });

  it("renders a Slider whose native range input carries the value", () => {
    render(<Slider defaultValue={[20]} min={0} max={100} />);

    // `hidden: true` is required here and is a jsdom artifact, not a defect.
    // Base UI keeps the thumb at `visibility: hidden` until it has measured the
    // control, and jsdom has no layout engine, so the measurement never lands
    // and the thumb — which wraps the native range input — stays hidden from
    // the accessibility tree. In a browser the input is exposed as role=slider.
    const input = screen.getByRole("slider", { hidden: true });

    expect(input).toHaveAttribute("aria-valuenow", "20");
    expect(input).toHaveAttribute("min", "0");
    expect(input).toHaveAttribute("max", "100");
  });

  it("opens a Popover on click", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger render={<button>open</button>} />
        <PopoverContent>panel body</PopoverContent>
      </Popover>,
    );

    await user.click(screen.getByRole("button", { name: "open" }));

    expect(await screen.findByText("panel body")).toBeInTheDocument();
  });
});
