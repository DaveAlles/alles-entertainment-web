import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type {
  CanonicalSpeaker,
  EditorialDateState,
  EditorialInput,
  Preflight,
} from "./types";
import type { EditorialClient } from "./api";
import { apiError, PortalError } from "./errors";
import { canUpdate, formatDate, locked } from "./dates";
import { Notice, PreflightResults, Status } from "./components";
import type { BackendClient, Context } from "./backend";
import { TrustedPicker } from "./PuzzleTools";
import { metadata, useCommand } from "./workspace";
import { SpeakerSearch } from "./SpeakerSearch";

type Props = {
  initial: EditorialDateState;
  api: EditorialClient;
  backend: BackendClient;
  context: Context;
  reauthenticate?: () => Promise<void>;
  startRemove?: boolean;
  onClose(): void;
  onSuccess(message: string): Promise<void>;
  onFailure(error: PortalError): void;
  onLocked(): Promise<void>;
  onReload(): Promise<void>;
};
export function OverrideEditor({
  initial,
  api,
  backend,
  context,
  reauthenticate,
  startRemove = false,
  onClose,
  onSuccess,
  onFailure,
  onLocked,
  onReload,
}: Props) {
  const command = useCommand(context, reauthenticate, true);
  const [reconciled, setReconciled] = useState("");
  const existing = initial.state === "scheduled" ? initial.override : null;
  const [speaker, setSpeaker] = useState<CanonicalSpeaker | null>(
    existing?.speaker && existing.speaker.name
      ? { ...existing.speaker, name: existing.speaker.name, aliases: [] }
      : null,
  );
  const [text, setText] = useState(existing?.quoteText ?? "");
  const [pair, setPair] = useState(existing?.existingPairId);
  const [trusted, setTrusted] = useState(existing?.trustedRevisionId);
  const [source, setSource] = useState(existing?.sourceUrl ?? "");
  const [quoteDate, setQuoteDate] = useState(existing?.quoteDate ?? "");
  const [note, setNote] = useState(existing?.editorialNote ?? "");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [preflight, setPreflight] = useState<Preflight | null>(null);
  const [error, setError] = useState<PortalError | null>(null);
  const [phase, setPhase] = useState<
    "idle" | "validating" | "saving" | "removing" | "reloading"
  >("idle");
  const [dirty, setDirty] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const working = useRef(false);
  const mounted = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  const blocked =
    locked(initial) ||
    ["conflict", "exists", "missing", "locked"].includes(error?.kind ?? "") ||
    uncertain ||
    command.blocked;
  useEffect(() => {
    mounted.current = true;
    if (startRemove && canUpdate(initial)) void remove();
    else heading.current?.focus();
    return () => {
      mounted.current = false;
    };
  }, [startRemove]);
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [dirty]);
  const changed = () => {
    setDirty(true);
    setPreflight(null);
    setFields({});
    setError(null);
  };
  const speakerFailure = useCallback(
    (e: PortalError) => {
      if (e.kind === "auth" || e.kind === "denied") onFailure(e);
    },
    [onFailure],
  );
  async function failed(cause: unknown, mutation = false) {
    const e = apiError(cause);
    if (!mounted.current) return;
    setError(e);
    if (mutation && ["network", "unexpected", "malformed"].includes(e.kind))
      setUncertain(true);
    if (e.kind === "auth" || e.kind === "denied") onFailure(e);
    if (e.kind === "locked") await onLocked();
  }
  function input(): EditorialInput | null {
    const errors: Record<string, string> = {};
    if (!speaker)
      errors.speakerId = "Choose a speaker from the search results.";
    if (!text.trim()) errors.quoteText = "Enter the quote text.";
    if (!pair && !trusted && !source.trim())
      errors.sourceUrl = "Add a source URL for this editorial quote.";
    if (source.trim()) {
      try {
        const url = new URL(source.trim());
        if (
          !["http:", "https:"].includes(url.protocol) ||
          url.username ||
          url.password
        )
          throw new Error();
      } catch {
        errors.sourceUrl =
          "Enter an HTTP or HTTPS source URL without embedded credentials.";
      }
    }
    setFields(errors);
    if (Object.keys(errors).length) {
      heading.current?.focus();
      return null;
    }
    return {
      gameDate: initial.gameDate,
      speakerId: speaker!.id,
      quoteText: text,
      ...(pair ? { existingPairId: pair } : {}),
      ...(trusted ? { trustedRevisionId: trusted } : {}),
      ...(source.trim() ? { sourceUrl: source.trim() } : {}),
      ...(quoteDate ? { quoteDate } : {}),
      ...(note.trim() ? { editorialNote: note } : {}),
    };
  }
  async function validateAndSave(save: boolean) {
    if (working.current || blocked) return;
    const content = input();
    if (!content) return;
    working.current = true;
    setError(null);
    setPhase("validating");
    let mutation = false;
    try {
      const expectedRevision = initial.override?.revision ?? undefined;
      const result = await api.validate({
        ...content,
        ...(expectedRevision ? { expectedRevision } : {}),
      });
      if (!mounted.current) return;
      setPreflight(result);
      const boundary = result.errors.find((e) =>
        [
          "REVISION_CONFLICT",
          "PUZZLE_GENERATED",
          "OVERRIDE_CONSUMED",
          "DATE_NOT_FUTURE",
          "NOT_FOUND",
        ].includes(e.code),
      );
      if (boundary)
        throw apiError({
          code:
            boundary.code === "REVISION_CONFLICT"
              ? "functions/aborted"
              : boundary.code === "NOT_FOUND"
                ? "functions/not-found"
                : "functions/failed-precondition",
          details: { reason: boundary.code },
        });
      setFields(
        Object.fromEntries(
          result.errors
            .filter((e) => e.field)
            .map((e) => [e.field!, e.message]),
        ),
      );
      if (
        !result.valid ||
        result.publicationEligibility?.eligible === false ||
        !save ||
        (result.warnings.length > 0 && !preflight?.valid)
      )
        return;
      const request = {
        ...content,
        ...metadata(
          context,
          initial.gameDate,
          expectedRevision ?? null,
          "editorial-selection",
        ),
        ...(expectedRevision ? { expectedRevision } : {}),
      };
      command.prepare({
        title: existing ? "Save this override?" : "Schedule this override?",
        effect:
          "Schedule the admitted pair before publication. This does not publish a puzzle.",
        target: initial.gameDate,
        version: expectedRevision ?? null,
        reason: "editorial-selection",
        execute: async () => {
          mutation = true;
          try {
            return canUpdate(initial)
              ? await api.update({
                  ...request,
                  expectedRevision: expectedRevision!,
                })
              : await api.create(request);
          } catch (e) {
            await failed(e, true);
            throw e;
          }
        },
        reconcile: async () => {
          const latest = await api.get({ gameDate: initial.gameDate });
          if (mounted.current)
            setReconciled(
              `Authoritative state: ${latest.state}; revision ${latest.override?.revision ?? "none"}. Your draft remains below.`,
            );
        },
        onAccepted: async () => {
          setDirty(false);
          await onSuccess(
            `Override ${existing ? "updated" : "scheduled"} for ${formatDate(initial.gameDate)}.`,
          );
        },
      });
    } catch (e) {
      await failed(e, mutation);
    } finally {
      working.current = false;
      if (mounted.current) setPhase("idle");
    }
  }
  async function remove() {
    if (working.current || blocked || !canUpdate(initial)) return;
    working.current = true;
    setPhase("removing");
    try {
      const revision = initial.override!.revision!;
      const request = {
        ...metadata(context, initial.gameDate, revision, "editorial-cancel"),
        gameDate: initial.gameDate,
        expectedRevision: revision,
      };
      command.prepare({
        title: "Confirm override removal",
        effect:
          "Return this date to automatic selection. The revision and audit history are retained.",
        target: initial.gameDate,
        version: revision,
        reason: "editorial-cancel",
        execute: async () => {
          try {
            return await api.cancel(request);
          } catch (e) {
            await failed(e, true);
            throw e;
          }
        },
        reconcile: async () => {
          const latest = await api.get({ gameDate: initial.gameDate });
          if (mounted.current)
            setReconciled(
              `Authoritative state: ${latest.state}; revision ${latest.override?.revision ?? "none"}.`,
            );
        },
        onAccepted: async () => {
          setDirty(false);
          await onSuccess(
            `Override removed for ${formatDate(initial.gameDate)}.`,
          );
        },
      });
    } catch (e) {
      await failed(e, true);
    } finally {
      working.current = false;
      if (mounted.current) setPhase("idle");
    }
  }
  async function reload() {
    if (working.current) return;
    working.current = true;
    setPhase("reloading");
    try {
      await onReload();
    } catch (e) {
      await failed(e);
    } finally {
      working.current = false;
      if (mounted.current) setPhase("idle");
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    void validateAndSave(true);
  }
  const fieldError = (name: string) =>
    fields[name] ? (
      <p className="field-error" id={`${name}-error`}>
        {fields[name]}
      </p>
    ) : null;
  return (
    <section className="editor" aria-busy={phase !== "idle"}>
      <button
        className="back-button"
        onClick={onClose}
        disabled={phase !== "idle"}
      >
        ← Upcoming puzzles
      </button>
      <p className="eyebrow">{existing ? "EDIT OVERRIDE" : "ADD OVERRIDE"}</p>
      <h1 ref={heading} tabIndex={-1}>
        Override for {formatDate(initial.gameDate, true)}
      </h1>
      <p className="intro">
        Game dates use Eastern Time. Generated puzzles cannot be changed.
      </p>
      {error && (
        <Notice>
          <p>{error.message}</p>
          {uncertain && (
            <p>
              The save may already have reached the server. Reload this date
              before trying another change.
            </p>
          )}
          {blocked && error.kind !== "locked" && !command.blocked && (
            <button onClick={() => void reload()} disabled={phase !== "idle"}>
              Reload latest version (discard draft)
            </button>
          )}
        </Notice>
      )}
      {locked(initial) && !error && (
        <Notice warning>This date is locked and cannot be changed.</Notice>
      )}
      {Object.keys(fields).length > 0 && (
        <p className="field-error" role="alert">
          Please fix the highlighted fields before continuing.
        </p>
      )}
      {reconciled && <p role="status">{reconciled}</p>}
      {command.ui}
      <TrustedPicker
        backend={backend}
        disabled={phase !== "idle" || blocked}
        onSelect={(item) => {
          changed();
          setSpeaker({
            id: item.speakerId,
            name: item.speakerName,
            aliases: [],
          });
          setText(item.displayText);
          setPair(item.existingPairId ?? undefined);
          setTrusted(item.trustedRevisionId ?? undefined);
          setSource(item.provenance[0]?.url ?? "");
          setQuoteDate("");
        }}
      />
      <form noValidate onSubmit={submit}>
        <fieldset disabled={phase !== "idle" || blocked}>
          <legend className="sr-only">Correct speaker and quote</legend>
          <SpeakerSearch
            api={api}
            value={speaker}
            onChange={(value) => {
              changed();
              setSpeaker(value);
              if (value?.id !== speaker?.id) {
                setPair(undefined);
                setTrusted(undefined);
              }
            }}
            error={fields.speakerId}
            onFailure={speakerFailure}
          />
          <div className="field">
            <label htmlFor="quoteText">
              Quote text <span className="required">Required</span>
            </label>
            <textarea
              id="quoteText"
              rows={6}
              value={text}
              maxLength={10000}
              aria-invalid={!!fields.quoteText}
              aria-describedby={`quote-help${fields.quoteText ? " quoteText-error" : ""}`}
              onChange={(e) => {
                changed();
                setText(e.target.value);
                setPair(undefined);
                setTrusted(undefined);
              }}
            />
            <p id="quote-help" className="field-help">
              {pair
                ? "This quote uses an existing catalog record. Changing its text or speaker clears that reference."
                : "Keep the original wording, punctuation and capitalization."}
            </p>
            {fieldError("quoteText")}
          </div>
          <div className="field">
            <label htmlFor="sourceUrl">
              Source URL{" "}
              <span className="required">{pair ? "Optional" : "Required"}</span>
            </label>
            <input
              id="sourceUrl"
              type="url"
              value={source}
              maxLength={2048}
              placeholder="https://…"
              aria-invalid={!!fields.sourceUrl}
              aria-describedby={
                fields.sourceUrl ? "sourceUrl-error" : undefined
              }
              onChange={(e) => {
                changed();
                setSource(e.target.value);
              }}
            />
            {fieldError("sourceUrl")}
          </div>
          <div className="field">
            <label htmlFor="quoteDate">
              Quote date <span className="required">Optional</span>
            </label>
            <input
              id="quoteDate"
              type="date"
              value={quoteDate}
              min="0001-01-01"
              max="9999-12-31"
              aria-invalid={!!fields.quoteDate}
              aria-describedby={
                fields.quoteDate ? "quoteDate-error" : undefined
              }
              onChange={(e) => {
                changed();
                setQuoteDate(e.target.value);
              }}
            />
            {fieldError("quoteDate")}
          </div>
          <div className="field">
            <label htmlFor="editorialNote">
              Editorial note <span className="required">Optional</span>
            </label>
            <textarea
              id="editorialNote"
              rows={2}
              maxLength={2000}
              value={note}
              placeholder="Context for the team, an anniversary, or a timely connection…"
              aria-describedby="note-help"
              onChange={(e) => {
                changed();
                setNote(e.target.value);
              }}
            />
            <p id="note-help" className="field-help">
              Internal only. This note will not appear in the game.
            </p>
          </div>
        </fieldset>
        <PreflightResults value={preflight} />
        {phase !== "idle" && (
          <Status>
            {phase === "validating"
              ? "Checking this pair…"
              : phase === "saving"
                ? "Saving override…"
                : phase === "removing"
                  ? "Removing override…"
                  : "Loading latest version…"}
          </Status>
        )}
        <div className="editor-actions">
          <div className="actions">
            <button
              type="button"
              onClick={() => void validateAndSave(false)}
              disabled={phase !== "idle" || blocked}
            >
              Validate
            </button>
            <button
              className="primary"
              type="submit"
              disabled={
                phase !== "idle" ||
                blocked ||
                preflight?.valid === false ||
                preflight?.publicationEligibility?.eligible === false
              }
            >
              {preflight?.valid && preflight.warnings.length
                ? "Save with warnings"
                : existing
                  ? "Save changes"
                  : "Schedule override"}
            </button>
          </div>
          {canUpdate(initial) && !blocked && (
            <button
              type="button"
              className="text-button remove"
              onClick={() => void remove()}
              disabled={phase !== "idle"}
            >
              Remove override
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
