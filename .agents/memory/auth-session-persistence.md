---
name: Auth session persistence
description: The rule for reliable cookie-session authentication during immediate client redirects.
---

Successful authentication responses must not be sent until the database-backed session has been explicitly saved. This is especially important for guest login, where the client redirects immediately after the mutation resolves.

Every auth URL consumed by the client must also be registered as a server API route. SPA fallbacks can otherwise return `index.html` with status 200, which looks successful at the HTTP layer but breaks JSON parsing in the client.

**Why:** A response can reach the browser before the session store finishes writing the new user ID, so the first redirected request may still be treated as unauthenticated.

**How to apply:** Whenever an auth route sets an authenticated session, await `req.session.save(...)` before sending the success response. Keep the behavior consistent across guest login, sign-in, and sign-up. When a client query uses an auth endpoint, ensure it is defined before any SPA catch-all and disable caching for session-state responses.