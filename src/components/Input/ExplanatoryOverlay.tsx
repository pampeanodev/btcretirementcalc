import { useTranslation } from "react-i18next";
import "./ExplanatoryOverlay.scss";

const ExplanatoryOverlay = () => {
  const [t] = useTranslation();
  return (
    <div className="explanatory-overlay">
      <div>{t("mode-explanation.header")}</div>
      <div>
        <div className="explanatory-overlay__title">{t("mode-explanation.conservative")}</div>
        <div>{t("mode-explanation.conservative-text")}</div>
      </div>
      <div>
        <div className="explanatory-overlay__title">{t("mode-explanation.optimized")}</div>
        <div>{t("mode-explanation.optimized-text")}</div>
      </div>
    </div>
  );
};

export default ExplanatoryOverlay;
