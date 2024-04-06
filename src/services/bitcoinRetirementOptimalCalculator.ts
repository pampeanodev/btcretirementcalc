import { AnnualBitcoinPrice } from "../models/AnnualBitcoinPrice";
import { CalculationData } from "../models/CalculationData";
import { CalculationResult } from "../models/CalculationResult";

export const calculateOptimal = (
  input: CalculationData,
  startingBitcoinPrice: number,
): CalculationResult => {
  const growthRate = input.annualPriceGrowth / 100;
  const growthFactor = 1 + growthRate;
  const bitcoinPriceHistory = calculateBitcoinPriceHistory(
    input,
    startingBitcoinPrice,
    growthFactor,
  );
  const result = estimateRetirementAge(
    input,
    startingBitcoinPrice,
    growthFactor,
    bitcoinPriceHistory,
  );

  return result;
};

const calculateBitcoinPriceHistory = (
  input: CalculationData,
  bitcoinPrice: number,
  growthFactor: number,
) => {
  let year = new Date().getFullYear();
  const priceHistory: AnnualBitcoinPrice[] = [];

  for (let age = input.currentAge + 1; age <= input.lifeExpectancy; age++) {
    year++;
    bitcoinPrice = bitcoinPrice * growthFactor;

    priceHistory.push({ year, age, bitcoinPrice });
  }
  return priceHistory;
};

const estimateRetirementAge = (
  input: CalculationData,
  currentBtcPrice: number,
  growthFactor: number,
  bitcoinPriceHistory: AnnualBitcoinPrice[],
) => {
  const calculationResult: CalculationResult = {
    startingBitcoinPrice: currentBtcPrice,
    dataSet: [],
    retirementAge: 0,
    savingsBitcoin: 0,
    savingsFiat: 0,
    bitcoinPriceAtRetirementAge: 0,
    annualRetirementBudget: 0,
  };

  let accumulatedSavingsBitcoin = input.currentSavingsInBitcoin;
  let year = new Date().getFullYear();

  for (let age = input.currentAge + 1; age <= input.lifeExpectancy; age++) {
    year++;
    currentBtcPrice = currentBtcPrice * growthFactor;
    const bitcoinBought = input.annualBuyInFiat / currentBtcPrice;
    accumulatedSavingsBitcoin += bitcoinBought;

    const totalBictoinWillNeed = calculateMoneyWillNeedOverLife(
      age,
      input.desiredRetirementAnnualBudget,
      bitcoinPriceHistory,
    );

    if (totalBictoinWillNeed < accumulatedSavingsBitcoin) {
      calculationResult.retirementAge = age;
      calculationResult.annualRetirementBudget = input.desiredRetirementAnnualBudget;
      calculationResult.bitcoinPriceAtRetirementAge = currentBtcPrice;
      calculationResult.savingsBitcoin = accumulatedSavingsBitcoin;
      calculationResult.savingsFiat = accumulatedSavingsBitcoin * currentBtcPrice;
      break;
    }

    calculationResult.dataSet.push({
      key: year,
      year: year,
      age: age,
      savingsBtc: accumulatedSavingsBitcoin,
      savingsFiat: accumulatedSavingsBitcoin * currentBtcPrice,
      bitcoinBought: bitcoinBought,
      bitcoinPrice: currentBtcPrice,
    });
  }

  let remainingSavingsBitcoin = calculationResult.savingsBitcoin;
  if (calculationResult.retirementAge == 0) {
    return calculationResult;
  }
  for (let age = calculationResult.retirementAge; age <= input.lifeExpectancy; age++) {
    year++;
    const priceIndex = age - input.currentAge - 1;
    const dataSetItem = bitcoinPriceHistory[priceIndex];
    const bitcoinToSell = input.desiredRetirementAnnualBudget / dataSetItem.bitcoinPrice;
    remainingSavingsBitcoin -= bitcoinToSell;
    calculationResult.dataSet.push({
      key: year,
      year: year,
      age: age,
      savingsBtc: remainingSavingsBitcoin,
      savingsFiat: bitcoinToSell * dataSetItem.bitcoinPrice,
      bitcoinBought: -bitcoinToSell,
      bitcoinPrice: dataSetItem.bitcoinPrice,
    });
  }
  return calculationResult;
};

const calculateMoneyWillNeedOverLife = (
  age: number,
  desiredRetirementAnnualBudget: number,
  dataset: AnnualBitcoinPrice[],
): number => {
  return dataset
    .filter((x) => x.age >= age)
    .reduce((sum, item) => {
      const btcNeededForTheYear = desiredRetirementAnnualBudget / item.bitcoinPrice;
      return sum + btcNeededForTheYear;
    }, 0);
};
