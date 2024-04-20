import { InputData } from "../models/InputData";
import { CalculationResult } from "../models/CalculationResult";
import {
  calculateBitcoinPriceHistory,
  getGrowthFactor,
  getInflationFactor,
} from "./calculationUtils";
import { AnnualBitcoinPrice } from "../models/AnnualBitcoinPrice";

export const calculate = (input: InputData, startingBitcoinPrice: number): CalculationResult => {
  const growthFactor = getGrowthFactor(input.annualPriceGrowth);
  const inflationFactor = getInflationFactor(input.inflationRate);
  const bitcoinPriceHistory = calculateBitcoinPriceHistory(
    input,
    startingBitcoinPrice,
    growthFactor,
    inflationFactor,
  );
  return buildRetirementPrediction(
    input,
    startingBitcoinPrice,
    inflationFactor,
    bitcoinPriceHistory,
  );
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
    retirementAge: 0,
    savingsBitcoin: 0,
    savingsFiat: 0,
    bitcoinPriceAtRetirementAge: 0,
    annualRetirementBudget: 0,
    annualRetirementBudgetAtRetirementAge: 0,
    optimized: false,
    canRetire: false,
  };

  let accumulatedSavingsBitcoin = input.currentSavingsInBitcoin;
  let indexedAnnualBuyInFiat = input.annualBuyInFiat;
  let accumulatedSavingsFiat = input.currentSavingsInBitcoin * startingBitcoinPrice;

  // iterate to find retirement values (age, savings, etc)
  for (const dataSetItem of bitcoinPriceHistory) {
    const pendingSavingsFiat = calculateFiatWillNeedOverLife(dataSetItem.age, bitcoinPriceHistory);
    accumulatedSavingsFiat = accumulatedSavingsBitcoin * dataSetItem.bitcoinPriceIndexed;

    if (pendingSavingsFiat <= accumulatedSavingsFiat) {
      calculationResult.canRetire = true;
      const yearsAfterRetirement = input.lifeExpectancy - dataSetItem.age;
      calculationResult.annualRetirementBudget = accumulatedSavingsFiat / yearsAfterRetirement;
      calculationResult.annualRetirementBudgetAtRetirementAge =
        dataSetItem.desiredAnnualBudgetIndexed;
      calculationResult.retirementAge = dataSetItem.age;
      calculationResult.bitcoinPriceAtRetirementAge = dataSetItem.bitcoinPriceIndexed;
      calculationResult.savingsBitcoin = accumulatedSavingsBitcoin;
      calculationResult.savingsFiat = accumulatedSavingsFiat;
      break;
    }
    // increase bitcoin price as composite interest based on annual price growth
    indexedAnnualBuyInFiat = indexedAnnualBuyInFiat * inflationFactor;
    // accumulate amount of btc you hodl
    const bitcoinToBuy = indexedAnnualBuyInFiat / dataSetItem.bitcoinPriceIndexed;
    accumulatedSavingsBitcoin += bitcoinToBuy;

    // add current year to dataset
    calculationResult.dataSet.push({
      key: dataSetItem.year,
      year: dataSetItem.year,
      age: dataSetItem.age,
      savingsBitcoin: accumulatedSavingsBitcoin,
      savingsFiat: accumulatedSavingsFiat,
      bitcoinFlow: bitcoinToBuy,
      bitcoinPrice: dataSetItem.bitcoinPriceIndexed,
      annualRetirementBudget: dataSetItem.desiredAnnualBudgetIndexed,
    });
  }
  // for (let age = input.currentAge + 1; age <= input.lifeExpectancy; age++) {
  //   year++;
  //   bitcoinPrice = bitcoinPrice * growthFactor;
  //   indexedDesiredAnnualBudget = indexedDesiredAnnualBudget * inflationFactor;
  //   const pendingSavingsFiat = calculateFiatWillNeedOverLife(age, bitcoinPriceHistory);

  //   // check whether the user has reached as much as they can retire
  //   if (pendingSavingsFiat <= accumulatedSavingsFiat) {
  //     calculationResult.canRetire = true;
  //     const yearsAfterRetirement = input.lifeExpectancy - age;
  //     calculationResult.annualRetirementBudget = accumulatedSavingsFiat / yearsAfterRetirement;
  //     calculationResult.annualRetirementBudgetAtRetirementAge = indexedDesiredAnnualBudget;
  //     calculationResult.retirementAge = age;
  //     calculationResult.bitcoinPriceAtRetirementAge = bitcoinPrice;
  //     calculationResult.savingsBitcoin = accumulatedSavingsBitcoin;
  //     calculationResult.savingsFiat = accumulatedSavingsFiat;
  //     break;
  //   }
  //   // increase bitcoin price as composite interest based on annual price growth
  //   indexedAnnualBuyInFiat = indexedAnnualBuyInFiat * inflationFactor;
  //   // accumulate amount of btc you hodl
  //   const bitcoinToBuy = indexedAnnualBuyInFiat / bitcoinPrice;
  //   accumulatedSavingsBitcoin += bitcoinToBuy;
  //   accumulatedSavingsFiat = accumulatedSavingsBitcoin * bitcoinPrice;

  //   // add current year to dataset
  //   calculationResult.dataSet.push({
  //     key: year,
  //     year: year,
  //     age: age,
  //     savingsBtc: accumulatedSavingsBitcoin,
  //     savingsFiat: accumulatedSavingsFiat,
  //     bitcoinBought: bitcoinToBuy,
  //     bitcoinPrice: bitcoinPrice,
  //     annualRetirementBudget: indexedDesiredAnnualBudget,
  //   });
  // }
  // didn't find a retirement age skip pos retirement calculations
  if (!calculationResult.canRetire) {
    return calculationResult;
  }
  // pos-retirement calculations
  let remainingSavingsFiat = calculationResult.savingsFiat;
  const posRetirementPriceHistory = bitcoinPriceHistory.filter(
    (x) => x.age >= calculationResult.retirementAge,
  );
  for (const dataSetItem of posRetirementPriceHistory) {
    remainingSavingsFiat -= dataSetItem.desiredAnnualBudgetIndexed;
    calculationResult.dataSet.push({
      key: dataSetItem.year,
      year: dataSetItem.year,
      age: dataSetItem.age,
      savingsBitcoin: 0,
      savingsFiat: remainingSavingsFiat,
      bitcoinFlow:
        dataSetItem.age == calculationResult.retirementAge ? -calculationResult.savingsBitcoin : 0,
      bitcoinPrice: dataSetItem.bitcoinPriceIndexed,
      annualRetirementBudget: dataSetItem.desiredAnnualBudgetIndexed,
    });
  }
  return calculationResult;
};

const calculateFiatWillNeedOverLife = (age: number, dataset: AnnualBitcoinPrice[]): number => {
  return dataset
    .filter((x) => x.age >= age)
    .reduce((sum, item) => {
      return sum + item.desiredAnnualBudgetIndexed;
    }, 0);
};
