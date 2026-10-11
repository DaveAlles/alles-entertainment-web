import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi, beforeEach } from "vitest";
import { App } from "../src/App";
import { context, config, fakeBackend } from "./backend-fixtures";
import { fakeAuth, fakeApi, deferred } from "./fixtures";
import { metadata, Provenance, useCommand } from "../src/workspace";
import { gameDateAt } from "../src/dates";
import { PortalError } from "../src/errors";
beforeEach(() => {
  location.hash = "overview";
});
it("does not load protected data until capabilities resolve and rejects a late result after sign-out", async () => {
  const gate = deferred<typeof context>(),
    backend = fakeBackend({ context: vi.fn(() => gate.promise) }),
    auth = fakeAuth();
  render(
    <App
      auth={auth.auth}
      api={fakeApi().api}
      backend={backend}
      config={config}
    />,
  );
  expect(screen.getByText("Checking staff capabilities…")).toBeVisible();
  expect(backend.overview).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Sign out" }));
  await act(async () => gate.resolve(context));
  expect(screen.queryByRole("heading", { name: "Action queue" })).toBeNull();
  expect(backend.overview).not.toHaveBeenCalled();
});
it("ordinary authenticated accounts cannot open private screens or infer roles", async () => {
  const backend = fakeBackend({
    context: vi.fn().mockRejectedValue(new PortalError("denied")),
  });
  localStorage.setItem("editorialRole", "editorialAdmin");
  render(
    <App
      auth={fakeAuth().auth}
      api={fakeApi().api}
      backend={backend}
      config={config}
    />,
  );
  await screen.findByText(/does not have editorial access/);
  expect(backend.overview).not.toHaveBeenCalled();
  expect(screen.queryByRole("navigation", { name: "Workspace" })).toBeNull();
  localStorage.clear();
});
it.each([
  { editor: true, moderator: false, admin: true },
  { editor: false, moderator: true, admin: false },
])("uses independent server capabilities %j", async (capabilities) => {
  render(
    <App
      auth={fakeAuth().auth}
      api={fakeApi().api}
      backend={fakeBackend({
        context: vi.fn(async () => ({ ...context, capabilities })),
      })}
      config={config}
    />,
  );
  await screen.findByRole("heading", { name: "Action queue" });
  expect(!!screen.queryByRole("button", { name: "Puzzles" })).toBe(
    capabilities.editor,
  );
  expect(!!screen.queryByRole("button", { name: "Community moderation" })).toBe(
    capabilities.moderator,
  );
});
it("account switching cannot show another account’s delayed overview", async () => {
  const response =
      deferred<
        Awaited<ReturnType<ReturnType<typeof fakeBackend>["overview"]>>
      >(),
    backend = fakeBackend({ overview: vi.fn(() => response.promise) }),
    session = fakeAuth();
  render(
    <App
      auth={session.auth}
      api={fakeApi().api}
      backend={backend}
      config={config}
    />,
  );
  await waitFor(() => expect(backend.overview).toHaveBeenCalled());
  vi.mocked(backend.context).mockRejectedValue(new PortalError("denied"));
  await act(async () =>
    session.emit({ uid: "other", displayName: "Other", email: null }),
  );
  await act(async () =>
    response.resolve({
      ...context,
      dataEpochId: "epoch",
      asOf: "private-old-snapshot",
    }),
  );
  await screen.findByText(/does not have editorial access/);
  expect(screen.queryByText(/private-old-snapshot/)).toBeNull();
});
it("safe provenance links reject executable URLs and embedded credentials", () => {
  render(
    <Provenance
      links={[
        { url: "javascript:alert(1)", publisherId: "bad", role: "source" },
        {
          url: "https://user:pass@example.test",
          publisherId: "bad",
          role: "source",
        },
        {
          url: "https://example.test/source",
          publisherId: "verified",
          role: "primary",
        },
      ]}
    />,
  );
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(screen.getByRole("link")).toHaveAttribute(
    "rel",
    "noopener noreferrer",
  );
});
it("production is explicitly identified even before login", () => {
  render(
    <App
      auth={fakeAuth(null).auth}
      api={fakeApi().api}
      backend={fakeBackend()}
      config={{
        ...config,
        environment: "prod",
        projectId: "misattribution-aa1e2",
      }}
    />,
  );
  expect(screen.getByText("PRODUCTION")).toBeVisible();
  expect(screen.getByText("misattribution-aa1e2")).toBeVisible();
});

