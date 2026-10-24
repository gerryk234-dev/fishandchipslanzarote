// Local preview that behaves like the Vercel deployment: serves dist/ and runs api/*.js.
//   npm run dev   →  http://localhost:8080
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const PORT = Number(process.env.PORT) || 8080;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml" };

// Minimal Vercel-style req/res helpers for the API handlers.
function vercelRes(res) {
  res.status = (code) => ((res.statusCode = code), res);
  res.json = (obj) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(obj));
    return res;
  };
  return res;
}

http
  .createServer(async (req, res) => {
    const u = new URL(req.url, `http://${req.headers.host}`);
    if (u.pathname.startsWith("/api/")) {
      const name = u.pathname.slice(5).replace(/[^a-z0-9-]/gi, "");
      const file = path.join(root, "api", `${name}.js`);
      if (!fs.existsSync(file)) return vercelRes(res).status(404).json({ error: "not_found" });
      const chunks = [];
      for await (const c of req) chunks.push(c);
      const raw = Buffer.concat(chunks).toString();
      req.query = Object.fromEntries(u.searchParams);
      try {
        req.body = raw && /json/.test(req.headers["content-type"] || "") ? JSON.parse(raw) : raw;
      } catch {
        req.body = raw;
      }
      const { default: handler } = await import(pathToFileURL(file).href);
      try {
        return await handler(req, vercelRes(res));
      } catch (err) {
        console.error(err);
        return vercelRes(res).status(500).json({ error: "server_error" });
      }
    }
    let p = path.normalize(decodeURIComponent(u.pathname)).replace(/^(\.\.[/\\])+/, "");
    let file = path.join(dist, p);
    if (!file.startsWith(dist)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) {
      res.writeHead(404, { "content-type": TYPES[".html"] });
      return fs.createReadStream(path.join(dist, "404.html")).pipe(res);
    }
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`Tickets Direct preview on http://localhost:${PORT}`));
