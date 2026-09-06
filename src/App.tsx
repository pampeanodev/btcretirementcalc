import { useTranslation } from "react-i18next";
import { useLayoutEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import useLocalStorage from "use-local-storage";
import { Switch } from "@/components/ui/switch";
import { GithubIcon, XIcon } from "@/components/common/BrandIcons";
import Calculator from "./components/Calculator";
import Donate from "./components/Misc/Donate";

function App() {
  const [t] = useTranslation();
  const defaultDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [, setUserTheme] = useLocalStorage("theme", defaultDark ? "dark" : "light");
  const [useDarkMode, setUseDarkMode] = useState(defaultDark);

  useLayoutEffect(() => {
    // `data-theme` lives on <html>: theme.css resolves its dark tokens against
    // `:root[data-theme="dark"]`, and <body>'s own background cannot read a
    // token declared on one of its descendants. The `dark` class that used to
    // go on <body> alongside this is gone with App.scss, which was the only
    // rule reading it.
    const nextTheme = useDarkMode ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", nextTheme);
    setUserTheme(nextTheme);
  }, [setUserTheme, useDarkMode]);

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4">
        {/* `title` is not styling — App.spec.tsx scopes its switch query to it,
            because the switch has no accessible name of its own to find. */}
        <div className="title flex items-center justify-center gap-2 py-4 text-2xl">
          <img src="/bitcoin-logo2.png" width="40" alt="" />
          <span>{t("app.title")}</span>
          <span className="flex items-center gap-1.5">
            <Sun className="size-4" aria-hidden="true" />
            <Switch
              aria-label={t("app.theme-toggle")}
              checked={useDarkMode}
              onCheckedChange={setUseDarkMode}
            />
            <Moon className="size-4" aria-hidden="true" />
          </span>
        </div>

        <Calculator />

        <div className="flex items-center justify-end gap-1.5 py-4 text-sm font-medium">
          <span>by</span>
          <a target="blank" href="https://github.com/pampeanodev">
            @pampeanodev
          </a>
          <a target="blank" href="https://x.com/pampeanodev" aria-label="X">
            <XIcon />
          </a>
          <a
            target="blank"
            href="https://primal.net/p/npub16r9fy3936x9pf9sk020zt48ntpp809lk9xf5wldzhlqu7x8y3t9shy8j7x"
            aria-label="Nostr"
          >
            <img src="https://nostr.how/images/nostrich-150.webp" width={16} alt="" />
          </a>
          <a
            target="_blank"
            href="https://github.com/pampeanodev/btcretirementcalc"
            aria-label="GitHub"
          >
            <GithubIcon />
          </a>
          <Donate />
        </div>
      </div>
    </div>
  );
}

export default App;
