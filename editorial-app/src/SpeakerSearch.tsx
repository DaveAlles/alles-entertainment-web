import { useEffect, useId, useState } from "react";
import type { CanonicalSpeaker } from "./types";
import type { EditorialClient } from "./api";
import { apiError, PortalError } from "./errors";
import { Status } from "./components";

export function SpeakerSearch({
  api,
  value,
  onChange,
  error,
  onFailure,
}: {
  api: EditorialClient;
  value: CanonicalSpeaker | null;
  onChange(value: CanonicalSpeaker | null): void;
  error?: string;
  onFailure(error: PortalError): void;
}) {
  const id = useId();
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<CanonicalSpeaker[]>([]);
  const [phase, setPhase] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [failure, setFailure] = useState("");
  const [more, setMore] = useState(false);
  const [active, setActive] = useState(-1);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (value || query.trim().length < 2) {
      setResults([]);
      setPhase("idle");
      return;
    }
    let current = true;
    setPhase("loading");
    setResults([]);
    setActive(-1);
    const timer = setTimeout(() => {
      api
        .search({ query: query.trim() })
        .then((response) => {
          if (!current) return;
          setResults(response.speakers);
          setMore(response.hasMore);
          setPhase("done");
          setOpen(true);
        })
        .catch((cause) => {
          if (!current) return;
          const e = apiError(cause);
          setFailure(e.message);
          setPhase("error");
          onFailure(e);
        });
    }, 300);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [api, query, value, onFailure]);
  function select(s: CanonicalSpeaker) {
    onChange(s);
    setQuery(s.name);
    setOpen(false);
    setResults([]);
  }
  return (
    <div className="field speaker-search">
      <label htmlFor={id}>
        Speaker <span className="required">Required</span>
      </label>
      <input
        id={id}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open && results.length > 0}
        aria-controls={`${id}-results`}
        aria-activedescendant={
          open && active >= 0 ? `${id}-option-${active}` : undefined
        }
        aria-invalid={!!error}
        aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
        placeholder="Search by name or alias"
        value={query}
        maxLength={100}
        autoComplete="off"
        onFocus={() => {
          if (results.length) setOpen(true);
        }}
        onBlur={(e) => {
          if (!e.currentTarget.parentElement?.contains(e.relatedTarget))
            setOpen(false);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(null);
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            return;
          }
          if (!results.length) return;
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
            setActive((i) =>
              e.key === "ArrowDown"
                ? (i + 1) % results.length
                : (i - 1 + results.length) % results.length,
            );
          }
          if (e.key === "Enter" && open && active >= 0) {
            e.preventDefault();
            select(results[active]);
          }
        }}
      />
      <p className="field-help" id={`${id}-help`}>
        {value
          ? `Selected: ${value.name} · ID ${value.id}`
          : "Type at least two characters, then choose a speaker."}
      </p>
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
      {phase === "loading" && <Status>Searching speakers…</Status>}
      {phase === "error" && (
        <p role="alert" className="field-error">
          {failure}
        </p>
      )}
      {phase === "done" && !value && !results.length && (
        <p role="status" className="field-help">
          No speakers found. Try another name or alias.
        </p>
      )}
      {open && results.length > 0 && (
        <ul
          id={`${id}-results`}
          role="listbox"
          aria-label="Matching speakers"
          className="search-results"
        >
          {results.map((s, i) => (
            <li key={s.id} role="presentation">
              <button
                id={`${id}-option-${i}`}
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => select(s)}
              >
                <strong>{s.name}</strong>
                <small>
                  {s.aliases.length
                    ? `Also known as ${s.aliases.join(", ")} · `
                    : ""}
                  ID {s.id}
                </small>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && more && (
        <p className="field-help">
          Showing 20 matches. Keep typing to narrow the search.
        </p>
      )}
    </div>
  );
}
