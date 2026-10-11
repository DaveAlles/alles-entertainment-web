export type {
  EditorialDateState,
  EditorialDetails,
  EditorialInput,
  EditorialOperation,
  EditorialRequests,
  EditorialResponses,
  CanonicalSpeaker,
  Finding,
  Preflight,
} from "./contract/contracts";
export type Account = {
  uid: string;
  email: string | null;
  displayName: string | null;
};
export interface AuthPort {
  subscribe(
    listener: (user: Account | null) => void,
    onError: () => void,
  ): () => void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  reauthenticate?(): Promise<void>;
}
