import { useMemo, useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import { normalizeSearch } from "@/lib/normalizeSearch";

const POPULAR_MUNICIPALITIES = [
  "København", "Aarhus", "Odense", "Aalborg", "Frederiksberg",
  "Gentofte", "Roskilde", "Helsingør", "Vejle", "Horsens",
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  municipalities: string[];
  placeholder: string;
}

export default function MunicipalityCombobox({ value, onChange, municipalities, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const ref = useRef<HTMLDivElement>(null);
  const listboxId = "municipality-listbox";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = useMemo(() => {
    if (!query) {
      const popular = POPULAR_MUNICIPALITIES.filter((m) => municipalities.includes(m));
      const rest = municipalities.filter((m) => !POPULAR_MUNICIPALITIES.includes(m));
      return [...popular, ...rest];
    }
    const q = query.toLowerCase();
    const qNorm = normalizeSearch(q);
    return municipalities.filter((m) => {
      const mLower = m.toLowerCase();
      return mLower.includes(q) || normalizeSearch(mLower).includes(qNorm);
    });
  }, [query, municipalities]);

  const visibleItems = filtered.slice(0, 30);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlightIndex((prev) => Math.min(prev + 1, visibleItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && open && highlightIndex >= 0) {
      e.preventDefault();
      onChange(visibleItems[highlightIndex]);
      setOpen(false);
      setQuery("");
      setHighlightIndex(-1);
    } else if (e.key === "Escape") {
      setOpen(false);
      setHighlightIndex(-1);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <label htmlFor="muni-combobox" className="sr-only">Kommune</label>
      <input
        id="muni-combobox"
        type="text"
        value={open ? query : value || ""}
        placeholder={placeholder}
        onFocus={() => { setOpen(true); setQuery(""); setHighlightIndex(-1); }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlightIndex(-1); }}
        onKeyDown={handleKeyDown}
        className={`w-full sm:w-[180px] px-3 py-1.5 rounded-xl border bg-bg-card text-sm min-h-[36px] sm:min-h-[44px] focus:outline-none focus:ring-2 focus:ring-primary ${
          value ? "border-primary text-primary font-medium" : "border-border text-foreground"
        }`}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open && highlightIndex >= 0 ? `muni-option-${highlightIndex}` : undefined}
        aria-label={placeholder}
      />
      {value && !open && (
        <button
          onClick={() => { onChange(""); setQuery(""); }}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-border/30 rounded"
          aria-label="Clear"
        >
          <X className="w-3.5 h-3.5 text-muted" />
        </button>
      )}
      {open && (
        <div id={listboxId} role="listbox" className="absolute top-full left-0 mt-1 w-full sm:w-[220px] max-h-[50vh] sm:max-h-[280px] overflow-y-auto bg-bg-card border border-border rounded-xl shadow-lg z-50">
          <button
            role="option"
            aria-selected={!value}
            onClick={() => { onChange(""); setOpen(false); setQuery(""); setHighlightIndex(-1); }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/5 ${!value ? "text-primary font-medium" : "text-foreground"}`}
          >
            {placeholder}
          </button>
          {visibleItems.map((m, i) => (
            <button
              key={m}
              id={`muni-option-${i}`}
              role="option"
              aria-selected={value === m}
              onClick={() => { onChange(m); setOpen(false); setQuery(""); setHighlightIndex(-1); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/5 ${
                highlightIndex === i ? "bg-primary/10" : ""
              } ${value === m ? "text-primary font-medium bg-primary/5" : "text-foreground"}`}
            >
              {m}
            </button>
          ))}
          {filtered.length > 30 && (
            <p className="px-3 py-2 text-xs text-muted">+{filtered.length - 30} mere...</p>
          )}
        </div>
      )}
    </div>
  );
}

