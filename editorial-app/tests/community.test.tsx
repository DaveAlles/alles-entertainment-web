import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { CommunityReview } from "../src/CommunityReview";
import { context, fakeBackend, reviewItem } from "./backend-fixtures";
import { PortalError } from "../src/errors";
async function setup(item = reviewItem) {
  const backend = fakeBackend({
    review: vi.fn(async () => ({ ...context, dataEpochId: "epoch", item })),
  });
  render(
    <CommunityReview
      backend={backend}
      context={context}
      onSubject={vi.fn()}
      onAudit={vi.fn()}
    />,
  );
  const user = userEvent.setup();
  await user.click(await screen.findByRole("button", { name: "Review case" }));
  await screen.findByRole("heading", { name: "Case detail" });
  return { backend, user };
}
it("approval sends exact displayed state, finite reason and original request identity after confirmation", async () => {
  const { backend, user } = await setup();
  await user.selectOptions(screen.getByLabelText("Decision reason"), "safe");
  await user.click(screen.getByRole("button", { name: "Approve" }));
  expect(backend.decideReview).not.toHaveBeenCalled();
  await user.click(
    within(screen.getByRole("dialog")).getByRole("button", {
      name: "Confirm action",
    }),
  );
  await waitFor(() =>
    expect(backend.decideReview).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedDataEpochId: "epoch",
        expectedRevision: 2,
        expectedStateVersion: 8,
        expectedItemVersion: 3,
        action: "approve",
        reason: "safe",
        expectedProjectId: context.projectId,
      }),
    ),
  );
});
it("stale decisions fail safely and refresh clears unavailable protected content", async () => {
  const { backend, user } = await setup();
  vi.mocked(backend.decideReview).mockRejectedValue(
    new PortalError("conflict"),
  );
  await user.click(screen.getByRole("button", { name: "Approve" }));
  await user.click(screen.getByRole("button", { name: "Confirm action" }));
  await screen.findByText(/changed by another editor/);
  expect(backend.decideReview).toHaveBeenCalledTimes(1);
  vi.mocked(backend.review).mockRejectedValue(new PortalError("denied"));
  await user.click(screen.getByRole("button", { name: "Refresh case" }));
  await waitFor(() =>
    expect(screen.queryByText("The moon hired a teapot.")).toBeNull(),
  );
});
it("rejected appeal exposes the server permitted approve action and no impossible reinstatement", async () => {
  await setup({
    ...reviewItem,
    expectedStatus: "rejected",
    availableActions: ["approve", "close"],
  });
  expect(screen.getByRole("button", { name: "Approve" })).toBeVisible();
  expect(
    screen.queryByRole("button", { name: "Reinstate unchanged version" }),
  ).toBeNull();
});
it("reports keep immutable evidence revision distinct from current version and confirm that distinction", async () => {
  const { backend, user } = await setup({
    ...reviewItem,
    availableActions: ["remove"],
    text: "The reported first version.",
    evidenceRevision: 1,
    revision: 2,
  });
  expect(screen.getByText("Reported revision: 1")).toBeVisible();
  expect(screen.getByText(/Current revision: 2/)).toBeVisible();
  await user.click(
    screen.getByRole("button", { name: "Remove reported content" }),
  );
  expect(screen.getByRole("dialog")).toHaveTextContent(
    "Evidence revision 1; current revision 2",
  );
  await user.click(screen.getByRole("button", { name: "Confirm action" }));
  await waitFor(() =>
    expect(backend.decideReview).toHaveBeenCalledWith(
      expect.objectContaining({
        expectedRevision: 2,
        expectedItemVersion: 3,
        action: "remove",
      }),
    ),
  );
});
it.each([null])(
  "missing evidence revision never inherits current revision (%s)",
  async (evidenceRevision) => {
    await setup({
      ...reviewItem,
      evidenceRevision,
      evidenceAvailable: false,
      text: null,
      availableActions: ["close"],
    });
    expect(screen.getByText("Reported revision: unavailable")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Approve" })).toBeNull();
    expect(screen.getByText(/Evidence expired/)).toBeVisible();
  },
);
it("unknown decision reconciles and retrieves same receipt without a new mutation identity", async () => {
  const { backend, user } = await setup();
  vi.mocked(backend.decideReview).mockRejectedValueOnce(
    new PortalError("network"),
  );
  await user.click(screen.getByRole("button", { name: "Approve" }));
  await user.click(screen.getByRole("button", { name: "Confirm action" }));
  await screen.findByText(/outcome is unknown/);
  const first = vi.mocked(backend.decideReview).mock.calls[0][0];
  expect(
    screen.getByRole("button", { name: "Retrieve original receipt" }),
  ).toBeDisabled();
  await user.click(
    screen.getByRole("button", { name: "Reconcile current state" }),
  );
  await user.click(
    screen.getByRole("button", { name: "Retrieve original receipt" }),
  );
  await waitFor(() => expect(backend.decideReview).toHaveBeenCalledTimes(2));
  expect(vi.mocked(backend.decideReview).mock.calls[1][0]).toEqual(first);
});
