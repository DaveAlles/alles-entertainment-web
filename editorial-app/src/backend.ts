import {
  backendEndpoints,
  EDITORIAL_CONTRACT_VERSION,
} from "./contract/backendContracts";
import type {
  EditorialBackendRequests as Requests,
  EditorialBackendResponses as Responses,
  EditorialReviewListRequest,
  EditorialReviewDecisionRequest,
  ReviewItem,
} from "./contract/backendContracts";
import type { MutationReceipt } from "./contract/communityReality";
import { apiError, PortalError } from "./errors";
export type Context = Responses["context"];
export type BackendConfig = {
  environment: "local" | "staging" | "prod";
  projectId: string;
  backendSha: string;
};
export type ReviewPage = {
  dataEpochId: string;
  serverNow: string;
  items: ReviewItem[];
  cursor: string | null;
};
export type BackendClient = {
  [K in keyof Requests]: (request: Requests[K]) => Promise<Responses[K]>;
} & {
  listReviews(request: EditorialReviewListRequest): Promise<ReviewPage>;
  decideReview(
    request: EditorialReviewDecisionRequest,
  ): Promise<MutationReceipt>;
};
type Check = (v: unknown) => boolean;
export const object = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const str: Check = (v) => typeof v === "string";
const id: Check = (v) => typeof v === "string" && v.length > 0;
const bool: Check = (v) => typeof v === "boolean";
const num: Check = (v) => typeof v === "number" && Number.isFinite(v);
const integer: Check = (v) => Number.isSafeInteger(v) && Number(v) >= 0;
const iso: Check = (v) =>
  typeof v === "string" && Number.isFinite(Date.parse(v));
const nil =
  (check: Check): Check =>
  (v) =>
    v === null || check(v);
const optional =
  (check: Check): Check =>
  (v) =>
    v === undefined || check(v);
const array =
  (check: Check, max = 500): Check =>
  (v) =>
    Array.isArray(v) && v.length <= max && v.every(check);
const shape =
  (fields: Record<string, Check>): Check =>
  (v) =>
    object(v) && Object.entries(fields).every(([k, c]) => c(v[k]));
const choice =
  (...values: unknown[]): Check =>
  (v) =>
    values.includes(v);
