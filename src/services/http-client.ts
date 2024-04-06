import axios from "axios";

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_APP_BTC_API_URL,
  headers: {
    "Content-type": "application/json",
    Accept: "application/json",
  },
});
