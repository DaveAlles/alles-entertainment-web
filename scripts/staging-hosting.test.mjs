import test from "node:test";
import assert from "node:assert/strict";
import { assertPlan, assertBackendAttestation, hostingConfig, verifyServed, projectId, siteId } from "./staging-hosting.mjs";
import {sha} from "./site.mjs";
const plan={schemaVersion:1,environment:"staging",projectId,siteId,previousHostingRelease:null,backendSha:"a".repeat(40),websiteSha:"b".repeat(40),bundleDigest:"c".repeat(64),hostingConfigDigest:"d".repeat(64),contractDigest:"e".repeat(64)};
const state={backendSha:plan.backendSha,websiteSha:plan.websiteSha,backendDirty:false,websiteDirty:false,hostingConfigDigest:plan.hostingConfigDigest,manifest:{...plan,websiteBaseSha:plan.websiteSha}};
test("hosting plan rejects Production, dirty trees, stale backend/website/config/artifact",()=>{
  assert.doesNotThrow(()=>assertPlan(plan,state));
  for(const change of [{environment:"prod"},{projectId:"misattribution-aa1e2"},{siteId:"misattribution-staging"},{backendSha:"x".repeat(40)},{bundleDigest:"f".repeat(64)},{hostingConfigDigest:"f".repeat(64)}])assert.throws(()=>assertPlan({...plan,...change},state));
  for(const change of [{backendDirty:true},{websiteDirty:true},{websiteSha:"f".repeat(40)},{manifest:{...state.manifest,websiteBaseSha:"f".repeat(40)}}])assert.throws(()=>assertPlan(plan,{...state,...change}));
});
test("backend attestation rejects incomplete scopes and mismatched configuration",()=>{
 const hashes={indexesSha256:"i",rulesSha256:"r"};const record={projectId,commit:plan.backendSha,dirty:false,status:"passed",functions:["a","b"],firestoreConfiguration:true,firestore:hashes};
 assert.doesNotThrow(()=>assertBackendAttestation(plan,record,["a","b"],hashes));
 for(const change of [{functions:["a"]},{functions:["a","b","unrelated"]},{dirty:true},{status:"uncommitted-not-promotable"},{firestore:{...hashes,rulesSha256:"other"}},{projectId:"misattribution-aa1e2"}])assert.throws(()=>assertBackendAttestation(plan,{...record,...change},["a","b"],hashes));
});
test("hosting serves full Staging artifact with popup-safe headers, no rewrites and a predeploy guard",()=>{
 const h=hostingConfig().hosting;assert.equal(h.public,"dist/staging");assert.equal(h.site,siteId);assert.equal(h.rewrites,undefined);assert.equal(h.predeploy.length,1);
 assert.ok(h.headers[0].headers.some(v=>v.key==="Cross-Origin-Opener-Policy"&&v.value==="same-origin-allow-popups"));
 assert.ok(h.headers[0].headers.some(v=>v.key==="Cache-Control"&&v.value==="no-store"));
});

test("served verification checks direct directory routes and rejects changed bytes or missing files",async()=>{
 const manifest={files:{"index.html":sha("home"),"misattribution/editorial/index.html":sha("editorial"),"misattribution/editorial/assets/app.js":sha("script")}};
 const content={"/":"home","/misattribution/editorial/":"editorial","/misattribution/editorial/assets/app.js":"script","/misattribution/editorial/build-manifest.json":"manifest"};
 const fetchMock=async(url)=>({status:200,arrayBuffer:async()=>Buffer.from(content[new URL(url).pathname])});
 await verifyServed(manifest,fetchMock,Buffer.from("manifest"));
 await assert.rejects(verifyServed(manifest,async()=>({status:404}),Buffer.from("manifest")),/missing/);
 await assert.rejects(verifyServed(manifest,async()=>({status:200,arrayBuffer:async()=>Buffer.from("stale")}),Buffer.from("manifest")),/mismatch/);
});
