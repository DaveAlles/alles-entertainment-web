import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { root, verify, sha } from "./site.mjs";

export const projectId = "misattribution-staging";
export const siteId = "misattr-editorial-staging";
export const backend = path.resolve(root, "../MisAttribution");
const requireBackend = createRequire(path.join(backend, "package.json"));
export const git = (directory, ...args) => execFileSync("git", args, { cwd: directory, encoding: "utf8" }).trim();

export function assertPlan(plan, state) {
  assert.equal(plan.schemaVersion, 1);
  assert.equal(plan.environment, "staging");
  assert.equal(plan.projectId, projectId);
  assert.equal(plan.siteId, siteId);
  assert.match(plan.backendSha, /^[a-f0-9]{40}$/);
  assert.match(plan.websiteSha, /^[a-f0-9]{40}$/);
  assert.match(plan.bundleDigest, /^[a-f0-9]{64}$/);
  assert.match(plan.hostingConfigDigest, /^[a-f0-9]{64}$/);
  assert.ok(plan.previousHostingRelease === null ||
    (typeof plan.previousHostingRelease === "string" && plan.previousHostingRelease.startsWith(`projects/${projectId}/sites/${siteId}/channels/live/releases/`)), "Explicit previous Hosting release required");
  assert.equal(state.backendDirty, false, "Backend must be clean");
  assert.equal(state.websiteDirty, false, "Website must be clean");
  assert.equal(plan.backendSha, state.backendSha);
  assert.equal(plan.websiteSha, state.websiteSha);
  assert.equal(plan.hostingConfigDigest, state.hostingConfigDigest);
  assert.equal(state.manifest.backendSha, plan.backendSha);
  assert.equal(state.manifest.websiteBaseSha, plan.websiteSha);
  assert.equal(state.manifest.projectId, projectId);
  assert.equal(state.manifest.environment, "staging");
  assert.equal(state.manifest.bundleDigest, plan.bundleDigest);
  assert.equal(state.manifest.contractDigest, plan.contractDigest);
}

export function hostingConfig() {
  return { hosting: {
    site: siteId,
    public: "dist/staging",
    ignore: ["**/node_modules/**"],
    predeploy: ["node scripts/predeploy-staging.mjs"],
    headers: [{ source: "**", headers: [
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      { key: "Cache-Control", value: "no-store" },
    ] }],
  } };
}

export function localPreflight(plan) {
  const manifest = verify("staging");
  const state = {
    backendSha: git(backend, "rev-parse", "HEAD"),
    websiteSha: git(root, "rev-parse", "HEAD"),
    backendDirty: !!git(backend, "status", "--porcelain"),
    websiteDirty: !!git(root, "status", "--porcelain"),
    hostingConfigDigest: sha(JSON.stringify(hostingConfig())), manifest,
  };
  assertPlan(plan, state);
  git(backend, "merge-base", "--is-ancestor", plan.backendSha, "origin/main");
  execFileSync(process.execPath, ["scripts/contract.mjs", "--local"], { cwd: root, stdio: "inherit" });
  return state;
}

export function assertBackendAttestation(plan, record, functions, configHashes) {
  assert.equal(record?.projectId, projectId);
  assert.equal(record?.commit, plan.backendSha);
  assert.equal(record?.dirty, false);
  assert.equal(record?.status, "passed");
  assert.deepEqual([...(record.functions || [])].sort(), [...functions].sort(), "Complete combined deployment attestation required");
  assert.equal(record.firestoreConfiguration, true);
  assert.equal(record.firestore?.indexesSha256, configHashes.indexesSha256);
  assert.equal(record.firestore?.rulesSha256, configHashes.rulesSha256);
}

export async function livePreflight(plan) {
  const { environment, liveEnvironment } = requireBackend("./scripts/lib/environment.cjs");
  const { authenticate, request, readRecord } = requireBackend("./scripts/lib/cloud.cjs");
  const { canonical, inspect, assertReady, assertRules } = requireBackend("./scripts/lib/firestore.cjs");
  const { editorialReleaseFunctions } = requireBackend("./scripts/lib/editorial-release.cjs");
  const { assertEpochContract } = requireBackend("./scripts/lib/epoch-deployment.cjs");
  const { verifyInvokerIam } = requireBackend("./scripts/lib/invoker-iam.cjs");
  const config = environment("staging");
  liveEnvironment("staging");
  await authenticate(projectId);
  const functions = editorialReleaseFunctions(config);
  assertBackendAttestation(plan, await readRecord(config, "deploymentValidations", plan.backendSha), functions, canonical());
  const report = await inspect(config); assertReady(report); assertRules(report);
  const site = await request("firebasehosting", "v1beta1", `/projects/${projectId}/sites/${siteId}`);
  assert.equal(site.name, `projects/${projectId}/sites/${siteId}`);
  const channel = await request("firebasehosting", "v1beta1", `/projects/${projectId}/sites/${siteId}/channels/live`);
  // Compare-and-stop on an intervening publication. A first release uses null.
  assert.equal(channel.release?.name || null, plan.previousHostingRelease, "Hosting occupant changed; review before replacing it");
  const revisions = {};
  for (const name of functions) {
    const def = config.functions[name];
    const fn = await request("cloudfunctions", "v1", `/projects/${projectId}/locations/${def.region}/functions/${name}`);
    assert.equal(fn.status, "ACTIVE");
    assert.equal(fn.environmentVariables?.DEPLOYMENT_GIT_SHA, plan.backendSha);
    assert.equal(fn.environmentVariables?.DEPLOYMENT_DIRTY, "false");
    assert.equal(fn.environmentVariables?.APP_ENV, "staging");
    assert.equal(fn.runtime, config.runtime);
    assert.equal(fn.serviceAccountEmail, config.puzzleServiceAccount);
    assertEpochContract(name, def, fn.environmentVariables || {});
    if (["editorial", "community-staff"].includes(def.kind)) await verifyInvokerIam(config, name, request);
    revisions[name] = fn.versionId;
  }
  return { revisions, ruleset: report.rules.rulesetName, priorHostingRelease: channel.release?.name || null };
}

export async function hostingRelease() {
  const { request } = requireBackend("./scripts/lib/cloud.cjs");
  const channel = await request("firebasehosting", "v1beta1", `/projects/${projectId}/sites/${siteId}/channels/live`);
  assert.ok(channel.release?.name && channel.release?.version?.name, "Missing Hosting release identity");
  return { name: channel.release.name, version: channel.release.version.name };
}

export async function verifyServed(manifest, request = fetch, manifestBytes = fs.readFileSync(path.join(root, "dist/staging/misattribution/editorial/build-manifest.json"))) {
  const origin = `https://${siteId}.web.app`;
  const targets = { ...manifest.files, "misattribution/editorial/build-manifest.json": sha(manifestBytes) };
  for (const [name, digest] of Object.entries(targets)) {
    // Jekyll's dot marker is only a build-system marker, not an application asset.
    if (name === ".nojekyll") continue;
    const pathname = name.endsWith("index.html") ? name.slice(0, -10) : name;
    const response = await request(`${origin}/${pathname}`, { cache: "no-store", signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 200, `Served file missing: ${name}`);
    assert.equal(sha(Buffer.from(await response.arrayBuffer())), digest, `Served file mismatch: ${name}`);
  }
}
