export const getGrowthFactor = (annualPriceGrowth: number) => {
  const growthRate = annualPriceGrowth / 100;
  const growthFactor = 1 + growthRate;
  return growthFactor;
};

export const getInflationFactor = (annualInflation: number) => {
  const inflationRate = annualInflation / 100;
  const inflationFactor = 1 + inflationRate;
  return inflationFactor;
};
