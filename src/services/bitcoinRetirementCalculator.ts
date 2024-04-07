import { CalculationData } from "../models/CalculationData";
import { CalculationResult } from "../models/CalculationResult";

export const calculate = (data: CalculationData, startingBtcPrice: number): CalculationResult => {
  const yearsToLive = data.lifeExpectancy - data.currentAge;
  const growthFactor = 1 + data.annualPriceGrowth / 100;
  let pendingSavingsFiat = yearsToLive * data.desiredRetirementAnnualBudget;
  let currentBtcPrice = startingBtcPrice;
  let accumulatedSavingsBtc = data.currentSavingsInBitcoin;
  let accumulatedSavingsFiat = data.currentSavingsInBitcoin * currentBtcPrice;
  let currentAge = data.currentAge;
  let year = new Date().getFullYear();

  const result: CalculationResult = {
    startingBitcoinPrice: currentBtcPrice,
    dataSet: [],
    retirementAge: 0,
    savingsBitcoin: 0,
    savingsFiat: 0,
    bitcoinPriceAtRetirementAge: 0,
    annualRetirementBudget: 0,
  };

  let canRetire = false;
  while (!canRetire) {
    year++;
    currentAge++;
    // increase bitcoin price as composite interest based on annual price growth
    currentBtcPrice = currentBtcPrice * growthFactor;
    // accumulate amount of btc you hodl
    const btcBought = parseFloat((data.annualBuyInFiat / currentBtcPrice).toPrecision(8));
    accumulatedSavingsBtc += btcBought;
    accumulatedSavingsFiat = accumulatedSavingsBtc * currentBtcPrice;
    const newPendingSavingsFiat =
      (data.lifeExpectancy - currentAge) * data.desiredRetirementAnnualBudget;
    pendingSavingsFiat = newPendingSavingsFiat - accumulatedSavingsFiat;
    if (pendingSavingsFiat <= 0) {
      canRetire = true;
    } else {
      result.dataSet.push({
        key: year,
        year: year,
        age: currentAge,
        savingsBtc: accumulatedSavingsBtc,
        savingsFiat: accumulatedSavingsFiat,
        bitcoinBought: btcBought,
        bitcoinPrice: currentBtcPrice,
      });
    }
  }

  const yearsAfterRetirement = data.lifeExpectancy - currentAge;
  result.annualRetirementBudget = (accumulatedSavingsBtc * currentBtcPrice) / yearsAfterRetirement;
  result.retirementAge = currentAge;
  result.bitcoinPriceAtRetirementAge = currentBtcPrice;
  result.savingsBitcoin = accumulatedSavingsBtc;
  result.savingsFiat = accumulatedSavingsFiat;
  let remainingSavings = result.savingsFiat;
  for (let age = result.retirementAge; age <= data.lifeExpectancy; age++) {
    remainingSavings -= result.annualRetirementBudget;
    result.dataSet.push({
      key: year,
      year: year,
      age: age,
      savingsBtc: remainingSavings / result.bitcoinPriceAtRetirementAge,
      savingsFiat: remainingSavings,
      bitcoinBought: 0,
      bitcoinPrice: result.bitcoinPriceAtRetirementAge,
    });
    year++;
  }
  return result;
};
