import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Account, AuthPort } from "./types";
import type { EditorialClient } from "./api";
import type { EditorialQueue } from "./contract/backendContracts";
import type { BackendClient, BackendConfig, Context } from "./backend";
import { apiError, fatalError, PortalError, signInMessage } from "./errors";
import { Brand, Notice, Status } from "./components";
import { Puzzles } from "./Puzzles";
import { Overview, Audit, Operator } from "./screens";
import { CommunityReview } from "./CommunityReview";
import { UserHistory } from "./UserHistory";
export type AppProps = {
  auth: AuthPort;
  api: EditorialClient;
  backend: BackendClient;
  config: BackendConfig;
};
export function App({ auth, api, backend, config }: AppProps) {
  const [account, setAccount] = useState<Account | null | undefined>(undefined),
    [signingIn, setSigningIn] = useState(false),
    [signingOut, setSigningOut] = useState(false),
    [signOutFailed, setSignOutFailed] = useState(false),
    [error, setError] = useState("");
  const hidden = useRef(false),
    lock = useRef(false),
    [generation, setGeneration] = useState(0);
  useEffect(
    () =>
      auth.subscribe(
        (user) => {
          if (!hidden.current) {
            setAccount(user);
            setGeneration((n) => n + 1);
          }
        },
        () => {
          setAccount(null);
          setGeneration((n) => n + 1);
          setError("Your session could not be restored. Please sign in again.");
        },
      ),
    [auth],
  );
  async function login() {
    if (lock.current) return;
    lock.current = true;
    setSigningIn(true);
    setError("");
    try {
      hidden.current = false;
      await auth.signIn();
    } catch (e) {
      setError(signInMessage(e));
    } finally {
      lock.current = false;
      setSigningIn(false);
    }
  }
  async function logout() {
    if (lock.current) return;
    lock.current = true;
    hidden.current = true;
    setAccount(null);
    setGeneration((n) => n + 1);
    setSigningOut(true);
    setError("");
    try {
      await auth.signOut();
      setSignOutFailed(false);
      hidden.current = false;
    } catch {
      setSignOutFailed(true);
      setError(
        "Sign-out could not finish. Editorial data has been cleared. Please try signing out again.",
      );
    } finally {
      lock.current = false;
      setSigningOut(false);
    }
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <div className="account">
            <span
              className={`environment-label ${config.environment === "prod" ? "production" : ""}`}
            >
              {config.environment === "prod"
                ? "PRODUCTION"
                : config.environment === "local"
                  ? "LOCAL DEMO"
                  : "STAGING / BETA"}
            </span>
            <span className="project-label">{config.projectId}</span>
            {account && (
              <>
                <div className="account-name">
                  <strong>{account.displayName || "Staff"}</strong>
                  <span>{account.email}</span>
                </div>
                <button className="header-button" onClick={() => void logout()}>
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      </header>
      {account === undefined ? (
        <main id="main" className="auth-layout">
          <Status>Restoring your session…</Status>
        </main>
      ) : account ? (
        <Authorized
          key={`${account.uid}-${generation}`}
          api={api}
          backend={backend}
          auth={auth}
        />
      ) : (
        <main id="main" className="auth-layout">
          <section className="sign-in-card">
            <p className="eyebrow">ALLES ENTERTAINMENT</p>
            <h1>Editorial Portal</h1>
            <p className="sign-in-description">
              The right quote, on the right day.
            </p>
            <p>
              Review puzzles, Community contributions, and editorial activity
              with your assigned staff permissions.
            </p>
            {error && <Notice>{error}</Notice>}
            {signingOut ? (
              <Status>Signing out…</Status>
            ) : signOutFailed ? (
              <button onClick={() => void logout()}>Retry sign out</button>
            ) : (
              <button
                className="google-button"
                disabled={signingIn}
                onClick={() => void login()}
              >
                {signingIn ? "Connecting to Google…" : "Sign in with Google"}
              </button>
            )}
            <p className="access-note">
              For authorized Alles Entertainment editors.
            </p>
          </section>
        </main>
      )}
    </>
  );
}
type Area =
  | "overview"
  | "puzzles"
  | "community"
  | "abuse"
  | "audit"
  | "operator";
const areas: Area[] = [
  "overview",
  "puzzles",
  "community",
  "abuse",
  "audit",
  "operator",
];
function hashArea(): Area {
  const value = location.hash.slice(1);
  return areas.includes(value as Area) ? (value as Area) : "overview";
}
function guarded<T extends object>(
  client: T,
  failed: (e: PortalError) => void,
): T {
  return Object.fromEntries(
    Object.entries(client).map(([name, call]) => [
      name,
      async (...args: unknown[]) => {
        try {
          return await call(...args);
        } catch (e) {
          const failure = apiError(e);
          if (fatalError(failure)) failed(failure);
          throw failure;
        }
      },
    ]),
  ) as T;
}
function Authorized({
  api,
  backend,
  auth,
}: Pick<AppProps, "api" | "backend" | "auth">) {
  const [communityQueue, setCommunityQueue] =
    useState<EditorialQueue>("reviews");
  const [context, setContext] = useState<Context | null>(null),
    [error, setError] = useState<PortalError | null>(null),
    [area, setArea] = useState<Area>(hashArea),
    [subject, setSubject] = useState<{
      ref: string;
      origin: { queue: EditorialQueue; itemId: string };
    } | null>(null),
    [returnCase, setReturnCase] = useState<{
      queue: EditorialQueue;
      itemId: string;
    } | null>(null),
    [auditTarget, setAuditTarget] = useState<{
      stream: "puzzle" | "community" | "access";
      target?: string;
    } | null>(null),
    [checking, setChecking] = useState(true);
  const mounted = useRef(true),
    contextRef = useRef<Context | null>(null),
    lastCheck = useRef(0),
    authSequence = useRef(0);
  const failed = useCallback((e: PortalError) => {
    if (mounted.current) {
      authSequence.current++;
      setContext(null);
      contextRef.current = null;
      setSubject(null);
      setReturnCase(null);
      setAuditTarget(null);
      setError(e);
    }
  }, []);
  const safeApi = useMemo(() => guarded(api, failed), [api, failed]),
    safeBackend = useMemo(() => guarded(backend, failed), [backend, failed]);
  const authorize = useCallback(async () => {
    const sequence = ++authSequence.current;
    setChecking(true);
    try {
      const next = await safeBackend.context({});
      if (!mounted.current || sequence !== authSequence.current) return;
      const old = contextRef.current;
      if (
        old &&
        (old.dataEpochId !== next.dataEpochId ||
          JSON.stringify(old.capabilities) !==
            JSON.stringify(next.capabilities) ||
          JSON.stringify(old.policies) !== JSON.stringify(next.policies) ||
          JSON.stringify(old.features) !== JSON.stringify(next.features))
      ) {
        failed(new PortalError("scope"));
        return;
      }
      contextRef.current = next;
      setContext(next);
      setError(null);
      lastCheck.current = Date.now();
    } catch (e) {
      failed(apiError(e));
    } finally {
      if (mounted.current) setChecking(false);
    }
  }, [safeBackend, failed]);
  useEffect(() => {
    mounted.current = true;
    void authorize();
    return () => {
      mounted.current = false;
    };
  }, [authorize]);
  useEffect(() => {
    const changed = () => setArea(hashArea());
    window.addEventListener("hashchange", changed);
    return () => window.removeEventListener("hashchange", changed);
  }, []);
  useEffect(() => {
    const focus = () => {
      if (
        document.visibilityState === "visible" &&
        Date.now() - lastCheck.current > 60000
      )
        void authorize();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => {
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
    };
  }, [authorize]);
  function navigate(next: Area) {
    setArea(next);
    location.hash = next;
  }
  if (!context)
    return (
      <main id="main" className="auth-layout">
        <section className="sign-in-card">
          <h1>{error ? "Editorial access" : "Checking access"}</h1>
          {checking ? (
            <Status>Checking staff capabilities…</Status>
          ) : (
            error && (
              <>
                <Notice>{error.message}</Notice>
                <button onClick={() => void authorize()}>
                  Check access again
                </button>
                <p>Use Sign out above to switch accounts.</p>
              </>
            )
          )}
        </section>
      </main>
    );
  const { editor, moderator, admin } = context.capabilities,
    community = moderator && context.epochStatus === "available";
  const allowed: Record<Area, boolean> = {
    overview: true,
    puzzles: editor,
    community,
    abuse: community,
    audit: editor || community || admin,
    operator: true,
  };
  const labels: Record<Area, string> = {
    overview: "Overview",
    puzzles: "Puzzles",
    community: "Community moderation",
    abuse: "Abuse and restrictions",
    audit: "Audit history",
    operator: "Access and policy",
  };
  const audit = (
    stream: "puzzle" | "community" | "access",
    target?: string,
  ) => {
    setAuditTarget({ stream, target });
    navigate("audit");
  };
  return (
    <>
      <div className="workspace-bar">
        <p>
          Epoch: {context.dataEpochId ?? "unavailable"} ·{" "}
          {context.policies.timeZone}
        </p>
        <nav aria-label="Workspace">
          {areas
            .filter((a) => allowed[a])
            .map((a) => (
              <button
                key={a}
                aria-current={a === area ? "page" : undefined}
                onClick={() => navigate(a)}
              >
                {labels[a]}
              </button>
            ))}
        </nav>
      </div>
      {context.epochStatus === "unavailable" && (
        <div className="main-content">
          <Notice>
            Community data is unavailable until an active server epoch can be
            verified.
          </Notice>
        </div>
      )}
      {!allowed[area] ? (
        <main id="main" className="main-content">
          <h1>Permission required</h1>
          <Notice>
            Your server-assigned capabilities do not include this area.
          </Notice>
        </main>
      ) : area === "puzzles" ? (
        <Puzzles
          api={safeApi}
          backend={safeBackend}
          context={context}
          reauthenticate={auth.reauthenticate}
          onAudit={(target) => audit("puzzle", target)}
        />
      ) : area === "community" || area === "abuse" ? (
        <main id="main" className="main-content">
          {area === "abuse" && subject ? (
            <UserHistory
              key={subject.ref}
              subjectRef={subject.ref}
              backend={safeBackend}
              context={context}
              reauthenticate={auth.reauthenticate}
              onBack={() => {
                if (subject.origin.queue !== "restrictions") {
                  setReturnCase(subject.origin);
                  navigate("community");
                }
                setSubject(null);
              }}
              onAudit={() => audit("community")}
            />
          ) : (
            <CommunityReview
              key={area}
              backend={safeBackend}
              context={context}
              reauthenticate={auth.reauthenticate}
              restrictionsOnly={area === "abuse"}
              initialQueue={area === "abuse" ? "restrictions" : communityQueue}
              initialCase={area === "community" ? returnCase : null}
              onSubject={(ref, origin) => {
                setSubject({ ref, origin });
                setReturnCase(null);
                navigate("abuse");
              }}
              onAudit={(target) => audit("community", target)}
            />
          )}
        </main>
      ) : (
        <main id="main" className="main-content">
          {area === "overview" ? (
            <Overview
              backend={safeBackend}
              context={context}
              onNavigate={(next, queue) => {
                setReturnCase(null);
                setSubject(null);
                if (queue) setCommunityQueue(queue);
                navigate(next);
              }}
            />
          ) : area === "audit" ? (
            <Audit
              key={`${auditTarget?.stream}-${auditTarget?.target}`}
              backend={safeBackend}
              context={context}
              initial={auditTarget}
            />
          ) : (
            <Operator context={context} />
          )}
        </main>
      )}
    </>
  );
}
