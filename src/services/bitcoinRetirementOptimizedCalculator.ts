import { AnnualBitcoinPrice } from "../models/AnnualBitcoinPrice";
import { InputData } from "../models/InputData";
import { CalculationResult } from "../models/CalculationResult";
import {
  calculateBitcoinPriceHistory,
  getGrowthFactor,
  getInflationFactor,
} from "./calculationUtils";

export const calculateOptimal = (
  input: InputData,
  startingBitcoinPrice: number,
): CalculationResult => {
  const growthFactor = getGrowthFactor(input.annualPriceGrowth);
  const inflationFactor = getInflationFactor(input.inflationRate);
  const bitcoinPriceHistory = calculateBitcoinPriceHistory(
    input,
    startingBitcoinPrice,
    growthFactor,
    inflationFactor,
  );
  const result = buildRetirementPrediction(
    input,
    startingBitcoinPrice,
    inflationFactor,
    bitcoinPriceHistory,
  );

  return result;
};

const buildRetirementPrediction = (
  input: InputData,
  startingBitcoinPrice: number,
  inflationFactor: number,
  bitcoinPriceHistory: AnnualBitcoinPrice[],
) => {
  const calculationResult: CalculationResult = {
    startingBitcoinPrice: startingBitcoinPrice,
    dataSet: [],
    retirementAge: input.lifeExpectancy,
    savingsBitcoin: 0,
    savingsFiat: 0,
    bitcoinPriceAtRetirementAge: 0,
    annualRetirementBudget: 0,
    annualRetirementBudgetAtRetirementAge: 0,
    optimized: true,
    canRetire: false,
  };

  let accumulatedSavingsBitcoin = input.currentSavingsInBitcoin;
  let indexedAnnualBuyInFiat = input.annualBuyInFiat;

  // iterate to find retirement values (age, savings, etc)
  for (const dataSetItem of bitcoinPriceHistory) {
    // check whether the user has reached as much as they can retire
    const totalBictoinWillNeedInLifetime = calculateBitcoinWillNeedOverLife(
      dataSetItem.age,
      bitcoinPriceHistory,
    );
    if (totalBictoinWillNeedInLifetime < accumulatedSavingsBitcoin) {
      calculationResult.canRetire = true;
      calculationResult.retirementAge = dataSetItem.age;

      const yearsAfterRetirement = input.lifeExpectancy - dataSetItem.age;

      calculationResult.annualRetirementBudget = accumulatedSavingsBitcoin / yearsAfterRetirement;
      calculationResult.annualRetirementBudgetAtRetirementAge =
        dataSetItem.desiredAnnualBudgetIndexed;
      calculationResult.bitcoinPriceAtRetirementAge = dataSetItem.bitcoinPriceIndexed;
      calculationResult.savingsBitcoin = accumulatedSavingsBitcoin;
      calculationResult.savingsFiat = accumulatedSavingsBitcoin * dataSetItem.bitcoinPriceIndexed;

      break;
    }

    // accumulate amount of btc you hodl
    indexedAnnualBuyInFiat = indexedAnnualBuyInFiat * inflationFactor;
    const bitcoinToBuy = indexedAnnualBuyInFiat / dataSetItem.bitcoinPriceIndexed;
    accumulatedSavingsBitcoin += bitcoinToBuy;

    // add current year to dataset
    calculationResult.dataSet.push({
      key: dataSetItem.year,
      year: dataSetItem.year,
      age: dataSetItem.age,
      savingsBtc: accumulatedSavingsBitcoin,
      savingsFiat: accumulatedSavingsBitcoin * dataSetItem.bitcoinPriceIndexed,
      bitcoinBought: bitcoinToBuy,
      bitcoinPrice: dataSetItem.bitcoinPriceIndexed,
      annualRetirementBudget: dataSetItem.desiredAnnualBudgetIndexed,
    });
  }

  // didn't find a retirement age skip pos retirement calculations
  if (!calculationResult.canRetire) {
    return calculationResult;
  }
  // pos-retirement calculations
  const posRetirementPriceHistory = bitcoinPriceHistory.filter(
    (x) => x.age >= calculationResult.retirementAge,
  );
  let remainingSavingsBitcoin = calculationResult.savingsBitcoin;
  for (const dataSetItem of posRetirementPriceHistory) {
    const bitcoinToSell = dataSetItem.desiredAnnualBudgetIndexed / dataSetItem.bitcoinPriceIndexed;
    remainingSavingsBitcoin -= bitcoinToSell;
    calculationResult.dataSet.push({
      key: dataSetItem.year,
      year: dataSetItem.year,
      age: dataSetItem.age,
      savingsBtc: remainingSavingsBitcoin,
      savingsFiat: bitcoinToSell * dataSetItem.bitcoinPriceIndexed,
      bitcoinBought: -bitcoinToSell,
      bitcoinPrice: dataSetItem.bitcoinPriceIndexed,
      annualRetirementBudget: dataSetItem.desiredAnnualBudgetIndexed,
    });
  }
  return calculationResult;
};

const calculateBitcoinWillNeedOverLife = (age: number, dataset: AnnualBitcoinPrice[]): number => {
  return dataset
    .filter((x) => x.age >= age)
    .reduce((sum, item) => {
      const btcNeededForTheYear = item.desiredAnnualBudgetIndexed / item.bitcoinPriceIndexed;
      return sum + btcNeededForTheYear;
    }, 0);
};
