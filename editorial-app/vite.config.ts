import { defineConfig } from "vitest/config";
import { configFor } from "./config";
export default defineConfig(({ mode }) => ({
  plugins: [
    {
      name: "editorial-csp",
      transformIndexHtml(html) {
        const c = configFor(mode);
        const connect = c.emulator
          ? `http://127.0.0.1:${c.authPort} http://127.0.0.1:${c.functionsPort}`
          : `https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://us-central1-${c.firebase.projectId}.cloudfunctions.net https://${c.firebase.authDomain}`;
        const csp = `default-src 'self'; script-src 'self' https://apis.google.com https://www.gstatic.com; style-src 'self'; img-src 'self' data:; connect-src 'self' ${connect}; frame-src https://${c.firebase.authDomain} ${c.emulator ? `http://127.0.0.1:${c.authPort}` : ""}; object-src 'none'; base-uri 'none'; form-action 'self'`;
        return html.replace("__EDITORIAL_CSP__", csp);
      },
    },
  ],
  base: "/misattribution/editorial/",
  define: { __PORTAL_CONFIG__: JSON.stringify(configFor(mode)) },
  esbuild: { jsx: "automatic" },
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
  preview: { host: "127.0.0.1", port: 4174, strictPort: true },
  build: { sourcemap: false },
  test: {
    environment: "jsdom",
    setupFiles: ["tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    restoreMocks: true,
  },
}));
