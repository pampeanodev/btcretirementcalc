import { useTranslation } from "react-i18next";

const CannotRetire = () => {
  const [t] = useTranslation();
  return (
    <>
      <div className="wont-retire">
        <span className="wont-retire__text">{t("cannot-retire.text")}</span>
      </div>
    </>
  );
};

export default CannotRetire;
