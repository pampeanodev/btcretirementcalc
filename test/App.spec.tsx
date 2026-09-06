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
    // Asserted positively. `body` used to carry a `dark` class as well, and the
    // negative form of that assertion survived the class being removed for good
    // — it passes against a theme that never applies at all. `data-theme` on
    // <html> is what theme.css actually resolves its tokens against.
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
  });

  it("flips the persisted theme when the dark-mode switch is toggled", async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />);

    const title = await screen.findByText("Bitcoin Retirement Calculator");
    await waitFor(() => expect(localStorage.getItem("theme")).toBe('"light"'));

    // The switch carries no accessible name, so scope the query to the header.
    // It used to have to compete with InputPanel's Conservative/Optimized
    // switch; that one is gone, and the scoping stays because the header is
    // where this control lives, not because something else would match.
    const header = title.closest(".title");
    expect(header).not.toBeNull();

    await user.click(within(header as HTMLElement).getByRole("switch"));

    await waitFor(() => expect(localStorage.getItem("theme")).toBe('"dark"'));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
  });

  it("gives each strategy its own retirement age", async () => {
    renderWithRouter(<App />);

    const conservative = await screen.findByRole("button", {
      name: /Sell everything at retirement/,
    });
    const optimized = screen.getByRole("button", { name: /Sell what you need/ });

    // The ages are asserted, not just their presence. Both strategies are
    // computed on every change now, and the two figures must differ: liquidating
    // the whole stack at retirement funds it later than selling a slice a year.
    // A card reading the other strategy's result, or one calculator's output
    // wired into both cards, shows up here and nowhere else.
    //
    // 60 and 50 are fixed by the default inputs and the $70,000 price mocked
    // above, not by the calendar — only the year labels move with the clock, and
    // these patterns stop before them.
    expect(conservative).toHaveAccessibleName(/^Sell everything at retirement 60 /);
    expect(optimized).toHaveAccessibleName(/^Sell what you need 50 /);
    expect(screen.queryByText(/not gonna make it/i)).toBeNull();
  });

  it("expands the selected strategy under the comparison", async () => {
    renderWithRouter(<App />);
    await screen.findByRole("button", { name: /Sell what you need/ });

    // Optimized is selected on load, and it is the only strategy with a unit to
    // choose, so the toggle group is proof that StrategyDetail mounted for it —
    // the cards never render one. Without this the comparison could render
    // alone and every other assertion in this file would still pass.
    expect(await screen.findByRole("group", { name: "Chart unit" })).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("expands the other strategy when its card is picked", async () => {
    const user = userEvent.setup();
    renderWithRouter(<App />);

    const conservative = await screen.findByRole("button", {
      name: /Sell everything at retirement/,
    });
    expect(conservative).toHaveAttribute("aria-pressed", "false");
    await screen.findByRole("group", { name: "Chart unit" });

    await user.click(conservative);

    // Selling the whole stack leaves nothing to hold, so its chart plots dollars
    // and bitcoin at once and there is no unit to choose — the toggle is gone.
    // Asserting the pressed state alone would pass against a detail panel still
    // showing the strategy nobody picked.
    await waitFor(() => expect(screen.queryByRole("group", { name: "Chart unit" })).toBeNull());
    expect(conservative).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("says so when the inputs put retirement out of reach", async () => {
    renderWithRouter(<App />, ["/?currentAge=90&lifeExpectancy=86"]);

    // An age past the life expectancy projects no years at all. InputPanel used
    // to refuse the keystroke silently; nothing refuses it now, so the answer
    // has to be an answer. Both cards still render, showing "—".
    expect(await screen.findByText(/not gonna make it/i)).toBeInTheDocument();
    expect(screen.getByText(/Stay humble/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sell what you need — / })).toBeInTheDocument();
    // No detail panel: there is nothing to expand.
    expect(screen.queryByRole("table")).toBeNull();
  });
});
