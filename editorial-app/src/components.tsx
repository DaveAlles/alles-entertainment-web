import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { EditorialDateState, Preflight } from "./types";
import { canSchedule, canUpdate, editedAt, formatDate, locked } from "./dates";

export function Brand() {
  return (
    <div className="brand">
      <span className="brand-symbol" aria-hidden="true">
        “
      </span>
      <div>
        <span className="wordmark">
          ALLES <span>ENTERTAINMENT</span>
        </span>
        <span className="brand-product">MisAttribution Editorial</span>
      </div>
    </div>
  );
}
export function Status({ children }: { children: ReactNode }) {
  return (
    <p className="status-message" role="status">
      <span className="spinner" aria-hidden="true" />
      {children}
    </p>
  );
}
export function Notice({
  children,
  warning = false,
}: {
  children: ReactNode;
  warning?: boolean;
}) {
  return (
    <div
      className={warning ? "notice warning" : "notice error"}
      role={warning ? "status" : "alert"}
    >
      {children}
    </div>
  );
}
export function Confirm({
  title,
  children,
  busy,
  onCancel,
  onConfirm,
  confirmText,
  severe = false,
}: {
  title: string;
  children: ReactNode;
  busy: boolean;
  onCancel(): void;
  onConfirm(): void;
  confirmText: string;
  severe?: boolean;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const node = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    node.showModal();
    cancel.current?.focus();
    return () => {
      node.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      aria-labelledby="confirm-title"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const buttons = [
          ...e.currentTarget.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled),input:not(:disabled)",
          ),
        ];
        const first = buttons[0],
          last = buttons[buttons.length - 1];
        if (!first) {
          e.preventDefault();
          e.currentTarget.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      <h2 id="confirm-title">{title}</h2>
      {children}
      {severe && (
        <label className="severity-confirm">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
          />{" "}
          I understand this disables the whole account, including game access.
        </label>
      )}
      <div className="actions">
        <button ref={cancel} onClick={onCancel} disabled={busy}>
          Keep editing
        </button>
        <button
          className="danger"
          onClick={onConfirm}
          disabled={busy || (severe && !acknowledged)}
        >
          {busy ? "Working…" : confirmText}
        </button>
      </div>
    </dialog>
  );
}
export function PreflightResults({ value }: { value: Preflight | null }) {
  if (!value) return null;
  return (
    <section
      className="preflight"
      aria-label="Validation results"
      aria-live="polite"
    >
      {value.publicationEligibility &&
        !value.publicationEligibility.eligible && (
          <div className="notice error">
            <h3>Publication blocked: factual evidence required</h3>
            <p>
              This selection cannot be scheduled or published until its
              quotation has an eligible evidence-backed revision.
            </p>
            <ul>
              {value.publicationEligibility.errors.map((code) => (
                <li key={code}>{code}</li>
              ))}
            </ul>
          </div>
        )}
      {value.errors.length > 0 && (
        <div className="notice error">
          <h3>Fix before saving</h3>
          <ul>
            {value.errors.map((e, i) => (
              <li key={i}>{e.message}</li>
            ))}
          </ul>
        </div>
      )}
      {value.warnings.length > 0 && (
        <div className="notice warning">
          <h3>Editorial warnings</h3>
          <ul>
            {value.warnings.map((w, i) => (
              <li key={i}>{w.message}</li>
            ))}
          </ul>
          <p>You can still save this override.</p>
        </div>
      )}
      {value.valid &&
        !value.warnings.length &&
        value.publicationEligibility?.eligible !== false && (
          <p className="validation-ok">
            ✓ Ready to schedule. No blocking problems found.
          </p>
        )}
    </section>
  );
}
export function PuzzleDateCard({
  day,
  busy = false,
  onOpen,
  onRemove,
  onPreview,
  onAudit,
}: {
  day: EditorialDateState;
  busy?: boolean;
  onOpen(): void;
  onRemove(): void;
  onPreview?(): void;
  onAudit?(): void;
}) {
  const scheduled = day.state === "scheduled" && !locked(day);
  const frozen = locked(day);
  const summary =
    day.override &&
    (scheduled ||
      (day.puzzleGenerated &&
        day.selectionMode === "editorial" &&
        day.generatedOverrideRevision === day.override.revision));
  const label = frozen
    ? day.puzzleGenerated
      ? "Generated · Locked"
      : "Locked"
    : scheduled
      ? "Override scheduled"
      : canSchedule(day)
        ? "No override"
        : "Unavailable";
  const dateParts = formatDate(day.gameDate).split(", ");
  const by = day.override?.updatedBy;
  const time = editedAt(day.override?.updatedAt ?? null);
  return (
    <li>
      <article
        className={`date-card ${scheduled ? "scheduled" : frozen ? "locked" : ""}`}
        aria-labelledby={`date-${day.gameDate}`}
      >
        <div className="card-date">
          <span className="weekday">{dateParts[0]}</span>
          <h2 id={`date-${day.gameDate}`}>
            <time dateTime={day.gameDate}>{dateParts[1]}</time>
          </h2>
        </div>
        <div className="card-content">
          <span
            className={`badge ${scheduled ? "purple" : frozen ? "gray" : "neutral"}`}
          >
            {label}
          </span>
          {summary ? (
            <>
              <h3>{day.override?.speaker?.name ?? "Speaker unavailable"}</h3>
              <p className="quote-preview">“{day.override?.quoteText}”</p>
              {scheduled && (
                <p className="meta">
                  Last edited by {by?.displayName || by?.email || "an editor"}
                  {time ? ` · ${time}` : ""} · Revision {day.override?.revision}
                </p>
              )}
            </>
          ) : (
            <p className="card-description">
              {frozen
                ? "This daily puzzle is locked and cannot be changed."
                : canSchedule(day)
                  ? "Leave this date open for automatic selection."
                  : "This record needs an administrator’s attention."}
            </p>
          )}
          {day.state === "cancelled" && (
            <p className="meta">Previous override removed</p>
          )}
        </div>
        <div className="card-actions">
          {onPreview && (
            <button
              disabled={busy}
              onClick={onPreview}
              aria-label={`Preview ${day.gameDate}`}
            >
              Preview
            </button>
          )}
          {onAudit && (
            <button
              disabled={busy}
              onClick={onAudit}
              aria-label={`History ${day.gameDate}`}
            >
              History
            </button>
          )}
          {canSchedule(day) && (
            <button
              disabled={busy}
              onClick={onOpen}
              aria-label={`Add override for ${formatDate(day.gameDate)}`}
            >
              + Add override
            </button>
          )}
          {canUpdate(day) && (
            <>
              <button
                disabled={busy}
                onClick={onOpen}
                aria-label={`Edit override for ${formatDate(day.gameDate)}`}
              >
                Edit override
              </button>
              <button
                disabled={busy}
                className="text-button"
                onClick={onRemove}
                aria-label={`Remove override for ${formatDate(day.gameDate)}`}
              >
                Remove
              </button>
            </>
          )}
          {frozen && (
            <span className="lock-icon" aria-label="Read only">
              ⌑
            </span>
          )}
        </div>
      </article>
    </li>
  );
}