function CommandHarness({
  execute,
  reconcile,
  reauthenticate,
  production = false,
  severe = false,
}: {
  execute: () => Promise<unknown>;
  reconcile: () => Promise<void>;
  reauthenticate?: () => Promise<void>;
  production?: boolean;
  severe?: boolean;
}) {
  const ctx = production
    ? {
        ...context,
        environment: "prod" as const,
        projectId: "misattribution-aa1e2",
      }
    : context;
  const command = useCommand(ctx, reauthenticate);
  return (
    <>
      <button
        disabled={command.blocked}
        onClick={() =>
          command.prepare({
            title: "Review action?",
            effect: "Consequential action",
            target: "case-reference",
            version: 3,
            reason: "other",
            severe,
            execute,
            reconcile,
          })
        }
      >
        Prepare action
      </button>
      {command.ui}
    </>
  );
}
it("Production metadata pins project, target and version and reauthenticates before sending", async () => {
  const ctx = {
    ...context,
    environment: "prod" as const,
    projectId: "misattribution-aa1e2",
  };
  expect(metadata(ctx, "case-reference", 3, "other")).toMatchObject({
    expectedProjectId: ctx.projectId,
    confirmation: {
      project: ctx.projectId,
      target: "case-reference",
      expectedVersion: 3,
    },
  });
  const order: string[] = [],
    execute = vi.fn(async () => {
      order.push("execute");
      return { requestId: "original" };
    }),
    reauth = vi.fn(async () => {
      order.push("reauth");
    });
  render(
    <CommandHarness
      execute={execute}
      reconcile={async () => {}}
      reauthenticate={reauth}
      production
    />,
  );
  await userEvent.click(screen.getByText("Prepare action"));
  expect(screen.getByRole("dialog")).toHaveTextContent("PRODUCTION");
  expect(execute).not.toHaveBeenCalled();
  await userEvent.click(screen.getByText("Confirm action"));
  await screen.findByText(/Receipt original/);
  expect(order).toEqual(["reauth", "execute"]);
});
it("failed reauthentication never sends a Production mutation", async () => {
  const execute = vi.fn();
  render(
    <CommandHarness
      execute={execute}
      reconcile={async () => {}}
      reauthenticate={async () => {
        throw new PortalError("reauth");
      }}
      production
    />,
  );
  await userEvent.click(screen.getByText("Prepare action"));
  await userEvent.click(screen.getByText("Confirm action"));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(execute).not.toHaveBeenCalled();
  expect(screen.getByText("Prepare action")).toBeEnabled();
});
it("failed reconciliation cannot enable an uncertain mutation receipt retry", async () => {
  const execute = vi.fn().mockRejectedValue(new PortalError("network"));
  render(
    <CommandHarness
      execute={execute}
      reconcile={async () => {
        throw new PortalError("network");
      }}
    />,
  );
  await userEvent.click(screen.getByText("Prepare action"));
  await userEvent.click(screen.getByText("Confirm action"));
  await screen.findByText(/outcome is unknown/);
  await userEvent.click(screen.getByText("Reconcile current state"));
  await waitFor(() =>
    expect(screen.getByText("Reconcile current state")).toBeEnabled(),
  );
  expect(screen.getByText("Retrieve original receipt")).toBeDisabled();
  expect(execute).toHaveBeenCalledTimes(1);
});
it("an acknowledged mutation stays accepted if the following read reports a missing case", async () => {
  render(
    <CommandHarness
      execute={async () => ({ requestId: "accepted-once" })}
      reconcile={async () => {
        throw new PortalError("missing");
      }}
    />,
  );
  await userEvent.click(screen.getByText("Prepare action"));
  await userEvent.click(screen.getByText("Confirm action"));
  await screen.findByText(/Receipt accepted-once/);
  expect(screen.queryByText(/outcome is unknown/)).toBeNull();
  expect(screen.queryByText("Reload current state")).toBeNull();
  expect(screen.getByText("Prepare action")).toBeEnabled();
});
it("whole-account action requires the separate severe acknowledgement", async () => {
  const execute = vi.fn(async () => ({ requestId: "severe" }));
  render(
    <CommandHarness execute={execute} reconcile={async () => {}} severe />,
  );
  await userEvent.click(screen.getByText("Prepare action"));
  expect(screen.getByText("Confirm action")).toBeDisabled();
  await userEvent.click(screen.getByRole("checkbox"));
  await userEvent.click(screen.getByText("Confirm action"));
  await screen.findByText(/Receipt severe/);
  expect(execute).toHaveBeenCalledTimes(1);
});

it.each([
  ["2026-03-08T04:59:59Z", "2026-03-07"],
  ["2026-03-08T05:00:00Z", "2026-03-08"],
  ["2026-03-09T03:59:59Z", "2026-03-08"],
  ["2026-03-09T04:00:00Z", "2026-03-09"],
  ["2026-11-01T04:00:00Z", "2026-11-01"],
  ["2026-11-02T04:59:59Z", "2026-11-01"],
  ["2026-11-02T05:00:00Z", "2026-11-02"],
])("derives preview day from server NY time across DST: %s", (time, expected) =>
  expect(gameDateAt(time)).toBe(expected),
);
