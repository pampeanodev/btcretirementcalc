import { InputData } from "../models/InputData";
import { CalculationResult } from "../models/CalculationResult";

export const calculate = (input: InputData, startingBtcPrice: number): CalculationResult => {
  let year = new Date().getFullYear();
  const yearsToLive = input.lifeExpectancy - input.currentAge;
  const inflationFactor = 1 + input.inflationRate / 100;
  const growthFactor = 1 + input.annualPriceGrowth / 100;
  let currentBtcPrice = startingBtcPrice;
  let accumulatedSavingsBtc = input.currentSavingsInBitcoin;
  let accumulatedSavingsFiat = input.currentSavingsInBitcoin * currentBtcPrice;
  let currentAge = input.currentAge;
  let currentDesiredAnualBudget = input.desiredRetirementAnnualBudget;
  let currentAnnualBuyInFiat = input.annualBuyInFiat;
  let pendingSavingsFiat = yearsToLive * input.desiredRetirementAnnualBudget * inflationFactor;

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
    currentDesiredAnualBudget = currentDesiredAnualBudget * inflationFactor;
    currentAnnualBuyInFiat = currentAnnualBuyInFiat * inflationFactor;

    // accumulate amount of btc you hodl
    const btcBought = currentAnnualBuyInFiat / currentBtcPrice;
    accumulatedSavingsBtc += btcBought;
    accumulatedSavingsFiat = accumulatedSavingsBtc * currentBtcPrice;
    const newPendingSavingsFiat = (input.lifeExpectancy - currentAge) * currentDesiredAnualBudget;
    pendingSavingsFiat = newPendingSavingsFiat - accumulatedSavingsFiat;
    result.dataSet.push({
      key: year,
      year: year,
      age: currentAge,
      savingsBtc: accumulatedSavingsBtc,
      savingsFiat: accumulatedSavingsFiat,
      bitcoinBought: btcBought,
      bitcoinPrice: currentBtcPrice,
      annualRetirementBudget: currentDesiredAnualBudget,
    });
    if (pendingSavingsFiat <= 0) {
      canRetire = true;
    }
  }

  const yearsAfterRetirement = input.lifeExpectancy - currentAge;
  result.annualRetirementBudget = (accumulatedSavingsBtc * currentBtcPrice) / yearsAfterRetirement;
  result.retirementAge = currentAge;
  result.bitcoinPriceAtRetirementAge = currentBtcPrice;
  result.savingsBitcoin = accumulatedSavingsBtc;
  result.savingsFiat = accumulatedSavingsFiat;
  let remainingSavings = result.savingsFiat;
  for (let age = result.retirementAge; age < input.lifeExpectancy; age++) {
    remainingSavings -= result.annualRetirementBudget;
    result.dataSet.push({
      key: year,
      year: year,
      age: age,
      savingsBtc: remainingSavings / result.bitcoinPriceAtRetirementAge,
      savingsFiat: remainingSavings,
      bitcoinBought: 0,
      bitcoinPrice: result.bitcoinPriceAtRetirementAge,
      annualRetirementBudget: result.annualRetirementBudget,
    });
    year++;
  }
  return result;
};
