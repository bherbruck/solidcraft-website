# SolidCraft website

A locally reviewable MVP for SolidCraft’s public website. Built with static Astro, React, strict TypeScript, Tailwind v4, and Zustand. Includes real upstream product media, release downloads, and the existing SolidCore progress reports.

The application lives in [`apps/frontend/solidcraft-landing/`](apps/frontend/solidcraft-landing/). Its package owns the Astro configuration, source, public assets, scripts, and tests. The repository root owns the pnpm workspace and shared lockfile; the commands below forward to the solidcraft-landing package.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open `http://localhost:4347`. Both `pnpm dev` and `pnpm preview` use port 4347. Node **24.10.0** and pnpm **12.10.1** are pinned. Documentation links use https://docs.solidcraft.io/; the browser app retains its upstream destination.

```sh
pnpm typecheck
pnpm test:unit
pnpm build
pnpm test:e2e
pnpm test:dev
```

You can also run the app scripts directly from `apps/frontend/solidcraft-landing/`.

For browser tests, install the pinned Playwright browser once with `pnpm --filter @solidcraft/solidcraft-landing exec playwright install chromium` if it is not already cached. The test suite starts and stops its own static server on port 4322, applying the built security headers.

The development regression uses a separate foreground server on port 4348 and confirms downloads continue working while a production build runs. It preserves your existing development server on port 4347.

`pnpm build` validates source data and imported media, produces `apps/frontend/solidcraft-landing/dist/`, checks all local output references and Pages size limits, and generates an enforced Content Security Policy. The result is static files; no application server or credentials are required. CI runs from the application directory after installing the root workspace.


This review build uses `noindex` in HTML and response headers, plus a restrictive robots policy. It has not been deployed. Production domain cutover and official-site/operator review are separate launch steps.

Release versions and desktop/CLI packages refresh directly from public GitHub Releases in the browser, with a five-minute cache and a saved offline/no-JavaScript fallback. Publishing a new upstream release does not require rebuilding the website.

For Cloudflare Pages, use root directory `apps/frontend/solidcraft-landing`, build command `pnpm build`, and output directory `dist`. The app-level `.node-version` pins Node 24.10.0 when Pages uses that subdirectory. Remove any conflicting `NODE_VERSION` environment override or set it to `24.10.0`; Node 22.16.0 cannot execute the repository’s TypeScript scripts directly.

SolidCore progress loads directly from the upstream progress site. Failed loads show an error and retry; no progress snapshot or stale-data fallback is shipped.
