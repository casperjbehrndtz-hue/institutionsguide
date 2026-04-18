import { useState, useRef, useEffect, useCallback, useDeferredValue, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useData } from "@/contexts/DataContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSearchIndex, searchIndex } from "@/hooks/useSearchIndex";

const CATEGORY_LABELS: Record<string, string> = {
  vuggestue: "Vuggestue",
  boernehave: "Børnehave",
  dagpleje: "Dagpleje",
  skole: "Skole",
  sfo: "SFO",
  fritidsklub: "Fritidsklub",
  efterskole: "Efterskole",
  gymnasium: "Gymnasium",
};

interface Props {
  variant?: "navbar" | "inline";
  placeholder?: string;
  autoFocus?: boolean;
  onSelect?: () => void;
}

export default function InstitutionSearch({ variant = "inline", placeholder, autoFocus, onSelect }: Props) {
  const { institutions } = useData();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const index = useSearchIndex(institutions);
  const suggestions = useMemo(() => searchIndex(index, deferredQuery, 8), [index, deferredQuery]);

  useEffect(() => {
    setHighlightIdx(-1);
    setOpen(suggestions.length > 0);
  }, [suggestions]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const select = useCallback((id: string) => {
    setOpen(false);
    setQuery("");
    onSelect?.();
    navigate(`/institution/${id}`);
  }, [navigate, onSelect]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((p) => Math.min(p + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((p) => Math.max(p - 1, -1));
    } else if (e.key === "Enter" && highlightIdx >= 0) {
      e.preventDefault();
      select(suggestions[highlightIdx].id);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const placeholderText = placeholder ?? (language === "da" ? "Søg institution..." : "Search institution...");

  const isNavbar = variant === "navbar";
  const inputCls = isNavbar
    ? "w-full pl-9 pr-8 py-1.5 rounded-lg border border-border/70 bg-bg-card text-foreground placeholder:text-muted/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary min-h-[36px]"
    : "w-full pl-10 pr-10 py-3 rounded-xl border border-border bg-bg-card text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary min-h-[44px] text-base sm:text-sm";
  const iconCls = isNavbar
    ? "absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none"
    : "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted pointer-events-none";

  return (
    <div ref={wrapperRef} className="relative w-full">
      <Search className={iconCls} />
      <input
        ref={inputRef}
        type="search"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        onKeyDown={onKeyDown}
        placeholder={placeholderText}
        className={inputCls}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? "global-search-suggestions" : undefined}
        aria-activedescendant={open && highlightIdx >= 0 ? `global-suggestion-${highlightIdx}` : undefined}
        aria-label={t.common.searchPlaceholder}
        autoComplete="off"
      />
      {query && (
        <button
          type="button"
          onClick={() => { setQuery(""); inputRef.current?.focus(); }}
          className={`absolute ${isNavbar ? "right-2" : "right-3"} top-1/2 -translate-y-1/2 text-muted hover:text-foreground`}
          aria-label={language === "da" ? "Ryd" : "Clear"}
        >
          <X className={isNavbar ? "w-3.5 h-3.5" : "w-4 h-4"} />
        </button>
      )}
      {open && suggestions.length > 0 && (
        <div
          id="global-search-suggestions"
          role="listbox"
          className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden max-h-[60vh] overflow-y-auto"
        >
          {suggestions.map((inst, i) => (
            <button
              key={inst.id}
              id={`global-suggestion-${i}`}
              role="option"
              aria-selected={highlightIdx === i}
              onMouseDown={() => select(inst.id)}
              className={`w-full text-left px-3 sm:px-4 py-3 sm:py-2.5 flex items-center gap-2 sm:gap-3 text-sm hover:bg-primary/5 transition-colors ${
                highlightIdx === i ? "bg-primary/10" : ""
              }`}
            >
              <span className="flex-1 min-w-0">
                <span className="font-medium text-foreground block sm:inline truncate">{inst.name}</span>
                <span className="text-muted text-xs sm:text-sm sm:ml-1.5 block sm:inline truncate">{inst.city}, {inst.municipality}</span>
              </span>
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium bg-border/50 text-muted">
                {CATEGORY_LABELS[inst.category] || inst.category}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
