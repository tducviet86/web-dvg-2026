import { HAS_WORDS, textKey, type Locale } from "./config";

/**
 * Translations live in BE-DVG (table `translations`). This server keeps one
 * copy per language in memory, refreshed every minute, and sends strings it
 * met without a translation back to the API in the background so the next
 * render has them. Visitors never call Gemini.
 */
const api = (process.env.API_INTERNAL_URL || "http://127.0.0.1:4000").replace(
  /\/$/,
  "",
);
/** How often a language's dictionary is reloaded (corrections from Admin). */
const REFRESH_MS = Number(process.env.I18N_REFRESH_MS) || 60_000;

type Dict = {
  entries: Map<string, string>;
  loadedAt: number;
  loading?: Promise<void>;
};
const dictionaries = new Map<Locale, Dict>();

async function load(locale: Locale, dict: Dict) {
  try {
    const res = await fetch(`${api}/api/v1/i18n/dictionary?locale=${locale}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const json = (await res.json()) as {
      data: { entries: Record<string, string> };
    };
    // Replace the whole copy: corrected or removed translations take effect.
    dict.entries.clear();
    for (const [source, text] of Object.entries(json.data.entries))
      dict.entries.set(source, text);
    dict.loadedAt = Date.now();
  } catch (err) {
    // Keep serving what we have; the page falls back to Vietnamese text.
    console.warn(
      "[i18n] dictionary load failed",
      locale,
      (err as Error).message,
    );
    dict.loadedAt = Date.now() - REFRESH_MS + 10_000;
  }
}

/** The in-memory dictionary for a language (loads it on first use). */
export async function getDictionary(
  locale: Locale,
): Promise<Map<string, string>> {
  let dict = dictionaries.get(locale);
  if (!dict) {
    dict = { entries: new Map(), loadedAt: 0 };
    dictionaries.set(locale, dict);
  }
  if (!dict.loadedAt) {
    dict.loading ??= load(locale, dict).finally(
      () => (dict!.loading = undefined),
    );
    await dict.loading;
  } else if (Date.now() - dict.loadedAt > REFRESH_MS && !dict.loading) {
    // Stale-while-revalidate: answer now, refresh in the background.
    dict.loading = load(locale, dict).finally(
      () => (dict!.loading = undefined),
    );
  }
  return dict.entries;
}

/* ── Strings rendered without a translation ─────────────────────────────── */
const pending = new Map<Locale, Set<string>>();
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
/** Strings the API could not translate right now: retried later, not every render. */
const cooldown = new Map<string, number>();
const COOLDOWN_MS = 2 * 60_000;

export function reportMissing(locale: Locale, text: string) {
  const key = textKey(text);
  if (!key || key.length > 2000 || !HAS_WORDS.test(key)) return;
  const id = `${locale}:${key}`;
  const until = cooldown.get(id);
  if (until && until > Date.now()) return;
  let set = pending.get(locale);
  if (!set) pending.set(locale, (set = new Set()));
  set.add(key);
  timer ??= setTimeout(flush, 1500);
}

/** Number of strings waiting for translation (used by the warm-up script). */
export function pendingCount() {
  let n = 0;
  for (const set of pending.values()) n += set.size;
  return n + (flushing ? 1 : 0);
}

async function flush() {
  timer = null;
  if (flushing) {
    timer = setTimeout(flush, 1500);
    return;
  }
  flushing = true;
  const secret = process.env.REVALIDATE_SECRET || "";
  try {
    for (const [locale, set] of pending) {
      const texts = [...set];
      pending.delete(locale);
      for (let i = 0; i < texts.length; i += 100) {
        const chunk = texts.slice(i, i + 100);
        chunk.forEach((t) =>
          cooldown.set(`${locale}:${t}`, Date.now() + COOLDOWN_MS),
        );
        if (!secret) continue;
        try {
          const res = await fetch(`${api}/api/v1/i18n/translate`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-revalidate-secret": secret,
            },
            body: JSON.stringify({ locale, texts: chunk }),
            signal: AbortSignal.timeout(180_000),
          });
          if (!res.ok) throw new Error(String(res.status));
          const json = (await res.json()) as {
            data: { translations: Record<string, string> };
          };
          const dict = await getDictionary(locale);
          for (const [source, text] of Object.entries(json.data.translations)) {
            dict.set(textKey(source), text);
            cooldown.delete(`${locale}:${textKey(source)}`);
          }
        } catch (err) {
          console.warn(
            "[i18n] translate request failed",
            locale,
            (err as Error).message,
          );
        }
      }
    }
  } finally {
    flushing = false;
    if (pending.size && !timer) timer = setTimeout(flush, 1500);
  }
}
