import { InputData } from "../models/InputData";
import { CalculationResult } from "../models/CalculationResult";

export const calculate = (data: InputData, startingBtcPrice: number): CalculationResult => {
  let year = new Date().getFullYear();
  const yearsToLive = data.lifeExpectancy - data.currentAge;
  const inflationFactor = 1 + data.inflationRate / 100;
  const growthFactor = 1 + data.annualPriceGrowth / 100;
  let currentBtcPrice = startingBtcPrice;
  let accumulatedSavingsBtc = data.currentSavingsInBitcoin;
  let accumulatedSavingsFiat = data.currentSavingsInBitcoin * currentBtcPrice;
  let currentAge = data.currentAge;
  let currentDesiredAnualBudget = data.desiredRetirementAnnualBudget;
  let pendingSavingsFiat = yearsToLive * data.desiredRetirementAnnualBudget * inflationFactor;

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

    // accumulate amount of btc you hodl
    const btcBought = parseFloat((data.annualBuyInFiat / currentBtcPrice).toPrecision(8));
    accumulatedSavingsBtc += btcBought;
    accumulatedSavingsFiat = accumulatedSavingsBtc * currentBtcPrice;
    const newPendingSavingsFiat = (data.lifeExpectancy - currentAge) * currentDesiredAnualBudget;
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

  const yearsAfterRetirement = data.lifeExpectancy - currentAge;
  result.annualRetirementBudget = (accumulatedSavingsBtc * currentBtcPrice) / yearsAfterRetirement;
  result.retirementAge = currentAge;
  result.bitcoinPriceAtRetirementAge = currentBtcPrice;
  result.savingsBitcoin = accumulatedSavingsBtc;
  result.savingsFiat = accumulatedSavingsFiat;
  let remainingSavings = result.savingsFiat;
  for (let age = result.retirementAge; age < data.lifeExpectancy; age++) {
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
