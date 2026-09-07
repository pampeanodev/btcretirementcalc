import { QRCodeCanvas } from "qrcode.react";
import { useTranslation } from "react-i18next";

/**
 * The popover used to carry two tabs, Lightning and on-chain, and #50 deleted
 * the Lightning one. That left a bare QR under a title that no longer
 * distinguishes anything: nothing on screen said which network it pays, and the
 * canvas had no accessible name at all, so a screen reader announced nothing.
 *
 * The address is shown as text as well as encoded, so it can be read, checked
 * against the QR, and copied by anyone who cannot scan it.
 */
export const ONCHAIN_ADDRESS = "bc1q8y92hwx02nxs5p6qkdm2322vvh55h3wkqpnrye";

const OnChain = () => {
  const [t] = useTranslation();

  return (
    <div className="flex flex-col items-center gap-2">
      <QRCodeCanvas
        value={ONCHAIN_ADDRESS}
        size={256}
        role="img"
        aria-label={t("donate.onchain-qr")}
      />
      <div className="text-xs text-ink-muted">{t("donate.onchain-network")}</div>
      <code className="max-w-[256px] break-all text-center font-mono text-xs">
        {ONCHAIN_ADDRESS}
      </code>
    </div>
  );
};

export default OnChain;
