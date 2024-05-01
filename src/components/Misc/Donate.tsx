import { Button, Popover, Tabs, TabsProps } from "antd";
import { useTranslation } from "react-i18next";
import LnInvoice from "./LnInvoice";
import DonateOnChain from "./OnChain";
import "./Donate.scss";

const Donate = () => {
  const [t] = useTranslation();

  const tabs: TabsProps["items"] = [
    {
      key: "1",
      label: t("donate.lightning"),
      children: <LnInvoice />,
    },
    {
      key: "2",
      label: t("donate.onchain"),
      children: <DonateOnChain />,
    },
  ];

  return (
    <Popover
      zIndex={2000}
      content={<Tabs className="donate-tabs" defaultActiveKey="1" items={tabs} />}
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
