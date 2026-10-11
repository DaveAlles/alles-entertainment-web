import { createRoot } from "react-dom/client";
import { App } from "./App";
import { api, backend, portalConfig, session } from "./firebase";
import "./styles.css";
createRoot(document.getElementById("root")!).render(
  <App
    auth={session}
    api={api}
    backend={backend}
    config={{
      environment: portalConfig.environment,
      projectId: portalConfig.firebase.projectId,
      backendSha: portalConfig.backendSha,
    }}
  />,
);
