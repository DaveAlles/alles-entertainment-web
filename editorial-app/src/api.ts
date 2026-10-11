import { editorialEndpoints } from "./contract/contracts";
import type {
  EditorialOperation,
  EditorialRequests,
  EditorialResponses,
} from "./types";
import { envelope, type BackendConfig } from "./backend";
import { apiError, PortalError } from "./errors";

export type EditorialClient = {
  [K in EditorialOperation]: (
    request: EditorialRequests[K],
  ) => Promise<EditorialResponses[K]>;
};
type Transport = (name: string, data: unknown) => Promise<unknown>;
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const nullableString = (v: unknown) => v === null || typeof v === "string";
const revision = (v: unknown) => Number.isSafeInteger(v) && Number(v) > 0;
const date = (v: unknown): v is string =>
  typeof v === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(v) &&
  Number.isFinite(Date.parse(v + "T00:00:00Z")) &&
  new Date(v + "T00:00:00Z").toISOString().slice(0, 10) === v;
const actor = (v: unknown) =>
  v === null ||
  (object(v) &&
    nullableString(v.uid) &&
    nullableString(v.email) &&
    nullableString(v.displayName));
function day(v: unknown): boolean {
  if (
    !object(v) ||
    !date(v.gameDate) ||
    typeof v.state !== "string" ||
    typeof v.editable !== "boolean" ||
    typeof v.puzzleGenerated !== "boolean" ||
    !nullableString(v.lockReason) ||
    !nullableString(v.puzzleId)
  )
    return false;
  if (
    v.editable &&
    (v.puzzleGenerated || v.state === "locked" || v.lockReason !== null)
  )
    return false;
  if (v.override === null) return true;
  const o = v.override;
  if (
    !object(o) ||
    o.gameDate !== v.gameDate ||
    !nullableString(o.status) ||
    !(o.revision === null || revision(o.revision))
  )
    return false;
  if (
    !actor(o.createdBy) ||
    !actor(o.updatedBy) ||
    !nullableString(o.updatedAt) ||
    !nullableString(o.createdAt)
  )
    return false;
  if (
    !(
      o.speaker === null ||
      (object(o.speaker) &&
        typeof o.speaker.id === "string" &&
        nullableString(o.speaker.name))
    )
  )
    return false;
  return [
    "speakerId",
    "quoteText",
    "existingPairId",
    "trustedRevisionId",
    "sourceUrl",
    "quoteDate",
    "editorialNote",
  ].every((k) => o[k] === undefined || typeof o[k] === "string");
}
function findings(v: unknown): boolean {
  return (
    Array.isArray(v) &&
    v.every(
      (f) =>
        object(f) &&
        typeof f.code === "string" &&
        typeof f.message === "string" &&
        (f.field === undefined || typeof f.field === "string"),
    )
  );
}
export function parseResponse<K extends EditorialOperation>(
  op: K,
  value: unknown,
  request: EditorialRequests[K],
): EditorialResponses[K] {
  let valid = false;
  if (object(value)) {
    if (op === "list") {
      const days = value.days;
      valid =
        Array.isArray(days) &&
        days.length === 7 &&
        days.every(day) &&
        days.every(
          (d, i) =>
            !i ||
            Date.parse(d.gameDate + "T00:00:00Z") -
              Date.parse(days[i - 1].gameDate + "T00:00:00Z") ===
              86400000,
        );
    } else if (op === "get")
      valid =
        day(value) &&
        value.gameDate === (request as EditorialRequests["get"]).gameDate;
    else if (op === "search")
      valid =
        Array.isArray(value.speakers) &&
        value.speakers.length <= 20 &&
        typeof value.hasMore === "boolean" &&
        value.speakers.every(
          (s) =>
            object(s) &&
            typeof s.id === "string" &&
            !!s.id &&
            typeof s.name === "string" &&
            Array.isArray(s.aliases) &&
            s.aliases.every((a) => typeof a === "string"),
        );
    else if (op === "validate")
      valid =
        typeof value.valid === "boolean" &&
        findings(value.errors) &&
        findings(value.warnings) &&
        (!value.valid || (value.errors as unknown[]).length === 0) &&
        typeof value.checkedAt === "string" &&
        (value.publicationEligibility === undefined ||
          (object(value.publicationEligibility) &&
            typeof value.publicationEligibility.eligible === "boolean" &&
            Array.isArray(value.publicationEligibility.errors) &&
            value.publicationEligibility.errors.every(
              (e) => typeof e === "string",
            ) &&
            Array.isArray(value.publicationEligibility.warnings) &&
            value.publicationEligibility.warnings.every(
              (e) => typeof e === "string",
            )));
    else
      valid =
        value.gameDate === (request as EditorialRequests["create"]).gameDate &&
        revision(value.revision) &&
        value.status === (op === "cancel" ? "cancelled" : "scheduled");
  }
  if (!valid) throw new PortalError("malformed");
  return value as EditorialResponses[K];
}
export function createClient(
  transport: Transport,
  config?: BackendConfig,
): EditorialClient {
  async function call<K extends EditorialOperation>(
    op: K,
    request: EditorialRequests[K],
  ) {
    try {
      const value = await transport(editorialEndpoints[op], request);
      if (
        ["create", "update", "cancel"].includes(op) &&
        "requestId" in request
      ) {
        if (config) envelope(value, config);
        if (!object(value) || value.requestId !== request.requestId)
          throw new PortalError("malformed");
      }
      return parseResponse(op, value, request);
    } catch (error) {
      throw apiError(error);
    }
  }
  return {
    list: (r) => call("list", r),
    get: (r) => call("get", r),
    create: (r) => call("create", r),
    update: (r) => call("update", r),
    cancel: (r) => call("cancel", r),
    validate: (r) => call("validate", r),
    search: (r) => call("search", r),
  };
}
