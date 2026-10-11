import { vi } from "vitest";
import type { BackendClient, Context } from "../src/backend";
import type { ReviewItem } from "../src/contract/backendContracts";
export const context: Context = {
  contractVersion: "editorial-v2",
  environment: "staging",
  projectId: "misattribution-staging",
  serverNow: "2026-10-10T22:00:00Z",
  backendRevision: "a".repeat(40),
  capabilities: { editor: true, moderator: true, admin: true },
  dataEpochId: "epoch",
  epochStatus: "available",
  policies: {
    publicationWindowDays: 31,
    timeZone: "America/New_York",
    contentPolicy: "trust-v1",
    moderationPolicy: "human-v1",
    authConfirmationMaxAgeSeconds: 600,
    manualViolationsOnly: true,
  },
  features: {
    readEnabled: false,
    submitEnabled: false,
    voteEnabled: false,
    autoApproveEnabled: false,
    screeningMode: "human-only",
    dispatchEnabled: false,
    paidEnabled: false,
    scheduledPublicationEnabled: false,
  },
};
export const config = {
  environment: "staging" as const,
  projectId: context.projectId,
  backendSha: context.backendRevision,
};
export const reviewItem: ReviewItem = {
  itemId: "item",
  kind: "text",
  status: "open",
  targetId: "submission",
  entryId: "entry",
  revision: 2,
  evidenceRevision: 1,
  expectedStateVersion: 8,
  expectedStatus: "review",
  expectedItemVersion: 3,
  expectedReporterStateVersion: 4,
  subjectRef: "subject",
  reporterSubjectRef: null,
  availableActions: ["approve", "reject"],
  decisionId: null,
  createdAt: 0,
  evidenceExpiresAt: null,
  evidenceAvailable: true,
  editedAt: null,
  text: "The moon hired a teapot.",
  context: { quoteText: "Quoted context", wrongSpeakerName: "Wrong speaker" },
  publicName: "Quiet Comet",
  reasonCodes: ["ambiguous-context"],
  screeningEvidence: null,
  relatedSourceCaseId: null,
  note: null,
  history: [],
  publicAuthorId: "author",
};
export function fakeBackend(
  overrides: Partial<BackendClient> = {},
): BackendClient {
  const unsupported = vi.fn(async () => {
    throw Error("Unconfigured test operation");
  });
  return {
    context: vi.fn(async () => context),
    overview: vi.fn(async () => ({
      ...context,
      dataEpochId: "epoch",
      asOf: context.serverNow,
    })),
    content: vi.fn(async () => ({ ...context, items: [], cursor: null })),
    preview: unsupported,
    publish: unsupported,
    review: vi.fn(async () => ({
      ...context,
      dataEpochId: "epoch",
      item: reviewItem,
    })),
    history: unsupported,
    restrictions: unsupported,
    violation: unsupported,
    correction: unsupported,
    audit: vi.fn(async () => ({
      ...context,
      dataEpochId: "epoch",
      asOf: context.serverNow,
      items: [],
      cursor: null,
    })),
    listReviews: vi.fn(async () => ({
      dataEpochId: "epoch",
      serverNow: context.serverNow,
      items: [reviewItem],
      cursor: null,
    })),
    decideReview: vi.fn(async (r) => ({
      dataEpochId: "epoch",
      serverNow: context.serverNow,
      acceptedAt: context.serverNow,
      requestId: r.requestId,
      decisionId: "decision",
    })),
    ...overrides,
  };
}
