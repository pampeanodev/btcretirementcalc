# Simulating price fluctuation — scoping

**Status:** not a spec and not an approved plan. This is the measurement and the
open questions that a brainstorming session should start from. Nothing here has
been agreed.

**Why:** the model prices bitcoin as `P₀ · (1 + g)^k` — a single smooth path with
no volatility, no drawdowns and no sequence-of-returns risk. An audit of the
optimized strategy (see `test/optimizedRetirementCalculator.spec.ts`) refuted
every hypothesis that the arithmetic was wrong. What is left to distrust is that
curve, and it is the reason the projection reads as too good.

---

## 1. What this changes about the product, not just the maths

The app currently answers **"you retire at 49."** With fluctuation the honest
answer becomes a distribution: a median, a spread, and a share of paths where
retirement never arrives at all. Every result surface is built around a single
number, so this is a product decision before it is an implementation.

The failure mode worth showing is specific: **the optimized strategy sells bitcoin
every year of retirement.** Selling into a 70% drawdown is exactly what a smooth
curve cannot express, and it is the one risk the "sell what you need" strategy
carries that "sell everything at retirement" does not. If the simulation is built
and does not surface that asymmetry, it has not earned its cost.

## 2. The seam already exists

`calculationUtils.ts`

```ts
calculateBitcoinPriceHistory(input, bitcoinPrice, growthFactor, inflationFactor, startYear)
  → AnnualBitcoinPrice[]   // { year, age, bitcoinPriceIndexed, desiredAnnualBudgetIndexed }
```

That array is the only thing downstream depends on. Both calculators are pure
functions of `(input, startingPrice)` and neither reaches for a clock or a
global. **A Monte Carlo runner generates N price paths and calls the existing
calculators unchanged.** No refactor of the calculators is required — this is the
cheapest part of the work and it should stay that way.

## 3. Measured cost

| | |
|---|---|
| One conservative + one optimized projection | **27 µs** |
| 1 000 paths (both strategies) | **27 ms** |
| 10 000 paths | **273 ms** |

Measured in jsdom on this machine, 2 000 iterations after a warm-up.

**Consequence: no web worker is needed at 1 000 paths.** 27 ms is inside a frame
budget. What does need care is that a `ScrubField` drag fires continuously —
debounce the recompute, do not move it off-thread.

One caveat for larger path counts: the retirement search is O(years²) —
`calculateBitcoinWillNeedOverLife` re-sums the whole tail on every iteration. It
does not matter at 56 years (measured above), and it would be worth a prefix-sum
before anyone reaches for 100 000 paths.

## 4. Which model — needs a decision

| | Captures | Cost |
|---|---|---|
| **(a) GBM**, drift = the user's CAGR, σ from history | volatility | trivial; assumes log-normal, so it throws away fat tails *and* the cycle — the two things that make the current model optimistic |
| **(b) Historical bootstrap** — resample real annual log-returns with replacement | real magnitudes, fat tails | needs a bundled series; i.i.d. resampling destroys sequence |
| **(c) Block bootstrap** — resample multi-year blocks | fat tails **and** drawdown clustering | same data, slightly more code |

**Recommendation: (c), falling back to (b).** The risk this feature exists to show
— selling into a drawdown — is a *sequence* effect. Independent yearly draws
scatter the bad years evenly and quietly delete the exact scenario that matters.
Block length is a real parameter to argue about; the four-year halving period is
the obvious candidate and also the obvious thing to be sceptical of.

**(a) is not a bad first step** if the goal is to ship something and learn. It just
should not be described to the reader as modelling real bitcoin behaviour.

## 5. Where the statistics come from — needs a decision

The request was "estadística real del precio de btc a lo largo de los años", so
the numbers have to come from data rather than from a plausible-sounding σ. Two
open questions, neither of which I should answer alone:

**Bundled or fetched?** A static series committed to the repo is deterministic,
works offline, is auditable in review, and goes stale. Fetching at runtime is
fresh and adds a dependency, a failure mode, and a second network call to an app
that already has one API-token problem. **Recommendation: bundle it**, with the
source and the retrieval date written into the file.

**How far back?** Starting in 2010–2013 includes early-adoption returns that will
not recur and that dominate any resample. Starting in 2017 halves the sample.
This choice moves the output more than the model choice does, and it is a
judgement about the future, not about the data.

## 6. Determinism is not optional

Seeded PRNG. `Math.random()` must not appear anywhere in this feature.

Two reasons, both concrete. Tests go flaky otherwise, and a flake already cost
time in the session that produced this note. And the query string is this app's
sharing contract — a link that reproduces a *different* fan chart for the person
you sent it to is a broken link. **The seed belongs in the URL** alongside the
other parameters.

## 7. What breaks in the UI

Not a list of chores — each of these is a small design question:

- **`StrategyCard`** shows one retirement age. A range needs a shape: median with
  a band? median with "n% never retire"? The card is small.
- **`ProjectionChart`** plots lines. A fan chart wants percentile bands, which is
  a different data shape than `ProjectionView.points` and a different chart.js
  configuration (`fill` between datasets).
- **`TableTab`** shows one row per year — of *which* path? Probably the median,
  and it has to say so.
- **The query string** carries scalars today; it gains a seed and a path count.
  Existing shared links must keep working — they currently do, and that was
  deliberate.
- **Both strategies** get simulated, so everything above happens twice.

## 8. The risk worth naming up front

This feature makes the app less confident, and that is the point. But the numbers
on screen today — retire at 49, $29M left over — will move, and a returning user
will read that as the calculator having been wrong before rather than as it being
more honest now. Decide in advance whether the default view is the median path or
the distribution, and whether the old deterministic mode stays available.

## 9. Suggested shape of the work

Roughly, and only after the decisions in §4 and §5 are made:

1. The historical series, bundled, with its provenance — and a test that it
   parses and covers the range it claims.
2. A seeded PRNG and the sampler, tested against known seeds.
3. The Monte Carlo runner over the existing calculators; assertions on the
   distribution, not on any single path.
4. The percentile aggregation into whatever shape the chart needs.
5. The UI, last, because §7 is where the design questions actually live.

Steps 1–3 are self-contained and testable without touching a component.
