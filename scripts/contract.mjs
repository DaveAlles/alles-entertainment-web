import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
const root = path.resolve(import.meta.dirname, "..");
const target = path.join(root, "editorial-app/src/contract");
const pinFile = path.join(root, "editorial-app/backend-pin.json");
const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const args = process.argv.slice(2);
const backend = path.resolve(
  root,
  args.find((a) => a.startsWith("--backend="))?.slice(10) ??
    "../MisAttribution",
);
const local = args.includes("--local"),
  sync = args.includes("--sync");
if (sync) {
  if (!local)
    throw Error("Explicit --local --sync required for contract updates");
  execFileSync("node", ["scripts/export-editorial-contract.cjs", "--check"], {
    cwd: backend,
    stdio: "inherit",
  });
  const changed = execFileSync(
    "git",
    [
      "status",
      "--porcelain",
      "--",
      "functions",
      "shared",
      "docs/editorial/export",
    ],
    { cwd: backend, encoding: "utf8" },
  );
  if (changed.trim())
    throw Error(
      "Backend contract and implementation must be committed before updating its pin",
    );
  for (const name of [
    "contracts.ts",
    "backendContracts.ts",
    "communityReality.ts",
    "manifest.json",
  ])
    fs.copyFileSync(
      path.join(backend, "docs/editorial/export", name),
      path.join(target, name),
    );
  const manifest = JSON.parse(
    fs.readFileSync(path.join(target, "manifest.json")),
  );
  fs.writeFileSync(
    pinFile,
    JSON.stringify(
      {
        backendSha: execFileSync("git", ["rev-parse", "HEAD"], {
          cwd: backend,
          encoding: "utf8",
        }).trim(),
        contractVersion: manifest.contractVersion,
        contractDigest: manifest.sourceFingerprint,
        manifestDigest: hash(
          fs.readFileSync(path.join(target, "manifest.json")),
        ),
      },
      null,
      2,
    ) + "\n",
  );
}
const manifest = JSON.parse(
    fs.readFileSync(path.join(target, "manifest.json")),
  ),
  pin = JSON.parse(fs.readFileSync(pinFile));
if (
  !/^[a-f0-9]{40}$/.test(pin.backendSha) ||
  pin.contractVersion !== "editorial-v2" ||
  pin.contractDigest !== manifest.sourceFingerprint ||
  pin.manifestDigest !==
    hash(fs.readFileSync(path.join(target, "manifest.json"))) ||
  hash(JSON.stringify(manifest.files)) !== manifest.sourceFingerprint
)
  throw Error("Contract pin/manifest mismatch");
for (const [source, digest] of Object.entries(manifest.files)) {
  const bytes = fs.readFileSync(path.join(target, path.basename(source)));
  if (
    hash(bytes) !== digest ||
    /firebase-admin|process\.env|serviceAccount/.test(bytes)
  )
    throw Error("Unsafe or changed contract: " + source);
  if (
    local &&
    (!bytes.equals(fs.readFileSync(path.join(backend, source))) ||
      !bytes.equals(
        execFileSync("git", ["show", `${pin.backendSha}:${source}`], {
          cwd: backend,
        }),
      ))
  )
    throw Error("Canonical source/pinned revision drift: " + source);
}
if (local) {
  const changes = execFileSync(
    "git",
    ["status", "--porcelain", "--untracked-files=all"],
    { cwd: backend, encoding: "utf8" },
  )
    .trimEnd()
    .split("\n")
    .filter(Boolean);
  if (
    changes.some(
      (line) =>
        !/^(docs\/|README\.md$|PROJECT_STATUS\.md$|AGENTS\.md$)/.test(
          line.slice(3),
        ),
    )
  )
    throw Error(
      "Backend implementation differs from the pinned commit; only documentation changes are allowed",
    );
  execFileSync("node", ["scripts/export-editorial-contract.cjs", "--check"], {
    cwd: backend,
    stdio: "inherit",
  });
  if (
    execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: backend,
      encoding: "utf8",
    }).trim() !== pin.backendSha
  )
    throw Error(
      "Backend HEAD differs from reviewed pin; review and explicitly update",
    );
}
console.log(
  `Contract ${pin.contractVersion} verified (${local ? "canonical source and commit" : "standalone vendored bytes"}): ${pin.contractDigest}`,
);
