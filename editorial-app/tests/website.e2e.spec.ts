import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { createRequire } from "node:module";
const fixtures = createRequire(import.meta.url)("./browser-fixtures.cjs");
const {
  db,
  auth,
  reset,
  login,
  identity,
  seedReport,
  seedReview,
  invoke,
  communityEpochCollection,
  tomorrow,
} = fixtures;
const entry = "/misattribution/editorial/";
async function confirm(page: Page) {
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirm action" })
    .click();
}
async function openReport(page: Page) {
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await page
    .getByRole("button", { name: "Review case", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Case detail" }),
  ).toBeVisible();
}
async function createOverride(page: Page) {
  const date = tomorrow();
  await page
    .locator("article")
    .filter({ has: page.locator(`time[datetime="${date}"]`) })
    .getByRole("button", { name: /Add override/ })
    .click();
  await page
    .getByRole("button", { name: "Use quotation by Ada Lovelace", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Schedule override", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Save with warnings" })
    .or(page.getByRole("dialog"))
    .first()
    .waitFor();
  if (
    await page.getByRole("button", { name: "Save with warnings" }).isVisible()
  )
    await page.getByRole("button", { name: "Save with warnings" }).click();
  await confirm(page);
  await expect(page.getByText(/Override scheduled for/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "↻ Refresh", exact: true }),
  ).toBeEnabled();
}
async function axe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}
test.beforeEach(async ({ context }) => {
  await reset();
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.protocol === "http:" && url.hostname === "127.0.0.1")
      return route.continue();
    return route.abort("blockedbyclient");
  });
});
test.afterAll(async () => {
  await db.terminate();
});
test("complete built public site, direct directory URL, assets, refresh, noindex and hidden route", async ({
  page,
  request,
}) => {
  for (const path of [
    "/",
    "/misattribution/",
    "/about/",
    "/contact/",
    "/privacy/",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    expect(await page.locator(`a[href*="/editorial"]`).count()).toBe(0);
  }
  const noSlash = await request.get("/misattribution/editorial", {
    maxRedirects: 0,
  });
  expect(noSlash.status()).toBe(301);
  expect(noSlash.headers().location).toBe(entry);
  const scripts: string[] = [];
  page.on("response", (r) => {
    if (r.url().includes("/assets/") && r.status() !== 200)
      scripts.push(r.url());
  });
  await page.goto(entry + "#audit");
  await expect(
    page.getByRole("button", { name: "Sign in with Google" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Sign in with Google" }),
  ).toBeVisible();
  expect(scripts).toEqual([]);
  expect(
    await page.locator('meta[name="robots"]').getAttribute("content"),
  ).toContain("noindex");
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    "/editorial",
  );
  expect(
    (await request.get("/misattribution/editorial/not-a-route")).status(),
  ).toBe(404);
  await axe(page);
  await page.screenshot({ path: "test-results/sign-in.png", fullPage: true });
});
test("real emulator Google restoration, capabilities, forbidden roles, sign-out and account switch", async ({
  page,
}) => {
  await login(page, "outsider");
  await expect(page.getByText(/does not have editorial access/)).toBeVisible();
  await page.evaluate(() =>
    localStorage.setItem("editorialRole", "editorialAdmin"),
  );
  await page.getByRole("button", { name: "Check access again" }).click();
  await expect(page.getByText(/does not have editorial access/)).toBeVisible();
  await login(page, "editor", "puzzles");
  await expect(
    page.getByRole("list", { name: "Upcoming puzzle dates" }),
  ).toBeVisible();
  expect(
    await page
      .getByRole("button", { name: "Community moderation", exact: true })
      .count(),
  ).toBe(0);
  await page.goto(entry + "#community");
  await expect(
    page.getByRole("heading", { name: "Permission required" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sign in with Google" }),
  ).toBeVisible();
  expect(await page.getByRole("article").count()).toBe(0);
  await login(page, "moderator", "community");
  await expect(
    page.getByRole("heading", { name: "Community review" }),
  ).toBeVisible();
  expect(
    await page.getByRole("button", { name: "Puzzles", exact: true }).count(),
  ).toBe(0);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Community review" }),
  ).toBeVisible();
});
test("trusted override lifecycle, provenance, edits, cancellation, v2 receipts, publication and immutable locks", async ({
  page,
}) => {
  const calls: Record<string, unknown>[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("createEditorialOverride"))
      calls.push(r.postDataJSON().data);
  });
  await login(page, "admin", "puzzles");
  await createOverride(page);
  await page.screenshot({ path: "test-results/puzzles.png", fullPage: true });
  await axe(page);
  expect(calls).toHaveLength(1);
  expect(calls[0]).toMatchObject({
    existingPairId: "trusted-0",
    expectedProjectId: "demo-misattribution",
    reasonCode: "editorial-selection",
  });
  expect(calls[0].requestId).toBeTruthy();
  const card = () =>
    page
      .locator("article")
      .filter({ has: page.locator(`time[datetime="${tomorrow()}"]`) });
  await card()
    .getByRole("button", { name: /Edit override/ })
    .click();
  await page
    .getByLabel("Editorial note", { exact: false })
    .fill("Synthetic editorial annotation");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await page
    .getByRole("button", { name: "Save with warnings" })
    .or(page.getByRole("dialog"))
    .first()
    .waitFor();
  if (
    await page.getByRole("button", { name: "Save with warnings" }).isVisible()
  )
    await page.getByRole("button", { name: "Save with warnings" }).click();
  await confirm(page);
  await expect(card().getByText(/Revision 2/)).toBeVisible();
  await card()
    .getByRole("button", { name: /Remove override/ })
    .click();
  await confirm(page);
  await expect(page.getByText(/Override removed for/)).toBeVisible();
  await createOverride(page);
  await card()
    .getByRole("button", { name: "Preview " + tomorrow() })
    .click();
  await expect(
    page.getByRole("heading", { name: "Authoritative board" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /reuters/ }).first(),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await page.screenshot({ path: "test-results/preview.png", fullPage: true });
  await axe(page);
  await page
    .getByRole("button", { name: "Publish puzzle", exact: true })
    .click();
  await confirm(page);
  await expect(
    page.getByText(/Published · immutable. This snapshot/),
  ).toBeVisible();
  expect(
    await page
      .getByRole("button", { name: "Publish puzzle", exact: true })
      .count(),
  ).toBe(0);
  await page
    .getByRole("button", { name: "← Upcoming puzzles", exact: true })
    .click();
  await expect(card().getByText("Generated · Locked")).toBeVisible();
  expect(
    await card()
      .getByRole("button", { name: /Edit override|Remove override/ })
      .count(),
  ).toBe(0);
});
test("two editors preserve stale drafts and reject concurrent puzzle writes", async ({
  page,
  browser,
}) => {
  await login(page, "admin", "puzzles");
  await createOverride(page);
  const peerContext = await browser.newContext();
  const peer = await peerContext.newPage();
  try {
    await login(peer, "peer", "puzzles");
    for (const p of [page, peer])
      await p.getByRole("button", { name: /Edit override for/ }).click();
    await peer.getByLabel(/Editorial note/).fill("Peer accepted note");
    await peer
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await peer
      .getByRole("button", { name: "Save with warnings" })
      .or(peer.getByRole("dialog"))
      .first()
      .waitFor();
    if (
      await peer.getByRole("button", { name: "Save with warnings" }).isVisible()
    )
      await peer.getByRole("button", { name: "Save with warnings" }).click();
    await confirm(peer);
    await expect(peer.getByText(/Override updated/)).toBeVisible();
    await page.getByLabel(/Editorial note/).fill("Preserved stale draft");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      page.getByText(/changed by another editor/).first(),
    ).toBeVisible();
    await expect(page.getByLabel(/Editorial note/)).toHaveValue(
      "Preserved stale draft",
    );
    await page.getByRole("button", { name: /Reload latest version/ }).click();
    await expect(page.getByLabel(/Editorial note/)).toHaveValue(
      "Peer accepted note",
    );
  } finally {
    await peerContext.close();
  }
});
test("human approval and rejection use real candidate consent and authoritative review state", async ({
  page,
}) => {
  const { receipt, epoch } = await seedReview();
  await login(page, "moderator", "community");
  await page.getByRole("button", { name: "Review case" }).first().click();
  await page.getByLabel("Decision reason").selectOption("safe");
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await confirm(page);
  await expect(page.getByText(/Action accepted/)).toBeVisible();
  expect(
    (
      await communityEpochCollection(db, "communitySubmissions", epoch)
        .doc(receipt.submissionId)
        .get()
    ).data().status,
  ).toBe("published");
  await page.getByRole("button", { name: "← Back to queue" }).click();
  const second = await seedReview();
  await page.getByRole("button", { name: "Refresh queue" }).click();
  await page.getByRole("button", { name: "Review case" }).first().click();
  await page.getByLabel("Decision reason").selectOption("spam-impersonation");
  await page.getByRole("button", { name: "Reject", exact: true }).click();
  await confirm(page);
  await expect(page.getByText(/Action accepted/)).toBeVisible();
  expect(
    (
      await communityEpochCollection(db, "communitySubmissions", second.epoch)
        .doc(second.receipt.submissionId)
        .get()
    ).data().status,
  ).toBe("rejected");
});
test("reports, human removal, confirmed violation, restriction, correction and global recovery", async ({
  page,
}) => {
  const seeded = await seedReport();
  await login(page, "admin", "community");
  await openReport(page);
  await expect(page.getByText("Reported revision: 1")).toBeVisible();
  await page.getByLabel("Decision reason").selectOption("personal-information");
  await page.getByRole("button", { name: "Remove reported content" }).click();
  await confirm(page);
  await expect(page.getByText(/Action accepted/)).toBeVisible();
  await page
    .getByRole("button", { name: "Subject history", exact: true })
    .click();
  await expect(
    page.getByText("0 confirmed violations · 0 corrected"),
  ).toBeVisible();
  await page.getByLabel("Supporting human decision").selectOption({ index: 1 });
  await page.getByLabel("Reason code").selectOption("personal-information");
  await page
    .getByRole("button", { name: "Record violation", exact: true })
    .click();
  await confirm(page);
  await expect(
    page.getByText("1 confirmed violations · 0 corrected"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Restrict Community", exact: true })
    .click();
  await confirm(page);
  await expect(page.getByText("contribute: Restricted")).toBeVisible();
  await page.screenshot({ path: "test-results/history.png", fullPage: true });
  await axe(page);
  await page.getByRole("button", { name: /Correct violation / }).click();
  await confirm(page);
  await expect(
    page.getByText("0 confirmed violations · 1 corrected"),
  ).toBeVisible();
  await expect(page.getByText("contribute: Restricted")).toBeVisible();
  await page
    .getByRole("button", { name: "← Back to source or restricted accounts" })
    .click();
  await page
    .getByRole("button", { name: "Abuse and restrictions", exact: true })
    .click();
  await page.getByRole("button", { name: "Review case" }).click();
  await page
    .getByRole("button", { name: "Remove restrictions", exact: true })
    .click();
  await confirm(page);
  await expect(page.getByText(/Action accepted/)).toBeVisible();
  expect(
    (await db.doc("communityAccountControls/" + seeded.uid).get()).data()
      .restrictions.contribute,
  ).toBe(false);
});
test("unknown mutation outcome retrieves original receipt, concurrent review becomes stale, expired evidence stays private", async ({
  page,
  browser,
}) => {
  await seedReport();
  await login(page, "admin", "community");
  await openReport(page);
  const peerContext = await browser.newContext(),
    peer = await peerContext.newPage();
  try {
    await login(peer, "peer", "community");
    await openReport(peer);
    let original: unknown;
    await page.route("**/decideCommunityReview", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      original = route.request().postDataJSON().data;
      await route.fetch();
      await route.abort("failed");
      await page.unroute("**/decideCommunityReview");
    });
    await page.getByRole("button", { name: "Close case", exact: true }).click();
    await confirm(page);
    await expect(page.getByText(/outcome is unknown/)).toBeVisible();
    await page.getByRole("button", { name: "Reconcile current state" }).click();
    const receipt = page.waitForRequest(
      (r) =>
        r.url().endsWith("/decideCommunityReview") && r.method() === "POST",
    );
    await page
      .getByRole("button", { name: "Retrieve original receipt" })
      .click();
    expect((await receipt).postDataJSON().data).toEqual(original);
    await expect(page.getByText(/Action accepted/)).toBeVisible();
    await peer.getByRole("button", { name: "Close case", exact: true }).click();
    await confirm(peer);
    await expect(peer.getByText(/changed by another editor/)).toBeVisible();
  } finally {
    await peerContext.close();
  }
  await seedReport("expired", {
    expired: true,
    text: "Expired private evidence",
  });
  await page.getByRole("button", { name: "← Back to queue" }).click();
  await page.getByRole("button", { name: "Refresh queue" }).click();
  await page.getByRole("button", { name: "Review case" }).click();
  await expect(page.getByText(/Evidence expired, deleted/)).toBeVisible();
  expect(await page.getByText("Expired private evidence").count()).toBe(0);
  expect(
    await page.getByRole("button", { name: "Remove reported content" }).count(),
  ).toBe(0);
});
test("audit streams, resource filters and bounded pagination redact private content", async ({
  page,
}) => {
  for (let n = 0; n < 24; n++)
    await db.doc("editorialAuditEvents/browser-" + n).set({
      action: "update",
      gameDate: "2026-10-11",
      revision: n + 1,
      actor: { uid: "synthetic-editor" },
      timestamp: n + 1,
      privateText: "PRIVATE AUDIT TEXT",
      previousRevision: n,
      resultingRevision: n + 1,
    });
  await login(page, "admin", "audit");
  await expect(page.locator(".audit-list li")).toHaveCount(20);
  await page.screenshot({ path: "test-results/audit.png", fullPage: true });
  await axe(page);
  expect(await page.getByText("PRIVATE AUDIT TEXT").count()).toBe(0);
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await expect(page.locator(".audit-list li")).toHaveCount(4);
  await page.getByLabel("Resource reference").fill("2026-10-12");
  await page.getByRole("button", { name: "Apply filter" }).click();
  await expect(
    page.getByText("No activity matches this filter."),
  ).toBeVisible();
  await page.getByLabel("Audit stream").selectOption("access");
  await expect(
    page.getByText("No activity matches this filter."),
  ).toBeVisible();
});
test("revoked and disabled sessions clear private state and forged roles do not grant authority", async ({
  page,
}) => {
  const user = await login(page, "admin", "puzzles");
  await createOverride(page);
  await db.doc("editorialUsers/" + user.localId).update({ active: false });
  await page.getByRole("button", { name: "↻ Refresh", exact: true }).click();
  await expect(page.getByText(/does not have editorial access/)).toBeVisible();
  expect(
    await page
      .getByText("This is synthetic evidence statement 0.", { exact: true })
      .count(),
  ).toBe(0);
  await db.doc("editorialUsers/" + user.localId).update({ active: true });
  await page.getByRole("button", { name: "Check access again" }).click();
  await expect(
    page.getByRole("list", { name: "Upcoming puzzle dates" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "↻ Refresh", exact: true }),
  ).toBeEnabled();
  await auth.updateUser(user.localId, { disabled: true });
  await page.getByRole("button", { name: "↻ Refresh", exact: true }).click();
  await expect(page.getByText(/session has expired/)).toBeVisible();
  expect(await page.getByRole("article").count()).toBe(0);
  await auth.updateUser(user.localId, { disabled: false });
});
test("responsive and keyboard accessibility, long hostile evidence and text scaling on actual artifact", async ({
  page,
}) => {
  await seedReport("long", {
    text:
      "<img src=x onerror=alert(1)> " +
      "A fictional lunar teapot tells a long story. ".repeat(70),
  });
  await login(page, "admin", "community");
  await openReport(page);
  expect(await page.locator(".evidence img").count()).toBe(0);
  for (const width of [390, 768, 1280]) {
    await page.setViewportSize({ width, height: 960 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await axe(page);
    await page.screenshot({
      path: `test-results/community-${width}.png`,
      fullPage: true,
    });
  }
  await page.evaluate(() =>
    document.documentElement.style.setProperty(
      "font-size",
      "32px",
      "important",
    ),
  );
  await page.setViewportSize({ width: 390, height: 960 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Close case", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Keep editing" }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(
    page.getByRole("button", { name: "Confirm action" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Close case", exact: true }),
  ).toBeFocused();
});
test("backend denies wrong project, stale epoch, unsupported roles and direct privileged Firestore access", async () => {
  const c = (await invoke("getEditorialContext", {})).body.result;
  expect(
    (
      await invoke("getEditorialUserHistory", {
        subjectRef: "fake",
        expectedDataEpochId: "old-epoch",
      })
    ).status,
  ).not.toBe(200);
  expect(
    (
      await invoke(
        "listCommunityReviews",
        { queue: "reports", expectedDataEpochId: c.dataEpochId },
        "editor",
      )
    ).status,
  ).not.toBe(200);
  expect(
    (
      await invoke("publishEditorialPuzzle", {
        requestId: crypto.randomUUID(),
        expectedProjectId: "misattribution-aa1e2",
        reasonCode: "manual-publication",
        gameDate: tomorrow(),
        previewFingerprint: "bad",
        expectedOverrideRevision: null,
      })
    ).status,
  ).not.toBe(200);
  const u = await identity("admin");
  const response = await fetch(
    "http://127.0.0.1:28080/v1/projects/demo-misattribution/databases/(default)/documents/editorialUsers/forged",
    {
      method: "PATCH",
      headers: {
        Authorization: "Bearer " + u.idToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: { role: { stringValue: "editorialAdmin" } },
      }),
    },
  );
  expect(response.status).toBe(403);
});

test("appeal reinstates an unchanged removed version and revised reports retain exact historical evidence", async ({
  page,
}) => {
  const seeded = await seedReport("appeal");
  await login(page, "admin", "community");
  await openReport(page);
  await page.getByLabel("Decision reason").selectOption("personal-information");
  await page.getByRole("button", { name: "Remove reported content" }).click();
  await confirm(page);
  await expect(page.getByText(/Action accepted/)).toBeVisible();
  const audit = await communityEpochCollection(
    db,
    "communityModerationAudit",
    seeded.epoch,
  )
    .where("targetId", "==", seeded.sid)
    .get();
  expect(audit.size).toBe(1);
  await communityEpochCollection(db, "communityAppeals", seeded.epoch)
    .doc("b".repeat(64))
    .set({
      uid: seeded.uid,
      decisionId: audit.docs[0].id,
      targetId: seeded.sid,
      kind: "text",
      revision: 1,
      explanation: "Synthetic appeal for unchanged version",
      status: "open",
      priority: 1,
      purgeAt: Date.now() + 86400000,
      evidenceExpiresAt: Date.now() + 86400000,
      createdAt: Date.now(),
      stateVersion: 1,
    });
  await page.getByRole("button", { name: "Appeals", exact: true }).click();
  await page.getByRole("button", { name: "Review case" }).click();
  await expect(
    page.getByText(/Synthetic appeal for unchanged version/),
  ).toBeVisible();
  await page.getByLabel("Decision reason").selectOption("safe");
  await page
    .getByRole("button", { name: "Reinstate unchanged version" })
    .click();
  await confirm(page);
  await expect(page.getByText(/Action accepted/)).toBeVisible();
  expect(
    (
      await communityEpochCollection(db, "communitySubmissions", seeded.epoch)
        .doc(seeded.sid)
        .get()
    ).data().status,
  ).toBe("published");
  const revised = await seedReport("revised", { revision: 2 });
  await page.getByRole("button", { name: "Reports", exact: true }).click();
  await page.getByRole("button", { name: "Review case" }).click();
  await expect(page.getByText("Reported revision: 1")).toBeVisible();
  await expect(page.getByText(/Current revision: 2/)).toBeVisible();
  await page.getByLabel("Decision reason").selectOption("personal-information");
  await page.getByRole("button", { name: "Remove reported content" }).click();
  await confirm(page);
  await expect(page.getByText(/Action accepted/)).toBeVisible();
  expect(
    (
      await communityEpochCollection(db, "communitySubmissions", revised.epoch)
        .doc(revised.sid)
        .get()
    ).data().status,
  ).toBe("published");
  expect(
    (
      await communityEpochCollection(
        db,
        "alternateUniverseEntries",
        revised.epoch,
      )
        .doc(revised.entryId)
        .get()
    ).data().status,
  ).toBe("hidden");
});

test("overview links to the selected action queue and access tools disclose server policy", async ({
  page,
}) => {
  await seedReport("overview");
  await login(page, "admin", "overview");
  await expect(
    page.getByRole("heading", { name: "Action queue" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Review reports", exact: true }),
  ).toBeVisible();
  await axe(page);
  await page.screenshot({ path: "test-results/overview.png", fullPage: true });
  await page
    .getByRole("button", { name: "Review reports", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Reports", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Review case" })).toHaveCount(
    1,
  );
  await page
    .getByRole("button", { name: "Access and policy", exact: true })
    .click();
  await expect(
    page.getByText(/This browser cannot grant permissions/),
  ).toBeVisible();
  await axe(page);
  await page.screenshot({ path: "test-results/operator.png", fullPage: true });
});
