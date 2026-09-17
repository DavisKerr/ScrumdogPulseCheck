Instructions for AI coding agents working in this repository. Follow these rules on every task. If a request conflicts with them, say so in the pull request description instead of silently changing the architecture.

Project overview
Frontend: React + Vite, built to dist/.
Backend: Netlify Functions (serverless), in netlify/functions/.
Storage: Netlify Blobs, site-wide store, accessed only from functions.
Hosting: Netlify, continuous deploy from the main branch.
Architecture rules — do not deviate
All persistent data goes in Netlify Blobs. Do not add Postgres, Supabase, Firebase, Mongo, Prisma, or any other database or storage service.
Do not add a server framework. No Express, Fastify, Koa, NestJS, or server.js. Netlify Functions are the entire backend.
The browser never touches the blob store directly. Blobs are readable and writable only from functions and edge functions. The frontend calls /api/... endpoints.
localStorage is never the source of truth. It may be used for UI preferences only (theme, collapsed panels). Anything a second user or a second device should see must be in Blobs.
No secrets, tokens, site IDs, or API keys in frontend code. Inside functions, Netlify supplies blob credentials automatically.
Netlify Blobs rules
js
import { getStore } from "@netlify/blobs";

const store = getStore({ name: "app-data", consistency: "strong" });
Always getStore. Never getDeployStore. A deploy store is scoped to a single deploy, so its data disappears on the next deploy. getStore is site-wide and persists across deploys, which is what this project needs.
Never pass siteID or token to getStore. They are injected automatically inside functions. Passing them means hardcoding credentials.
Use consistency: "strong" for this app. The default is eventual consistency, where updates and deletions can take up to 60 seconds to reach all edge locations. Users here save something and immediately expect to see it, so accept the slightly slower reads.
Write JSON with setJSON(key, value). Read it with get(key, { type: "json" }). A missing key returns null, never throws — always handle null.
One key per record. Never one big JSON array of everything. Blobs has no concurrency control and the last write wins, so two people saving at once would silently overwrite each other's work if all records shared a key.
Namespace keys with a prefix and a slash, e.g. items/<uuid>, settings/theme. List a group with store.list({ prefix: "items/" }).
Generate IDs with crypto.randomUUID().
Never use raw user input as a key. Validate and sanitize it, or derive the key from a UUID you generate. Keys cannot start with / and cannot exceed 600 bytes.
For an update that must not clobber a concurrent change, read with getWithMetadata and write with { onlyIfMatch: etag }; for a create that must not overwrite, use { onlyIfNew: true }. Both return { modified } — check it and return a 409 when it is false.
Deleting is store.delete(key). Never call store.deleteAll() in application code.

Be aware: the site-wide store is shared by production, branch deploys, and deploy previews. Preview code can read and overwrite live data. Never write destructive or bulk-rewrite logic that runs automatically on load.

Function conventions
One file per resource in netlify/functions/, using the modern handler signature (export default async (req, context) => Response).
Routing is handled by netlify.toml redirects. Do not use the export const config = { path: ... } form — one routing mechanism only.
Always return JSON with Response.json(...) and a correct status code.
Validate the request body. Reject unexpected shapes with a 400.
Wrap blob calls in try/catch and return a 500 with a short message, never a raw stack trace.

Reference implementation, netlify/functions/items.mjs:

js
import { getStore } from "@netlify/blobs";

const store = () => getStore({ name: "app-data", consistency: "strong" });

export default async (req) => {
  try {
    if (req.method === "GET") {
      const { blobs } = await store().list({ prefix: "items/" });
      const items = await Promise.all(
        blobs.map((b) => store().get(b.key, { type: "json" }))
      );
      return Response.json(items.filter(Boolean));
    }

    if (req.method === "POST") {
      const body = await req.json();
      if (typeof body?.title !== "string" || body.title.trim() === "") {
        return Response.json({ error: "title is required" }, { status: 400 });
      }
      const id = crypto.randomUUID();
      const item = {
        id,
        title: body.title.trim(),
        createdAt: new Date().toISOString(),
      };
      await store().setJSON(`items/${id}`, item);
      return Response.json(item, { status: 201 });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Storage error" }, { status: 500 });
  }
};
Frontend conventions
Call the backend with relative paths only: fetch("/api/items"). Never a full URL, never a hardcoded .netlify.app domain.
Show a loading state while fetching and a visible error message on failure. Never fail silently.
After a successful write, refetch or update local state from the response — do not assume the write succeeded without checking response.ok.
netlify.toml

This file is the source of truth for build and routing config. Keep it in sync and do not move settings into the Netlify dashboard. The /api/* rule must come before the SPA catch-all, or API calls will return index.html.

toml
[build]
  command = "npm run build"
  publish = "dist"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
Constraints to respect
Node.js 18 or later (Blobs needs the built-in fetch).
@netlify/blobs must be a dependency in package.json.
Store names: no / or :, under 64 bytes. Keys: under 600 bytes, cannot start with /. Objects: up to 5 GB, metadata up to 2 KB.
Local development uses a sandboxed local store. Production data is not readable locally, so do not write tests or scripts that assume it is.
Definition of done

Before opening a pull request:

npm run build succeeds.
Every new data path reads and writes through a function, not the browser.
Every blob read handles null.
New endpoints are reachable at /api/<name> and documented in README.md.
The PR description lists which files changed and what to click in the deploy preview to verify the change.
