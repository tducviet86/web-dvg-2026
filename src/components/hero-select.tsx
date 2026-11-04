"use client";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

/**
 * A dropdown of the search box in the site's own style (the browser's list
 * cannot be styled). Its value goes with the form through a hidden input; a
 * value no longer on offer counts as the placeholder.
 */
export function HeroSelect({
  id,
  name,
  defaultValue = "",
  placeholder,
  options,
}: {
  id: string;
  name: string;
  defaultValue?: string;
  placeholder: string;
  /** [value, label], already translated. */
  options: [string, string][];
}) {
  const [chosen, setChosen] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const all: [string, string][] = [["", placeholder], ...options];
  const value = all.some(([key]) => key === chosen) ? chosen : "";
  const label = all.find(([key]) => key === value)![1];

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function show() {
    setActive(all.findIndex(([key]) => key === value));
    setOpen(true);
  }
  function choose(next: string) {
    setChosen(next);
    setOpen(false);
  }
  function onKeyDown(event: React.KeyboardEvent) {
    if (!open) {
      if (["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        show();
      }
      return;
    }
    if (event.key === "Escape" || event.key === "Tab") setOpen(false);
    else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + all.length) % all.length);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(all[active][0]);
    }
  }
  return (
    <div className="hero-select" ref={root}>
      <button
        type="button"
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-o${active}` : undefined}
        data-empty={!value || undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKeyDown}
      >
        <span>{label}</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
      <ul id={`${id}-list`} role="listbox" hidden={!open}>
        {all.map(([key, text], i) => (
          <li
            key={key}
            id={`${id}-o${i}`}
            role="option"
            aria-selected={key === value}
            data-active={i === active || undefined}
            onMouseEnter={() => setActive(i)}
            onClick={() => choose(key)}
          >
            <span>{text}</span>
            {key === value && <Check size={15} aria-hidden="true" />}
          </li>
        ))}
      </ul>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
