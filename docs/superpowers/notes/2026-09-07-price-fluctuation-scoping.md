# Simulating price fluctuation — scoping

**Status:** the two open questions have been answered — see §4 and §5, updated
2026-09-08. Still not a spec: the model and the data source are settled, the
product questions in §1 and §7 are not.

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

|                                             |            |
| ------------------------------------------- | ---------- |
| One conservative + one optimized projection | **27 µs**  |
| 1 000 paths (both strategies)               | **27 ms**  |
| 10 000 paths                                | **273 ms** |

Measured in jsdom on this machine, 2 000 iterations after a warm-up.

**Consequence: no web worker is needed at 1 000 paths.** 27 ms is inside a frame
budget. What does need care is that a `ScrubField` drag fires continuously —
debounce the recompute, do not move it off-thread.

One caveat for larger path counts: the retirement search is O(years²) —
`calculateBitcoinWillNeedOverLife` re-sums the whole tail on every iteration. It
does not matter at 56 years (measured above), and it would be worth a prefix-sum
before anyone reaches for 100 000 paths.

## 4. Which model — needs a decision

|                                                                                  | Captures                              | Cost                                                                                                                             |
| -------------------------------------------------------------------------------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **(a) GBM**, drift = the user's CAGR, σ from history                             | volatility                            | trivial; assumes log-normal, so it throws away fat tails _and_ the cycle — the two things that make the current model optimistic |
| **(b) Historical bootstrap** — resample real annual log-returns with replacement | real magnitudes, fat tails            | needs a bundled series; i.i.d. resampling destroys sequence                                                                      |
| **(c) Block bootstrap** — resample multi-year blocks                             | fat tails **and** drawdown clustering | same data, slightly more code                                                                                                    |

**DECIDED (2026-09-08): (c), block bootstrap**, and the model must be explained to
the reader in a tooltip or popover rather than left implicit.

The reason it wins: the risk this feature exists to show — selling into a
drawdown — is a _sequence_ effect. Independent yearly draws scatter the bad years
evenly and quietly delete the exact scenario that matters.

**Work in monthly log returns, not annual ones.** The measured history (§5) yields
only 16 annual returns, and 4-year blocks over 16 observations leave ~13
overlapping windows — too few to resample without the output being a rearrangement
of the same handful of paths. Monthly returns over the same span give ~200
observations and ~150 distinct 48-month windows. Block length 48 months keeps the
halving cycle; that number is the obvious candidate and also the obvious thing to
stay sceptical of.

**On the tooltip.** The app already has the shadcn `Popover` primitive and used to
carry exactly this pattern in `AnnualBudgetExplanation`, which was deleted in the
redesign because its callers went. Bringing that component back is the natural
home for this explanation, and it settles an outstanding item in the handoff at
the same time. What it has to say, at minimum: that the paths are resampled from
real bitcoin history rather than simulated from a formula, in multi-year blocks so
that crashes stay attached to the runs that preceded them, and that past
behaviour is not a forecast.

## 5. Where the statistics come from — measured 2026-09-08

**yadio cannot supply this, and that was checked rather than assumed.**
`/hist/{range}/{currency}` takes a number of **days**, not a period: `5y` returns
five points, `10y` returns ten — the API parses the leading integer and drops the
suffix. `365` works and returns 365 daily points. **`366` and everything above it
return `{"error":"invalid parameter"}`.** One year of daily closes is the whole
offering. It stays the live-price source it already is; it cannot be the history.

CoinGecko's free tier refuses the same way, explicitly: _"Public API users are
limited to querying historical data..."_.

| Source                                                 | Depth measured                              | Key?   |
| ------------------------------------------------------ | ------------------------------------------- | ------ |
| yadio `/hist`                                          | **365 days, hard cap**                      | no     |
| CoinGecko free                                         | capped, refuses long ranges                 | no     |
| Binance `/api/v3/klines`                               | 2017-08 → today, monthly candles            | no     |
| **blockchain.com `/charts/market-price?timespan=all`** | **2009-01 → today, 1 615 points, 17 years** | **no** |

**Recommendation: blockchain.com, fetched once and committed to the repo** as a
static series, with the source URL and the retrieval date in the file. Bundling
keeps the simulation deterministic, offline, reviewable in a diff, and free of a
second runtime dependency — and these statistics have no reason to be fresh to
the day.

**How far back to include — still a judgement, and now a concrete one.** These are
the annual returns that source actually returns:

```
2011  +1556%    2012  +205%     2013  +5204%    2014   -57%
2015    +39%    2016  +115%     2017  +1256%    2018   -70%
2019    +94%    2020  +295%     2021   +61%     2022   -64%
2023   +163%    2024  +115%     2025    -6%     2026    -9%
```

2011 and 2013 are early-adoption returns that will not recur, and a resampler that
draws them produces paths nobody should be shown. Cutting them costs two of
sixteen observations. Starting at 2015 or 2017 is defensible and halves the
sample. **This choice moves the output more than the model choice does, and it is
a judgement about the future rather than about the data** — so whatever is picked
should be visible to the reader in the same popover as the model, not buried in a
constant.

Two things this table settles on its own. The realized range is **−70% to +5204%**,
which is the case against a constant 20% CAGR in one line. And the drawdowns
cluster — 2014, 2018, 2022 — four years apart, which is the case for block
resampling over independent draws.

## 6. Determinism is not optional

Seeded PRNG. `Math.random()` must not appear anywhere in this feature.

Two reasons, both concrete. Tests go flaky otherwise, and a flake already cost
time in the session that produced this note. And the query string is this app's
sharing contract — a link that reproduces a _different_ fan chart for the person
you sent it to is a broken link. **The seed belongs in the URL** alongside the
other parameters.

## 7. What breaks in the UI

Not a list of chores — each of these is a small design question:

- **`StrategyCard`** shows one retirement age. A range needs a shape: median with
  a band? median with "n% never retire"? The card is small.
- **`ProjectionChart`** plots lines. A fan chart wants percentile bands, which is
  a different data shape than `ProjectionView.points` and a different chart.js
  configuration (`fill` between datasets).
- **`TableTab`** shows one row per year — of _which_ path? Probably the median,
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

1. The historical series from blockchain.com, reduced to monthly closes,
   committed with its source URL and retrieval date — and a test that it parses,
   covers the span it claims, and contains no gaps.
2. A seeded PRNG and the block sampler, tested against known seeds.
3. The Monte Carlo runner over the existing calculators; assertions on the
   distribution, not on any single path.
4. The percentile aggregation into whatever shape the chart needs.
5. The UI, last, because §7 is where the design questions actually live — and the
   popover from §4, which is where `AnnualBudgetExplanation` comes back.

Steps 1–3 are self-contained and testable without touching a component.

**One trap worth naming before step 3.** The existing calculators decide
retirement by summing `budget / price` over _every remaining year of the known
price path_. That is only meaningful when the path is known in advance. Under
resampling it becomes a person with perfect foresight of the next fifty years of
bitcoin, which is a stronger assumption than the constant CAGR it replaces, not a
weaker one. The retirement rule has to be restated in terms a person could
actually act on — a withdrawal rate, a multiple of current spending, a rolling
re-check — and that is a design decision, not a port. It is the real work in this
feature, and it is not in the 27 µs.
