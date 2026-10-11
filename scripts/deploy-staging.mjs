import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { root, sha } from "./site.mjs";
import { backend, localPreflight, livePreflight, hostingConfig, verifyServed, hostingRelease, projectId, siteId } from "./staging-hosting.mjs";

const [planPath, mode = "--dry-run", ...extra] = process.argv.slice(2);
if (!planPath || extra.length || !["--dry-run", "--apply"].includes(mode))
  throw Error("Use deploy-staging.mjs PLAN.json [--dry-run|--apply]; Production is unsupported");
const absolutePlan = path.resolve(planPath);
const planBytes = fs.readFileSync(absolutePlan);
const plan = JSON.parse(planBytes);
const state = localPreflight(plan);
const live = await livePreflight(plan);
if (mode === "--dry-run") {
  console.log(JSON.stringify({ status: "preflight-passed", projectId, siteId, writesPerformed: 0, ...live }));
} else {
  // The owner approves this exact plan outside this script. A flag is not consent.
  const directory = path.join(root, ".operations/step-d/staging-release");
  fs.mkdirSync(directory, { recursive: true });
  const configPath = path.join(root, ".firebase-editorial-staging.generated.json");
  if (fs.existsSync(configPath)) throw Error("Generated Hosting config already exists; inspect before continuing");
  try {
    fs.writeFileSync(configPath, JSON.stringify(hostingConfig(), null, 2) + "\n", { flag: "wx" });
    execFileSync(process.execPath, [path.join(backend, "node_modules/firebase-tools/lib/bin/firebase.js"), "deploy", "--project", projectId, "--config", configPath, "--only", `hosting:${siteId}`, "--non-interactive"], {
      cwd: root, stdio: "inherit", env: { ...process.env, EDITORIAL_STAGING_PLAN: absolutePlan, EDITORIAL_STAGING_PLAN_SHA256: sha(planBytes) },
    });
    localPreflight(plan);
    await verifyServed(state.manifest);
    fs.writeFileSync(path.join(directory, `${plan.websiteSha}.json`), JSON.stringify({ ...plan, status: "deployed-served-bytes-verified", verifiedAt: new Date().toISOString(), hostingRelease: await hostingRelease(), backend: live, realEditorAcceptance: "NOT RUN" }, null, 2) + "\n");
    console.log("Staging served bytes verified. Real editor acceptance remains required.");
  } finally { if (fs.existsSync(configPath)) fs.unlinkSync(configPath); }
}
