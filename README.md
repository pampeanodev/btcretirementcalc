# Bitcoin Retirement Calculator

This project is part of the [Bitcoiner Academy](calcbitcoineracademy.com) project.

## How to run

This project uses vite and was made with pnpm

- Checkout the project `git clone https://github.com/pampeanodev/btcretirementcalc.git`
- Download [pnpm.io](https://pnpm.io/installation)
- run `pnpm install`
- run `pnpm run dev`

## Dependencies

TypeScript is intentionally pinned to `5.9.x`. TypeScript 7.0 is the native (Go)
compiler rewrite, and `typescript-eslint` refuses to load against it — it throws
`typescript-eslint does not support TS 7.0` at module load, so `pnpm lint` breaks.
Its peer range caps at `<6.1.0` on every published version, including canary.

Track [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940)
and lift the pin once TS >=7.1 is supported. Do not bump `typescript` past 5.9
before then.
