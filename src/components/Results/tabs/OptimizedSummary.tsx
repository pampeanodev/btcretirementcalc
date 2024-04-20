import InfoBox from "../InfoBox";
import { toBtc, toUsd } from "../../../constants";
import { useTranslation } from "react-i18next";

type Props = {
  bitcoinPrice: number;
  retirementAge: number;
  totalSavings: number;
  bitcoinPriceAtRetirement: number;
  annualBudget: number;
};

const OptimizedSummary = ({
  retirementAge,
  totalSavings,
  bitcoinPriceAtRetirement,
  annualBudget,
  bitcoinPrice,
}: Props) => {
  const onTrack = true;
  const [t] = useTranslation();
  return (
    <div className="calculator__summary">
      <div className="column">
        <InfoBox label={t("summary.retirement-age")} value={retirementAge} type="info" />
        <InfoBox label={t("summary.total-savings")} value={toBtc(totalSavings)} type="info" />
        <InfoBox
          label={t("summary.btc-price-at-retirement")}
          value={toUsd(bitcoinPriceAtRetirement)}
          type="info"
        />
      </div>
      <div className="column">
        <InfoBox label={t("summary.bitcoin-price")} value={toUsd(bitcoinPrice)} type="info" />
        <InfoBox
          label={t("summary.annual-retirement-budget")}
          value={toBtc(annualBudget)}
          type={onTrack ? "success" : "danger"}
        />
        <InfoBox
          label={t("summary.monthly-retirement-budget")}
          value={toBtc(annualBudget / 12)}
          type={onTrack ? "success" : "danger"}
        />
      </div>
    </div>
  );
};

export default OptimizedSummary;
