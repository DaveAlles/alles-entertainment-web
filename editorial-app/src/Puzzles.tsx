import { useCallback, useEffect, useRef, useState } from "react";
import type { EditorialDateState } from "./types";
import type { EditorialClient } from "./api";
import { apiError, PortalError } from "./errors";
import { Notice, PuzzleDateCard, Status } from "./components";
import { PuzzlePreview } from "./PuzzleTools";
import type { BackendClient, Context } from "./backend";
import { gameDateAt } from "./dates";
import { OverrideEditor } from "./OverrideEditor";

export function Puzzles({
  api,
  backend,
  context,
  reauthenticate,
  onAudit,
}: {
  api: EditorialClient;
  backend: BackendClient;
  context: Context;
  reauthenticate?: () => Promise<void>;
  onAudit: (date: string) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [previewDate, setPreviewDate] = useState(gameDateAt(context.serverNow));
  const [days, setDays] = useState<EditorialDateState[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState<PortalError | null>(null);
  const [fatal, setFatal] = useState<PortalError | null>(null);
  const [notice, setNotice] = useState("");
  const [offline, setOffline] = useState(!navigator.onLine);
  const [editor, setEditor] = useState<{
    day: EditorialDateState;
    version: number;
    remove?: boolean;
  } | null>(null);
  const alive = useRef(true);
  const sequence = useRef(0);
  const openingRef = useRef(false);
  const lastRefresh = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const failed = useCallback((e: PortalError) => {
    if (!alive.current) return;
    if (e.kind === "auth" || e.kind === "denied") {
      sequence.current++;
      setDays(null);
      setEditor(null);
      setFatal(e);
    } else setError(e);
  }, []);
  const refresh = useCallback(async () => {
    const id = ++sequence.current;
    setLoading(true);
    setError(null);
    try {
      // Empty request lets the server choose the next seven New York dates.
      const response = await api.list({});
      if (!alive.current || id !== sequence.current) return;
      setDays(response.days);
      lastRefresh.current = Date.now();
    } catch (e) {
      if (alive.current && id === sequence.current) failed(apiError(e));
    } finally {
      if (alive.current && id === sequence.current) setLoading(false);
    }
  }, [api, failed]);
  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
      sequence.current++;
    };
  }, [refresh]);
  useEffect(() => {
    const focus = () => {
      if (
        !editor &&
        !fatal &&
        document.visibilityState === "visible" &&
        Date.now() - lastRefresh.current > 60000
      )
        void refresh();
    };
    const network = () => {
      setOffline(!navigator.onLine);
      if (navigator.onLine) focus();
    };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    return () => {
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
    };
  }, [editor, fatal, refresh]);
  async function open(gameDate: string, remove = false) {
    if (openingRef.current || loading) return;
    openingRef.current = true;
    setOpening(true);
    setError(null);
    setNotice("");
    try {
      const day = await api.get({ gameDate });
      if (alive.current) setEditor({ day, remove, version: 1 });
    } catch (e) {
      failed(apiError(e));
    } finally {
      openingRef.current = false;
      if (alive.current) setOpening(false);
    }
  }
  async function reloadEditor() {
    if (!editor) return;
    const day = await api.get({ gameDate: editor.day.gameDate });
    if (alive.current)
      setEditor((old) => (old ? { day, version: old.version + 1 } : null));
  }
  async function markLocked() {
    if (!editor) return;
    try {
      const day = await api.get({ gameDate: editor.day.gameDate });
      if (alive.current) setEditor((old) => (old ? { ...old, day } : null));
    } catch (e) {
      failed(apiError(e));
    }
    await refresh();
  }
  async function saved(message: string) {
    if (!alive.current) return;
    setEditor(null);
    setNotice(message);
    await refresh();
    heading.current?.focus();
  }
  function close() {
    setEditor(null);
    void refresh();
    setTimeout(() => heading.current?.focus(), 0);
  }
  if (fatal)
    return (
      <main id="main" className="auth-layout">
        <section className="sign-in-card">
          <p className="eyebrow">EDITORIAL ACCESS</p>
          <h1>
            {fatal.kind === "denied" ? "Access not enabled" : "Sign in again"}
          </h1>
          <Notice>{fatal.message}</Notice>
          <p>Use Sign out above to switch accounts.</p>
        </section>
      </main>
    );
  return (
    <main id="main" className="main-content">
      {offline && (
        <Notice warning>
          You’re offline. Reconnect before saving. Your unsaved text stays here
          while this tab is open.
        </Notice>
      )}
      {context.environment !== "prod" && (
        <Notice warning>
          Beta gameplay uses fixture cycles. Daily publication here does not
          change the normal Beta player rotation.
        </Notice>
      )}
      {preview ? (
        <PuzzlePreview
          gameDate={preview}
          backend={backend}
          context={context}
          reauthenticate={reauthenticate}
          onBack={() => setPreview(null)}
          onAudit={() => onAudit(preview)}
          onPublished={refresh}
        />
      ) : editor ? (
        <OverrideEditor
          key={`${editor.day.gameDate}-${editor.version}`}
          initial={editor.day}
          startRemove={editor.remove}
          api={api}
          backend={backend}
          context={context}
          reauthenticate={reauthenticate}
          onClose={close}
          onSuccess={saved}
          onFailure={failed}
          onReload={reloadEditor}
          onLocked={markLocked}
        />
      ) : (
        <>
          <div className="page-heading">
            <div>
              <p className="eyebrow">THE EDITORIAL DESK</p>
              <h1 ref={heading} tabIndex={-1}>
                Upcoming puzzles
              </h1>
              <p className="intro">
                Schedule a forced correct speaker and quote for an upcoming
                daily puzzle.
              </p>
            </div>
            <button
              onClick={() => void refresh()}
              disabled={loading || opening}
            >
              ↻ Refresh
            </button>
          </div>
          <form
            className="filters"
            onSubmit={(e) => {
              e.preventDefault();
              setPreview(previewDate);
            }}
          >
            <label>
              Preview puzzle date
              <input
                type="date"
                required
                value={previewDate}
                onChange={(e) => setPreviewDate(e.target.value)}
              />
            </label>
            <button>Preview date</button>
          </form>
          <p className="date-convention">
            NEXT SEVEN GAME DATES <span>·</span> EASTERN TIME
          </p>
          {notice && (
            <p className="success-notice" role="status">
              ✓ {notice}
            </p>
          )}
          {error && (
            <Notice>
              <p>{error.message}</p>
              <button onClick={() => void refresh()} disabled={loading}>
                Try again
              </button>
            </Notice>
          )}
          {(loading || opening) && (
            <Status>
              {opening
                ? "Loading override…"
                : days
                  ? "Refreshing puzzle dates…"
                  : "Checking access and loading puzzle dates…"}
            </Status>
          )}
          {days && (
            <ol
              className="date-list"
              aria-label="Upcoming puzzle dates"
              aria-busy={loading || opening}
            >
              {days.map((day) => (
                <PuzzleDateCard
                  key={day.gameDate}
                  day={day}
                  busy={loading || opening}
                  onPreview={() => setPreview(day.gameDate)}
                  onAudit={() => onAudit(day.gameDate)}
                  onOpen={() => void open(day.gameDate)}
                  onRemove={() => void open(day.gameDate, true)}
                />
              ))}
            </ol>
          )}
          {days && (
            <p className="page-footer">
              Most days can stay automatic. An editorial override sets only the
              correct pair.
            </p>
          )}
        </>
      )}
    </main>
  );
}
