import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import { fakeBackend, config, context } from "./backend-fixtures";
import { beforeEach } from "vitest";
beforeEach(() => {
  location.hash = "puzzles";
});
import { PortalError } from "../src/errors";
import {
  fakeApi,
  fakeAuth,
  deferred,
  dates,
  editor,
  speaker,
  valid,
} from "./fixtures";
import type { EditorialClient } from "../src/api";
import type { EditorialDateState } from "../src/types";

function setup(signedIn = true) {
  const backend = fakeApi();
  const session = fakeAuth(signedIn ? editor : null);
  const user = userEvent.setup();
  render(
    <App
      auth={session.auth}
      api={backend.api}
      backend={fakeBackend()}
      config={config}
    />,
  );
  return { ...backend, ...session, user };
}
async function openAdd(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    (await screen.findAllByRole("button", { name: /Add override for/ }))[0],
  );
  await screen.findByRole("heading", { name: /Override for Sunday/ });
}
async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("combobox"), "Ada");
  await user.click(await screen.findByRole("option", { name: /Ada Lovelace/ }));
  await user.type(
    screen.getByLabelText(/Quote text/),
    "A useful editorial quote.",
  );
  await user.type(
    screen.getByLabelText(/Source URL/),
    "https://example.test/quote",
  );
}
async function openEdit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    await screen.findByRole("button", { name: /Edit override for/ }),
  );
  await screen.findByRole("button", { name: "Save changes" });
}

describe("authentication and the seven-day desk", () => {
  it("shows branded Google sign-in without protected reads when signed out", () => {
    const { api } = setup(false);
    expect(
      screen.getByRole("button", { name: "Sign in with Google" }),
    ).toBeVisible();
    expect(
      screen.queryByText("Imagination is the discovering faculty."),
    ).not.toBeInTheDocument();
    expect(api.list).not.toHaveBeenCalled();
  });
  it("loads the portal only after authorized sign-in and passes the empty date-range request", async () => {
    const { user, api } = setup(false);
    await user.click(
      screen.getByRole("button", { name: "Sign in with Google" }),
    );
    expect(
      await screen.findByRole("list", { name: "Upcoming puzzle dates" }),
    ).toBeVisible();
    expect(api.list).toHaveBeenCalledWith({});
  });
  it("does not display editorial data while authorization is unresolved", async () => {
    const api = fakeApi().api;
    const pending = deferred<{ days: EditorialDateState[] }>();
    api.list = vi.fn(() => pending.promise);
    render(
      <App
        auth={fakeAuth().auth}
        api={api}
        backend={fakeBackend()}
        config={config}
      />,
    );
    expect(
      await screen.findByText("Checking access and loading puzzle dates…"),
    ).toBeVisible();
    expect(
      screen.queryByRole("list", { name: "Upcoming puzzle dates" }),
    ).toBeNull();
    await act(async () => pending.resolve({ days: dates() }));
    expect(
      screen.getByRole("list", { name: "Upcoming puzzle dates" }),
    ).toBeVisible();
  });
  it("denies an authenticated account without showing internal data", async () => {
    const api = fakeApi().api;
    api.list = vi.fn().mockRejectedValue(new PortalError("denied"));
    render(
      <App
        auth={fakeAuth().auth}
        api={api}
        backend={fakeBackend()}
        config={config}
      />,
    );
    expect(
      await screen.findByText(/does not have editorial access/),
    ).toBeVisible();
    expect(screen.queryByRole("article")).toBeNull();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeVisible();
  });
  it("clears protected state immediately on sign-out and ignores a late list response", async () => {
    const { user, api, auth } = setup();
    await screen.findByRole("list", { name: "Upcoming puzzle dates" });
    const pending = deferred<{ days: EditorialDateState[] }>();
    vi.mocked(api.list).mockImplementation(() => pending.promise);
    await user.click(screen.getByRole("button", { name: /Refresh/ }));
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await act(async () => pending.resolve({ days: dates() }));
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(screen.queryByRole("article")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Sign in with Google" }),
    ).toBeVisible();
  });
  it("keeps data cleared when sign-out fails", async () => {
    const { user, auth } = setup();
    await screen.findByRole("list", { name: "Upcoming puzzle dates" });
    vi.mocked(auth.signOut).mockRejectedValue(new Error("private stack"));
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(
      await screen.findByRole("button", { name: "Retry sign out" }),
    ).toBeVisible();
    expect(screen.queryByRole("article")).toBeNull();
    expect(screen.queryByText("private stack")).toBeNull();
  });
  it("renders seven API dates with empty, scheduled, locked states and editor metadata", async () => {
    setup();
    expect(await screen.findAllByRole("article")).toHaveLength(7);
    expect(screen.getAllByText("No override")).toHaveLength(5);
    expect(screen.getByText("Override scheduled")).toBeVisible();
    expect(screen.getByText("Generated · Locked")).toBeVisible();
    expect(screen.getByText(/Last edited by Jill/)).toBeVisible();
    const frozen = screen.getByText("Generated · Locked").closest("article")!;
    expect(
      within(frozen).queryByRole("button", { name: /override/i }),
    ).toBeNull();
    expect(
      within(frozen).getByRole("button", { name: /Preview/ }),
    ).toBeEnabled();
  });
  it("disables date actions until authoritative refresh finishes", async () => {
    const { user, api } = setup();
    await screen.findAllByRole("article");
    const pending = deferred<{ days: EditorialDateState[] }>();
    vi.mocked(api.list).mockImplementation(() => pending.promise);
    await user.click(screen.getByRole("button", { name: /Refresh/ }));
    for (const action of screen.getAllByRole("button", {
      name: /override for/,
    })) {
      expect(action).toBeDisabled();
      await user.click(action);
    }
    expect(api.get).not.toHaveBeenCalled();
    await act(async () => pending.resolve({ days: dates() }));
    expect(
      screen.getByRole("button", { name: /Edit override for/ }),
    ).toBeEnabled();
  });
  it("refreshes manually and clears data if editorial access is revoked", async () => {
    const { user, api } = setup();
    await screen.findByRole("list", { name: "Upcoming puzzle dates" });
    vi.mocked(api.list).mockRejectedValue(new PortalError("denied"));
    await user.click(screen.getByRole("button", { name: /Refresh/ }));
    await screen.findByText(/does not have editorial access/);
    expect(screen.queryByRole("article")).toBeNull();
  });
  it("shows useful initial network failure and allows retry", async () => {
    const api = fakeApi().api;
    vi.mocked(api.list).mockRejectedValueOnce(new PortalError("network"));
    render(
      <App
        auth={fakeAuth().auth}
        api={api}
        backend={fakeBackend()}
        config={config}
      />,
    );
    await userEvent.click(
      await screen.findByRole("button", { name: "Try again" }),
    );
    expect(
      await screen.findByRole("list", { name: "Upcoming puzzle dates" }),
    ).toBeVisible();
  });
});

