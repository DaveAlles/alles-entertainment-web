import { describe, expect, it, vi } from "vitest";
import { createBackendClient, parseBackend } from "../src/backend";
import { context, config, reviewItem } from "./backend-fixtures";
import { configFor } from "../config";
import type { EditorialBackendRequests } from "../src/contract/backendContracts";
import { backendEndpoints } from "../src/contract/backendContracts";
import { apiError } from "../src/errors";
describe("pinned response validation", () => {
  it("accepts canonical context and refuses project, environment, contract and backend revision drift", () => {
    expect(parseBackend("context", context, {}, config)).toEqual(context);
    for (const change of [
      { projectId: "other" },
      { environment: "prod" },
      { contractVersion: "old" },
      { backendRevision: "b".repeat(40) },
    ])
      expect(() =>
        parseBackend("context", { ...context, ...change }, {}, config),
      ).toThrow(/environment/);
  });
  it("accepts the explicit local emulator revision only for demo mode", () => {
    const local = {
      ...context,
      projectId: "demo-misattribution",
      environment: "local",
      backendRevision: "local",
    };
    expect(
      parseBackend(
        "context",
        local,
        {},
        configFor("emulator").firebase
          ? {
              environment: "local",
              projectId: "demo-misattribution",
              backendSha: config.backendSha,
            }
          : config,
      ),
    ).toEqual(local);
    expect(() =>
      parseBackend(
        "context",
        { ...context, backendRevision: "local" },
        {},
        config,
      ),
    ).toThrow();
  });
  it("refuses unauthorized or contradictory capabilities and epoch state", () => {
    for (const change of [
      { capabilities: { editor: false, moderator: false, admin: false } },
      { capabilities: { editor: "true", moderator: false, admin: false } },
      { epochStatus: "unavailable" },
    ])
      expect(() =>
        parseBackend("context", { ...context, ...change }, {}, config),
      ).toThrow();
  });
  it.each(Object.keys(backendEndpoints))(
    "rejects an incomplete %s response",
    (op) => {
      expect(() =>
        parseBackend(
          op as keyof EditorialBackendRequests,
          { ...context, capabilities: undefined },
          {} as never,
          config,
        ),
      ).toThrow();
    },
  );
  it("pins response identity and epoch to the request", () => {
    const request = {
      queue: "reviews" as const,
      itemId: "item",
      expectedDataEpochId: "epoch",
    };
    expect(
      parseBackend("review", { ...context, item: reviewItem }, request, config)
        .item,
    ).toEqual(reviewItem);
    expect(() =>
      parseBackend(
        "review",
        { ...context, item: { ...reviewItem, itemId: "other" } },
        request,
        config,
      ),
    ).toThrow();
    expect(() =>
      parseBackend(
        "review",
        { ...context, dataEpochId: "old", item: reviewItem },
        request,
        config,
      ),
    ).toThrow(/environment/);
  });
  it("rejects missing evidence revisions and unsupported actions instead of inventing privileges", () => {
    const request = {
      queue: "reviews" as const,
      itemId: "item",
      expectedDataEpochId: "epoch",
    };
    for (const change of [
      { evidenceRevision: undefined },
      { availableActions: ["grant-admin"] },
      { expectedItemVersion: -1 },
    ])
      expect(() =>
        parseBackend(
          "review",
          { ...context, item: { ...reviewItem, ...change } },
          request,
          config,
        ),
      ).toThrow();
  });
  it("rejects an actionable preview without fingerprint or complete board", () => {
    expect(() =>
      parseBackend(
        "preview",
        {
          ...context,
          gameDate: "2026-10-11",
          state: "provisional",
          readiness: "ready",
          previewFingerprint: null,
          puzzle: null,
          warnings: [],
          errors: [],
        },
        { gameDate: "2026-10-11" },
        config,
      ),
    ).toThrow();
  });
  it("uses a single transport and validates receipt identities", async () => {
    const transport = vi.fn(async () => ({
      ...context,
      requestId: "wrong",
      acceptedAt: context.serverNow,
      decisionId: "d",
    }));
    const client = createBackendClient(transport, config);
    await expect(
      client.decideReview({
        requestId: "request",
        queue: "reviews",
        itemId: "item",
        action: "approve",
        expectedDataEpochId: "epoch",
        expectedItemVersion: 1,
        expectedRevision: 1,
        expectedStateVersion: 1,
        expectedStatus: "review",
        reason: "safe",
      }),
    ).rejects.toThrow(/unexpected response/);
    expect(transport.mock.calls).toHaveLength(1);
  });
});
describe("environment isolation and safe errors", () => {
  it.each(["development", "production", "", "garbage"])(
    "fails closed for unselected mode %s",
    (mode) => expect(() => configFor(mode)).toThrow(),
  );
  it.each([
    ["emulator", "demo-misattribution"],
    ["staging", "misattribution-staging"],
    ["prod", "misattribution-aa1e2"],
  ])("routes %s only to its approved project", (mode, project) =>
    expect(configFor(mode).firebase.projectId).toBe(project),
  );
  it.each([
    ["data-epoch-mismatch", "scope"],
    ["CONFIRMATION_REQUIRED", "reauth"],
    ["SUBJECT_UNAVAILABLE", "expired"],
    ["review-conflict", "conflict"],
  ])("maps safe reason %s", (reason, kind) =>
    expect(
      apiError({
        code:
          reason === "review-conflict"
            ? "functions/aborted"
            : "functions/failed-precondition",
        details: { reason },
        message: "PRIVATE RESPONSE",
      }).kind,
    ).toBe(kind),
  );
});
it("accepts the server reissued global restriction reference, with strict account-only actions", () => {
  const request = {
    queue: "restrictions" as const,
    itemId: "old-token",
    globalRestrictions: true as const,
    expectedDataEpochId: "epoch",
  };
  const item = {
    ...reviewItem,
    kind: "account",
    globalRestrictions: true,
    itemId: "fresh-token",
    subjectRef: "fresh-token",
    targetId: "fresh-token",
    availableActions: ["unrestrict"],
  };
  expect(
    parseBackend("review", { ...context, item }, request, config).item.itemId,
  ).toBe("fresh-token");
  expect(() =>
    parseBackend(
      "review",
      { ...context, item: { ...item, availableActions: ["disable"] } },
      request,
      config,
    ),
  ).toThrow();
});
