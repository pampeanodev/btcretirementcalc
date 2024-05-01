import { QuestionCircleTwoTone } from "@ant-design/icons";
import { Popover } from "antd";
import { useTranslation } from "react-i18next";
import { BITCOIN_COLOR } from "../../../constants";

const AnnualBudgetExplanation = () => {
  const [t] = useTranslation();
  return (
    <Popover
      zIndex={2000}
      content={
        <div className="explanatory-overlay">
          <div>{t("annual-budget.explanation.text")}</div>
        </div>
      }
      title={t("annual-budget-explanation.title")}
      trigger="click"
    >
      <QuestionCircleTwoTone data-tooltip-id="annual-budget-tooltip" twoToneColor={BITCOIN_COLOR} />
    </Popover>
  );
};

export default AnnualBudgetExplanation;