describe("speaker lookup and create", () => {
  it("opens the selected server date and associates labels with fields", async () => {
    const { user } = setup();
    await openAdd(user);
    expect(
      screen.getByRole("heading", { name: /September 6, 2026/ }),
    ).toHaveFocus();
    expect(screen.getByLabelText(/Editorial note/)).toBeVisible();
    expect(screen.getByLabelText(/Quote date/)).toHaveAttribute("type", "date");
  });
  it("requires a canonical speaker, quote and source before preflight", async () => {
    const { user, api } = setup();
    await openAdd(user);
    await user.click(screen.getByRole("button", { name: "Schedule override" }));
    expect(api.validate).not.toHaveBeenCalled();
    expect(
      screen.getByText("Choose a speaker from the search results."),
    ).toBeVisible();
    expect(screen.getByText("Enter the quote text.")).toBeVisible();
    expect(
      screen.getByText("Add a source URL for this editorial quote."),
    ).toBeVisible();
  });
  it("debounces search and supports keyboard selection of a canonical identity", async () => {
    const { user, api } = setup();
    await openAdd(user);
    await user.type(screen.getByRole("combobox"), "Ada");
    expect(api.search).not.toHaveBeenCalled();
    await screen.findByRole("option", { name: /Ada Lovelace/ });
    expect(api.search).toHaveBeenCalledTimes(1);
    expect(api.search).toHaveBeenCalledWith({ query: "Ada" });
    await user.keyboard("{ArrowDown}{Enter}");
    expect(
      screen.getByText(/Selected: Ada Lovelace · ID canonical-ada/),
    ).toBeVisible();
    await user.type(screen.getByLabelText(/Quote text/), "A quote.");
    await user.type(
      screen.getByLabelText(/Source URL/),
      "https://example.test",
    );
    await user.click(screen.getByRole("button", { name: "Validate" }));
    expect(api.validate).toHaveBeenCalledWith(
      expect.objectContaining({ speakerId: speaker.id }),
    );
  });
  it("shows loading and no-results messages without treating typed names as IDs", async () => {
    const { user, api } = setup();
    vi.mocked(api.search).mockResolvedValue({ speakers: [], hasMore: false });
    await openAdd(user);
    await user.type(screen.getByRole("combobox"), "Nobody");
    expect(screen.getByText("Searching speakers…")).toBeVisible();
    expect(await screen.findByText(/No speakers found/)).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Validate" }));
    expect(api.validate).not.toHaveBeenCalled();
  });
  it("ignores older search results after a newer query", async () => {
    const { user, api } = setup();
    const old = deferred<Awaited<ReturnType<EditorialClient["search"]>>>();
    vi.mocked(api.search)
      .mockImplementationOnce(() => old.promise)
      .mockResolvedValue({
        speakers: [{ id: "grace", name: "Grace Hopper", aliases: [] }],
        hasMore: false,
      });
    await openAdd(user);
    await user.type(screen.getByRole("combobox"), "Ada");
    await waitFor(() => expect(api.search).toHaveBeenCalled());
    await user.clear(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "Grace");
    await screen.findByRole("option", { name: /Grace Hopper/ });
    await act(async () => old.resolve({ speakers: [speaker], hasMore: false }));
    expect(screen.queryByRole("option", { name: /Ada Lovelace/ })).toBeNull();
  });
  it("creates with the canonical ID and refreshes authoritative dates", async () => {
    const { user, api } = setup();
    await openAdd(user);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Schedule override" }));
    await user.click(
      await screen.findByRole("button", { name: "Confirm action" }),
    );
    await screen.findByText(/Override scheduled for Sunday/);
    expect(api.create).toHaveBeenCalledWith(
      expect.objectContaining({
        gameDate: "2026-09-06",
        speakerId: "canonical-ada",
        quoteText: "A useful editorial quote.",
        sourceUrl: "https://example.test/quote",
        requestId: expect.any(String),
        expectedProjectId: context.projectId,
        reasonCode: "editorial-selection",
      }),
    );
    expect(api.list).toHaveBeenCalledTimes(2);
  });
  it("preflight blocking errors prevent save and associate field errors", async () => {
    const { user, api } = setup();
    vi.mocked(api.validate).mockResolvedValue({
      ...valid,
      valid: false,
      errors: [
        {
          code: "PAIR_INVALID",
          message: "This pair is inconsistent.",
          field: "quoteText",
        },
      ],
    });
    await openAdd(user);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Schedule override" }));
    await screen.findByText("Fix before saving");
    expect(
      screen.getByRole("button", { name: "Schedule override" }),
    ).toBeDisabled();
    expect(api.create).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/Quote text/)).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
  it("shows non-blocking warnings and allows an intentional save", async () => {
    const { user, api } = setup();
    vi.mocked(api.validate).mockResolvedValue({
      ...valid,
      warnings: [
        {
          code: "SPEAKER_COOLDOWN",
          message: "This speaker was used recently.",
        },
      ],
    });
    await openAdd(user);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Schedule override" }));
    const save = await screen.findByRole("button", {
      name: "Save with warnings",
    });
    expect(save).toBeEnabled();
    expect(api.create).not.toHaveBeenCalled();
    await user.click(save);
    await user.click(
      await screen.findByRole("button", { name: "Confirm action" }),
    );
    await screen.findByText(/Override scheduled for Sunday/);
    expect(api.create).toHaveBeenCalledOnce();
  });
  it("does not submit twice while validation or save is pending", async () => {
    const { user, api } = setup();
    const pending = deferred<typeof valid>();
    vi.mocked(api.validate).mockReturnValue(pending.promise);
    await openAdd(user);
    await fill(user);
    const form = screen.getByLabelText(/Quote text/).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(api.validate).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Checking this pair…")).toBeVisible();
    await act(async () => pending.resolve(valid));
    await user.click(
      await screen.findByRole("button", { name: "Confirm action" }),
    );
    await screen.findByText(/Override scheduled for Sunday/);
    expect(api.create).toHaveBeenCalledOnce();
  });
  it("reloads after a conflicting create instead of changing the other editor's override", async () => {
    const { user, api } = setup();
    vi.mocked(api.create).mockRejectedValue(new PortalError("exists"));
    await openAdd(user);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Schedule override" }));
    await user.click(
      await screen.findByRole("button", { name: "Confirm action" }),
    );
    expect(await screen.findByText(/An override was added/)).toBeVisible();
    expect(api.create).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: /Reload latest version/ }),
    ).toBeVisible();
  });
});

