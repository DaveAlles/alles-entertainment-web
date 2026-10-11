// Browser-only wire definitions; exported verbatim for the Step C source pin.
// No Firebase Admin, storage records, credentials or runtime imports.
export const EDITORIAL_CONTRACT_VERSION = "editorial-v2" as const;
export const EDITORIAL_REASON_CODES = [
  "editorial-selection",
  "editorial-cancel",
  "manual-publication",
  "restriction-review",
  "appeal-upheld",
  "violation-correction",
  "staff-access",
  "safe",
  "hate-harassment",
  "sexual",
  "violence-threats",
  "personal-information",
  "spam-impersonation",
  "ambiguous-context",
  "unsupported-language",
  "source-unsafe",
  "provider-unavailable",
  "invalid-response",
  "budget-exhausted",
  "policy-changed",
  "human-only",
  "ai-permission-required",
  "screening-paused",
  "context-required",
  "context-relevance",
  "fiction-attribution",
  "strong-profanity",
  "obfuscation",
  "injection-risk",
  "child-safety-review",
  "other",
] as const;
export const backendEndpoints = {
  context: "getEditorialContext",
  overview: "getEditorialOverview",
  content: "listEditorialContent",
  preview: "getEditorialPuzzlePreview",
  publish: "publishEditorialPuzzle",
  review: "getEditorialReview",
  history: "getEditorialUserHistory",
  restrictions: "setEditorialUserRestrictions",
  violation: "recordCommunityViolation",
  correction: "correctCommunityViolation",
  audit: "listEditorialAudit",
} as const;
export type EditorialEnvelope = {
  contractVersion: "editorial-v2";
  environment: "local" | "staging" | "prod";
  projectId: string;
  serverNow: string;
  backendRevision: string;
};
export type Confirmation = {
  project: string;
  target: string;
  expectedVersion: number | null;
};
export type EditorialMutation = {
  requestId: string;
  expectedProjectId: string;
  reasonCode: (typeof EDITORIAL_REASON_CODES)[number];
  confirmation?: Confirmation;
};
export type EditorialPage = { cursor?: string | null; limit?: number };
export type EditorialQueue = "reviews" | "reports" | "appeals" | "restrictions";
export type EpochRequest = { expectedDataEpochId: string };
export type EditorialReviewListRequest = EpochRequest & EditorialPage & {
  queue: EditorialQueue;
  // Only queue=restrictions; discovers project-global controls after epoch reset.
  globalRestrictions?: true;
};
export type EditorialReviewDecisionRequest = EpochRequest & {
  requestId: string;
  queue: EditorialQueue;
  itemId: string;
  action: "approve" | "reject" | "remove" | "reinstate" | "restrict" | "restrict-reporter" | "unrestrict" | "close" | "disable";
  expectedStateVersion: number;
  expectedStatus: string;
  expectedRevision: number | null;
  expectedItemVersion: number;
  expectedReporterStateVersion?: number;
  reason: Exclude<EditorialMutation["reasonCode"], "editorial-selection" | "editorial-cancel" | "manual-publication" | "restriction-review" | "appeal-upheld" | "violation-correction" | "staff-access">;
  expectedProjectId?: string;
  confirmation?: Confirmation;
  // Only queue=restrictions/action=unrestrict; itemId is the issued subject ref.
  globalRestrictions?: true;
};
export type EditorialBackendRequests = {
  context: Record<string, never>;
  overview: Partial<EpochRequest>;
  content: EditorialPage & { query?: string };
  preview: { gameDate: string };
  publish: EditorialMutation & {
    gameDate: string;
    previewFingerprint: string;
    expectedOverrideRevision: number | null;
  };
  review: EpochRequest & { queue: EditorialQueue; itemId: string; globalRestrictions?: true };
  history: EpochRequest & EditorialPage & { subjectRef: string };
  restrictions: EpochRequest &
    EditorialMutation & {
      subjectRef: string;
      action: "restrict" | "restrict-reporting" | "unrestrict" | "disable";
      supportingDecisionIds: string[];
      expectedControlVersion: number;
    };
  violation: EpochRequest &
    EditorialMutation & {
      subjectRef: string;
      decisionId: string;
      severity: "low" | "medium" | "high";
      expectedControlVersion: number;
    };
  correction: EpochRequest &
    EditorialMutation & {
      violationId: string;
      expectedViolationVersion: number;
    };
  audit: EditorialPage &
    Partial<EpochRequest> & {
      stream: "puzzle" | "community" | "access";
      targetRef?: string;
    };
};
export type ProvenanceLink = { url: string; publisherId: string; role: string };
export type ContentItem = {
  quoteId: string;
  revisionId: string;
  existingPairId: string | null;
  trustedRevisionId: string | null;
  speakerId: string;
  speakerName: string;
  displayText: string;
  provenance: ProvenanceLink[];
  sourcePublishedAt: number | null;
  saidAt: number | null;
};
export type PreviewBoard = {
  id: string;
  durationSec: number;
  correctPair: { quoteId: string; authorId: string };
  quotes: {
    id: string;
    text: string;
    speakerId: string;
    revisionId: string;
    provenance: ProvenanceLink[];
  }[];
  speakers: { id: string; name: string }[];
};
export type AuditItem = {
  id: string;
  action: string;
  actor: string | null;
  createdAt: string | null;
  targetRef: string | null;
  revision: number | null;
  previousState: unknown;
  newState: unknown;
  reasonCodes: string[];
  decisionId: string | null;
  requestId: string | null;
};
export type RestrictionState = {
  contribute: boolean;
  vote: boolean;
  report: boolean;
};
export type ViolationSummary = { confirmed: number; corrected: number };
export type AuthSyncStatus =
  | "disable-pending"
  | "enable-pending"
  | "disabled"
  | "enabled";
