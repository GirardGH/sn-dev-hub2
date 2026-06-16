"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Building2, BookOpen, Code2, X, Loader2 } from "lucide-react";
import {
  searchAll,
  type SearchAllResult,
  type ClientResult,
  type StoryResult,
  type DevelopmentResult,
} from "@/features/search/search.actions";
import { DEVELOPMENT_TYPE_MAP } from "@/features/developments/developmentTypes";
import { resolveSnLabel } from "@/features/xml/snTableRegistry";
import { cn } from "@/lib/utils";

function devTypeLabel(type: string): string {
  return DEVELOPMENT_TYPE_MAP[type as keyof typeof DEVELOPMENT_TYPE_MAP]?.label ?? resolveSnLabel(type);
}

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchAllResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setOpen(false);
      return;
    }

    setLoading(true);
    setOpen(true);

    const timer = setTimeout(async () => {
      try {
        const data = await searchAll(trimmed);
        setResults(data);
      } catch {
        setResults({ clients: [], stories: [], developments: [] });
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults(null);
    setOpen(false);
    inputRef.current?.focus();
  }, []);

  function navigate(href: string) {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(href);
  }

  function onClientClick(c: ClientResult) {
    navigate(`/clients/${c.id}`);
  }

  function onStoryClick(s: StoryResult) {
    navigate(`/clients/${s.client_id}/stories/${s.id}`);
  }

  function onDevClick(d: DevelopmentResult) {
    navigate(`/clients/${d.client_id}/stories/${d.story_id}/developments/${d.id}`);
  }

  const total =
    (results?.clients.length ?? 0) +
    (results?.stories.length ?? 0) +
    (results?.developments.length ?? 0);

  const hasResults = results !== null && total > 0;
  const noResults = results !== null && !loading && total === 0;

  return (
    <div ref={containerRef} className="relative">
      {/* Search input */}
      <div
        className={cn(
          "flex items-center gap-2 h-7 px-2.5 rounded-sm border transition-colors",
          open || query
            ? "bg-white/20 border-white/40 w-64"
            : "bg-white/10 border-white/15 w-52",
          "transition-all duration-150"
        )}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 text-white/60 animate-spin flex-shrink-0" />
        ) : (
          <Search className="w-3.5 h-3.5 text-white/50 flex-shrink-0" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") clear();
          }}
          placeholder="Search clients, stories, developments..."
          className="flex-1 min-w-0 bg-transparent text-white/90 text-[12px] placeholder:text-white/40 outline-none"
        />
        {query && (
          <button
            onClick={clear}
            className="text-white/40 hover:text-white/80 transition-colors flex-shrink-0"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 mt-1 w-[420px] bg-white border border-sn-border rounded-sm shadow-2xl z-50 overflow-hidden">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center gap-2 py-5 text-sn-text-muted text-[13px]">
              <Loader2 className="w-4 h-4 animate-spin text-sn-accent" />
              Searching…
            </div>
          )}

          {/* No results */}
          {noResults && (
            <div className="py-6 text-center text-[13px] text-sn-text-muted">
              No results found for <span className="font-semibold text-sn-text">&quot;{query}&quot;</span>
            </div>
          )}

          {/* Results */}
          {hasResults && !loading && (
            <div className="max-h-[480px] overflow-y-auto">

              {/* Clients */}
              {results!.clients.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-sn-table-header border-b border-sn-border sticky top-0">
                    <Building2 className="w-3 h-3 text-sn-accent" />
                    <span className="text-[10px] font-bold text-sn-text-muted uppercase tracking-widest">
                      Clients
                    </span>
                  </div>
                  {results!.clients.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => onClientClick(c)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-sn-accent-light transition-colors text-left border-b border-sn-border/50 last:border-0 group"
                    >
                      <div className="w-6 h-6 rounded-sm bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-3.5 h-3.5 text-sn-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-sn-text group-hover:text-sn-accent truncate">
                          {c.name}
                        </p>
                        {c.code && (
                          <p className="text-[11px] text-sn-text-muted">{c.code}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </section>
              )}

              {/* Stories */}
              {results!.stories.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-sn-table-header border-b border-sn-border sticky top-0">
                    <BookOpen className="w-3 h-3 text-sn-accent" />
                    <span className="text-[10px] font-bold text-sn-text-muted uppercase tracking-widest">
                      Stories
                    </span>
                  </div>
                  {results!.stories.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => onStoryClick(s)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-sn-accent-light transition-colors text-left border-b border-sn-border/50 last:border-0 group"
                    >
                      <div className="w-6 h-6 rounded-sm bg-green-50 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-3.5 h-3.5 text-green-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-sn-text group-hover:text-sn-accent truncate">
                          {s.reference ? (
                            <>
                              <span className="text-sn-text-muted font-normal">{s.reference} — </span>
                              {s.title}
                            </>
                          ) : (
                            s.title
                          )}
                        </p>
                      </div>
                    </button>
                  ))}
                </section>
              )}

              {/* Developments */}
              {results!.developments.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-sn-table-header border-b border-sn-border sticky top-0">
                    <Code2 className="w-3 h-3 text-sn-accent" />
                    <span className="text-[10px] font-bold text-sn-text-muted uppercase tracking-widest">
                      Developments
                    </span>
                  </div>
                  {results!.developments.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => onDevClick(d)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-sn-accent-light transition-colors text-left border-b border-sn-border/50 last:border-0 group"
                    >
                      <div className="w-6 h-6 rounded-sm bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Code2 className="w-3.5 h-3.5 text-purple-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-sn-text group-hover:text-sn-accent truncate">
                          {devTypeLabel(d.development_type)} — {d.title}
                        </p>
                      </div>
                    </button>
                  ))}
                </section>
              )}
            </div>
          )}

          {/* Footer */}
          {(hasResults || noResults) && !loading && (
            <div className="px-3 py-1.5 border-t border-sn-border bg-sn-table-header">
              <p className="text-[10px] text-sn-text-muted">
                {hasResults ? `${total} result${total > 1 ? "s" : ""}` : "No results"} for &quot;{query}&quot;
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
