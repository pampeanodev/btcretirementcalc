import { InputData } from "../models/InputData";
import { CalculationResult } from "../models/CalculationResult";
import { getGrowthFactor, getInflationFactor } from "./calculationUtils";

export const calculate = (input: InputData, startingBitcoinPrice: number): CalculationResult => {
  const growthFactor = getGrowthFactor(input.annualPriceGrowth);
  const inflationFactor = getInflationFactor(input.inflationRate);

  return buildRetirementPrediction(input, startingBitcoinPrice, growthFactor, inflationFactor);
};

const buildRetirementPrediction = (
  input: InputData,
  bitcoinPrice: number,
  growthFactor: number,
  inflationFactor: number,
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

  let accumulatedSavingsFiat = input.currentSavingsInBitcoin * bitcoinPrice;
  const yearsToLive = input.lifeExpectancy - input.currentAge;
  let pendingSavingsFiat = yearsToLive * input.desiredRetirementAnnualBudget * inflationFactor;

  // iterate to find retirement values (age, savings, etc)
  for (let age = input.currentAge + 1; age <= input.lifeExpectancy; age++) {
    year++;
    bitcoinPrice = bitcoinPrice * growthFactor;
    indexedDesiredAnnualBudget = indexedDesiredAnnualBudget * inflationFactor;
    // TODO: should calculate indexed annual budget to future values based on inflation.
    const newPendingSavingsFiat = (input.lifeExpectancy - age) * indexedDesiredAnnualBudget;
    pendingSavingsFiat = newPendingSavingsFiat - accumulatedSavingsFiat;

    // check whether the user has reached as much as they can retire
    if (pendingSavingsFiat <= 0) {
      const yearsAfterRetirement = input.lifeExpectancy - age;
      calculationResult.annualRetirementBudget =
        (accumulatedSavingsBitcoin * bitcoinPrice) / yearsAfterRetirement;
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
    remainingSavingsFiat -= calculationResult.annualRetirementBudget;
    calculationResult.dataSet.push({
      key: year,
      year: year,
      age: age,
      savingsBtc: remainingSavingsFiat / calculationResult.bitcoinPriceAtRetirementAge,
      savingsFiat: remainingSavingsFiat,
      bitcoinBought: 0,
      bitcoinPrice: calculationResult.bitcoinPriceAtRetirementAge,
      annualRetirementBudget: calculationResult.annualRetirementBudget,
    });
    year++;
  }
  return calculationResult;
};
