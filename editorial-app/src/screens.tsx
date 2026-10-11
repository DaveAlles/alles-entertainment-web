import { useState } from "react";
import type { BackendClient, Context } from "./backend";
import type { AuditItem, EditorialQueue } from "./contract/backendContracts";
import { Panel, ReadState, StateSummary, useRead } from "./workspace";
export function Overview({
  backend,
  context,
  onNavigate,
}: {
  backend: BackendClient;
  context: Context;
  onNavigate: (
    area: "puzzles" | "community" | "abuse",
    queue?: EditorialQueue,
  ) => void;
}) {
  if (context.capabilities.moderator && !context.dataEpochId)
    return (
      <>
        <h1>Action queue</h1>
        <p>
          Community overview is unavailable because the server has no active
          epoch. Puzzle operations remain available to editors.
        </p>
        {context.capabilities.editor && (
          <button onClick={() => onNavigate("puzzles")}>Open puzzles</button>
        )}
        <Operator context={context} compact />
      </>
    );
  return (
    <AvailableOverview
      backend={backend}
      context={context}
      onNavigate={onNavigate}
    />
  );
}
function AvailableOverview({
  backend,
  context,
  onNavigate,
}: {
  backend: BackendClient;
  context: Context;
  onNavigate: (
    area: "puzzles" | "community" | "abuse",
    queue?: EditorialQueue,
  ) => void;
}) {
  const state = useRead(() =>
    backend.overview(
      context.capabilities.moderator && context.dataEpochId
        ? { expectedDataEpochId: context.dataEpochId }
        : {},
    ),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">THE EDITORIAL DESK</p>
          <h1>Action queue</h1>
          <p className="intro">Review the work that needs a human decision.</p>
        </div>
        <button onClick={() => void state.refresh()} disabled={state.busy}>
          Refresh overview
        </button>
      </div>
      <ReadState state={state} />
      {state.data && (
        <>
          <p>Server snapshot: {state.data.asOf}</p>
          <div className="panel-grid">
            {state.data.publication && (
              <Panel title="Today’s publication">
                <p>
                  {state.data.publication.gameDate} ·{" "}
                  {state.data.publication.published
                    ? "Published · immutable"
                    : "No published snapshot"}
                </p>
                <p>
                  Scheduled publication:{" "}
                  {state.data.publication.scheduledEnabled
                    ? "Enabled"
                    : "Disabled"}
                </p>
                <button onClick={() => onNavigate("puzzles")}>
                  Open puzzles
                </button>
              </Panel>
            )}
            {state.data.queues &&
              Object.entries(state.data.queues).map(([name, q]) => (
                <Panel key={name} title={name}>
                  <p className="count">
                    {q.count}
                    {q.capped ? "+" : ""}
                  </p>
                  <p>
                    {q.capped
                      ? "Count capped at the server limit."
                      : "Open items in this snapshot."}
                  </p>
                  <p>
                    Oldest:{" "}
                    {q.oldestAt === null
                      ? "None recorded"
                      : new Date(q.oldestAt).toLocaleString()}
                  </p>
                  <p>
                    Highest priority: {q.highestPriority ?? "None recorded"}
                  </p>
                  <button
                    onClick={() =>
                      onNavigate(
                        name === "restrictions" ? "abuse" : "community",
                        name as EditorialQueue,
                      )
                    }
                  >
                    Review {name}
                  </button>
                </Panel>
              ))}
          </div>
          {state.data.health && (
            <Panel title="Operational health">
              <p>Status: {state.data.health.status}</p>
              <p>
                Pending Auth changes: {state.data.health.pendingAuthChanges}
                {state.data.health.capped ? "+ (capped)" : ""}
              </p>
              <p>
                Worker success: {time(state.data.health.workerLastSucceededAt)}
              </p>
              <p>
                Purge success: {time(state.data.health.purgeLastSucceededAt)}
              </p>
              <p>Missing heartbeat evidence means unknown health.</p>
            </Panel>
          )}
        </>
      )}
      <Operator context={context} compact />
    </>
  );
}
function time(value: number | null) {
  return value === null ? "Unknown" : new Date(value).toLocaleString();
}
export function AuditRows({ items }: { items: AuditItem[] }) {
  return (
    <ol className="audit-list">
      {items.map((item) => (
        <li key={item.id}>
          <article>
            <h3>{item.action}</h3>
            <p>
              {item.createdAt ?? "Time unavailable"} · Actor{" "}
              {item.actor ?? "Deleted or system actor"}
            </p>
            <p>
              Target: {item.targetRef ?? "Redacted or unavailable"} · Revision{" "}
              {item.revision ?? "unavailable"}
            </p>
            <p>
              <StateSummary value={item.previousState} /> →{" "}
              <StateSummary value={item.newState} />
            </p>
            <p>Reasons: {item.reasonCodes.join(", ") || "None recorded"}</p>
            {item.decisionId && (
              <p>
                Decision: <code>{item.decisionId}</code>
              </p>
            )}
            {item.requestId && (
              <p>
                Receipt: <code>{item.requestId}</code>
              </p>
            )}
          </article>
        </li>
      ))}
    </ol>
  );
}
export function Audit({
  backend,
  context,
  initial,
}: {
  backend: BackendClient;
  context: Context;
  initial: {
    stream: "puzzle" | "community" | "access";
    target?: string;
  } | null;
}) {
  const streams = (["puzzle", "community", "access"] as const).filter((s) =>
    s === "puzzle"
      ? context.capabilities.editor
      : s === "community"
        ? context.capabilities.moderator && context.epochStatus === "available"
        : context.capabilities.admin,
  );
  const [stream, setStream] = useState(initial?.stream ?? streams[0]),
    [draft, setDraft] = useState(initial?.target ?? ""),
    [target, setTarget] = useState(initial?.target ?? "");
  return (
    <>
      <h1>Audit history</h1>
      <p>Bounded private activity. Deleted evidence stays unavailable.</p>
      <div className="filters">
        <label>
          Audit stream
          <select
            value={stream}
            onChange={(e) => {
              setStream(e.target.value as typeof stream);
              setTarget("");
              setDraft("");
            }}
          >
            {streams.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setTarget(draft.trim());
          }}
        >
          <label>
            Resource reference
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={160}
            />
          </label>
          <button>Apply filter</button>
        </form>
      </div>
      {streams.includes(stream) ? (
        <AuditPage
          key={`${stream}-${target}`}
          backend={backend}
          context={context}
          stream={stream}
          target={target}
        />
      ) : (
        <p>Permission required for this audit stream.</p>
      )}
    </>
  );
}
function AuditPage({
  backend,
  context,
  stream,
  target,
}: {
  backend: BackendClient;
  context: Context;
  stream: "puzzle" | "community" | "access";
  target: string;
}) {
  const [cursor, setCursor] = useState<string | null>(null);
  return (
    <AuditSlice
      key={cursor ?? "first"}
      backend={backend}
      context={context}
      stream={stream}
      target={target}
      cursor={cursor}
      onNext={setCursor}
    />
  );
}
function AuditSlice({
  backend,
  context,
  stream,
  target,
  cursor,
  onNext,
}: {
  backend: BackendClient;
  context: Context;
  stream: "puzzle" | "community" | "access";
  target: string;
  cursor: string | null;
  onNext: (c: string | null) => void;
}) {
  const state = useRead(() =>
    backend.audit({
      stream,
      limit: 20,
      ...(target ? { targetRef: target } : {}),
      ...(cursor ? { cursor } : {}),
      ...(stream === "community"
        ? { expectedDataEpochId: context.dataEpochId! }
        : {}),
    }),
  );
  return (
    <>
      <ReadState state={state} />
      {state.data && (
        <>
          <p>As of {state.data.asOf}</p>
          {state.data.items.length ? (
            <AuditRows items={state.data.items} />
          ) : (
            <p>No activity matches this filter.</p>
          )}
          <div className="actions">
            {cursor && <button onClick={() => onNext(null)}>First page</button>}
            {state.data.cursor && (
              <button onClick={() => onNext(state.data!.cursor)}>
                Next page
              </button>
            )}
            <button disabled={state.busy} onClick={() => void state.refresh()}>
              Refresh audit
            </button>
          </div>
        </>
      )}
    </>
  );
}
export function Operator({
  context,
  compact = false,
}: {
  context: Context;
  compact?: boolean;
}) {
  return (
    <Panel title={compact ? "Current policy" : "Access and policy"}>
      {!compact && (
        <>
          <p>
            Permissions verified by the server:{" "}
            {Object.entries(context.capabilities)
              .filter(([, v]) => v)
              .map(([k]) => k)
              .join(", ")}
            .
          </p>
          <p>
            Staff provisioning and revocation use the separately authorized
            operator tool. This browser cannot grant permissions or bootstrap
            administrators.
          </p>
          <p>
            Backend revision: <code>{context.backendRevision}</code>
          </p>
          <p>Contract: {context.contractVersion}</p>
        </>
      )}
      <dl className="policy-grid">
        {Object.entries(context.features).map(([k, v]) => (
          <div key={k}>
            <dt>
              {
                (
                  {
                    readEnabled: "Community reading",
                    submitEnabled: "Community writing",
                    voteEnabled: "Community voting",
                    autoApproveEnabled: "Automatic approval",
                    screeningMode: "Screening mode",
                    dispatchEnabled: "Provider dispatch",
                    paidEnabled: "Paid inference",
                    scheduledPublicationEnabled: "Scheduled publication",
                  } as Record<string, string>
                )[k]
              }
            </dt>
            <dd>{typeof v === "boolean" ? (v ? "Enabled" : "Disabled") : v}</dd>
          </div>
        ))}
      </dl>
      <p>
        Violations are human decisions. No report count or model result
        automatically imposes a sanction.
      </p>
    </Panel>
  );
}
