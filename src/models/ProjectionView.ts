export interface ProjectionPoint {
  key: number;
  year: number;
  age: number;
  bitcoinPrice: number;
  savingsBitcoin: number;
  /** Nominal value of the stack that year. */
  savingsFiat: number;
  /** Same figure in the purchasing power of today. */
  savingsFiatReal: number;
  bitcoinFlow: number;
  /** Nominal budget that year, indexed by inflation. */
  annualBudget: number;
  /** Same figure discounted back to today. */
  annualBudgetReal: number;
}

export interface ProjectionView {
  optimized: boolean;
  canRetire: boolean;
  retirementAge: number;
  savingsBitcoin: number;
  savingsFiat: number;
  savingsFiatReal: number;
  /**
   * The budget at the retirement age, nominal. Sourced from
   * `annualRetirementBudgetAtRetirementAge`, which means the same thing on both
   * strategies — see the note in `presentValue.ts`.
   */
  annualBudget: number;
  /** Same figure discounted back to today. Round-trips to the user's input. */
  annualBudgetReal: number;
  startingBitcoinPrice: number;
  bitcoinPriceAtRetirementAge: number;
  points: ProjectionPoint[];
}
