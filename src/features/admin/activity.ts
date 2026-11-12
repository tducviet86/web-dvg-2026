/** One change in the audit log, as the dashboard receives it. */
export type ActivityEntry = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  label: string | null;
  createdAt: string;
  actor: { name: string } | null;
};

/** Changes in a row by one person, of one kind, shown as one line. */
export type ActivityGroup = ActivityEntry & {
  /** How many changes the line stands for (1: a single change). */
  count: number;
  /** The same record changed `count` times (else: `count` records). */
  sameRecord: boolean;
};

/**
 * Folds runs of alike changes, newest first: the same person doing the same
 * thing to the same record ("cập nhật dự án Cora" 3 times), or to records with
 * no name of their own ("tải lên tệp" 4 times). Changes to different named
 * records stay apart, so each name is still shown.
 */
export function groupActivity(list: ActivityEntry[]): ActivityGroup[] {
  const out: ActivityGroup[] = [];
  for (const a of list) {
    const last = out.at(-1);
    const alike =
      last &&
      last.action === a.action &&
      last.entityType === a.entityType &&
      (last.actor?.name ?? "") === (a.actor?.name ?? "");
    if (alike && last.entityId === a.entityId && last.sameRecord) {
      last.count++;
      continue;
    }
    if (
      alike &&
      !last.label &&
      !a.label &&
      !(last.count > 1 && last.sameRecord)
    ) {
      last.count++;
      last.sameRecord = false;
      last.entityId = null;
      continue;
    }
    out.push({ ...a, count: 1, sameRecord: true });
  }
  return out;
}
