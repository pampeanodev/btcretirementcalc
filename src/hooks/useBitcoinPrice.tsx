import { useEffect, useState } from "react";
import { httpClient } from "../services/http-client";

export const useBitcoinPrice = (delay: number) => {
  const [btcPrice, setBtcPrice] = useState<number>();

  const refreshBtcPrice = () => {
    httpClient.get("/exrates").then((response) => {
      const price = response.data["BTC"] as number;
      if (price && price > 0) {
        setBtcPrice(price);
      }
    });
  };

  // Remember the latest callback.
  useEffect(() => {
    refreshBtcPrice();
  }, []);

  // Set up the interval.
  useEffect(() => {
    function tick() {
      refreshBtcPrice();
    }
    if (delay !== null) {
      const id = setInterval(tick, delay);
      return () => clearInterval(id);
    }
  }, [delay]);

  return btcPrice;
};
