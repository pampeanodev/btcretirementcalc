import { beforeAll, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { initI18n, renderWithRouter } from "./test-utils";

// useBitcoinPrice fetches /exrates on mount and again on an interval. Keep the
// suite off the network and make the rendered price deterministic.
vi.mock("../src/services/http-client", () => ({
  httpClient: {
    get: vi.fn().mockResolvedValue({ data: { BTC: 70000 } }),
    interceptors: {
      request: { use: vi.fn(), eject: vi.fn() },
      response: { use: vi.fn(), eject: vi.fn() },
    },
  },
}));

const App = (await import("../src/App")).default;

beforeAll(async () => {
  await initI18n();
});

describe("App", () => {
  /**
   * Catches the app failing to mount at all — a broken provider, a hook called
   * against a changed library API, a missing i18n bootstrap.
   *
   * It does NOT catch the Vite 8 CJS interop break (#51), and that was measured,
   * not assumed: with `legacy.inconsistentCjsInterop` removed from vite.config.ts
   * this file still passes 4/4. vitest resolves dependencies through vite-node's
   * SSR transform, which applies its own `__esModule`-aware interop, while the
   * production build goes through Rolldown and applies Node ESM semantics.
   *
   * build-smoke.spec.ts covers that class of bug by executing the real bundle.
   */
  it("mounts without crashing and renders the title", async () => {
    renderWithRouter(<App />);

    expect(await screen.findByText("Bitcoin Retirement Calculator")).toBeInTheDocument();
  });

  it("stores the resolved theme through useLocalStorage on first render", async () => {
    renderWithRouter(<App />);

    await screen.findByText("Bitcoin Retirement Calculator");

    // use-local-storage serializes with JSON.stringify, hence the quoted value.
    await waitFor(() => expect(localStorage.getItem("theme")).toBe('"light"'));
    expect(document.body).not.toHaveClass("dark");
  });

  it("flips the persisted theme when the dark-mode switch is toggled", async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />);

    const title = await screen.findByText("Bitcoin Retirement Calculator");
    await waitFor(() => expect(localStorage.getItem("theme")).toBe('"light"'));

    // Two switches exist — dark mode here, Conservative/Optimized in InputPanel.
    // Neither carries an accessible name, so scope the query to the header.
    const header = title.closest(".title");
    expect(header).not.toBeNull();

    await user.click(within(header as HTMLElement).getByRole("switch"));

    await waitFor(() => expect(localStorage.getItem("theme")).toBe('"dark"'));
    expect(document.body).toHaveClass("dark");
  });

  it("renders the calculator with a retirement result", async () => {
    renderWithRouter(<App />);

    expect(await screen.findByText("Your retirement age:")).toBeInTheDocument();
    expect(screen.getByText("Chart view")).toBeInTheDocument();
    expect(screen.getByText("Table view")).toBeInTheDocument();
  });
});
