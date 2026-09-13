## Emmortals

Privacy-first QR creation and public media tools built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, and Motion.

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Vercel deployment

Import this repository in Vercel and keep the detected **Next.js** framework defaults. Vercel will use:

```bash
npm install
npm run build
```

Copy `.env.example` into the Vercel project settings only when enabling optional media-provider or external rate-limit services. Keep all values server-only.

The app does not require a fixed domain. `robots.txt` and `sitemap.xml` derive their URLs from the active deployment host, including preview deployments.

## Checks

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
# Emmortals
