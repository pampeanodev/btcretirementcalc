import { httpClient } from "./http-client";

const baseUrl = import.meta.env.VITE_APP_ALBY_API_URL;

const createInvoice = (amount: number) => {
  return httpClient.post(
    `${baseUrl}/invoices`,
    {
      amount,
    },
    {
      headers: { Authorization: `Bearer ${import.meta.env.VITE_APP_ALBY_API_TOKEN}` },
    },
  );
};

export default {
  createInvoice,
};
