import { useTranslation } from "react-i18next";
import "./App.scss";
import Calculator from "./components/Calculator";
import Donate from "./components/Donate";
import { GithubOutlined, TwitterOutlined } from "@ant-design/icons";

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
          <a target="blank" href="https://github.com/pampeanodev">
            @pampeanodev
          </a>
          <a target="blank" href="https://x.com/pampeanodev">
            <TwitterOutlined width={10} />
          </a>
          <a target="_blank" href="https://github.com/pampeanodev/btcretirementcalc">
            <GithubOutlined width={10}></GithubOutlined>
          </a>
          <Donate></Donate>
        </div>
      </div>
    </>
  );
}

export default App;
