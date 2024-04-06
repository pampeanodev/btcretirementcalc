import InfoBox from "./InfoBox";
import { toBtc, toUsd } from "../constants";
import { useTranslation } from "react-i18next";

type Props = {
  bitcoinPrice: number;
  retirementAge: number;
  totalSavings: number;
  bitcoinPriceAtRetirement: number;
  annualBudget: number;
};

const Summary = ({ retirementAge, totalSavings, bitcoinPriceAtRetirement, annualBudget, bitcoinPrice }: Props) => {
  const onTrack = true;
  const [t] = useTranslation();
  return (
    <div className="calculator__summary">
      <div className="column">
        <InfoBox msg={`${t("summary.retirement-age")} ${retirementAge}`} type="info" />
        <InfoBox msg={`${t("summary.total-savings")} ${toBtc(totalSavings)}`} type="info" />
        <InfoBox msg={`${t("summary.btc-price-at-retirement")} ${toUsd(bitcoinPriceAtRetirement)}`} type="info" />
      </div>
      <div className="column">
        <InfoBox msg={`${t("summary.bitcoin-price")} ${toUsd(bitcoinPrice)}`} type="info" />
        <InfoBox
          msg={`${t("summary.annual-retirement-budget")} ${toUsd(annualBudget)}`}
          type={onTrack ? "success" : "danger"}
        />
        <InfoBox
          msg={`${t("summary.monthly-retirement-budget")} ${toUsd(annualBudget / 12)}`}
          type={onTrack ? "success" : "danger"}
        />
      </div>
    </div>
  );
};

export default Summary;
