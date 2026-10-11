import { useState } from "react";
import type { BackendClient, Context } from "./backend";
import type { ContentItem } from "./contract/backendContracts";
import { Notice } from "./components";
import {
  metadata,
  Panel,
  Provenance,
  ReadState,
  useCommand,
  useRead,
} from "./workspace";
export function TrustedPicker({
  backend,
  onSelect,
  disabled,
}: {
  backend: BackendClient;
  onSelect: (item: ContentItem) => void;
  disabled: boolean;
}) {
  const [draft, setDraft] = useState(""),
    [query, setQuery] = useState("");
  return (
    <Panel title="Choose an admitted quotation">
      <p>
        Use the exact trusted text and speaker. A source URL by itself cannot
        admit new content.
      </p>
      <form
        className="filters"
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(draft.trim());
        }}
      >
        <label>
          Search trusted quotations
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            minLength={2}
            maxLength={100}
          />
        </label>
        <button disabled={disabled}>Search catalog</button>
      </form>
      <ContentPage
        key={query}
        backend={backend}
        query={query}
        onSelect={onSelect}
        disabled={disabled}
      />
    </Panel>
  );
}
function ContentPage({
  backend,
  query,
  onSelect,
  disabled,
}: {
  backend: BackendClient;
  query: string;
  onSelect: (item: ContentItem) => void;
  disabled: boolean;
}) {
  const [cursor, setCursor] = useState<string | null>(null);
  return (
    <ContentSlice
      key={cursor ?? "first"}
      {...{ backend, query, onSelect, disabled, cursor, setCursor }}
    />
  );
}
function ContentSlice({
  backend,
  query,
  onSelect,
  disabled,
  cursor,
  setCursor,
}: {
  backend: BackendClient;
  query: string;
  onSelect: (item: ContentItem) => void;
  disabled: boolean;
  cursor: string | null;
  setCursor: (c: string | null) => void;
}) {
  const state = useRead(() =>
    backend.content({
      limit: 10,
      ...(query ? { query } : {}),
      ...(cursor ? { cursor } : {}),
    }),
  );
  return (
    <>
      <ReadState state={state} />
      {state.data && (
        <>
          <ul className="content-list">
            {state.data.items.map((item) => (
              <li key={item.revisionId}>
                <blockquote>{item.displayText}</blockquote>
                <p>
                  {item.speakerName} · revision {item.revisionId}
                </p>
                <Provenance links={item.provenance} />
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onSelect(item)}
                >
                  Use quotation by {item.speakerName}
                </button>
              </li>
            ))}
          </ul>
          {!state.data.items.length && (
            <p>No admitted quotations match this search.</p>
          )}
          {cursor && (
            <button type="button" onClick={() => setCursor(null)}>
              First page
            </button>
          )}
          {state.data.cursor && (
            <button type="button" onClick={() => setCursor(state.data!.cursor)}>
              More quotations
            </button>
          )}
        </>
      )}
    </>
  );
}
export function PuzzlePreview({
  gameDate,
  backend,
  context,
  reauthenticate,
  onBack,
  onAudit,
  onPublished,
}: {
  gameDate: string;
  backend: BackendClient;
  context: Context;
  reauthenticate?: () => Promise<void>;
  onBack: () => void;
  onAudit: () => void;
  onPublished: () => Promise<void>;
}) {
  const state = useRead(() => backend.preview({ gameDate })),
    command = useCommand(context, reauthenticate),
    p = state.data;
  function publish() {
    if (!p || !p.previewFingerprint || p.expectedOverrideRevision === undefined)
      return;
    const request = {
      ...metadata(
        context,
        gameDate,
        p.expectedOverrideRevision,
        "manual-publication",
      ),
      gameDate,
      previewFingerprint: p.previewFingerprint,
      expectedOverrideRevision: p.expectedOverrideRevision,
    };
    command.prepare({
      title: "Publish this immutable puzzle?",
      effect: `Seal this exact trusted preview (${p.previewFingerprint}). Published snapshots cannot be edited, replaced, or undone. Today is missing-snapshot recovery only.`,
      target: gameDate,
      version: p.expectedOverrideRevision,
      reason: "manual-publication",
      execute: () => backend.publish(request),
      reconcile: async () => {
        await state.reconcile();
        await onPublished();
      },
    });
  }
  return (
    <>
      <button onClick={onBack} disabled={command.blocked}>
        ← Upcoming puzzles
      </button>
      <h1>Trusted preview · {gameDate}</h1>
      <p>
        America/New_York puzzle day. Provisional previews are revalidated by the
        publisher.
      </p>
      <ReadState state={state} />
      {p && (
        <>
          <Panel title={`${p.state} · ${p.readiness}`}>
            <p>
              Expected override revision: {p.expectedOverrideRevision ?? "none"}
            </p>
            {p.state === "published" && (
              <Notice warning>
                Published · immutable. This snapshot cannot be changed through
                an override.
              </Notice>
            )}
            {p.errors.length > 0 && (
              <Notice>
                <h3>Blocking errors</h3>
                <ul>
                  {p.errors.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </Notice>
            )}
            {p.warnings.length > 0 && (
              <Notice warning>
                <h3>Warnings</h3>
                <ul>
                  {p.warnings.map((w) => (
                    <li key={w}>{w}</li>
                  ))}
                </ul>
              </Notice>
            )}
            {p.puzzle && (
              <>
                <h3>Authoritative board</h3>
                <ol>
                  {p.puzzle.quotes.map((q) => (
                    <li key={q.id}>
                      <blockquote>{q.text}</blockquote>
                      <p>
                        Trusted speaker:{" "}
                        {p.puzzle!.speakers.find((s) => s.id === q.speakerId)
                          ?.name ?? q.speakerId}{" "}
                        · revision {q.revisionId}
                      </p>
                      {q.id === p.puzzle!.correctPair.quoteId && (
                        <strong>
                          Correct displayed pairing:{" "}
                          {
                            p.puzzle!.speakers.find(
                              (s) => s.id === p.puzzle!.correctPair.authorId,
                            )?.name
                          }
                        </strong>
                      )}
                      <Provenance links={q.provenance} />
                    </li>
                  ))}
                </ol>
                <p>
                  Displayed speakers:{" "}
                  {p.puzzle.speakers.map((s) => s.name).join(" · ")}
                </p>
              </>
            )}
          </Panel>
          {context.capabilities.admin && p.state === "provisional" && (
            <button
              className="primary"
              disabled={
                command.blocked || state.busy || p.readiness !== "ready"
              }
              onClick={publish}
            >
              Publish puzzle
            </button>
          )}
          {!context.capabilities.admin && (
            <p>Administrator capability is required for publication.</p>
          )}
          <button onClick={onAudit}>Publication and override history</button>
        </>
      )}
      {command.ui}
      <button onClick={() => void state.refresh()} disabled={command.busy}>
        Refresh preview
      </button>
    </>
  );
}
