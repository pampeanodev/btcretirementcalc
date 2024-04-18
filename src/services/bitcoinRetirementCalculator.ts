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
    growthFactor,
    inflationFactor,
    bitcoinPriceHistory,
  );
};

const buildRetirementPrediction = (
  input: InputData,
  bitcoinPrice: number,
  growthFactor: number,
  inflationFactor: number,
  bitcoinPriceHistory: AnnualBitcoinPrice[],
) => {
  const calculationResult: CalculationResult = {
    startingBitcoinPrice: bitcoinPrice,
    dataSet: [],
    retirementAge: 0,
    savingsBitcoin: 0,
    savingsFiat: 0,
    bitcoinPriceAtRetirementAge: 0,
    annualRetirementBudget: 0,
    annualRetirementBudgetAtRetirementAge: 0,
    optimized: false,
  };

  let year = new Date().getFullYear();
  let accumulatedSavingsBitcoin = input.currentSavingsInBitcoin;
  let indexedDesiredAnnualBudget = input.desiredRetirementAnnualBudget;
  let indexedAnnualBuyInFiat = input.annualBuyInFiat;

  let accumulatedSavingsFiat = input.currentSavingsInBitcoin * bitcoinPrice;
  let yearsToLive = input.lifeExpectancy - input.currentAge;
  let pendingSavingsFiat = yearsToLive * input.desiredRetirementAnnualBudget;

  // iterate to find retirement values (age, savings, etc)
  for (let age = input.currentAge + 1; age <= input.lifeExpectancy; age++) {
    year++;
    bitcoinPrice = bitcoinPrice * growthFactor;
    indexedDesiredAnnualBudget = indexedDesiredAnnualBudget * inflationFactor;
    yearsToLive = input.lifeExpectancy - age;
    const newPendingSavingsFiat = calculateFiatWillNeedOverLife(age, bitcoinPriceHistory);
    // TODO: calculate pending savings considering inflation by year
    pendingSavingsFiat = newPendingSavingsFiat - accumulatedSavingsFiat;

    // check whether the user has reached as much as they can retire
    if (pendingSavingsFiat <= 0) {
      const yearsAfterRetirement = input.lifeExpectancy - age;
      calculationResult.annualRetirementBudget = accumulatedSavingsFiat / yearsAfterRetirement;
      calculationResult.annualRetirementBudgetAtRetirementAge = indexedDesiredAnnualBudget;
      calculationResult.retirementAge = age;
      calculationResult.bitcoinPriceAtRetirementAge = bitcoinPrice;
      calculationResult.savingsBitcoin = accumulatedSavingsBitcoin;
      calculationResult.savingsFiat = accumulatedSavingsFiat;
      break;
    }
    // increase bitcoin price as composite interest based on annual price growth
    indexedAnnualBuyInFiat = indexedAnnualBuyInFiat * inflationFactor;
    // accumulate amount of btc you hodl
    const bitcoinToBuy = indexedAnnualBuyInFiat / bitcoinPrice;
    accumulatedSavingsBitcoin += bitcoinToBuy;
    accumulatedSavingsFiat = accumulatedSavingsBitcoin * bitcoinPrice;

    // add current year to dataset
    calculationResult.dataSet.push({
      key: year,
      year: year,
      age: age,
      savingsBtc: accumulatedSavingsBitcoin,
      savingsFiat: accumulatedSavingsFiat,
      bitcoinBought: bitcoinToBuy,
      bitcoinPrice: bitcoinPrice,
      annualRetirementBudget: indexedDesiredAnnualBudget,
    });
  }

  // pos-retirement calculations
  let remainingSavingsFiat = calculationResult.savingsFiat;
  for (let age = calculationResult.retirementAge; age < input.lifeExpectancy; age++) {
    const priceIndex = age - input.currentAge - 1;
    const dataSetItem = bitcoinPriceHistory[priceIndex];
    remainingSavingsFiat -= calculationResult.annualRetirementBudget;
    bitcoinPrice = bitcoinPrice * growthFactor;
    calculationResult.dataSet.push({
      key: year,
      year: year,
      age: age,
      savingsBtc: 0,
      savingsFiat: remainingSavingsFiat,
      bitcoinBought: age == calculationResult.retirementAge ? -calculationResult.savingsBitcoin : 0,
      bitcoinPrice: dataSetItem.bitcoinPrice,
      annualRetirementBudget: dataSetItem.desiredAnnualBudget,
    });
    year++;
  }
  return calculationResult;
};

const calculateFiatWillNeedOverLife = (age: number, dataset: AnnualBitcoinPrice[]): number => {
  return dataset
    .filter((x) => x.age >= age)
    .reduce((sum, item) => {
      return sum + item.desiredAnnualBudget;
    }, 0);
};
