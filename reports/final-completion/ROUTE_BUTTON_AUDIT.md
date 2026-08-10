# Route / button audit (local Vite)

All listed routes returned HTTP 200. No empty `href="#"` primary nav links found.
Account page requires fresh Vite module graph after heavy TS renames (lazy chunk 404
cleared after restart) — verified `h1: Sign in`.

PWA: `public/sw.js` served 200.

## Routes checked
`/ /shop /cart /checkout /customize /teams-wholesale /account /favorites /compare
/search /contact /help /about /our-work /order-tracking /special-request
/shop/ready-to-ship`
