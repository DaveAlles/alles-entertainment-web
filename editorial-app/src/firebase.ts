import { initializeApp } from "firebase/app";
import {
  initializeAuth,
  browserSessionPersistence,
  browserPopupRedirectResolver,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  connectAuthEmulator,
  reauthenticateWithPopup,
} from "firebase/auth";
import {
  getFunctions,
  httpsCallable,
  connectFunctionsEmulator,
} from "firebase/functions";
import { createBackendClient } from "./backend";
import { createClient } from "./api";
import { PortalError } from "./errors";
import type { AuthPort } from "./types";

declare const __PORTAL_CONFIG__: {
  environment: "local" | "staging" | "prod";
  firebase: {
    projectId: string;
    apiKey: string;
    appId: string;
    authDomain: string;
  };
  region: string;
  emulator: boolean;
  authPort: number;
  functionsPort: number;
  backendSha: string;
};
export const portalConfig = __PORTAL_CONFIG__;
const app = initializeApp(
  portalConfig.firebase,
  "misattribution-editorial-" + portalConfig.environment,
);
const auth = initializeAuth(app, {
  persistence: browserSessionPersistence,
  popupRedirectResolver: browserPopupRedirectResolver,
});
const functions = getFunctions(app, portalConfig.region);
if (portalConfig.emulator) {
  if (
    portalConfig.firebase.projectId !== "demo-misattribution" ||
    !["localhost", "127.0.0.1"].includes(location.hostname)
  )
    throw new Error(
      "Emulator portal is restricted to the local demo environment.",
    );
  connectAuthEmulator(auth, `http://127.0.0.1:${portalConfig.authPort}`);
  connectFunctionsEmulator(functions, "127.0.0.1", portalConfig.functionsPort);
}
const google = new GoogleAuthProvider();
google.setCustomParameters({ prompt: "select_account" });
export const session: AuthPort = {
  subscribe: (listener, onError) =>
    onAuthStateChanged(
      auth,
      (user) =>
        listener(
          user
            ? {
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
              }
            : null,
        ),
      onError,
    ),
  signIn: async () => {
    await signInWithPopup(auth, google);
  },
  signOut: () => signOut(auth),
  reauthenticate: async () => {
    const user = auth.currentUser;
    if (!user) throw new PortalError("auth");
    await reauthenticateWithPopup(user, google);
    if (auth.currentUser !== user) throw new PortalError("auth");
  },
};
// All twenty operations share Firebase callable transport, token refresh and timeout.
async function transport(name: string, data: unknown) {
  const user = auth.currentUser;
  if (!user) throw new PortalError("auth");
  const response = await httpsCallable(functions, name, { timeout: 30000 })(
    data,
  );
  if (auth.currentUser !== user) throw new PortalError("auth");
  return response.data;
}
export const api = createClient(transport, {
  environment: portalConfig.environment,
  projectId: portalConfig.firebase.projectId,
  backendSha: portalConfig.backendSha,
});
export const backend = createBackendClient(transport, {
  environment: portalConfig.environment,
  projectId: portalConfig.firebase.projectId,
  backendSha: portalConfig.backendSha,
});
