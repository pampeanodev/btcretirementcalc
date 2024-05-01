import { InputNumber, QRCode } from "antd";
import { useState } from "react";
import albyApiClient from "../../services/albyApiClient";

const LnInvoice = () => {
  const [lnRequest, setLnRequest] = useState("");

  const onChange = async (amount: number | null) => {
    if (!amount) {
      return;
    }
    const createInvoiceResponse = await albyApiClient.createInvoice(amount);
    const paymentRequest: string = createInvoiceResponse.data.payment_request as string;

    setLnRequest(paymentRequest);
  };
  return (
    <div>
      <div className="donate-input">
        <InputNumber addonAfter="sat" onChange={(n: number | null) => onChange(n)} />
      </div>

      <QRCode value={lnRequest}></QRCode>
    </div>
  );
};

export default LnInvoice;
