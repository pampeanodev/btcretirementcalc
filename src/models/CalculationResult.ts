export interface CalculationResult {
  annualRetirementBudgetAtRetirementAge?: number;
  startingBitcoinPrice: number;
  dataSet: AnnualTrackingData[];
  retirementAge: number;
  savingsBitcoin: number;
  savingsFiat: number;
  bitcoinPriceAtRetirementAge: number;
  annualRetirementBudget: number;
  optimized: boolean;
  canRetire: boolean;
}

export interface AnnualTrackingData {
  key: number;
  year: number;
  age: number;
  savingsBtc: number;
  savingsFiat: number;
  bitcoinBought: number;
  bitcoinPrice: number;
  annualRetirementBudget: number;
}
