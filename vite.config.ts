import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  legacy: {
    // Vite 8 aligned CJS interop to Node semantics, where `import x from <cjs>`
    // resolves to `module.exports` and `__esModule` is ignored. Because this
    // package is `"type": "module"`, that breaks `use-local-storage` — a CJS-only
    // package that sets `exports.default = fn`, so the default import lands on
    // `{ __esModule: true, default: fn }` instead of the function itself.
    // See https://vite.dev/guide/migration - "Consistent CommonJS Interop".
    // TODO: drop this once `use-local-storage` is replaced; it is the only CJS
    // dependency in the bundle that hits this path.
    // test/App.spec.tsx guards this: it fails if the flag is removed.
    inconsistentCjsInterop: true,
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.ts"],
    restoreMocks: true,
  },
});
