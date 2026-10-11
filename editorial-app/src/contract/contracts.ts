// Browser-safe wire contracts. No Admin SDK, credentials or Firestore imports.
import type { EditorialMutation, EditorialEnvelope } from "./backendContracts";
export type EditorialInput = {
  gameDate: string;
  speakerId: string;
  quoteText: string;
  existingPairId?: string;
  trustedRevisionId?: string;
  sourceUrl?: string;
  quoteDate?: string;
  editorialNote?: string;
};
export type EditorIdentity = {
  uid: string | null;
  email: string | null;
  displayName: string | null;
};
export type EditorialDetails = Partial<EditorialInput> & {
  gameDate: string;
  speaker: { id: string; name: string | null } | null;
  status: string | null;
  revision: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  createdBy: EditorIdentity | null;
  updatedBy: EditorIdentity | null;
  consumedAt: string | null;
  consumedByPuzzleId: string | null;
};
export type EditorialDateState = {
  gameDate: string;
  state: string;
  editable: boolean;
  lockReason: string | null;
  puzzleGenerated: boolean;
  puzzleId: string | null;
  generatedOverrideRevision: number | null;
  selectionMode: "automatic" | "editorial" | null;
  override: EditorialDetails | null;
};
export type Finding = { code: string; message: string; field?: string };
export type Preflight = {
  publicationEligibility?: { eligible: boolean; errors: string[]; warnings: string[] };
  valid: boolean;
  errors: Finding[];
  warnings: Finding[];
  inventory: {
    structurallyPossible: boolean | null;
    eligibleNow: boolean | null;
  } | null;
  normalized?: EditorialInput;
  checkedAt: string;
};
export type CanonicalSpeaker = { id: string; name: string; aliases: string[] };
export type MutationResult = Partial<EditorialEnvelope> & {
  requestId?: string;
  acceptedAt?: string;
  gameDate: string;
  revision: number;
  status: string;
};
export const editorialEndpoints = {
  list: "listEditorialOverrides",
  get: "getEditorialOverride",
  create: "createEditorialOverride",
  update: "updateEditorialOverride",
  cancel: "deleteEditorialOverride",
  validate: "validateEditorialOverride",
  search: "searchEditorialSpeakers",
} as const;
export type EditorialOperation = keyof typeof editorialEndpoints;
export type EditorialRequests = {
  list: { startDate?: string; endDate?: string };
  get: { gameDate: string };
  create: EditorialInput & Partial<EditorialMutation> & { expectedRevision?: number };
  update: EditorialInput & Partial<EditorialMutation> & { expectedRevision: number };
  cancel: Partial<EditorialMutation> & { gameDate: string; expectedRevision: number };
  validate: EditorialInput & { expectedRevision?: number };
  search: { query: string };
};
export type EditorialResponses = {
  list: { days: EditorialDateState[] };
  get: EditorialDateState;
  create: MutationResult;
  update: MutationResult;
  cancel: MutationResult;
  validate: Preflight;
  search: { speakers: CanonicalSpeaker[]; hasMore: boolean };
};
