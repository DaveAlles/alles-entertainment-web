export type ErrorKind =
  | "scope"
  | "reauth"
  | "expired"
  | "auth"
  | "denied"
  | "invalid"
  | "conflict"
  | "exists"
  | "locked"
  | "missing"
  | "network"
  | "unexpected"
  | "malformed";
const messages: Record<ErrorKind, string> = {
  scope:
    "The environment, data epoch, or backend version changed. Protected data was cleared. Reload and authorize again.",
  reauth:
    "Recent Google authentication is required. Reauthenticate, review this target, and confirm again.",
  expired:
    "This reference or evidence expired. Refresh the queue to obtain current authorized details.",
  auth: "Your session has expired. Sign out, then sign in again.",
  denied:
    "Your Google account is authenticated, but it does not have editorial access.",
  invalid:
    "Some details could not be accepted. Check the fields and validate again.",
  conflict:
    "This record was changed by another editor after you opened it. Your unsaved work is preserved; reload the authoritative state before another action.",
  exists:
    "An override was added for this date while you were working. Reload the latest version.",
  locked:
    "This puzzle was generated while you were editing. The override is now locked and cannot be changed.",
  missing: "This override is no longer available. Reload the latest state.",
  network:
    "The request could not be completed. Check your connection and try again.",
  unexpected:
    "The service could not complete this request. Please try again shortly.",
  malformed:
    "The service returned an unexpected response. Refresh before making any changes.",
};
export class PortalError extends Error {
  constructor(
    public kind: ErrorKind,
    public reason?: string,
    public field?: string,
  ) {
    super(messages[kind]);
  }
}
export function apiError(error: unknown): PortalError {
  if (error instanceof PortalError) return error;
  const value = error as {
    code?: string;
    details?: { reason?: string; field?: string };
  } | null;
  const code =
    typeof value?.code === "string"
      ? value.code.replace(/^functions\//, "")
      : "";
  const reason =
    typeof value?.details?.reason === "string"
      ? value.details.reason
      : undefined;
  let kind: ErrorKind = "unexpected";
  if (
    [
      "PROJECT_MISMATCH",
      "data-epoch-mismatch",
      "data-epoch-unavailable",
      "policy-changed",
    ].includes(reason ?? "")
  )
    kind = "scope";
  else if (reason === "CONFIRMATION_REQUIRED") kind = "reauth";
  else if (
    [
      "INVALID_CURSOR",
      "SUBJECT_EXPIRED",
      "SUBJECT_UNAVAILABLE",
      "INVALID_SUBJECT",
      "evidence-expired",
    ].includes(reason ?? "")
  )
    kind = "expired";
  else if (
    ["PUZZLE_GENERATED", "OVERRIDE_CONSUMED", "DATE_NOT_FUTURE"].includes(
      reason ?? "",
    )
  )
    kind = "locked";
  else if (reason === "REVISION_CONFLICT" || code === "aborted")
    kind = "conflict";
  else if (code === "unauthenticated") kind = "auth";
  else if (code === "permission-denied") kind = "denied";
  else if (code === "already-exists") kind = "exists";
  else if (code === "not-found") kind = "missing";
  else if (["invalid-argument", "failed-precondition"].includes(code))
    kind = "invalid";
  else if (
    ["unavailable", "deadline-exceeded", "cancelled"].includes(code) ||
    error instanceof TypeError ||
    (code === "internal" &&
      typeof navigator !== "undefined" &&
      !navigator.onLine)
  )
    kind = "network";
  return new PortalError(
    kind,
    reason,
    typeof value?.details?.field === "string" ? value.details.field : undefined,
  );
}
export function signInMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
  )
    return "Sign-in was cancelled. You can try again when you’re ready.";
  if (code === "auth/popup-blocked")
    return "Allow the Google sign-in pop-up for this site, then try again.";
  if (code === "auth/network-request-failed")
    return "Google sign-in could not connect. Check your connection and try again.";
  return "Google sign-in is unavailable. Please contact the portal administrator if this continues.";
}

export const fatalError = (e: PortalError) =>
  ["auth", "denied", "scope"].includes(e.kind);
export const uncertainError = (e: PortalError) =>
  ["network", "unexpected", "malformed"].includes(e.kind);
