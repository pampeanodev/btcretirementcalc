import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Guards the bundled output, not the source.
 *
 * The Vite 8 CJS interop break (#51) took production down while `tsc`, `eslint`,
 * `vitest` and `vite build` were all green. Component tests cannot catch it:
 * vitest resolves dependencies through vite-node's SSR transform, which applies
 * its own `__esModule`-aware interop, while the production build goes through
 * Rolldown and applies Node ESM semantics. Different pipelines, different result.
 *
 * So this test executes the real production bundle. It is the only check here
 * that would have gone red before that deploy.
 */
const distDir = resolve(import.meta.dirname, "../dist/assets");

const findBundle = () => {
  const entry = readdirSync(distDir).find((f) => /^index-.*\.js$/.test(f));
  if (!entry) {
    throw new Error(`No production bundle found in ${distDir}`);
  }
  return resolve(distDir, entry);
};

describe("production bundle", () => {
  let bundlePath: string;

  beforeAll(() => {
    execFileSync("node_modules/.bin/vite", ["build"], {
      cwd: resolve(import.meta.dirname, ".."),
      stdio: "pipe",
    });
    bundlePath = findBundle();
  }, 120_000);

  it("boots and mounts the app into #root", async () => {
    document.body.innerHTML = '<div id="root"></div>';

    // Evaluating the bundle runs main.tsx for real, including the
    // `useLocalStorage(...)` call whose broken interop threw in production.
    await import(bundlePath);

    await expect
      .poll(() => document.getElementById("root")?.childElementCount ?? 0, { timeout: 10_000 })
      .toBeGreaterThan(0);

    expect(document.getElementById("root")?.textContent).toContain("Bitcoin Retirement Calculator");
  });
});
