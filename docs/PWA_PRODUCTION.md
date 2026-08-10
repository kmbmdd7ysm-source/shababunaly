# PWA testing and updates

The service worker uses versioned public caches only. Account, Supabase auth/private tables, and checkout routes are network-only.

Test over HTTPS: install, revisit, go offline, open a visited public page, reconnect, deploy a new `VERSION` in `public/sw.js`, and confirm the non-blocking update banner. Do not force an update while a form has focus. Increment the version for deployments that change cached assets.
