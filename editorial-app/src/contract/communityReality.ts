/** Canonical v2 community contract. Generated into each package; never expose storage records. */
export const COMMUNITY_SCHEMA = 1;
export const EDIT_WINDOW_MS = 168 * 60 * 60 * 1000;
export const COMMUNITY_TERMS_VERSION = "community-2026-10-10-pseudonyms-v4-draft";
export const COMMUNITY_POLICY_VERSION = "community-safety-2026-10-10-pseudonyms-v4-draft";
export const VISIBILITY_LEASE_MS = 60_000;
export type NameMode = "pen";
export type SubmissionStatus =
  | "pending"
  | "review"
  | "published"
  | "rejected"
  | "removed"
  | "deleted";
export type ModerationState =
  | "pending"
  | "review"
  | "approved"
  | "rejected"
  | "superseded";
export const REASON_CODES = [
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
export type ReasonCode = (typeof REASON_CODES)[number];
export const REPORT_CATEGORIES = [
  "hate-harassment",
  "sexual",
  "violence-threats",
  "personal-information",
  "spam-impersonation",
  "other",
] as const;
export type ReportCategory = (typeof REPORT_CATEGORIES)[number];
export type PublicAuthor = {
  publicAuthorId: string;
  displayName: string;
  profileVersion: number;
};
export type CommunityEntryV2 = {
  entryId: string;
  kind: "system" | "community";
  quoteText: string;
  wrongSpeakerName: string;
  vignette: string;
  author: PublicAuthor | null;
  publishedAt: string;
};
export type EntryViewV2 = {
  dataEpochId: string;
  serverNow: string;
  entry: CommunityEntryV2;
  viewerHasVoted: boolean;
  viewerCanVote: boolean;
  viewerIsAuthor: boolean;
  ownedSubmissionId: string | null;
  voteCount30d: number | null;
  countsAsOf: string | null;
  rank: number | null;
};
export type CommunityAvailability = {
  readEnabled: boolean;
  submitEnabled: boolean;
  voteEnabled: boolean;
  termsVersion: string;
  termsDigest: string;
  policyVersion: string;
  supportUrl: string | null;
};
export type CommunityProfile = {
  dataEpochId: string;
  serverNow: string;
  availability: CommunityAvailability;
  profileVersion: number;
  author: PublicAuthor | null;
  nameMode: NameMode | null;
  requiresPseudonym: boolean;
  hidden: boolean;
  acceptedTermsVersion: string | null;
  acceptedTermsDigest: string | null;
  aiSharing?: { version: string; granted: boolean; generation: number } | null;
  restrictionDecisionId: string | null;
  restrictionAppealDeadlineAt: string | null;
  restrictionCanAppeal: boolean;
  pendingName: {
    candidate: string | null;
    decisionId: string | null;
    appealDeadlineAt: string | null;
    appealEvidenceAvailable: boolean;
    canAppeal: boolean;
    mode: NameMode;
    status: ModerationState;
    reasonCodes: ReasonCode[];
  } | null;
  restrictions: { contribute: boolean; vote: boolean; report: boolean };
};
export type PairContext = {
  pairKey: string;
  systemEntryId: string;
  quoteText: string;
  wrongSpeakerName: string;
  originalVignette: string;
};
export type OwnedSubmission = {
  dataEpochId: string;
  serverNow: string;
  submissionId: string;
  stateVersion: number;
  currentRevision: number;
  status: SubmissionStatus;
  context: PairContext;
  text: string | null;
  createdAt: string;
  editedAt: string | null;
  firstPublishedAt: string | null;
  editDeadlineAt: string | null;
  canEdit: boolean;
  canDelete: boolean;
  canAppeal: boolean;
  appealDeadlineAt: string | null;
  appealEvidenceAvailable: boolean;
  decisionId: string | null;
  currentVersionVoteCountAllTime: number | null;
  voteCount30d: number | null;
  countsAsOf: string | null;
  reasonCode: ReasonCode | null;
  activeEntryId: string | null;
  replacedPublication: boolean;
};
export type ContributionContext = {
  dataEpochId: string;
  serverNow: string;
  availability: CommunityAvailability;
  eligible: boolean;
  reason: string | null;
  context: PairContext;
  submission: OwnedSubmission | null;
};
export type Page<T> = {
  dataEpochId: string;
  serverNow: string;
  items: T[];
  cursor: string | null;
};
export type OwnSort = "newest" | "oldest" | "votes";
export type LeaderboardV2 = {
  dataEpochId: string;
  serverNow: string;
  scope: "overall" | "community";
  generation: number | null;
  asOf: string | null;
  windowStart: string | null;
  unavailable: boolean;
  stale: boolean;
  filtered: boolean;
  limit: number;
  rows: EntryViewV2[];
};
export type MutationReceipt = {
  decisionId?: string;
  dataEpochId: string;
  serverNow: string;
  requestId: string;
  acceptedAt: string;
  viewerVotedAt?: string | null;
  submissionId?: string;
  entryId?: string;
  revision?: number;
  profileVersion?: number;
  existing?: boolean;
  noOp?: boolean;
};
export function editingOpen(
  firstPublishedAt: number | null,
  now: number,
): boolean {
  return firstPublishedAt === null || now < firstPublishedAt + EDIT_WINDOW_MS;
}
