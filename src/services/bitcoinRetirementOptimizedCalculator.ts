import { AnnualBitcoinPrice } from "../models/AnnualBitcoinPrice";
import { InputData } from "../models/InputData";
import { CalculationResult } from "../models/CalculationResult";
import { getGrowthFactor, getInflationFactor } from "./calculationUtils";

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
    growthFactor,
    inflationFactor,
    bitcoinPriceHistory,
  );

  return result;
};

const calculateBitcoinPriceHistory = (
  input: InputData,
  bitcoinPrice: number,
  growthFactor: number,
  inflationFactor: number,
) => {
  let year = new Date().getFullYear();
  const priceHistory: AnnualBitcoinPrice[] = [];
  let currentAnnualBudget = input.desiredRetirementAnnualBudget;

  for (let age = input.currentAge + 1; age <= input.lifeExpectancy; age++) {
    year++;
    currentAnnualBudget = currentAnnualBudget * inflationFactor;
    bitcoinPrice = bitcoinPrice * growthFactor;
    priceHistory.push({ year, age, bitcoinPrice, desiredAnnualBudget: currentAnnualBudget });
  }
  return priceHistory;
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
  };

  let year = new Date().getFullYear();
  let accumulatedSavingsBitcoin = input.currentSavingsInBitcoin;
  let indexedDesiredAnnualBudget = input.desiredRetirementAnnualBudget;
  let indexedAnnualBuyInFiat = input.annualBuyInFiat;

  // iterate to find retirement values (age, savings, etc)
  for (let age = input.currentAge + 1; age <= input.lifeExpectancy; age++) {
    // check whether the user has reached as much as they can retire
    const totalBictoinWillNeedInLifetime = calculateBitcoinWillNeedOverLife(
      age,
      bitcoinPriceHistory,
    );
    if (totalBictoinWillNeedInLifetime < accumulatedSavingsBitcoin) {
      calculationResult.retirementAge = age;
      calculationResult.annualRetirementBudget = input.desiredRetirementAnnualBudget;
      calculationResult.bitcoinPriceAtRetirementAge = bitcoinPrice;
      calculationResult.savingsBitcoin = accumulatedSavingsBitcoin;
      calculationResult.savingsFiat = accumulatedSavingsBitcoin * bitcoinPrice;
      break;
    }

    year++;
    // increase bitcoin price as composite interest based on annual price growth
    bitcoinPrice = bitcoinPrice * growthFactor;
    indexedDesiredAnnualBudget = indexedDesiredAnnualBudget * inflationFactor;
    indexedAnnualBuyInFiat = indexedAnnualBuyInFiat * inflationFactor;

    // accumulate amount of btc you hodl
    const bitcoinToBuy = indexedAnnualBuyInFiat / bitcoinPrice;
    accumulatedSavingsBitcoin += bitcoinToBuy;

    // add current year to dataset
    calculationResult.dataSet.push({
      key: year,
      year: year,
      age: age,
      savingsBtc: accumulatedSavingsBitcoin,
      savingsFiat: accumulatedSavingsBitcoin * bitcoinPrice,
      bitcoinBought: bitcoinToBuy,
      bitcoinPrice: bitcoinPrice,
      annualRetirementBudget: indexedDesiredAnnualBudget,
    });
  }

  // didn't find a retirement age skip pos retirement calculations
  if (calculationResult.retirementAge == 0) {
    return calculationResult;
  }
  // pos-retirement calculations
  let remainingSavingsBitcoin = calculationResult.savingsBitcoin;
  for (let age = calculationResult.retirementAge; age <= input.lifeExpectancy; age++) {
    year++;

    const priceIndex = age - input.currentAge - 1;
    const dataSetItem = bitcoinPriceHistory[priceIndex];
    const bitcoinToSell = dataSetItem.desiredAnnualBudget / dataSetItem.bitcoinPrice;
    remainingSavingsBitcoin -= bitcoinToSell;
    calculationResult.dataSet.push({
      key: year,
      year: year,
      age: age,
      savingsBtc: remainingSavingsBitcoin,
      savingsFiat: bitcoinToSell * dataSetItem.bitcoinPrice,
      bitcoinBought: -bitcoinToSell,
      bitcoinPrice: dataSetItem.bitcoinPrice,
      annualRetirementBudget: dataSetItem.desiredAnnualBudget,
    });
  }
  return calculationResult;
};

const calculateBitcoinWillNeedOverLife = (age: number, dataset: AnnualBitcoinPrice[]): number => {
  return dataset
    .filter((x) => x.age >= age)
    .reduce((sum, item) => {
      const btcNeededForTheYear = item.desiredAnnualBudget / item.bitcoinPrice;
      return sum + btcNeededForTheYear;
    }, 0);
};
