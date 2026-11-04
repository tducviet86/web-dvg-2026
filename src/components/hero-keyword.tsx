"use client";
import { useId, useState } from "react";
import { Search } from "lucide-react";
import { useT } from "@/i18n/client";
import { searchable, type SearchFacet } from "@/lib/filter";

/** What people look for; only those some unit on offer matches are shown. */
const KEYWORDS = [
  "view sông",
  "view biển",
  "view thành phố",
  "sông Hàn",
  "gần biển",
  "full nội thất",
  "nội thất cao cấp",
  "căn góc",
  "tầng cao",
  "ban công",
  "studio",
  "1PN",
  "2PN",
  "3PN",
  "shophouse",
  "penthouse",
  "nhà phố",
  "mặt bằng",
];
const MAX_SHOWN = 8;

/**
 * "Từ khóa": free text, with suggested words as chips: the ones that find
 * the most units, narrowed while typing. Picking one searches for it.
 */
export function HeroKeyword({
  units,
  defaultValue,
  onPick,
}: {
  units: SearchFacet[];
  defaultValue?: string;
  onPick: (word: string) => void;
}) {
  const t = useT();
  const id = useId();
  const [text, setText] = useState(defaultValue ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const query = searchable(text);
  const shown = KEYWORDS.map((word) => {
    const key = searchable(word);
    return {
      word,
      key,
      count: units.filter((u) => u.words.includes(key)).length,
    };
  })
    .filter((k) => k.count > 0 && k.key !== query && k.key.includes(query))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_SHOWN);
  const visible = open && shown.length > 0;
  function choose(word: string) {
    setText(word);
    setOpen(false);
    onPick(word);
  }
  return (
    <div className="hero-field hero-field-wide hero-keyword">
      <label htmlFor={`${id}-q`}>{t("Từ khóa")}</label>
      <span className="hero-input">
        <Search size={17} aria-hidden="true" />
        <input
          id={`${id}-q`}
          name="q"
          value={text}
          maxLength={100}
          autoComplete="off"
          placeholder={t("View sông, full nội thất…")}
          role="combobox"
          aria-expanded={visible}
          aria-controls={`${id}-list`}
          aria-autocomplete="list"
          aria-activedescendant={
            visible && active >= 0 ? `${id}-o${active}` : undefined
          }
          onChange={(e) => {
            setText(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (!visible) {
              if (e.key === "ArrowDown") setOpen(true);
              return;
            }
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const step = e.key === "ArrowDown" ? 1 : -1;
              setActive((i) => (i + step + shown.length) % shown.length);
            } else if (e.key === "Enter" && active >= 0) {
              e.preventDefault();
              choose(shown[active].word);
            }
          }}
        />
      </span>
      <div className="hero-suggest" hidden={!visible}>
        <p aria-hidden="true">{t("Gợi ý từ khóa")}</p>
        <ul id={`${id}-list`} role="listbox">
          {shown.map((k, i) => (
            <li
              key={k.word}
              id={`${id}-o${i}`}
              role="option"
              aria-selected={i === active}
              // Keeps the input focused until the click lands.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(k.word)}
            >
              {t(k.word)}
              <small>{k.count}</small>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
