import type { ApiProject } from "./api/types";

type Handover = Pick<ApiProject, "handoverNote" | "towers">;

/** A tower's own handover date, otherwise the project's. */
export const towerHandover = (api?: Handover, tower?: string) =>
  api?.towers?.find((x) => x.name === tower)?.handover ||
  api?.handoverNote ||
  "";

/** "Quý IV/2027 (tòa C3: Quý IV/2028)": the project's date and any exception. */
export function handoverSummary(api?: Handover) {
  const own = (api?.towers ?? []).filter(
    (x) => x.handover && x.handover !== api?.handoverNote,
  );
  if (!api?.handoverNote) return "";
  return own.length
    ? `${api.handoverNote} (${own
        .map((x) => `tòa ${x.name}: ${x.handover}`)
        .join(", ")})`
    : api.handoverNote;
}
