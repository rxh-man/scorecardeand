#!/usr/bin/env node
/**
 * Post-build prerender script for static hosting (GitHub Pages).
 *
 * TanStack Start builds client assets + an SSR server. This script runs
 * the built server locally, requests the root route, and writes the
 * server-rendered HTML to dist/client/index.html so the site can be
 * served from any static host.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, "../dist/client");
const outFile = path.join(outDir, "index.html");

// Nitro builds place the worker entry at index.mjs; non-nitro builds use server.js
const candidates = [
  path.resolve(__dirname, "../dist/server/index.mjs"),
  path.resolve(__dirname, "../dist/server/server.js"),
];

let serverPath = null;
for (const p of candidates) {
  if (fs.existsSync(p)) {
    serverPath = p;
    break;
  }
}

if (!serverPath) {
  console.error("❌ Server build not found. Run 'bun run build' first.");
  process.exit(1);
}

const serverModule = await import(serverPath);
const handler = serverModule.default;

if (!handler || typeof handler.fetch !== "function") {
  console.error("❌ Built server does not export a fetch handler.");
  process.exit(1);
}

const basePath = process.env.VITE_BASE_PATH || "/";
const url = new URL(basePath, "http://localhost/").href;

const request = new Request(url, {
  method: "GET",
  headers: { accept: "text/html" },
});

const response = await handler.fetch(request, {}, {});

if (response.status === 307 || response.status === 302) {
  const redirectUrl = response.headers.get("location");
  if (redirectUrl) {
    const followReq = new Request(new URL(redirectUrl, "http://localhost/").href, {
      method: "GET",
      headers: { accept: "text/html" },
    });
    const followRes = await handler.fetch(followReq, {}, {});
    if (followRes.ok) {
      const html = await followRes.text();
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(outFile, html);
      console.log(`✅ Prerendered index.html written to ${path.relative(process.cwd(), outFile)}`);
      console.log(`   ${html.length.toLocaleString()} bytes`);
      process.exit(0);
    }
  }
}

if (!response.ok) {
  console.error(`❌ Server returned ${response.status}.`);
  process.exit(1);
}

const html = await response.text();

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, html);

console.log(`✅ Prerendered index.html written to ${path.relative(process.cwd(), outFile)}`);
console.log(`   ${html.length.toLocaleString()} bytes`);
