import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { root, verify } from "./site.mjs";
const environment = process.argv[2];
verify(environment);
const folder = path.join(root, "dist", environment),
  port = Number(process.env.EDITORIAL_PREVIEW_PORT ?? 4174);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".json": "application/json",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".png": "image/png",
};
http
  .createServer((req, res) => {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://127.0.0.1").pathname,
    );
    let file = path.resolve(folder, "." + pathname);
    if (!file.startsWith(folder + path.sep) && file !== folder) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!pathname.endsWith("/")) {
        res.writeHead(301, { Location: pathname + "/" }).end();
        return;
      }
      file = path.join(file, "index.html");
    }
    const exists = fs.existsSync(file) && fs.statSync(file).isFile();
    if (!exists) file = path.join(folder, "404.html");
    res.writeHead(exists ? 200 : 404, {
      "Content-Type": mime[path.extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, "127.0.0.1", () =>
    console.log(
      `Local ${environment} built site: http://127.0.0.1:${port}/misattribution/editorial/`,
    ),
  );
