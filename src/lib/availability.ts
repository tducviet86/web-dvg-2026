/**
 * A unit marked "Còn trống" whose move-in date is still ahead is "Sắp trống";
 * on that date it becomes free by itself. Worked out on every render, so no
 * one has to change the unit that day.
 */
const todayInVietnam = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

type Unit = { status: string; availableFrom?: string };

export const liveStatus = (p: Unit) =>
  p.status === "Còn trống" &&
  p.availableFrom &&
  p.availableFrom.slice(0, 10) > todayInVietnam()
    ? "Sắp trống"
    : p.status;
export const vacantNow = (p: Unit) => liveStatus(p) === "Còn trống";
export const availableSoon = (p: Unit) => liveStatus(p) === "Sắp trống";
/** Free units first, then soon free, then the rest. */
export const availabilityRank = (p: Unit) =>
  vacantNow(p) ? 0 : availableSoon(p) ? 1 : 2;
/** "2026-12-15" → "15/12/2026". */
export const dayMonthYear = (iso: string) =>
  iso.slice(0, 10).split("-").reverse().join("/");
/** What a card or a heading says: "Còn trống", "Trống từ 15/12/2026"… */
export const statusLabel = (p: Unit) =>
  availableSoon(p) ? `Trống từ ${dayMonthYear(p.availableFrom!)}` : p.status;
/** When a tenant can move in; empty when the unit is taken. */
export const moveInLabel = (p: Unit) =>
  vacantNow(p)
    ? "Nhận nhà ngay"
    : availableSoon(p)
      ? `Từ ${dayMonthYear(p.availableFrom!)}`
      : "";
