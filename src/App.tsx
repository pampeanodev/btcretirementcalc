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
  const [, setUserTheme] = useLocalStorage("theme", defaultDark ? "dark" : "light");
  const [useDarkMode, setUseDarkMode] = useState(defaultDark);

  const toggleDarkMode = (darkMode: boolean) => {
    setUseDarkMode(darkMode);
  };
  useLayoutEffect(() => {
    // `data-theme` lives on <html>, not on a wrapper div: theme.css resolves its
    // dark tokens against `:root[data-theme="dark"]`, and <body>'s own
    // background cannot read a token declared on one of its descendants.
    const nextTheme = useDarkMode ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);
    if (useDarkMode) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
    setUserTheme(nextTheme);
  }, [setUserTheme, useDarkMode]);

  return (
    <div>
      <ConfigProvider
        theme={{
          algorithm: useDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        {/* `px-*` because #root has none and the fields sat flush against the
            window edge on a phone. `text-left` because #root also sets
            `text-align: center`, which cascaded into every `<legend>` and
            centred the input group labels. Both live here rather than in
            App.scss so they survive that file being deleted; `.title` and
            `.signature` centre themselves with flex, so neither moves. */}
        <div className="app px-4 text-left sm:px-6">
          <div>
            <div className="title">
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
