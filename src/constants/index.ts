export const BITCOIN_SIGN: string = "₿";
export const BITCOIN_COLOR: string = "#F6931A";
export const toUsd = (number: number) => {
  return number.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
};

export const toBtc = (number: number) => {
  return `${BITCOIN_SIGN}${number.toFixed(8)}`;
};
