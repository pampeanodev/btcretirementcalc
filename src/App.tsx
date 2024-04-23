import { useTranslation } from "react-i18next";
import "./App.scss";
import Calculator from "./components/Calculator";
import Donate from "./components/Misc/Donate";
import { GithubOutlined, MoonOutlined, SunOutlined, TwitterOutlined } from "@ant-design/icons";
import { ConfigProvider, Switch, theme } from "antd";
import { useLayoutEffect, useState } from "react";
import useLocalStorage from "use-local-storage";

function App() {
  const [t] = useTranslation();
  const defaultDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [userTheme, setUserTheme] = useLocalStorage("theme", defaultDark ? "dark" : "light");
  const [useDarkMode, setUseDarkMode] = useState(defaultDark);

  const toggleDarkMode = (darkMode: boolean) => {
    setUseDarkMode(darkMode);
  };
  useLayoutEffect(() => {
    if (useDarkMode) {
      document.body.classList.add("dark");

      setUserTheme("dark");
    } else {
      document.body.classList.remove("dark");
      setUserTheme("light");
    }
  }, [setUserTheme, useDarkMode]);

  return (
    <div data-theme={userTheme}>
      <ConfigProvider
        theme={{
          algorithm: useDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <div className="app">
          <div>
            <div className="title">
              <div>
                <img src="/bitcoin-logo.png" width="40px"></img>
              </div>
              <span>{t("app.title")}</span>
              <Switch
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
                checked={useDarkMode}
                onChange={(useDarkMode) => toggleDarkMode(useDarkMode)}
              ></Switch>
            </div>
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
            <a
              target="blank"
              href="https://primal.net/p/npub16r9fy3936x9pf9sk020zt48ntpp809lk9xf5wldzhlqu7x8y3t9shy8j7x"
            >
              <img src="https://nostr.how/images/nostrich-150.webp" width={16} />
            </a>
            <a target="_blank" href="https://github.com/pampeanodev/btcretirementcalc">
              <GithubOutlined width={10}></GithubOutlined>
            </a>
            <Donate></Donate>
          </div>
        </div>
      </ConfigProvider>
    </div>
  );
}

export default App;
