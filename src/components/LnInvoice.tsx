import { InputNumber, QRCode } from "antd";
import { useState } from "react";
import { LightningAddress } from "@getalby/lightning-tools";

const LnInvoice = () => {
  const [lnRequest, setLnRequest] = useState("");
  const ln = new LightningAddress("pampeanodev@getalby.com");

  const onChange = async (amount: number | null) => {
    if (!amount) {
      return;
    }
    await ln.fetch();
    // request an invoice for 1000 satoshis
    // this returns a new `Invoice` class that can also be used to validate the payment
    const invoice = await ln.requestInvoice({ satoshi: amount });

    setLnRequest(invoice.paymentRequest);
    console.log(invoice.paymentRequest);
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
