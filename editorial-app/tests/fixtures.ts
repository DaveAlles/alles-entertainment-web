import { vi } from "vitest";
import type {
  Account,
  AuthPort,
  EditorialDateState,
  Preflight,
} from "../src/types";
import type { EditorialClient } from "../src/api";

export const editor: Account = {
  uid: "dave-editor",
  email: "editor@example.test",
  displayName: "Dave Editor",
};
export const speaker = {
  id: "canonical-ada",
  name: "Ada Lovelace",
  aliases: ["Countess of Lovelace"],
};
export const valid: Preflight = {
  valid: true,
  errors: [],
  warnings: [],
  inventory: { structurallyPossible: true, eligibleNow: true },
  checkedAt: "2026-09-05T05:00:00Z",
};
export function dates(): EditorialDateState[] {
  const days: EditorialDateState[] = Array.from({ length: 7 }, (_, i) => ({
    gameDate: `2026-09-${String(6 + i).padStart(2, "0")}`,
    state: "none",
    editable: true,
    lockReason: null,
    puzzleGenerated: false,
    puzzleId: null,
    generatedOverrideRevision: null,
    selectionMode: null,
    override: null,
  }));
  days[1] = scheduled(days[1]);
  days[2] = {
    ...scheduled(days[2]),
    state: "locked",
    editable: false,
    lockReason: "PUZZLE_GENERATED",
    puzzleGenerated: true,
    puzzleId: "daily-2026-09-08",
    generatedOverrideRevision: 3,
    selectionMode: "editorial",
  };
  return days;
}
export function scheduled(day: EditorialDateState): EditorialDateState {
  return {
    ...day,
    state: "scheduled",
    override: {
      gameDate: day.gameDate,
      speakerId: speaker.id,
      speaker: { id: speaker.id, name: speaker.name },
      quoteText: "Imagination is the discovering faculty.",
      existingPairId: "quote-ada",
      sourceUrl: "https://example.test/source",
      quoteDate: "1843-01-01",
      editorialNote: "An anniversary",
      revision: 3,
      status: "scheduled",
      createdAt: "2026-09-04T12:00:00Z",
      updatedAt: "2026-09-05T04:00:00Z",
      createdBy: {
        uid: "jill",
        email: "jill@example.test",
        displayName: "Jill",
      },
      updatedBy: {
        uid: "jill",
        email: "jill@example.test",
        displayName: "Jill",
      },
      consumedAt: null,
      consumedByPuzzleId: null,
    },
  };
}
export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
export function fakeAuth(initial: Account | null = editor) {
  let listener: (user: Account | null) => void = () => {};
  const auth: AuthPort = {
    subscribe: (callback) => {
      listener = callback;
      callback(initial);
      return () => {
        listener = () => {};
      };
    },
    signIn: vi.fn(async () => {
      listener(editor);
    }),
    signOut: vi.fn(async () => {
      listener(null);
    }),
  };
  return { auth, emit: (value: Account | null) => listener(value) };
}
export function fakeApi() {
  let rows = dates();
  const api: EditorialClient = {
    list: vi.fn(async () => ({ days: rows })),
    get: vi.fn(
      async ({ gameDate }) => rows.find((d) => d.gameDate === gameDate)!,
    ),
    create: vi.fn(async (data) => {
      rows = rows.map((d) => (d.gameDate === data.gameDate ? scheduled(d) : d));
      return { gameDate: data.gameDate, revision: 1, status: "scheduled" };
    }),
    update: vi.fn(async (data) => ({
      gameDate: data.gameDate,
      revision: data.expectedRevision + 1,
      status: "scheduled",
    })),
    cancel: vi.fn(async (data) => {
      rows = rows.map((d) =>
        d.gameDate === data.gameDate
          ? {
              ...d,
              state: "cancelled",
              override: {
                ...d.override!,
                status: "cancelled",
                revision: data.expectedRevision + 1,
              },
            }
          : d,
      );
      return {
        gameDate: data.gameDate,
        revision: data.expectedRevision + 1,
        status: "cancelled",
      };
    }),
    validate: vi.fn(async () => valid),
    search: vi.fn(async () => ({ speakers: [speaker], hasMore: false })),
  };
  return {
    api,
    setRows: (value: EditorialDateState[]) => {
      rows = value;
    },
  };
}
