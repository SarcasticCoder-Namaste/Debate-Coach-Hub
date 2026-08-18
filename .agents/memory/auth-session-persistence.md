---
name: Auth session persistence
description: The rule for reliable cookie-session authentication during immediate client redirects.
---

Successful authentication responses must not be sent until the database-backed session has been explicitly saved. This is especially important for guest login, where the client redirects immediately after the mutation resolves.

**Why:** A response can reach the browser before the session store finishes writing the new user ID, so the first redirected request may still be treated as unauthenticated.

**How to apply:** Whenever an auth route sets an authenticated session, await `req.session.save(...)` before sending the success response. Keep the behavior consistent across guest login, sign-in, and sign-up.