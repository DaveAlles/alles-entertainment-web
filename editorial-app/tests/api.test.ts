import { describe, expect, it, vi } from "vitest";
import { createClient, parseResponse } from "../src/api";
import { apiError, signInMessage } from "../src/errors";
import { formatDate } from "../src/dates";
import { dates, valid } from "./fixtures";

describe("centralized wire contracts and errors", () => {
  it("uses the existing callable operation names", async () => {
    const transport = vi.fn(async () => ({ days: dates() }));
    await createClient(transport).list({});
    expect(transport).toHaveBeenCalledWith("listEditorialOverrides", {});
  });
  it.each([
    {},
    { days: [] },
    { days: dates().slice(0, 6) },
    { days: [...dates().slice(0, 6), dates()[0]] },
    {
      days: dates().map((d) => ({
        ...d,
        editable: true,
        puzzleGenerated: true,
      })),
    },
  ])("rejects a malformed seven-day response %j", (value) => {
    expect(() => parseResponse("list", value, {})).toThrow(
      /unexpected response/,
    );
  });
  it("rejects a response for another date and mutation acknowledgments with bad revisions", () => {
    expect(() =>
      parseResponse("get", dates()[0], { gameDate: "2030-01-01" }),
    ).toThrow();
    expect(() =>
      parseResponse(
        "cancel",
        { gameDate: "2026-09-06", revision: 0, status: "cancelled" },
        { gameDate: "2026-09-06", expectedRevision: 1 },
      ),
    ).toThrow();
  });
  it("rejects contradictory preflight results", () => {
    expect(() =>
      parseResponse(
        "validate",
        { ...valid, errors: [{ code: "BAD", message: "Bad" }] },
        { gameDate: "2026-09-06", speakerId: "a", quoteText: "q" },
      ),
    ).toThrow();
  });
  it.each([
    ["unauthenticated", "auth"],
    ["permission-denied", "denied"],
    ["invalid-argument", "invalid"],
    ["aborted", "conflict"],
    ["already-exists", "exists"],
    ["not-found", "missing"],
    ["unavailable", "network"],
    ["deadline-exceeded", "network"],
    ["internal", "unexpected"],
  ])("maps %s to safe %s UI errors", (code, kind) => {
    const error = apiError({
      code: `functions/${code}`,
      message: "private stack trace",
      details: { privateKey: "secret" },
    });
    expect(error.kind).toBe(kind);
    expect(error.message).not.toMatch(/private|secret/);
  });
  it.each(["PUZZLE_GENERATED", "OVERRIDE_CONSUMED", "DATE_NOT_FUTURE"])(
    "handles the server lock reason %s",
    (reason) => {
      expect(
        apiError({ code: "functions/failed-precondition", details: { reason } })
          .kind,
      ).toBe("locked");
    },
  );
  it("does not retry mutations after an error", async () => {
    const transport = vi
      .fn()
      .mockRejectedValue({ code: "functions/unavailable" });
    await expect(
      createClient(transport).cancel({
        gameDate: "2026-09-06",
        expectedRevision: 1,
      }),
    ).rejects.toThrow(/connection/);
    expect(transport).toHaveBeenCalledOnce();
  });
  it("formats server calendar dates independently of browser time zones", () => {
    expect(formatDate("2026-09-06", true)).toBe("Sunday, September 6, 2026");
  });
  it("sanitizes sign-in failures and explains popup problems", () => {
    expect(signInMessage({ code: "auth/popup-blocked" })).toMatch(/pop-up/);
    expect(signInMessage({ code: "auth/popup-closed-by-user" })).toMatch(
      /cancelled/,
    );
    expect(signInMessage(new Error("secret"))).not.toMatch(/secret/);
  });
});
