import { CURRENT_SEASON, formatMoney } from "@/lib/data";
import { SALARY_CAP } from "@/lib/draft";
import { ogCard } from "@/lib/og";

export { size, contentType } from "@/lib/og";
export const alt = "RPL draft report card";

export default function Image() {
  return ogCard({
    eyebrow: `Season ${CURRENT_SEASON}`,
    title: "Draft report card",
    subtitle:
      `Every club had ${formatMoney(SALARY_CAP)} at the auction. ` +
      "This is what they spent it on — and what those players are worth now.",
    footer: "rpl-site.vercel.app/draft",
  });
}
