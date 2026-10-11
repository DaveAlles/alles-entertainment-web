import { useState } from "react";
import { REASON_CODES } from "./communityReality";
import type { BackendClient, Context } from "./backend";
import { object } from "./backend";
import type {
  EditorialQueue,
  EditorialReviewDecisionRequest,
  ReviewItem,
} from "./contract/backendContracts";
import { Notice } from "./components";
import { metadata, Panel, ReadState, useCommand, useRead } from "./workspace";
export type CommunityTransport = (
  name: string,
  input: object,
) => Promise<unknown>;
type Props = {
  backend: BackendClient;
  context: Context;
  reauthenticate?: () => Promise<void>;
  restrictionsOnly?: boolean;
  onSubject: (
    ref: string,
    origin: { queue: EditorialQueue; itemId: string },
  ) => void;
  initialQueue?: EditorialQueue;
  initialCase?: { queue: EditorialQueue; itemId: string } | null;
  onAudit: (target: string) => void;
};
const labels: Record<EditorialQueue, string> = {
  reviews: "Pending reviews",
  reports: "Reports",
  appeals: "Appeals",
  restrictions: "Restricted accounts",
};
export function CommunityReview(props: Props) {
  const [queue, setQueue] = useState<EditorialQueue>(
      props.initialCase?.queue ??
        props.initialQueue ??
        (props.restrictionsOnly ? "restrictions" : "reviews"),
    ),
    [item, setItem] = useState<string | null>(
      props.initialCase?.itemId ?? null,
    ),
    [lookup, setLookup] = useState("");
  return (
    <>
      <h1>
        {props.restrictionsOnly ? "Abuse and restrictions" : "Community review"}
      </h1>
      <p className="intro">
        Review the player’s contribution in its source context. Automated
        screening is advisory; reports are allegations.
      </p>
      {!props.restrictionsOnly && (
        <nav className="queue-nav" aria-label="Community queues">
          {(Object.keys(labels) as EditorialQueue[]).map((q) => (
            <button
              key={q}
              aria-pressed={queue === q}
              onClick={() => {
                setQueue(q);
                setItem(null);
                setLookup("");
              }}
            >
              {labels[q]}
            </button>
          ))}
        </nav>
      )}
      {item ? (
        <CaseDetail
          key={`${queue}-${item}`}
          {...props}
          queue={queue}
          itemId={item}
          onBack={() => setItem(null)}
          onRelated={(id) => {
            setQueue("reviews");
            setItem(id);
          }}
        />
      ) : (
        <>
          <form
            className="filters"
            onSubmit={(e) => {
              e.preventDefault();
              if (lookup.trim()) setItem(lookup.trim());
            }}
          >
            <label>
              Case reference
              <input
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                maxLength={160}
                required
              />
            </label>
            <button>Open case</button>
          </form>
          <QueuePage key={queue} {...props} queue={queue} onOpen={setItem} />
        </>
      )}
    </>
  );
}
function QueuePage({
  backend,
  context,
  queue,
  onOpen,
}: {
  backend: BackendClient;
  context: Context;
  queue: EditorialQueue;
  onOpen: (id: string) => void;
}) {
  const [cursor, setCursor] = useState<string | null>(null);
  return (
    <QueueSlice
      key={cursor ?? "first"}
      backend={backend}
      context={context}
      queue={queue}
      cursor={cursor}
      setCursor={setCursor}
      onOpen={onOpen}
    />
  );
}
function QueueSlice({
  backend,
  context,
  queue,
  cursor,
  setCursor,
  onOpen,
}: {
  backend: BackendClient;
  context: Context;
  queue: EditorialQueue;
  cursor: string | null;
  setCursor: (c: string | null) => void;
  onOpen: (id: string) => void;
}) {
  const state = useRead(() =>
    backend.listReviews({
      queue,
      limit: 20,
      expectedDataEpochId: context.dataEpochId!,
      ...(queue === "restrictions" ? { globalRestrictions: true } : {}),
      ...(cursor ? { cursor } : {}),
    }),
  );
  return (
    <>
      <p>
        Server priority and time order · up to 20 items per page
        {queue === "restrictions" ? " · project-global restrictions" : ""}
      </p>
      <ReadState state={state} />
      {state.data && (
        <>
          <p>As of {state.data.serverNow}</p>
          {state.data.items.length ? (
            <ol className="case-list">
              {state.data.items.map((item) => (
                <li key={item.itemId}>
                  <article className="panel">
                    <h2>
                      {item.kind === "name"
                        ? "Public name"
                        : item.kind === "account"
                          ? "Restricted account"
                          : item.kind === "source"
                            ? "Source concern"
                            : "Community version"}
                    </h2>
                    <p>
                      {item.publicName ?? "Pseudonym unavailable"} ·{" "}
                      {item.expectedStatus} · revision{" "}
                      {item.revision ?? "unavailable"}
                    </p>
                    <p className="evidence">
                      {item.text ?? "Evidence unavailable or account record"}
                    </p>
                    <p>
                      Reasons: {item.reasonCodes.join(", ") || "None recorded"}
                    </p>
                    <button onClick={() => onOpen(item.itemId)}>
                      Review case
                    </button>
                  </article>
                </li>
              ))}
            </ol>
          ) : (
            <p>No open items in this queue.</p>
          )}
          <div className="actions">
            {cursor && (
              <button onClick={() => setCursor(null)}>First page</button>
            )}
            {state.data.cursor && (
              <button onClick={() => setCursor(state.data!.cursor)}>
                Next page
              </button>
            )}
          </div>
        </>
      )}
      <button disabled={state.busy} onClick={() => void state.refresh()}>
        Refresh queue
      </button>
    </>
  );
}
const actionLabel: Record<string, string> = {
  approve: "Approve",
  reject: "Reject",
  remove: "Remove reported content",
  reinstate: "Reinstate unchanged version",
  restrict: "Restrict writer",
  "restrict-reporter": "Restrict abusive reporting",
  unrestrict: "Remove restrictions",
  close: "Close case",
  disable: "Disable account",
};
const effects: Record<string, string> = {
  approve:
    "Approve only the exact reviewed revision, subject to server eligibility.",
  reject:
    "Reject this exact candidate. This does not automatically record a violation or sanction.",
  remove:
    "Remove the reported published revision only if current server checks permit it.",
  reinstate: "Restore only the eligible unchanged version.",
  restrict: "Restrict Community contributing, voting and reporting.",
  "restrict-reporter": "Restrict this reporter’s reporting privilege.",
  unrestrict:
    "Remove eligible controls. Auth restoration may remain pending until the worker confirms it.",
  close: "Close this review without changing the author’s content.",
  disable:
    "Queue whole-account Auth disabling. This affects game access; acceptance is not proof Auth synchronization completed.",
};
function CaseDetail({
  backend,
  context,
  reauthenticate,
  queue,
  itemId,
  onBack,
  onSubject,
  onAudit,
  onRelated,
}: Props & {
  queue: EditorialQueue;
  itemId: string;
  onBack: () => void;
  onRelated: (id: string) => void;
}) {
  const global = queue === "restrictions";
  const state = useRead(() =>
    backend.review({
      queue,
      itemId,
      expectedDataEpochId: context.dataEpochId!,
      ...(global ? { globalRestrictions: true } : {}),
    }),
  );
  const [reason, setReason] =
    useState<EditorialReviewDecisionRequest["reason"]>("ambiguous-context");
  const command = useCommand(context, reauthenticate);
  function decide(
    item: ReviewItem,
    action: EditorialReviewDecisionRequest["action"],
  ) {
    const meta = metadata(
      context,
      item.itemId,
      item.expectedItemVersion,
      reason,
    );
    const request: EditorialReviewDecisionRequest = {
      requestId: meta.requestId,
      expectedProjectId: meta.expectedProjectId,
      ...(meta.confirmation ? { confirmation: meta.confirmation } : {}),
      queue,
      itemId: item.itemId,
      action,
      reason,
      expectedDataEpochId: context.dataEpochId!,
      expectedRevision: item.revision,
      expectedStateVersion: item.expectedStateVersion,
      expectedStatus: item.expectedStatus,
      expectedItemVersion: item.expectedItemVersion,
      ...(action === "restrict-reporter"
        ? { expectedReporterStateVersion: item.expectedReporterStateVersion }
        : {}),
      ...(global ? { globalRestrictions: true } : {}),
    };
    command.prepare({
      title: `${actionLabel[action]}?`,
      effect:
        effects[action] +
        ` Evidence revision ${item.evidenceRevision ?? "unavailable"}; current revision ${item.revision ?? "unavailable"}.`,
      target: item.itemId,
      version: item.expectedItemVersion,
      reason,
      severe: action === "disable",
      execute: () => backend.decideReview(request),
      reconcile: state.reconcile,
    });
  }
  const item = state.data?.item;
  return (
    <>
      <button disabled={command.blocked} onClick={onBack}>
        ← Back to queue
      </button>
      <ReadState state={state} />
      {item && (
        <>
          <Panel title="Case detail">
            <p>
              {item.kind} · {item.status} · {item.expectedStatus}
            </p>
            <p>
              Case: <code>{item.itemId}</code>
            </p>
            {item.publicName && <p>Current credit: {item.publicName}</p>}
            <p>Reported revision: {item.evidenceRevision ?? "unavailable"}</p>
            <p>
              Current revision: {item.revision ?? "unavailable"} · Case version{" "}
              {item.expectedItemVersion}
            </p>
            {queue === "reports" && (
              <p>Reported entry: {item.entryId ?? "unavailable"}</p>
            )}
            <p>
              Submitted:{" "}
              {item.createdAt === null
                ? "Unavailable"
                : new Date(item.createdAt).toLocaleString()}
            </p>
            {item.editedAt && (
              <p>Edited: {new Date(item.editedAt).toLocaleString()}</p>
            )}
            {!item.evidenceAvailable && (
              <Notice warning>
                Evidence expired, deleted, or unavailable. Only server-permitted
                closure actions remain.
              </Notice>
            )}
            <p className="evidence">
              <strong>
                {queue === "reports" ? "Reported text: " : "Candidate: "}
              </strong>
              {item.text ?? "Text unavailable or erased"}
            </p>
            <Evidence
              value={item.context}
              keys={["quoteText", "wrongSpeakerName", "originalVignette"]}
            />
            <p>Reasons: {item.reasonCodes.join(", ")}</p>
            {item.note && <p className="evidence">Private note: {item.note}</p>}
            <p>
              Evidence expiry:{" "}
              {item.evidenceExpiresAt === null
                ? "Not specified"
                : new Date(item.evidenceExpiresAt).toLocaleString()}
            </p>
            {item.decisionId && (
              <p>
                Human decision: <code>{item.decisionId}</code>
              </p>
            )}
            <details>
              <summary>Screening and relevant history</summary>
              <p>
                Screening provides review context and does not establish
                misconduct.
              </p>
              <Evidence
                value={item.screeningEvidence}
                keys={[
                  "moderationModel",
                  "contextModel",
                  "inputTokens",
                  "outputTokens",
                  "mode",
                  "route",
                  "status",
                  "policyVersion",
                  "reasonCodes",
                  "outcome",
                  "moderation",
                  "contextual",
                  "deterministic",
                  "local",
                  "context",
                  "safety",
                  "aggregate",
                ]}
              />
              {item.history.map((h, i) => (
                <Evidence
                  key={i}
                  value={h}
                  keys={["action", "reasonCodes", "createdAt", "revision"]}
                />
              ))}
            </details>
            {item.relatedSourceCaseId && (
              <button onClick={() => onRelated(item.relatedSourceCaseId!)}>
                Related source case
              </button>
            )}
            <div className="actions">
              {item.subjectRef && (
                <button
                  disabled={command.blocked}
                  onClick={() => onSubject(item.subjectRef!, { queue, itemId })}
                >
                  Subject history
                </button>
              )}
              {item.reporterSubjectRef && (
                <button
                  disabled={command.blocked}
                  onClick={() =>
                    onSubject(item.reporterSubjectRef!, { queue, itemId })
                  }
                >
                  Reporter history
                </button>
              )}
              <button onClick={() => onAudit(item.targetId)}>
                Resource audit
              </button>
            </div>
          </Panel>
          <Panel title="Human decision">
            <label>
              Decision reason
              <select
                value={reason}
                disabled={command.blocked}
                onChange={(e) => setReason(e.target.value as typeof reason)}
              >
                {REASON_CODES.map((r) => (
                  <option key={r} value={r}>
                    {r.replaceAll("-", " ")}
                  </option>
                ))}
              </select>
            </label>
            <div className="actions">
              {item.availableActions.map((action) => (
                <button
                  key={action}
                  disabled={command.blocked || state.busy}
                  onClick={() =>
                    decide(
                      item,
                      action as EditorialReviewDecisionRequest["action"],
                    )
                  }
                >
                  {actionLabel[action]}
                </button>
              ))}
            </div>
            {!item.availableActions.length && (
              <p>
                No actions are available for your capabilities and this case
                state.
              </p>
            )}
          </Panel>
        </>
      )}
      {command.ui}
      <button disabled={command.busy} onClick={() => void state.refresh()}>
        Refresh case
      </button>
    </>
  );
}
export function Evidence({
  value,
  keys,
  depth = 0,
}: {
  value: unknown;
  keys: string[];
  depth?: number;
}) {
  if (!object(value) || depth > 3) return null;
  return (
    <dl className="evidence">
      {keys
        .filter((k) => value[k] !== undefined && value[k] !== null)
        .map((k) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>
              {typeof value[k] === "string" ||
              typeof value[k] === "number" ||
              typeof value[k] === "boolean" ? (
                String(value[k])
              ) : Array.isArray(value[k]) ? (
                (value[k] as unknown[])
                  .filter((v) => typeof v === "string")
                  .join(", ")
              ) : (
                <Evidence
                  value={value[k]}
                  keys={[
                    "status",
                    "reasonCodes",
                    "reasonCode",
                    "outcome",
                    "route",
                    "verdict",
                    "eligible",
                    "safe",
                    "contextRelevant",
                    "risk",
                    "errorCode",
                    "model",
                    "policyVersion",
                  ]}
                  depth={depth + 1}
                />
              )}
            </dd>
          </div>
        ))}
    </dl>
  );
}
