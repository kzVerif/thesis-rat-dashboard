# Dashboard HTTPS/WSS

Production requires these at next build and next start:

```dotenv
API_URL=http://127.0.0.1:8080
PUBLIC_DASHBOARD_ORIGIN=https://lab.example.com
NEXT_PUBLIC_FRONTEND_WS_URL=wss://lab.example.com/ws/frontend
```

API_URL is server-only and may be HTTP only to a trusted same-host loopback origin.
A remote REST server must use HTTPS. Normal Node certificate verification must
remain enabled. No TLS bypass or custom trust download is introduced.

NEXT_PUBLIC_FRONTEND_WS_URL is compiled into the browser bundle: rebuild when
changing it. Production build/start fails for missing/insecure URLs or a WS
hostname different from the Dashboard hostname. This preserves the existing
host-only __Host-session cookie. Local next dev retains current localhost fallbacks.
The cookie stays Secure, HttpOnly, SameSite and Path=/; browser cookie policy
still applies to development. Do not put session tokens in URLs.

Cloudflare routes lab.example.com/ws/frontend to local WS :8081, and every other
Dashboard path (including /api/*) to Next.js :3000. The existing Next.js proxy
forwards REST requests and cookies. Do not route Dashboard /api/* directly to Go,
because Next.js contains the existing proxy/application behavior.
Use npm run start -- --hostname 127.0.0.1 behind same-host cloudflared.
Keep public Host/Origin correct and strip/overwrite spoofed forwarding headers.
Production auth request origins are compared with PUBLIC_DASHBOARD_ORIGIN,
not client-controlled X-Forwarded-Host or development tunnel wildcards.
RBAC/session logic and WebSocket payloads are unchanged.

The WS repository contains the shared deploy/cloudflared.example.yml.
Do not weaken cookie Domain to bridge separate Dashboard and WS subdomains.
After deployment verify login/logout, /ws/frontend, file distribution, scan,
power, screens, process/performance and session expiry in the real browser.
TLS server authentication does not supply future Agent Ed25519 authentication.
