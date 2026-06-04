# IoT Ops Scorecard — Governance Dashboard

A clean, minimal governance scorecard dashboard for IoT Delivery & Operations teams. KPI targets, measurements, and weights by role — designed for executives and team leads.

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) (React 19 + file-based routing)
- **Styling:** Tailwind CSS v4
- **Build Tool:** Vite 7
- **Package Manager:** Bun

## Prerequisites

- [Bun](https://bun.sh) (v1.2 or later)
- Node.js 20+ (for running the prerender script locally)

## Local Development

```bash
# Install dependencies
bun install

# Start the dev server
bun dev
```

The app will be available at `http://localhost:3000`.

## Build

```bash
# Production build (outputs dist/client + dist/server)
bun run build

# Generate a static index.html for static hosting
node scripts/prerender.mjs
```

After building and prerendering, the static site lives in `dist/client/` and can be served with any static file server:

```bash
npx serve dist/client
```

## Deploy to GitHub Pages

This repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys to GitHub Pages on every push to `main` or `master`.

### Setup

1. Push this repository to GitHub.
2. Go to **Settings → Pages** in your GitHub repository.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. The next push to `main` will trigger the workflow and publish your site.

> **Project sites:** The workflow automatically sets the correct `base` path (`/<repo-name>/`) so assets load correctly on GitHub Pages project sites.

### Manual Deploy

If you prefer not to use GitHub Actions:

```bash
bun install
VITE_BASE_PATH=/<your-repo-name>/ bun run build
node scripts/prerender.mjs
# Upload the contents of dist/client/ to your static host
```

## Deploy to Other Platforms

Because this app is fully client-side with no backend dependencies, it can also be deployed to:

- **Vercel** — Connect your GitHub repo; zero config required.
- **Netlify** — Connect your GitHub repo; zero config required.
- **Cloudflare Pages** — Connect your GitHub repo; zero config required.
- **Any static host** — Build, prerender, and upload `dist/client/`.

## Project Structure

```
src/
  data/scorecard.ts          # KPI data & types
  routes/
    __root.tsx               # Root layout (shell, providers)
    index.tsx                # Dashboard page
  styles.css                 # Tailwind entry + design tokens
  router.tsx                 # Router setup
  server.ts                  # SSR entry point
scripts/
  prerender.mjs              # Post-build static HTML generator
```

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| Background | `#FFFFFF` | Page background |
| Primary | `#C0392B` | Headings, accents, CTAs |
| Rose tint | `#FDECEA` | Badges, highlights |
| Text (headings) | `#1A1A1A` | Headings |
| Text (body) | `#555555` | Body text |
| Border | `#E0E0E0` | Dividers, table borders |
| Success | `#27AE60` | Positive indicators |
| Warning | `#F39C12` | Caution indicators |

## License

Internal tool — proprietary to e& Enterprise · IoT Delivery & Operations.
