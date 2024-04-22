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
  savingsBitcoin: number;
  savingsFiat: number;
  bitcoinFlow: number;
  bitcoinPrice: number;
  annualRetirementBudget: number;
}
