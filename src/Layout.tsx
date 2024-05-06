import {
  MoonOutlined,
  SunOutlined,
  QuestionCircleTwoTone,
  TwitterOutlined,
  GithubOutlined,
  LeftCircleTwoTone,
} from "@ant-design/icons";
import { ConfigProvider, theme, Switch } from "antd";
import { useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Donate from "./components/Misc/Donate";
import { BITCOIN_COLOR } from "./constants";
import useLocalStorage from "use-local-storage";
import { useNavigate, Outlet, useLocation, NavLink } from "react-router-dom";

const Layout = () => {
  const [t] = useTranslation();
  const defaultDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [userTheme, setUserTheme] = useLocalStorage("theme", defaultDark ? "dark" : "light");
  const [useDarkMode, setUseDarkMode] = useState(defaultDark);
  const navigate = useNavigate();
  const location = useLocation();

  const { pathname } = location;
  const isInMain = () => {
    return pathname === "/";
  };

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
              {!isInMain() && (
                <NavLink title="Back" to={"/"} replace>
                  <LeftCircleTwoTone twoToneColor={BITCOIN_COLOR}></LeftCircleTwoTone>
                </NavLink>
              )}
              <div>
                <img src="/bitcoin-logo2.png" width="40px"></img>
              </div>
              <span>{t("app.title")}</span>
              <Switch
                checkedChildren={<MoonOutlined />}
                unCheckedChildren={<SunOutlined />}
                checked={useDarkMode}
                onChange={(useDarkMode) => toggleDarkMode(useDarkMode)}
              ></Switch>
              {isInMain() && (
                <QuestionCircleTwoTone
                  title="FAQ"
                  twoToneColor={BITCOIN_COLOR}
                  onClick={() => navigate("/faq")}
                ></QuestionCircleTwoTone>
              )}
            </div>
          </div>
          <Outlet />
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
};

export default Layout;