describe("revision-protected edits, cancellation and generation", () => {
  it("loads existing fields and submits the server revision without changing creation metadata", async () => {
    const { user, api } = setup();
    await openEdit(user);
    expect(screen.getByLabelText(/Quote text/)).toHaveValue(
      "Imagination is the discovering faculty.",
    );
    expect(screen.getByLabelText(/Quote date/)).toHaveValue("1843-01-01");
    expect(screen.getByLabelText(/Editorial note/)).toHaveValue(
      "An anniversary",
    );
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await user.click(
      await screen.findByRole("button", { name: "Confirm action" }),
    );
    await screen.findByText(/Override updated for Monday/);
    expect(api.update).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 3,
        existingPairId: "quote-ada",
      }),
    );
    expect(api.list).toHaveBeenCalledTimes(2);
  });
  it("clears an existing pair reference when the editor changes the quote", async () => {
    const { user, api } = setup();
    await openEdit(user);
    await user.type(screen.getByLabelText(/Quote text/), " More.");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await user.click(
      await screen.findByRole("button", { name: "Confirm action" }),
    );
    await screen.findByText(/Override updated/);
    expect(vi.mocked(api.update).mock.calls[0][0]).not.toHaveProperty(
      "existingPairId",
    );
  });
  it("shows revision conflict and only replaces contents after explicit reload", async () => {
    const { user, api, setRows } = setup();
    await openEdit(user);
    await user.type(screen.getByLabelText(/Editorial note/), " Dave draft");
    vi.mocked(api.update).mockRejectedValue(new PortalError("conflict"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await user.click(
      await screen.findByRole("button", { name: "Confirm action" }),
    );
    await screen.findByText(/changed by another editor/);
    expect(screen.getByLabelText(/Editorial note/)).toHaveValue(
      "An anniversary Dave draft",
    );
    expect(api.update).toHaveBeenCalledOnce();
    const rows = dates();
    rows[1].override = {
      ...rows[1].override!,
      revision: 4,
      editorialNote: "Jill's latest version",
    };
    setRows(rows);
    await user.click(
      screen.getByRole("button", { name: /Reload latest version/ }),
    );
    await waitFor(() =>
      expect(screen.getByLabelText(/Editorial note/)).toHaveValue(
        "Jill's latest version",
      ),
    );
    expect(api.update).toHaveBeenCalledOnce();
  });
  it("handles a conflict reported by preflight without attempting a mutation", async () => {
    const { user, api } = setup();
    vi.mocked(api.validate).mockResolvedValue({
      ...valid,
      valid: false,
      errors: [{ code: "REVISION_CONFLICT", message: "Changed." }],
    });
    await openEdit(user);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await screen.findByText(/changed by another editor/);
    expect(api.update).not.toHaveBeenCalled();
  });
  it("requires removal confirmation and sends the current expected revision", async () => {
    const { user, api } = setup();
    await user.click(
      await screen.findByRole("button", { name: /Remove override for/ }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(api.cancel).not.toHaveBeenCalled();
    expect(
      within(dialog).getByRole("button", { name: "Keep editing" }),
    ).toHaveFocus();
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    expect(
      within(dialog).getByRole("button", { name: "Confirm action" }),
    ).toHaveFocus();
    await user.tab();
    expect(
      within(dialog).getByRole("button", { name: "Keep editing" }),
    ).toHaveFocus();
    await user.click(
      within(dialog).getByRole("button", { name: "Confirm action" }),
    );
    await screen.findByText(/Override removed for Monday/);
    expect(api.cancel).toHaveBeenCalledWith(
      expect.objectContaining({
        gameDate: "2026-09-07",
        expectedRevision: 3,
        requestId: expect.any(String),
        reasonCode: "editorial-cancel",
      }),
    );
    expect(api.list).toHaveBeenCalledTimes(2);
  });
  it("dismisses removal without writing", async () => {
    const { user, api } = setup();
    await openEdit(user);
    await user.click(screen.getByRole("button", { name: "Remove override" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Keep editing",
      }),
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(api.cancel).not.toHaveBeenCalled();
  });
  it("does not open removal confirmation when the selected date has become locked", async () => {
    const { user, api } = setup();
    await screen.findByRole("list", { name: "Upcoming puzzle dates" });
    vi.mocked(api.get).mockResolvedValue(dates()[2]);
    await user.click(
      screen.getByRole("button", { name: /Remove override for/ }),
    );
    await screen.findByText("This date is locked and cannot be changed.");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.queryByRole("button", { name: "Remove override" }),
    ).toBeNull();
    expect(api.cancel).not.toHaveBeenCalled();
  });
  it("stale cancellation shows a conflict and is never retried automatically", async () => {
    const { user, api } = setup();
    vi.mocked(api.cancel).mockRejectedValue(new PortalError("conflict"));
    await openEdit(user);
    await user.click(screen.getByRole("button", { name: "Remove override" }));
    await user.click(
      within(await screen.findByRole("dialog")).getByRole("button", {
        name: "Confirm action",
      }),
    );
    await screen.findByText(/changed by another editor/);
    expect(api.cancel).toHaveBeenCalledOnce();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
  it("locked during save becomes read-only and refreshes authoritative state", async () => {
    const { user, api, setRows } = setup();
    await openEdit(user);
    vi.mocked(api.update).mockImplementation(async () => {
      const rows = dates();
      rows[1] = {
        ...rows[1],
        state: "locked",
        editable: false,
        puzzleGenerated: true,
        lockReason: "PUZZLE_GENERATED",
      };
      setRows(rows);
      throw new PortalError("locked");
    });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await user.click(
      await screen.findByRole("button", { name: "Confirm action" }),
    );
    await screen.findByText(/generated while you were editing/);
    await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText(/Quote text/)).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Remove override" }),
    ).toBeNull();
    await user.click(screen.getByRole("button", { name: /Upcoming puzzles/ }));
    expect(await screen.findAllByText("Generated · Locked")).toHaveLength(2);
  });
  it("a date locked between opening and fetching does not offer mutation controls", async () => {
    const { user, api } = setup();
    await screen.findByRole("list", { name: "Upcoming puzzle dates" });
    vi.mocked(api.get).mockResolvedValue(dates()[2]);
    await user.click(screen.getByRole("button", { name: /Edit override for/ }));
    await screen.findByText("This date is locked and cannot be changed.");
    expect(
      screen.getByRole("button", { name: "Schedule override" }),
    ).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Remove override" }),
    ).toBeNull();
  });
  it("uncertain save failures require reloading instead of risking a duplicate write", async () => {
    const { user, api } = setup();
    vi.mocked(api.update).mockRejectedValue(new PortalError("network"));
    await openEdit(user);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    await user.click(
      await screen.findByRole("button", { name: "Confirm action" }),
    );
    expect(
      await screen.findByText(/save may already have reached the server/),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Reconcile current state" }),
    ).toBeVisible();
    expect(api.update).toHaveBeenCalledOnce();
  });
  it("reschedules a cancelled date with its server revision", async () => {
    const backend = fakeApi();
    const rows = dates();
    rows[0] = {
      ...rows[1],
      gameDate: rows[0].gameDate,
      state: "cancelled",
      override: {
        ...rows[1].override!,
        gameDate: rows[0].gameDate,
        status: "cancelled",
        revision: 8,
      },
    };
    backend.setRows(rows);
    render(
      <App
        auth={fakeAuth().auth}
        api={backend.api}
        backend={fakeBackend()}
        config={config}
      />,
    );
    const user = userEvent.setup();
    await openAdd(user);
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Schedule override" }));
    await user.click(
      await screen.findByRole("button", { name: "Confirm action" }),
    );
    await screen.findByText(/Override scheduled for Sunday/);
    expect(backend.api.create).toHaveBeenCalledWith(
      expect.objectContaining({ expectedRevision: 8 }),
    );
  });
});
it("blocks structurally valid content whose authoritative publication eligibility fails", async () => {
  const { user, api } = setup();
  vi.mocked(api.validate).mockResolvedValue({
    ...valid,
    publicationEligibility: {
      eligible: false,
      errors: ["TRUST_REQUIRED"],
      warnings: [],
    },
  });
  await openAdd(user);
  await fill(user);
  await user.click(screen.getByRole("button", { name: "Schedule override" }));
  await screen.findByText("Publication blocked: factual evidence required");
  expect(api.create).not.toHaveBeenCalled();
  expect(
    screen.getByRole("button", { name: "Schedule override" }),
  ).toBeDisabled();
});
