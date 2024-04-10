import { useTranslation } from "react-i18next";
import "./App.scss";
import Calculator from "./components/Calculator";

function App() {
  const [t] = useTranslation();
  return (
    <>
      <div className="app">
        <div>
          <div className="title">
            <div>
              <img src="/bitcoin-logo.png" width="40px"></img>
            </div>
            <span>{t("app.title")}</span>
          </div>
          {/* <div>buy me a coffe</div> */}
        </div>
        <Calculator />
        <div className="signature">
          <span>by</span>
          <a href="https://github.com/pampeanodev" target="blank">
            @pampeanodev
          </a>{" "}
        </div>
      </div>
    </>
  );
}

export default App;
