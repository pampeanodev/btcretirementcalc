import { useTranslation } from "react-i18next";

const CannotRetire = () => {
  const [t] = useTranslation();
  return (
    <>
      <div className="wont-retire">
        <span className="wont-retire__text">{t("cannot-retire.text")}</span>
        <p style={{ fontStyle: "italic" }}>{t("cannot-retire.text2")}</p>
      </div>
    </>
  );
};

export default CannotRetire;
