import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// The suite runs with `globals: false`, so React Testing Library's automatic
// cleanup never registers itself. Unmount by hand between tests.
afterEach(() => {
  cleanup();
  localStorage.clear();
});

// App.tsx calls window.matchMedia("(prefers-color-scheme: dark)") during render,
// and antd's responsive observers use it too. jsdom ships no implementation.
// Defaults to light; use setPrefersColorScheme() to flip it for a single test.
export const setPrefersColorScheme = (scheme: "dark" | "light") => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches: scheme === "dark" && query.includes("prefers-color-scheme: dark"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
};
setPrefersColorScheme("light");

// antd's Slider, Table and Popover positioning all observe element size.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom returns null from getContext, which makes antd's QRCode throw while
// painting. Hand back an inert 2D context so it can no-op its way through.
HTMLCanvasElement.prototype.getContext = (() =>
  new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === "canvas") return undefined;
        if (prop === "measureText") return () => ({ width: 0 });
        if (prop === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
        if (prop === "createLinearGradient" || prop === "createPattern") return () => ({});
        return () => undefined;
      },
    },
  )) as unknown as HTMLCanvasElement["getContext"];
