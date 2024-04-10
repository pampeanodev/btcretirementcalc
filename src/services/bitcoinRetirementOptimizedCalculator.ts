import { AnnualBitcoinPrice } from "../models/AnnualBitcoinPrice";
import { InputData } from "../models/InputData";
import { CalculationResult } from "../models/CalculationResult";

export const calculateOptimal = (
  input: InputData,
  startingBitcoinPrice: number,
): CalculationResult => {
  const growthRate = input.annualPriceGrowth / 100;
  const growthFactor = 1 + growthRate;
  const inflationRate = input.inflationRate / 100;
  const inflationFactor = 1 + inflationRate;
  const bitcoinPriceHistory = calculateBitcoinPriceHistory(
    input,
    startingBitcoinPrice,
    growthFactor,
    inflationFactor,
  );
  const result = estimateRetirementAge(
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

const estimateRetirementAge = (
  input: InputData,
  currentBtcPrice: number,
  growthFactor: number,
  inflationFactor: number,
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
  let currentDesiredAnnualBudget = input.desiredRetirementAnnualBudget;
  let currentAnnualBuyInFiat = input.annualBuyInFiat;
  let year = new Date().getFullYear();

  for (let age = input.currentAge + 1; age <= input.lifeExpectancy; age++) {
    year++;
    currentBtcPrice = currentBtcPrice * growthFactor;
    currentDesiredAnnualBudget = currentDesiredAnnualBudget * inflationFactor;
    currentAnnualBuyInFiat = currentAnnualBuyInFiat * inflationFactor;
    const bitcoinBought = currentAnnualBuyInFiat / currentBtcPrice;
    accumulatedSavingsBitcoin += bitcoinBought;

    const totalBictoinWillNeed = calculateBitcoinWillNeedOverLife(age, bitcoinPriceHistory);

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
      annualRetirementBudget: currentDesiredAnnualBudget,
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