export type AcceptedMutation = EditorialEnvelope & {
  requestId: string;
  acceptedAt: string;
};
export type ReviewItem = {
  globalRestrictions?: true;
  itemId: string;
  kind: "text" | "name" | "source" | "account";
  status: "open" | "closed";
  targetId: string;
  entryId: string | null;
  revision: number | null;
  evidenceRevision: number | null;
  expectedStateVersion: number;
  expectedStatus: string;
  expectedItemVersion: number;
  expectedReporterStateVersion: number;
  subjectRef: string | null;
  reporterSubjectRef: string | null;
  availableActions: string[];
  decisionId: string | null;
  createdAt: number | null;
  evidenceExpiresAt: number | null;
  evidenceAvailable: boolean;
  editedAt: number | null;
  text: string | null;
  context: unknown;
  publicName: string | null;
  reasonCodes: string[];
  screeningEvidence: unknown;
  relatedSourceCaseId: string | null;
  note: string | null;
  history: unknown[];
  publicAuthorId: string | null;
};
export type EditorialBackendResponses = {
  context: EditorialEnvelope & {
    capabilities: { editor: boolean; moderator: boolean; admin: boolean };
    dataEpochId: string | null;
    epochStatus: "available" | "unavailable";
    policies: {
      publicationWindowDays: number;
      timeZone: string;
      contentPolicy: string;
      moderationPolicy: string;
      authConfirmationMaxAgeSeconds: number;
      manualViolationsOnly: boolean;
    };
    features: {
      readEnabled: boolean;
      submitEnabled: boolean;
      voteEnabled: boolean;
      autoApproveEnabled: boolean;
      screeningMode: string;
      dispatchEnabled: boolean;
      paidEnabled: boolean;
      scheduledPublicationEnabled: boolean;
    };
  };
  overview: EditorialEnvelope & {
    asOf: string;
    dataEpochId?: string;
    publication?: {
      gameDate: string;
      published: boolean;
      fingerprint: string | null;
      scheduledEnabled: boolean;
    };
    queues?: Record<
      EditorialQueue,
      {
        count: number;
        capped: boolean;
        oldestAt: number | null;
        highestPriority: number | null;
      }
    >;
    health?: {
      pendingAuthChanges: number;
      capped: boolean;
      workerLastSucceededAt: number | null;
      purgeLastSucceededAt: number | null;
      status: string;
    };
  };
  content: EditorialEnvelope & { items: ContentItem[]; cursor: string | null };
  preview: EditorialEnvelope & {
    gameDate: string;
    state: "published" | "provisional" | "unavailable";
    readiness: "ready" | "blocked";
    previewFingerprint: string | null;
    expectedOverrideRevision?: number | null;
    puzzle: PreviewBoard | null;
    warnings: string[];
    errors: string[];
  };
  publish: AcceptedMutation & {
    puzzleId: string;
    snapshotFingerprint: string;
    consumedOverrideRevision: number | null;
    publishedAt: string;
    alreadyPublished: boolean;
  };
  review: EditorialEnvelope & { dataEpochId: string; item: ReviewItem };
  history: EditorialEnvelope & {
    dataEpochId: string;
    subjectRef: string;
    controlVersion: number;
    effectiveRestrictions: RestrictionState;
    authSyncStatus: AuthSyncStatus;
    summary: ViolationSummary;
    reports: {
      itemId: string;
      status: string;
      createdAt: number;
      reasonCode: string | null;
      decisionId: string | null;
      revision: number | null;
    }[];
    appeals: {
      itemId: string;
      status: string;
      createdAt: number;
      reasonCode: string | null;
      decisionId: string | null;
      revision: number | null;
    }[];
    recentDecisions: AuditItem[];
    casesCapped: { reports: boolean; appeals: boolean; decisions: boolean };
    items: (AuditItem & {
      eventKind: "decision" | "violation" | "correction" | "auth-sync";
      sourceEpoch: string | null;
      status: string | null;
      violationId: string | null;
      version: number | null;
      severity: string | null;
      correctionId: string | null;
    })[];
    cursor: string | null;
  };
  restrictions: AcceptedMutation & {
    dataEpochId: string;
    decisionId: string;
    controlVersion: number;
    effectiveRestrictions: RestrictionState;
    authSyncStatus: AuthSyncStatus;
  };
  violation: AcceptedMutation & {
    dataEpochId: string;
    violationId: string;
    controlVersion: number;
    summary: ViolationSummary;
  };
  correction: AcceptedMutation & {
    dataEpochId: string;
    correctionId: string;
    version: number;
    summary: ViolationSummary;
  };
  audit: EditorialEnvelope & {
    dataEpochId?: string;
    asOf: string;
    items: AuditItem[];
    cursor: string | null;
  };
};