const strings = array(str);
const provenance = shape({ url: str, publisherId: str, role: str });
const content = shape({
  quoteId: id,
  revisionId: id,
  existingPairId: nil(str),
  trustedRevisionId: nil(str),
  speakerId: id,
  speakerName: str,
  displayText: str,
  provenance: array(provenance),
  sourcePublishedAt: nil(num),
  saidAt: nil(num),
});
const audit = shape({
  id: id,
  action: str,
  actor: nil(str),
  createdAt: nil(iso),
  targetRef: nil(str),
  revision: nil(integer),
  reasonCodes: strings,
  decisionId: nil(str),
  requestId: nil(str),
});
const restrictions = shape({ contribute: bool, vote: bool, report: bool });
const summary = shape({ confirmed: integer, corrected: integer });
const authStatus = choice(
  "disable-pending",
  "enable-pending",
  "disabled",
  "enabled",
);
const actions = [
  "approve",
  "reject",
  "remove",
  "reinstate",
  "restrict",
  "restrict-reporter",
  "unrestrict",
  "close",
  "disable",
];
const review = shape({
  itemId: id,
  kind: choice("text", "name", "source", "account"),
  status: choice("open", "closed"),
  targetId: str,
  entryId: nil(str),
  revision: nil(integer),
  evidenceRevision: nil(integer),
  expectedStateVersion: integer,
  expectedStatus: str,
  expectedItemVersion: integer,
  expectedReporterStateVersion: integer,
  subjectRef: nil(str),
  reporterSubjectRef: nil(str),
  availableActions: array(choice(...actions), 9),
  decisionId: nil(str),
  createdAt: nil(num),
  evidenceExpiresAt: nil(num),
  evidenceAvailable: bool,
  editedAt: nil(num),
  text: nil(str),
  publicName: nil(str),
  reasonCodes: strings,
  relatedSourceCaseId: nil(str),
  note: nil(str),
  history: array(object, 20),
  publicAuthorId: nil(str),
  globalRestrictions: optional(choice(true)),
});
const caseSummary = shape({
  itemId: id,
  status: str,
  createdAt: num,
  reasonCode: nil(str),
  decisionId: nil(str),
  revision: nil(integer),
});
const queueCount = shape({
  count: integer,
  capped: bool,
  oldestAt: nil(num),
  highestPriority: nil(num),
});
const schemas: Record<keyof Requests, Check> = {
  context: shape({
    capabilities: shape({ editor: bool, moderator: bool, admin: bool }),
    dataEpochId: nil(id),
    epochStatus: choice("available", "unavailable"),
    policies: shape({
      publicationWindowDays: integer,
      timeZone: choice("America/New_York"),
      contentPolicy: id,
      moderationPolicy: id,
      authConfirmationMaxAgeSeconds: integer,
      manualViolationsOnly: choice(true),
    }),
    features: shape({
      readEnabled: bool,
      submitEnabled: bool,
      voteEnabled: bool,
      autoApproveEnabled: bool,
      screeningMode: id,
      dispatchEnabled: bool,
      paidEnabled: bool,
      scheduledPublicationEnabled: bool,
    }),
  }),
  overview: shape({
    asOf: iso,
    publication: optional(
      shape({
        gameDate: id,
        published: bool,
        fingerprint: nil(str),
        scheduledEnabled: bool,
      }),
    ),
    queues: optional(
      shape({
        reviews: queueCount,
        reports: queueCount,
        appeals: queueCount,
        restrictions: queueCount,
      }),
    ),
    health: optional(
      shape({
        pendingAuthChanges: integer,
        capped: bool,
        workerLastSucceededAt: nil(num),
        purgeLastSucceededAt: nil(num),
        status: str,
      }),
    ),
  }),
  content: shape({ items: array(content, 50), cursor: nil(str) }),
  preview: shape({
    gameDate: id,
    state: choice("published", "provisional", "unavailable"),
    readiness: choice("ready", "blocked"),
    previewFingerprint: nil(str),
    expectedOverrideRevision: optional(nil(integer)),
    puzzle: nil(
      shape({
        id: id,
        durationSec: integer,
        correctPair: shape({ quoteId: id, authorId: id }),
        quotes: array(
          shape({
            id: id,
            text: str,
            speakerId: id,
            revisionId: id,
            provenance: array(provenance),
          }),
          3,
        ),
        speakers: array(shape({ id: id, name: str }), 4),
      }),
    ),
    warnings: strings,
    errors: strings,
  }),
  publish: shape({
    requestId: id,
    acceptedAt: iso,
    puzzleId: id,
    snapshotFingerprint: id,
    consumedOverrideRevision: nil(integer),
    publishedAt: iso,
    alreadyPublished: bool,
  }),
  review: shape({ dataEpochId: id, item: review }),
  history: shape({
    dataEpochId: id,
    subjectRef: id,
    controlVersion: integer,
    effectiveRestrictions: restrictions,
    authSyncStatus: authStatus,
    summary,
    reports: array(caseSummary, 20),
    appeals: array(caseSummary, 20),
    recentDecisions: array(audit, 20),
    casesCapped: shape({ reports: bool, appeals: bool, decisions: bool }),
    items: array(
      (v) =>
        audit(v) &&
        shape({
          eventKind: choice("decision", "violation", "correction", "auth-sync"),
          sourceEpoch: nil(str),
          status: nil(str),
          violationId: nil(str),
          version: nil(integer),
          severity: nil(str),
          correctionId: nil(str),
        })(v),
      50,
    ),
    cursor: nil(str),
  }),
  restrictions: shape({
    requestId: id,
    acceptedAt: iso,
    dataEpochId: id,
    decisionId: id,
    controlVersion: integer,
    effectiveRestrictions: restrictions,
    authSyncStatus: authStatus,
  }),
  violation: shape({
    requestId: id,
    acceptedAt: iso,
    dataEpochId: id,
    violationId: id,
    controlVersion: integer,
    summary,
  }),
  correction: shape({
    requestId: id,
    acceptedAt: iso,
    dataEpochId: id,
    correctionId: id,
    version: integer,
    summary,
  }),
  audit: shape({ asOf: iso, items: array(audit, 50), cursor: nil(str) }),
};
export function envelope(value: unknown, config: BackendConfig) {
  if (
    !object(value) ||
    value.contractVersion !== EDITORIAL_CONTRACT_VERSION ||
    value.environment !== config.environment ||
    value.projectId !== config.projectId ||
    (value.backendRevision !== config.backendSha &&
      !(config.environment === "local" && value.backendRevision === "local"))
  )
    throw new PortalError("scope");
  if (!iso(value.serverNow)) throw new PortalError("malformed");
}
function epoch(value: unknown, input: object) {
  if (
    object(input) &&
    input.expectedDataEpochId !== undefined &&
    (!object(value) || value.dataEpochId !== input.expectedDataEpochId)
  )
    throw new PortalError("scope");
}
export function parseBackend<K extends keyof Requests>(
  op: K,
  value: unknown,
  request: Requests[K],
  config: BackendConfig,
): Responses[K] {
  envelope(value, config);
  if (!schemas[op](value)) throw new PortalError("malformed");
  epoch(value, request);
  const v = value as Responses[K];
  if (
    "requestId" in request &&
    (!object(value) || value.requestId !== request.requestId)
  )
    throw new PortalError("malformed");
  if (op === "context") {
    const c = v as Context;
    if (!Object.values(c.capabilities).some(Boolean))
      throw new PortalError("denied");
    if ((c.epochStatus === "available") !== (c.dataEpochId !== null))
      throw new PortalError("malformed");
  }
  if (op === "preview") {
    const p = v as Responses["preview"];
    if (
      p.gameDate !== (request as Requests["preview"]).gameDate ||
      (p.readiness === "ready" &&
        (!p.puzzle ||
          !p.previewFingerprint ||
          p.expectedOverrideRevision === undefined ||
          p.errors.length))
    )
      throw new PortalError("malformed");
    if (
      p.puzzle &&
      (p.puzzle.quotes.length !== 3 ||
        p.puzzle.speakers.length !== 4 ||
        !p.puzzle.quotes.some((q) => q.id === p.puzzle!.correctPair.quoteId) ||
        !p.puzzle.speakers.some((s) => s.id === p.puzzle!.correctPair.authorId))
    )
      throw new PortalError("malformed");
  }
  if (op === "review") {
    const req = request as Requests["review"],
      item = (v as Responses["review"]).item;
    // Global detail reissues a fresh actor-bound subject token, not the input token.
    if (
      req.globalRestrictions
        ? !(
            item.globalRestrictions &&
            item.kind === "account" &&
            item.itemId === item.subjectRef &&
            item.targetId === item.subjectRef &&
            item.availableActions.every((a) => a === "unrestrict")
          )
        : item.itemId !== req.itemId
    )
      throw new PortalError("malformed");
  }
  if (
    op === "history" &&
    (v as Responses["history"]).subjectRef !==
      (request as Requests["history"]).subjectRef
  )
    throw new PortalError("malformed");
  return v;
}
export function createBackendClient(
  transport: (name: string, request: unknown) => Promise<unknown>,
  config: BackendConfig,
): BackendClient {
  const entries = Object.entries(backendEndpoints).map(([op, name]) => [
    op,
    async (request: Requests[keyof Requests]) => {
      try {
        return parseBackend(
          op as keyof Requests,
          await transport(name, request),
          request,
          config,
        );
      } catch (e) {
        throw apiError(e);
      }
    },
  ]);
  return {
    ...Object.fromEntries(entries),
    async listReviews(request: EditorialReviewListRequest) {
      try {
        const v = await transport("listCommunityReviews", request);
        envelope(v, config);
        epoch(v, request);
        if (
          !shape({
            dataEpochId: id,
            serverNow: iso,
            items: array(review, 20),
            cursor: nil(str),
          })(v)
        )
          throw new PortalError("malformed");
        return v as ReviewPage;
      } catch (e) {
        throw apiError(e);
      }
    },
    async decideReview(request: EditorialReviewDecisionRequest) {
      try {
        const v = await transport("decideCommunityReview", request);
        epoch(v, request);
        if (
          !shape({
            requestId: choice(request.requestId),
            acceptedAt: iso,
            serverNow: iso,
            decisionId: id,
          })(v)
        )
          throw new PortalError("malformed");
        return v as MutationReceipt;
      } catch (e) {
        throw apiError(e);
      }
    },
  } as BackendClient;
}
