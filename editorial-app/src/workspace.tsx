import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { apiError, PortalError, uncertainError } from "./errors";
import { Confirm, Notice, Status } from "./components";
import type { Context } from "./backend";
import type {
  EditorialMutation,
  ProvenanceLink,
} from "./contract/backendContracts";
export function useRead<T>(load: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState<PortalError | null>(null),
    [busy, setBusy] = useState(false),
    [asOf, setAsOf] = useState<number | null>(null);
  const sequence = useRef(0),
    latest = useRef(load);
  latest.current = load;
  const read = useCallback(async (required = false) => {
    const n = ++sequence.current;
    setBusy(true);
    setError(null);
    try {
      const value = await latest.current();
      if (n === sequence.current) {
        setData(value);
        setAsOf(Date.now());
      }
    } catch (e) {
      if (n === sequence.current) {
        setData(null);
        setError(apiError(e));
      }
      if (required) throw e;
    } finally {
      if (n === sequence.current) setBusy(false);
    }
  }, []);
  const refresh = useCallback(() => read(false), [read]);
  const reconcile = useCallback(() => read(true), [read]);
  useEffect(() => {
    void refresh();
    return () => {
      sequence.current++;
    };
  }, [refresh]);
  useEffect(() => {
    const focus = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - (asOf ?? 0) > 60000
      )
        void refresh();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [asOf, refresh]);
  return { data, error, busy, asOf, refresh, reconcile, setData };
}
export function ReadState({
  state,
}: {
  state: {
    busy: boolean;
    error: PortalError | null;
    asOf: number | null;
    refresh: () => Promise<void>;
  };
}) {
  return (
    <>
      {state.busy && <Status>Loading authoritative state…</Status>}
      {state.error && (
        <Notice>
          <p>{state.error.message}</p>
          <button onClick={() => void state.refresh()} disabled={state.busy}>
            Retry read
          </button>
        </Notice>
      )}
      {state.asOf && (
        <p className="meta">
          Last checked {new Date(state.asOf).toLocaleTimeString()}. Refresh
          before a new decision.
        </p>
      )}
    </>
  );
}
export function metadata(
  context: Context,
  target: string,
  version: number | null,
  reasonCode: EditorialMutation["reasonCode"],
): EditorialMutation {
  return {
    requestId: crypto.randomUUID(),
    expectedProjectId: context.projectId,
    reasonCode,
    ...(context.environment === "prod"
      ? {
          confirmation: {
            project: context.projectId,
            target,
            expectedVersion: version,
          },
        }
      : {}),
  };
}
type Command = {
  title: string;
  effect: string;
  target: string;
  version: number | null;
  reason: string;
  severe?: boolean;
  execute: () => Promise<unknown>;
  reconcile: () => Promise<void>;
  onAccepted?: () => Promise<void>;
};
export function useCommand(
  context: Context,
  reauthenticate?: () => Promise<void>,
  handledErrors = false,
) {
  const [pending, setPending] = useState<Command | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<PortalError | null>(null),
    [unknown, setUnknown] = useState(false),
    [reconciled, setReconciled] = useState(false),
    [receipt, setReceipt] = useState(""),
    [stale, setStale] = useState(false);
  const lock = useRef(false),
    mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  function prepare(command: Command) {
    if (lock.current || unknown || stale || pending) return;
    setPending(command);
    setError(null);
    setReceipt("");
    setReconciled(false);
    setStale(false);
  }
  async function run() {
    if (!pending || lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    let sending = false,
      accepted = false;
    try {
      if (context.environment === "prod") {
        if (!reauthenticate) throw new PortalError("reauth");
        await reauthenticate();
      }
      if (!mounted.current) return;
      sending = true;
      const result = await pending.execute();
      if (!mounted.current) return;
      const resultId =
        result && typeof result === "object" && "requestId" in result
          ? String(result.requestId)
          : "accepted";
      sending = false;
      accepted = true;
      setReceipt(`Action accepted. Receipt ${resultId}.`);
      setUnknown(false);
      setPending(null);
      // A refresh failure cannot turn an acknowledged mutation into an unknown one.
      await (pending.onAccepted ?? pending.reconcile)();
    } catch (e) {
      if (mounted.current) {
        const failure = apiError(e);
        setError(failure);
        setUnknown(sending && uncertainError(failure));
        setReconciled(false);
        if (
          !accepted &&
          !handledErrors &&
          ["conflict", "exists", "locked", "missing", "expired"].includes(
            failure.kind,
          )
        )
          setStale(true);
        else if (accepted || !uncertainError(failure)) setPending(null);
      }
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function reconcile() {
    if (!pending || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await pending.reconcile();
      if (mounted.current) {
        setReconciled(true);
        if (stale) {
          setStale(false);
          setPending(null);
          setError(null);
        }
      }
    } catch (e) {
      if (mounted.current) setError(apiError(e));
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const ui = (
    <>
      {receipt && (
        <p className="success-notice" role="status">
          {receipt}
        </p>
      )}
      {error && (!handledErrors || unknown || error.kind === "reauth") && (
        <Notice>
          {!handledErrors && <p>{error.message}</p>}
          {unknown && (
            <>
              <p>
                The outcome is unknown. Inspect current state first. Receipt
                reconciliation retries the exact original request; it never
                creates another action.
              </p>
              <button disabled={busy} onClick={() => void reconcile()}>
                Reconcile current state
              </button>
              <button disabled={busy || !reconciled} onClick={() => void run()}>
                Retrieve original receipt
              </button>
            </>
          )}
        </Notice>
      )}
      {stale && (
        <button disabled={busy} onClick={() => void reconcile()}>
          Reload current state
        </button>
      )}
      {pending && !unknown && !stale && (
        <Confirm
          title={pending.title}
          busy={busy}
          onCancel={() => setPending(null)}
          onConfirm={() => void run()}
          confirmText="Confirm action"
          severe={pending.severe}
        >
          <p>
            <strong>
              {context.environment === "prod"
                ? "PRODUCTION"
                : context.environment.toUpperCase()}
            </strong>{" "}
            · {context.projectId}
          </p>
          <p>
            Target: {pending.target} · expected version{" "}
            {pending.version ?? "none"}
          </p>
          <p>Reason: {pending.reason}</p>
          <p>{pending.effect}</p>
          {context.environment === "prod" && (
            <p>
              Google reauthentication is required for this Production action.
            </p>
          )}
        </Confirm>
      )}
    </>
  );
  return {
    prepare,
    ui,
    busy,
    blocked: busy || unknown || stale || pending !== null,
  };
}
export function Provenance({ links }: { links: ProvenanceLink[] }) {
  return (
    <ul className="provenance">
      {links.map((link, i) => {
        let safe = false;
        try {
          const url = new URL(link.url);
          safe =
            ["https:", "http:"].includes(url.protocol) &&
            !url.username &&
            !url.password;
        } catch {
          /* non-link text only */
        }
        return (
          <li key={i}>
            {safe ? (
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                {link.publisherId || "Source"} · {link.role}
              </a>
            ) : (
              <span>Source link unavailable</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
export function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export function StateSummary({ value }: { value: unknown }) {
  if (value === null || value === undefined)
    return <>Unavailable or redacted</>;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  )
    return <>{String(value)}</>;
  // Only known finite metadata fields; never dump arbitrary server records.
  if (typeof value === "object")
    return (
      <>
        {Object.entries(value)
          .filter(
            ([k, v]) =>
              [
                "status",
                "revision",
                "version",
                "active",
                "role",
                "contribute",
                "vote",
                "report",
                "confirmed",
                "corrected",
                "authSyncStatus",
              ].includes(k) &&
              ["string", "number", "boolean"].includes(typeof v),
          )
          .map(([k, v]) => `${k}: ${v}`)
          .join(" · ") || "Structured state (details withheld)"}
      </>
    );
  return <>Unavailable</>;
}
