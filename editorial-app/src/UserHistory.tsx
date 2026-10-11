import { useState } from "react";
import type { BackendClient, Context } from "./backend";
import type {
  EditorialBackendRequests as Requests,
  EditorialBackendResponses as Responses,
  EditorialMutation,
} from "./contract/backendContracts";
import { EDITORIAL_REASON_CODES } from "./contract/backendContracts";
import { metadata, Panel, ReadState, useCommand, useRead } from "./workspace";
import { AuditRows } from "./screens";
type Props = {
  subjectRef: string;
  backend: BackendClient;
  context: Context;
  reauthenticate?: () => Promise<void>;
  onBack: () => void;
  onAudit: () => void;
};
export function UserHistory(props: Props) {
  const [cursor, setCursor] = useState<string | null>(null);
  return (
    <HistoryPage
      key={cursor ?? "first"}
      {...props}
      cursor={cursor}
      setCursor={setCursor}
    />
  );
}
function HistoryPage({
  subjectRef,
  backend,
  context,
  reauthenticate,
  onBack,
  onAudit,
  cursor,
  setCursor,
}: Props & { cursor: string | null; setCursor: (c: string | null) => void }) {
  const epoch = { expectedDataEpochId: context.dataEpochId! };
  const state = useRead(() =>
    backend.history({
      ...epoch,
      subjectRef,
      limit: 20,
      ...(cursor ? { cursor } : {}),
    }),
  );
  const [selected, setSelected] = useState(""),
    [reason, setReason] = useState<EditorialMutation["reasonCode"]>("other"),
    [severity, setSeverity] = useState<"low" | "medium" | "high">("low");
  const command = useCommand(context, reauthenticate),
    data = state.data;
  function restrict(action: Requests["restrictions"]["action"]) {
    if (!data || !selected) return;
    const request: Requests["restrictions"] = {
      ...epoch,
      ...metadata(context, subjectRef, data.controlVersion, reason),
      subjectRef,
      action,
      supportingDecisionIds: [selected],
      expectedControlVersion: data.controlVersion,
    };
    command.prepare({
      title: `${action} account controls?`,
      effect:
        action === "disable"
          ? "Queue whole-account disabling. Auth synchronization must be checked separately."
          : action === "unrestrict"
            ? "Clear controls and queue Auth restoration if needed."
            : "Apply explicit Community restrictions based on the selected human decision.",
      target: subjectRef,
      version: data.controlVersion,
      reason,
      severe: action === "disable",
      execute: () => backend.restrictions(request),
      reconcile: state.reconcile,
    });
  }
  function violation() {
    if (!data || !selected) return;
    const request: Requests["violation"] = {
      ...epoch,
      ...metadata(context, subjectRef, data.controlVersion, reason),
      subjectRef,
      decisionId: selected,
      severity,
      expectedControlVersion: data.controlVersion,
    };
    command.prepare({
      title: "Record confirmed violation?",
      effect: `Record a ${severity} human-confirmed violation tied to the exact adverse decision and matching reason. No restriction or suspension is automatic.`,
      target: subjectRef,
      version: data.controlVersion,
      reason,
      execute: () => backend.violation(request),
      reconcile: state.reconcile,
    });
  }
  function correct(item: Responses["history"]["items"][number]) {
    if (!item.violationId || item.version === null) return;
    const request: Requests["correction"] = {
      ...epoch,
      ...metadata(
        context,
        item.violationId,
        item.version,
        "violation-correction",
      ),
      violationId: item.violationId,
      expectedViolationVersion: item.version,
    };
    command.prepare({
      title: "Correct this violation?",
      effect:
        "Append a correction and update confirmed totals. This does not restore content, remove restrictions, or change Auth.",
      target: item.violationId,
      version: item.version,
      reason: "violation-correction",
      execute: () => backend.correction(request),
      reconcile: state.reconcile,
    });
  }
  const decisions = data
    ? [
        ...new Map(
          [
            ...data.items.filter((i) => i.eventKind === "decision"),
            ...data.recentDecisions,
          ]
            .filter((i) => i.decisionId)
            .map((i) => [i.decisionId!, i]),
        ).values(),
      ]
    : [];
  const authRestore = data && data.authSyncStatus !== "enabled";
  return (
    <>
      <button disabled={command.blocked} onClick={onBack}>
        ← Back to source or restricted accounts
      </button>
      <h1>Subject history</h1>
      <p>
        Private, temporary subject reference. Reports are allegations; confirmed
        violations are separate human decisions.
      </p>
      <ReadState state={state} />
      {data && (
        <>
          <Panel title="Effective controls">
            <p>Control version {data.controlVersion}</p>
            <ul>
              {Object.entries(data.effectiveRestrictions).map(([k, v]) => (
                <li key={k}>
                  {k}: {v ? "Restricted" : "Unrestricted"}
                </li>
              ))}
            </ul>
            <p>
              Auth synchronization: <strong>{data.authSyncStatus}</strong>
            </p>
            {data.authSyncStatus.endsWith("pending") && (
              <p>
                The worker has not confirmed the Auth change. Refresh to check
                completion.
              </p>
            )}
            <p>
              {data.summary.confirmed} confirmed violations ·{" "}
              {data.summary.corrected} corrected
            </p>
          </Panel>
          <Panel title="Reports and appeals">
            {(["reports", "appeals"] as const).map((kind) => (
              <section key={kind}>
                <h3>{kind}</h3>
                {data.casesCapped[kind] && (
                  <p>
                    Showing the newest 20; older open cases are available
                    through queue pagination.
                  </p>
                )}
                {data[kind].length ? (
                  data[kind].map((row) => (
                    <p key={row.itemId}>
                      {row.status} · {row.reasonCode ?? "No reason recorded"} ·
                      revision {row.revision ?? "unavailable"} ·{" "}
                      {new Date(row.createdAt).toLocaleString()} · Case{" "}
                      {row.itemId}
                    </p>
                  ))
                ) : (
                  <p>None in this retained epoch.</p>
                )}
              </section>
            ))}
          </Panel>
          <Panel title="Human enforcement">
            <p>
              Select a recorded human decision. The backend validates the
              subject, adverse reason, and exact revision; an allegation or
              screening failure cannot qualify.
            </p>
            <label>
              Supporting human decision
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                disabled={command.blocked}
              >
                <option value="">Select decision</option>
                {decisions.map((d) => (
                  <option key={d.decisionId!} value={d.decisionId!}>
                    {d.action} · {d.reasonCodes.join(", ")} · {d.decisionId}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Reason code
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as typeof reason)}
                disabled={command.blocked}
              >
                {EDITORIAL_REASON_CODES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Violation severity
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as typeof severity)}
                disabled={command.blocked}
              >
                <option>low</option>
                <option>medium</option>
                <option>high</option>
              </select>
            </label>
            <div className="actions">
              <button
                disabled={!selected || command.blocked || state.busy}
                onClick={violation}
              >
                Record violation
              </button>
              {(
                [
                  "restrict",
                  "restrict-reporting",
                  "unrestrict",
                  "disable",
                ] as const
              )
                .filter((a) =>
                  a === "disable"
                    ? context.capabilities.admin
                    : a === "unrestrict" && authRestore
                      ? context.capabilities.admin
                      : true,
                )
                .map((a) => (
                  <button
                    key={a}
                    disabled={!selected || command.blocked || state.busy}
                    onClick={() => restrict(a)}
                  >
                    {a === "disable"
                      ? "Disable account"
                      : a === "unrestrict"
                        ? "Remove restrictions"
                        : a === "restrict-reporting"
                          ? "Restrict reporting"
                          : "Restrict Community"}
                  </button>
                ))}
            </div>
            <p>
              Legacy controls without a supporting decision can be released from
              the Restricted accounts queue.
            </p>
          </Panel>
          <Panel title="Global event journal">
            <AuditRows items={data.items} />
            {data.items.map((item) =>
              item.eventKind === "violation" ? (
                <div key={item.id}>
                  <p>
                    Violation {item.violationId} · {item.status} · severity{" "}
                    {item.severity} · source epoch{" "}
                    {item.sourceEpoch ?? "unknown"}
                  </p>
                  {context.capabilities.admin &&
                    item.status === "confirmed" && (
                      <button
                        disabled={command.blocked || state.busy}
                        onClick={() => correct(item)}
                      >
                        Correct violation {item.violationId}
                      </button>
                    )}
                </div>
              ) : null,
            )}
            {!data.items.length && <p>No retained journal events.</p>}
            <div className="actions">
              {cursor && (
                <button
                  disabled={command.blocked}
                  onClick={() => setCursor(null)}
                >
                  First page
                </button>
              )}
              {data.cursor && (
                <button
                  disabled={command.blocked}
                  onClick={() => setCursor(data.cursor)}
                >
                  Next page
                </button>
              )}
            </div>
          </Panel>
          <details>
            <summary>
              Recent moderation decisions
              {data.casesCapped.decisions ? " (newest 20; capped)" : ""}
            </summary>
            <AuditRows items={data.recentDecisions} />
          </details>
          <button onClick={onAudit}>Community audit</button>
        </>
      )}
      {command.ui}
      <button disabled={command.busy} onClick={() => void state.refresh()}>
        Refresh history
      </button>
    </>
  );
}
