import type { CollapseProps } from "antd";
import { Collapse } from "antd";
import { useTranslation } from "react-i18next";
import "./Faq.scss";
const Faq = () => {
  const [t] = useTranslation();

  const items: CollapseProps["items"] = [
    {
      key: "1",
      label: t("faq.what-is-it"),
      children: <p>{t("faq.what-is-it-text")}</p>,
    },
    {
      key: "2",
      label: t("faq.can-i-input-retirement-age"),
      children: <p>{t("faq.can-i-input-retirement-age-text")}</p>,
    },
    {
      key: "3",
      label: t("faq.uses-inflation"),
      children: <p>{t("faq.uses-inflation-text")}</p>,
    },
    {
      key: "4",
      label: t("faq.optimized-conservative"),
      children: <p>{t("faq.optimized-conservative-text")}</p>,
    },
    {
      key: "5",
      label: t("faq.is-cagr"),
      children: <p>{t("faq.is-cagr-text")}</p>,
    },
    {
      key: "6",
      label: t("faq.what-cagr-to-use"),
      children: <p>{t("faq.what-cagr-to-use-text")}</p>,
    },
    {
      key: "7",
      label: t("faq.is-cagr-fixed"),
      children: <p>{t("faq.is-cagr-fixed-text")}</p>,
    },
    {
      key: "8",
      label: t("faq.cagr-negative"),
      children: <p>{t("faq.cagr-negative-text")}</p>,
    },
    {
      key: "9",
      label: t("faq.inflation-rate-default"),
      children: <p>{t("faq.inflation-rate-default-text")}</p>,
    },
    {
      key: "10",
      label: t("faq.bitcoin-appreciation-after-retirement"),
      children: <p>{t("faq.bitcoin-appreciation-after-retirement-text")}</p>,
    },
    {
      key: "11",
      label: t("faq.bitcoin-buy-after-retirement"),
      children: <p>{t("faq.bitcoin-buy-after-retirement-text")}</p>,
    },
    {
      key: "12",
      label: t("faq.why-greater-annual-input"),
      children: <p>{t("faq.why-greater-annual-input-text")}</p>,
    },
    {
      key: "13",
      label: t("faq.other-crypto-assets"),
      children: <p>{t("faq.other-crypto-assets-text")}</p>,
    },
    {
      key: "14",
      label: t("faq.life-expectancy-defaults"),
      children: (
        <>
          <p>{t("faq.life-expectancy-defaults-text")}</p>
          <p>{t("faq.life-expectancy-defaults-link")}</p>
        </>
      ),
    },
    {
      key: "14",
      label: t("faq.btc-scale"),
      children: <p>{t("faq.btc-scale-text")}</p>,
    },
    {
      key: "15",
      label: t("faq.irs"),
      children: <p>{t("faq.irs-text")}</p>,
    },
    {
      key: "16",
      label: t("faq.get-money"),
      children: <p>{t("faq.get-money-text")}</p>,
    },
  ];
  return <Collapse className="faq" items={items} defaultActiveKey={["1"]} />;
};
export default Faq;
