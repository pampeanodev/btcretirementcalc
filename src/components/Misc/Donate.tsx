import { Button, Popover } from "antd";
import { useTranslation } from "react-i18next";
import DonateOnChain from "./OnChain";
import "./Donate.scss";

const Donate = () => {
  const [t] = useTranslation();

  return (
    <Popover
      zIndex={2000}
      content={
        <div className="donate-content">
          <DonateOnChain />
        </div>
      }
      title={t("donate.qrcode.title")}
      placement="topLeft"
      trigger="click"
    >
      <Button size="small" type="primary">
        {t("donate.donate")}
      </Button>
    </Popover>
  );
};

export default Donate;
