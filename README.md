# Quiz Arena — Frontend

React 19 + Vite 7 + Tailwind 4 + Socket.io client. Deployed to Vercel.

See the [project root README](../README.md) for architecture, deployment
flow, and the PWA / install-app details.

## Scripts

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build to ./dist
npm run preview    # preview the built app
npm run lint
```

## Local dev talking to local backend

The `BASE_URL` in [`src/utils/api.js`](./src/utils/api.js) auto-detects
`localhost` and points to `http://localhost:4000`. Anywhere else, it hits
the deployed backend `https://quizbackend-uevc-hvrc.onrender.com`.

To override at build/preview time:

```bash
VITE_SERVER_URL=https://my-other-backend.example.com npm run build
```

## PWA notes

The app is a Progressive Web App via
[`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) — configured in
[`vite.config.js`](./vite.config.js). Users can install it from their
browser and launch it from the phone home screen.

The install prompt UI lives in
[`src/components/InstallPWA.jsx`](./src/components/InstallPWA.jsx) — it
shows on Android/Chrome/Edge when the browser is ready to install, and
shows a manual "Share → Add to Home Screen" hint on iOS Safari.

Icons live in `public/`. Currently only `icon.svg` is committed —
drop `apple-touch-icon.png` (180×180), `icon-192.png`, `icon-512.png`, and
`icon-512-maskable.png` next to it for pixel-perfect rendering on every
platform. Without them the SVG is used as a fallback.

## Routes

| Path | Screen |
|---|---|
| `/` | Player registration → live match → champion screen |
| `/admin` | Admin dashboard (login required) |
| `/view` | Big-screen spectator / livestream broadcast view |
