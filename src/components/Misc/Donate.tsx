import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import DonateOnChain from "./OnChain";

const Donate = () => {
  const [t] = useTranslation();

  return (
    <Popover>
      <PopoverTrigger render={<Button size="sm">{t("donate.donate")}</Button>} />
      <PopoverContent align="start" side="top" className="w-auto">
        <PopoverTitle className="mb-2 text-sm font-medium">{t("donate.qrcode.title")}</PopoverTitle>
        {/* `donate-content` is not styling — Donate.spec.tsx scopes its canvas
            query to it, because a QR code has no accessible name to find it by. */}
        <div className="donate-content flex min-h-[270px] min-w-[270px] flex-col items-center justify-center">
          <DonateOnChain />
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default Donate;
