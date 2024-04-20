import { Button, Popover } from "antd";
import { useTranslation } from "react-i18next";
import LnInvoice from "./LnInvoice";

const Donate = () => {
  const [t] = useTranslation();

  return (
    <Popover zIndex={2000} content={<LnInvoice />} title={t("donate.qrcode.title")} trigger="click">
      <Button size="small" type="primary">
        {t("donate.donate")}
      </Button>
    </Popover>
  );
};

export default Donate;
