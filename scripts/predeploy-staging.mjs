import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { root, sha } from "./site.mjs";
import { localPreflight, livePreflight, hostingConfig, projectId } from "./staging-hosting.mjs";

assert.ok(process.env.EDITORIAL_STAGING_PLAN, "Use the guarded website Staging deploy script");
assert.equal(process.env.GCLOUD_PROJECT, projectId, "Firebase target mismatch");
const bytes = fs.readFileSync(process.env.EDITORIAL_STAGING_PLAN);
assert.equal(sha(bytes), process.env.EDITORIAL_STAGING_PLAN_SHA256, "Release plan changed");
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, ".firebase-editorial-staging.generated.json"))), hostingConfig());
const plan = JSON.parse(bytes);
localPreflight(plan);
await livePreflight(plan);
