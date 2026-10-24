import { cache } from "react";
import { HAS_WORDS, localizeHref, textKey, type Locale } from "./config";
import { getDictionary, reportMissing } from "./dictionary";

/**
 * Per-request language for Server Components. React's `cache` gives one
 * object per request, so concurrent visitors in different languages never
 * share state. Layouts and pages call `setRequestLocale` before rendering.
 */
const requestStore = cache(() => ({
  locale: "vi" as Locale,
  dict: null as Map<string, string> | null,
}));

export async function setRequestLocale(locale: Locale) {
  const store = requestStore();
  store.locale = locale;
  store.dict = locale === "vi" ? null : await getDictionary(locale);
}

export const getRequestLocale = () => requestStore().locale;

/** Translates one string with a dictionary, keeping surrounding spaces. */
export function translateWith(
  dict: Map<string, string> | null,
  locale: Locale,
  text: string,
): string {
  if (!dict || locale === "vi" || !HAS_WORDS.test(text)) return text;
  const key = textKey(text);
  const found = dict.get(key);
  if (found === undefined) {
    reportMissing(locale, key);
    return text;
  }
  if (found === key) return text;
  const lead = text.match(/^\s*/)![0];
  const trail = text.match(/\s*$/)![0];
  return lead + found + trail;
}

/** Translation for the current request (outside JSX: metadata, JSON-LD…). */
export function t(text: string): string {
  const store = requestStore();
  return translateWith(store.dict, store.locale, text);
}

/** Same as `t` with {placeholders}: t2("Xem {n} căn", { n: 3 }). */
export function tf(text: string, values: Record<string, string | number>) {
  return t(text).replace(/\{(\w+)\}/g, (_, k: string) =>
    String(values[k] ?? `{${k}}`),
  );
}

/** Locale-prefixed internal link for the current request. */
export const href = (path: string) => localizeHref(path, requestStore().locale);

/** Translator bound to a language, for code that runs outside a request render. */
export async function getTranslator(locale: Locale) {
  const dict = locale === "vi" ? null : await getDictionary(locale);
  return (text: string) => translateWith(dict, locale, text);
}

/* ── Automatic translation of rendered elements (see i18n/jsx) ───────────── */
const HOST_ATTRS = ["placeholder", "aria-label", "alt", "title"] as const;
/** Visible-text props of Client Components (logic values are left alone). */
const CLIENT_TEXT_KEYS = new Set([
  "alt",
  "title",
  "label",
  "aria-label",
  "placeholder",
  "description",
  "caption",
  "imageAlt",
  "eyebrow",
  "heading",
  "intro",
  "summary",
  "text",
]);
const CLIENT_REFERENCE = Symbol.for("react.client.reference");

type Props = Record<string, unknown> | null | undefined;
type Tr = (s: string) => string;

function deep(value: unknown, tr: Tr, depth = 0): unknown {
  if (typeof value === "string") return tr(value);
  if (depth > 4) return value;
  if (Array.isArray(value)) {
    let changed = false;
    const out = value.map((v) => {
      const next = deepText(v, tr, depth + 1);
      if (next !== v) changed = true;
      return next;
    });
    return changed ? out : value;
  }
  return value;
}
/** Walks plain objects/arrays, translating only CLIENT_TEXT_KEYS. */
function deepText(value: unknown, tr: Tr, depth: number): unknown {
  if (Array.isArray(value)) return deep(value, tr, depth);
  if (!value || typeof value !== "object" || depth > 4) return value;
  // Plain data only: React elements (already translated) are left intact.
  if (Object.getPrototypeOf(value) !== Object.prototype || "$$typeof" in value)
    return value;
  let out: Record<string, unknown> | null = null;
  for (const [k, v] of Object.entries(value)) {
    const next = CLIENT_TEXT_KEYS.has(k)
      ? deep(v, tr, depth + 1)
      : deepText(v, tr, depth + 1);
    if (next !== v)
      (out ??= { ...(value as Record<string, unknown>) })[k] = next;
  }
  return out ?? value;
}

export function localizeProps(type: unknown, props: Props): Props {
  if (!props) return props;
  const store = requestStore();
  if (store.locale === "vi" || !store.dict) return props;
  const tr: Tr = (s) => translateWith(store.dict, store.locale, s);
  let out: Record<string, unknown> | null = null;
  const set = (k: string, v: unknown) => {
    if (v !== props[k]) (out ??= { ...props })[k] = v;
  };
  const children = props.children;
  if (typeof children === "string") set("children", tr(children));
  else if (
    Array.isArray(children) &&
    children.some((c) => typeof c === "string")
  )
    set(
      "children",
      children.map((c) => (typeof c === "string" ? tr(c) : c)),
    );
  if (typeof type === "string") {
    for (const attr of HOST_ATTRS)
      if (typeof props[attr] === "string") set(attr, tr(props[attr] as string));
  } else if (
    (type as { $$typeof?: symbol } | null)?.$$typeof === CLIENT_REFERENCE
  ) {
    for (const [k, v] of Object.entries(props))
      if (k !== "children")
        set(k, CLIENT_TEXT_KEYS.has(k) ? deep(v, tr) : deepText(v, tr, 0));
  }
  return out ?? props;
}
