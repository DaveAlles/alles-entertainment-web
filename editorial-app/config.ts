import environments from "./environments.json";
import pin from "./backend-pin.json";
export function configFor(mode: string) {
  const environment = mode === "test" || mode === "emulator" ? "local" : mode;
  if (
    environment !== "local" &&
    environment !== "staging" &&
    environment !== "prod"
  )
    throw Error(
      "Select local, staging or prod explicitly. No default environment.",
    );
  const firebase = environments[environment];
  const expected = {
    local: "demo-misattribution",
    staging: "misattribution-staging",
    prod: "misattribution-aa1e2",
  };
  if (
    firebase.projectId !== expected[environment] ||
    !firebase.apiKey ||
    !firebase.appId ||
    firebase.authDomain !==
      (environment === "local"
        ? "localhost"
        : `${firebase.projectId}.firebaseapp.com`)
  )
    throw Error("Invalid Firebase environment configuration");
  // Test ports are fixed loopback endpoints, not user-selectable live routing.
  return {
    environment,
    firebase,
    region: "us-central1",
    emulator: environment === "local",
    authPort: 29099,
    functionsPort: 25001,
    backendSha: pin.backendSha,
    contractVersion: pin.contractVersion,
    contractDigest: pin.contractDigest,
  };
}
