// Test-only adapters to the pinned private backend candidate; never bundled.
const path = require("node:path"),
  { createRequire } = require("node:module"),
  { randomUUID, createHash } = require("node:crypto");
if (
  process.env.GCLOUD_PROJECT !== "demo-misattribution" ||
  process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:28080" ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST !== "127.0.0.1:29099" ||
  !process.env.EDITORIAL_TEST_BACKEND
)
  throw Error("Isolated demo backend required");
const backend = createRequire(
  path.join(process.env.EDITORIAL_TEST_BACKEND, "functions/package.json"),
);
const { initializeApp } = backend("firebase-admin/app"),
  { getFirestore } = backend("firebase-admin/firestore"),
  { getAuth } = backend("firebase-admin/auth");
const app = initializeApp(
    { projectId: "demo-misattribution" },
    "website-acceptance",
  ),
  db = getFirestore(app),
  auth = getAuth(app);
const { readDataEpoch, communityEpochCollection } = backend("./lib/dataEpoch");
const { seedTrusted } = backend("./tests/content-trust-fixture.cjs");
const { getGameDate, addGameDays } = backend("./lib/gameDate");
const { hashTuple } = backend("./lib/alternateUniverse/identity");
const identities = new Map();
async function identity(name) {
  if (identities.has(name)) return identities.get(name);
  const response = await fetch(
    "http://127.0.0.1:29099/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo-key",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody: new URLSearchParams({
          providerId: "google.com",
          id_token: JSON.stringify({
            sub: "step-c-" + name,
            email: "website-" + name + "@example.test",
            email_verified: true,
            name: "Test " + name,
          }),
        }).toString(),
        requestUri: "http://localhost",
        returnSecureToken: true,
      }),
    },
  );
  const body = await response.json();
  if (!response.ok)
    throw Error(
      "Demo sign in failed: " + response.status + " " + body.error?.message,
    );
  identities.set(name, body);
  return body;
}
async function reset() {
  for (const name of [
    "authors",
    "quotes",
    "quoteRevisions",
    "quoteRevisionStates",
    "quoteRevisionUses",
    "puzzles",
    "editorialOverrides",
    "editorialAuditEvents",
    "editorialMutationReceipts",
    "editorialCursors",
    "editorialSubjects",
    "communityViolationEvents",
    "communityAccountControls",
    "editorialUsers",
    "editorialAccessAudit",
  ])
    await db.recursiveDelete(db.collection(name));
  const epoch = await db.runTransaction((tx) =>
    readDataEpoch(db, tx, undefined, false),
  );
  for (const name of [
    "communityModerationJobs",
    "communityReports",
    "communityAppeals",
    "communityProfiles",
    "communityAuthors",
    "communitySubmissions",
    "alternateUniverseEntries",
    "communityRestrictions",
    "communityModerationAudit",
    "communityMutationReceipts",
  ])
    await db.recursiveDelete(communityEpochCollection(db, name, epoch));
  await seedTrusted(db);
  for (const [name, role, moderator] of [
    ["admin", "editorialAdmin", true],
    ["peer", "editorialAdmin", true],
    ["editor", "editorialEditor", false],
    ["moderator", "moderator", true],
    ["outsider", null, false],
  ]) {
    const user = await identity(name);
    await auth.updateUser(user.localId, { disabled: false });
    if (role)
      await db
        .doc("editorialUsers/" + user.localId)
        .set({
          active: true,
          role,
          permissions: { communityModerator: moderator },
        });
  }
  return epoch;
}
async function login(page, name = "admin", area = "overview") {
  const body = await identity(name);
  const value = {
    uid: body.localId,
    email: body.email,
    emailVerified: true,
    displayName: "Test " + name,
    isAnonymous: false,
    providerData: [
      {
        providerId: "google.com",
        uid: "step-c-" + name,
        email: body.email,
        displayName: "Test " + name,
        photoURL: null,
      },
    ],
    stsTokenManager: {
      refreshToken: body.refreshToken,
      accessToken: body.idToken,
      expirationTime: Date.now() + 3600000,
    },
    createdAt: String(Date.now()),
    lastLoginAt: String(Date.now()),
    apiKey: "demo-key",
    appName: "misattribution-editorial-local",
  };
  await page.goto("/misattribution/editorial/");
  await page
    .getByRole("button", { name: /^(Sign in with Google|Sign out)$/ })
    .first()
    .waitFor();
  if (
    await page
      .getByRole("button", { name: "Sign out", exact: true })
      .isVisible()
  ) {
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByRole("button", { name: "Sign in with Google" }).waitFor();
  }
  await page.evaluate((value) => {
    sessionStorage.setItem(
      "firebase:authUser:demo-key:misattribution-editorial-local",
      JSON.stringify(value),
    );
  }, value);
  await page.goto("/misattribution/editorial/#" + area);
  await page.reload();
  return body;
}
async function seedReport(suffix = "one", options = {}) {
  const epoch = await db.runTransaction((tx) =>
      readDataEpoch(db, tx, undefined, false),
    ),
    uid = "step-c-author-" + suffix,
    id = (label) =>
      createHash("sha256")
        .update(suffix + label)
        .digest("hex"),
    sid = id("submission"),
    entryId = id("entry"),
    reportId = id("report"),
    now = Date.now(),
    text = options.text ?? "A fictional teapot conducts the moon choir.";
  try {
    await auth.createUser({ uid });
  } catch (e) {
    if (e.code !== "auth/uid-already-exists") throw e;
  }
  await db.doc("users/" + uid).set({ uid });
  await communityEpochCollection(db, "communityProfiles", epoch)
    .doc(uid)
    .set({
      uid,
      publicAuthorId: id("author"),
      approvedName: "Moon Otter",
      nameMode: "pen",
      profileVersion: 1,
      hidden: false,
    });
  await communityEpochCollection(db, "communitySubmissions", epoch)
    .doc(sid)
    .set({
      uid,
      lifecycle: "open",
      status: "published",
      stateVersion: 1,
      currentRevision: options.revision ?? 1,
      activeEntryId: entryId,
      text,
      textHash: hashTuple([text]),
      currentVersionVoteCountAllTime: 0,
    });
  await communityEpochCollection(db, "communitySubmissions", epoch)
    .doc(sid + "/revisions/1")
    .set({ revision: 1, text, textHash: hashTuple([text]), entryId });
  await communityEpochCollection(db, "alternateUniverseEntries", epoch)
    .doc(entryId)
    .set({
      kind: "community",
      uid,
      submissionId: sid,
      revision: 1,
      status: "active",
      vignette: text,
    });
  await communityEpochCollection(db, "communityReports", epoch)
    .doc(reportId)
    .set({
      uid: "step-c-reporter",
      authorUid: uid,
      kind: "text",
      targetId: sid,
      submissionId: sid,
      entryId,
      revision: 1,
      status: "open",
      priority: 1,
      stateVersion: 1,
      createdAt: now,
      purgeAt: options.expired ? now - 1 : now + 120 * 86400000,
      evidence: { vignette: text, quoteText: "Trusted source context" },
      category: "personal-information",
    });
  return { uid, sid, entryId, reportId, epoch, text };
}
async function seedReview() {
  const epoch = await db.runTransaction((tx) =>
      readDataEpoch(db, tx, undefined, false),
    ),
    uid = "step-c-writer-" + randomUUID(),
    config = {
      haha: backend("./lib/generated/communityConfiguration")
        .communityEnvironments.local,
      writing: backend("./lib/generated/communityWritingConfiguration")
        .writingEnvironments.local,
    };
  const name = "Browser Otter";
  await db.doc("users/" + uid).set({ uid, provider: "apple" });
  await communityEpochCollection(db, "communityProfiles", epoch)
    .doc(uid)
    .set({
      uid,
      approvedName: name,
      nameMode: "pen",
      publicNameConfirmation: {
        textHash: hashTuple([name, "pen"]),
        mode: "pen",
        confirmedAt: Date.now(),
        requestId: randomUUID(),
      },
      publicAuthorId: "f".repeat(64),
      profileVersion: 1,
      hidden: false,
    });
  await communityEpochCollection(db, "communityAuthors", epoch)
    .doc("f".repeat(64))
    .set({
      uid,
      publicAuthorId: "f".repeat(64),
      displayName: name,
      profileVersion: 1,
      hidden: false,
    });
  const round = await backend("./tests/gameplay-fixture.cjs").acceptReference(
    db,
    uid,
    {
      kind: "fixture",
      fixtureVersion: "bundled-v1",
      quoteId: "q1",
      speakerId: "a2",
    },
    config.haha,
  );
  const receipt = await backend(
    "./lib/communityReality/submissions",
  ).submitReality(
    db,
    uid,
    {
      ...round,
      requestId: randomUUID(),
      expectedDataEpochId: epoch.dataEpochId,
      text: "A browser otter hired the moon to deliver tiny teacups.",
      acceptedTermsVersion: config.writing.termsVersion,
      acceptedTermsDigest: backend("./lib/generated/contributionTerms")
        .CONTRIBUTION_TERMS_DIGEST,
      acceptContributionTerms: true,
    },
    config,
    () => Date.now() + 365 * 86400000,
  );
  return { receipt, epoch, uid };
}
async function invoke(name, input, staff = "admin") {
  const user = await identity(staff);
  const response = await fetch(
    "http://127.0.0.1:25001/demo-misattribution/us-central1/" + name,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + user.idToken,
      },
      body: JSON.stringify({ data: input }),
    },
  );
  return { status: response.status, body: await response.json() };
}
module.exports = {
  db,
  auth,
  backend,
  reset,
  login,
  identity,
  seedReport,
  seedReview,
  invoke,
  communityEpochCollection,
  tomorrow: () => addGameDays(getGameDate(), 1),
};
