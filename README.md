# Bitcoin Retirement Calculator

This project is part of the [Bitcoiner Academy](calcbitcoineracademy.com) project.

## How to run

This project uses vite and was made with pnpm

- Checkout the project `git clone https://github.com/pampeanodev/btcretirementcalc.git`
- Download [pnpm.io](https://pnpm.io/installation)
- run `pnpm install`
- run `pnpm run dev`

## Tests

`pnpm test:run` (or `pnpm test` to watch). Vitest, jsdom, React Testing Library.

There are two kinds of test here, and the difference matters:

- **Unit and component tests** (`*.spec.ts`, `*.spec.tsx`) run against source. They
  cover the calculators, that the app mounts, theme persistence, and the donate popover.
- **`build-smoke.spec.ts`** runs `vite build` and then executes the real production
  bundle. Component tests **cannot** catch bundler-level bugs: vitest resolves imports
  through vite-node's SSR transform, while the production build goes through Rolldown.
  A CJS interop break once took production down with `tsc`, `eslint`, `vitest` and
  `vite build` all green — this test is what goes red for that class of bug.

Adding a dependency upgrade? `build-smoke.spec.ts` is the one that matters.

## Dependencies

TypeScript is intentionally pinned to `5.9.x`. TypeScript 7.0 is the native (Go)
compiler rewrite, and `typescript-eslint` refuses to load against it — it throws
`typescript-eslint does not support TS 7.0` at module load, so `pnpm lint` breaks.
Its peer range caps at `<6.1.0` on every published version, including canary.

Track [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)
and lift the pin once TS >=7.1 is supported. Do not bump `typescript` past 5.9
before then.
