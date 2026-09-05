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

// jsdom returns null from getContext, so anything that paints — antd's QRCode,
// chart.js — gets an inert 2D context here and no-ops its way through.
//
// `canvas` returns the element rather than undefined, and that one property is
// load-bearing. chart.js only accepts a context whose `.canvas` is identical to
// the element it asked about; without it `acquireContext` returns null and the
// Chart constructor RETURNS EARLY, leaving an object whose `this.canvas` is
// null. That object survives, and the next `chart.update()` — which any
// re-render triggers, because the options object is rebuilt every render —
// walks into `bindResponsiveEvents`, asks whether a null canvas is attached,
// and throws "Cannot read properties of null (reading 'ownerDocument')" from
// inside chart.js. The whole tree lands in the router's error boundary.
//
// So it looked like toggling the theme or picking the other strategy crashed
// the app. Neither does: both were checked against a production build in
// Chrome. The crash was this stub, and it made every test that re-renders a
// chart unwritable.
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement) {
  return new Proxy(
    {},
    {
      // Arrow, so `this` is still the canvas `getContext` was called on.
      get: (_target, prop) => {
        if (prop === "canvas") return this;
        if (prop === "measureText") return () => ({ width: 0 });
        if (prop === "getImageData") return () => ({ data: new Uint8ClampedArray(4) });
        if (prop === "createLinearGradient" || prop === "createPattern") return () => ({});
        return () => undefined;
      },
    },
  );
} as unknown as HTMLCanvasElement["getContext"];
