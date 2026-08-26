import { beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { initI18n } from "./test-utils";
import Donate from "../src/components/Misc/Donate";

beforeAll(async () => {
  await initI18n();
});

describe("Donate", () => {
  it("renders the trigger button closed", () => {
    render(<Donate />);

    expect(screen.getByRole("button", { name: "Donate!" })).toBeInTheDocument();
    expect(screen.queryByText("Support this project:")).not.toBeInTheDocument();
  });

  it("opens a popover with the on-chain QR code", async () => {
    const user = userEvent.setup();
    render(<Donate />);

    await user.click(screen.getByRole("button", { name: "Donate!" }));

    expect(await screen.findByText("Support this project:")).toBeInTheDocument();
    expect(document.querySelector(".donate-content canvas")).not.toBeNull();
  });

  /**
   * Alby can no longer receive donations, so #50 deleted LnInvoice and
   * albyApiClient and collapsed this popover from two tabs to the on-chain QR
   * alone. If the Lightning tab ever reappears, it means the dead Alby path —
   * and the client-side API token that shipped with it — came back too.
   */
  it("offers no Lightning tab", async () => {
    const user = userEvent.setup();
    render(<Donate />);

    await user.click(screen.getByRole("button", { name: "Donate!" }));
    await screen.findByText("Support this project:");

    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByText("Lightning")).not.toBeInTheDocument();
  });
});
