# dsh-creative-studio 「创作台」

**DSH 里的内容创作工作台：写内容、做设计、找素材、改 Logo 都在一个面板里。**

A content studio for DSH: write, design, source assets and edit logos in one panel.

[![Version](https://img.shields.io/badge/version-0.6.1-blue)](package.json)
[![License](https://img.shields.io/badge/license-AGPL--3.0--only-green)](LICENSE)
[![Platform](https://img.shields.io/badge/DSH-DeepSeek%20Harness-5b5ef7)](https://github.com/frankfurtlin/dsh-pocket)

[中文](README.md) · [English](README.en.md)

![Creative Studio panel](verification/shots/01-sidebar.png)

## What it is

Creative Studio gathers four content-production tools that used to live in four different places into a single DSH plugin: the social-media workflow from `dsh-media-desk` (ideas, posts, scheduling, review, style), the design skills from `dsh-guizang-design` (web PPT, social cards, page layout, de-AI-ify), the 103-component threeui gallery, and a pixel/vector logo editor. The sidebar gains exactly one entry, and the four workbenches share one light design system and one title area, so writing, designing, browsing assets and editing a logo all happen in the same panel.

The problem it solves is that the production flow itself spans several tools: ideas and drafts sit in one place, decks and cards in another, and assets and logos on yet another site, so context gets lost every time you switch. Everything now lives under Creative Studio, and a finished design can be handed straight to the content workbench.

## Features

- **Content** — five views (Ideas, Posts, Schedule, Review, Style) that take you from a one-line idea to a finished post, plus a monthly schedule.
- **Design** — web PPT, social cards and page-layout skills with a works library and a personal voice profile; "Use for content" hands a piece over to the content workbench.
- **Assets** — the threeui gallery with 103 components, each card showing its Chinese name and English API name, with bilingual search and one-click copy.
- **Logo** — a pixel/vector editor with three masters, layers, version snapshots and export; project data stays on the local machine.
- **Unified shell** — accordion navigation in the left column, one title area, a global "New" menu, and an assistant that starts collapsed and remembers its state.
- **Live panes** — all four panes mount on first visit and are only hidden afterwards, so state survives switching; the vendor bundle is externalized and fetched the first time you open Creative Studio.
- **Verifiable** — `verification/verify-ui.mjs` replays 68 real-browser assertions in headless Chromium.

## Install

```bash
# Preferred: Plugins → Add plugin → paste this repo's absolute path → Install →
# turn on the dsh-creative-studio switch → reload the page.
# Equivalent manual install:
cd /root/.dsh/profiles/web
pnpm add "dsh-creative-studio@link:/root/workspace/plugins/dsh-creative-studio"
# then add "dsh-creative-studio" to dsh.profile.bundles in the profile's package.json
pnpm install && systemctl restart deepseek-harness
```

The plugin is consumed as a `link:` dependency, so it is never published to npm and the profile always reads the working copy.

## Configuration

There are no API keys or external services. Everything the plugin serves — routes, pages, data — runs inside the DSH host process, and the only runtime configuration is where the DSH host keeps its state.

| What | Where | Contents |
| --- | --- | --- |
| Content workbench data | `$DSH_HOME/media-desk` | ideas, posts, schedule, style settings |
| Design library and voice profile | `$DSH_HOME/creative-studio` | works, per-work metadata, voice profile |
| Logo projects | `$DSH_HOME/pixel-logo-lab` | current project plus version snapshots, seeded from the bundled `data/current-project.json` on first run |
| Profile wiring | `dsh.profile.bundles` in `/root/.dsh/profiles/web/package.json` | must contain `dsh-creative-studio` |

Installing the dependency without adding the bundle entry is the usual failure: the package is present after a reload, but no "创作台" entry appears.

The three npm dependencies exist only for the bundled skill scripts and thumbnails: `playwright` (pinned to `1.63.0` to match the existing `chromium-1243` under `~/.cache/ms-playwright`, so no browser download is needed), `puppeteer-core` (lazy-loaded for PDF / long-image export in `guizang-page-skill`) and `subset-font` (font subsetting in the PPT and card scripts). They install into the plugin's own `node_modules`, because a `link:`ed package does not get its dependencies installed by the profile:

```bash
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 pnpm install
```

## Usage

Open **创作台** in the sidebar. The left column lists the four workbenches; picking one expands its sub-views, and the content area shows the current page title with a one-line description and its actions.

| Workbench | Sub-views | Notes |
| --- | --- | --- |
| Content | Ideas, Posts, Schedule, Review, Style | React pane rendered from the vendored client bundle |
| Design | works library, gallery | same-origin iframe, embedded mode |
| Assets | 103 components | same-origin iframe, 3 columns at a 923px content width |
| Logo | editor | same-origin iframe, tools column plus canvas |

- The assistant is collapsed by default; opening it turns the corner button into a title-area button, and the state is kept in `localStorage` across reloads.
- The global "New" menu offers: record an idea, write a post, make a web PPT, open the logo editor, browse the asset library.
- `⌘[` / `Ctrl+[` returns to the chat, and `↑` / `↓` move focus through the left column (it is `role="navigation"` with `aria-expanded` / `aria-haspopup` set).
- "Use for content" on a design work posts the title across tabs, so the content workbench shows an "imported from Design: …" bar and can drop the piece into the assistant composer.

## How it works

The plugin is a normal two-half DSH plugin, built so that the four upstream projects live inside it:

- `lib/index.js` is the host half: it mounts both vendored `apply(ctx)` functions plus two static servers, `/studio-elements/*` (gallery build output) and `/pixel-logo/*` (editor pages and the project/version JSON API).
- `client.js` is generated: `scripts/build-client.mjs` executes each vendored client bundle against a fake `window.__ModuleLoader__`, serializes the resulting `factory` and inlines it next to the shell source from `src/client.js`.
- The vendored factories start with a restricted `ctx`: their `sidebar.panellist` registrations are dropped so the sidebar keeps a single row, while `main`, betterSidebar, theme, locale and uiWorkspace pass through untouched.
- Content renders the vendored `main`-slot component directly; Design, Assets and Logo are same-origin iframes with `data-cs-embed=1` and an injected `#dsh-cs-theme` stylesheet that hides duplicated navigation.
- Because `client.js` used to carry roughly 260KB of vendor factories and was preloaded with every plugin at DSH startup, those factories now live in `vendor/media-desk/assets/vendor-factories.js` and are pulled with a `<script>` tag on first entry (`ensureVendorsBooted()`), cutting `client.js` from 340KB to 87KB.

The shared light design system (also the target of the embed overrides):

| Use | Value |
| --- | --- |
| Page / panel / raised background | `#f5f5f3` / `#fbfbf9` / `#ffffff` |
| Dividers (three steps) | `#e3e3df` / `#ededeb` / `#cdcdc7` |
| Text (three steps) | `#141414` / `#4d4d49` / `#787874` |
| Accent | `#1f7a68` for selection and interaction; primary buttons are ink `#141414` |
| Radii | 8px controls, 12px cards, 16px panels |
| Type | Inter + Noto Sans SC; JetBrains Mono for monospace |

Content-level colors are deliberately excluded from the overrides: the Swiss palette on the design pages, the dark logo canvas, and the WebGL stage of the component gallery.

## Repository layout

```
dsh-creative-studio/
├─ client.js                  generated: src/client.js + the two vendored client factories
├─ src/client.js              shell source (navigation, title area, panes, embed styles, cross-tab)
├─ scripts/build-client.mjs   build: capture the vendor factories and inline them into client.js
├─ lib/index.js               host half: mounts all four vendors on one plugin
├─ lib/elements.js            /studio-elements/* static server for the gallery build
├─ lib/pixel-logo.js          /pixel-logo/* static server + project/version JSON API
├─ vendor/media-desk/         content workbench (upstream 2.7.1, MIT)
├─ vendor/guizang-design/     design workbench (upstream 0.1.4, AGPL-3.0-only)
├─ vendor/threeui/            asset gallery build output (103 components)
├─ vendor/pixel-logo-lab/     logo editor pages (index.html / app.js / styles.css)
├─ threeui-src/               gallery source (React + Vite)
├─ verification/verify-ui.mjs real-browser acceptance
├─ README.md / README.en.md / NOTICE.md / LICENSE
```

## Development

```bash
npm run build:client    # regenerate client.js after touching src/client.js or a vendored UI
npm run check           # node --check on every entry point
node verification/verify-ui.mjs   # 68 browser assertions; TOKEN=... overrides the login token
```

Which files to edit depends on the workbench:

- **Content** — only `vendor/media-desk/src/**` (host side). Its browser bundle is a build artifact; UI changes go through the shell's injected CSS and behavior.
- **Design** — `vendor/guizang-design/gallery/` (`app.js`, `style.css`, `i18n.js`) is directly editable source.
- **Assets** — edit `threeui-src/src/**`, then rebuild and copy:

  ```bash
  cd threeui-src && npm run build
  rsync -a --delete build/elements-dist/ ../vendor/threeui/
  ```

- **Logo** — `vendor/pixel-logo-lab/index.html`, `app.js` and `styles.css` are editable in place.

The last recorded run of the acceptance script was **68 passed, 0 failed** (2026-11-19, v0.6.1) against the local DSH web instance. Screenshots land in `verification/shots/`, `01-sidebar.png` through `12-mobile.png`.

## Known limitations

- **Mobile** — DSH's sidebar is a drawer, so on narrow screens the workbench column becomes a top bar plus a sub-view row; the drawer still covers the panel when open, which is host behavior and not changed here.
- **Logo preview drawer** — floating on the right at a 923px content width covers part of the canvas by design; it is collapsed by default.
- **Logo on narrow windows** — the upstream breakpoints (≤1080px / ≤720px) wrap the tool panel below the canvas. The shell forces two columns in embedded mode (220px tools, 180px at ≤560px) and lets the toolbar wrap, so layers and tools stay visible while the canvas gets smaller.
- **Browser zoom** — at ≤1024px DSH collapses its sidebar into a drawer; the shell detects the floating hamburger and reserves 48px so the brand is not covered.
- **Asset previews** — the component stage is WebGL, so some cards render black or blank in headless screenshots while looking fine in a real browser.
- **Assistant and pet** — the assistant button lives in the title area and the bottom-right FAB is offset to avoid the DSH pet overlay.

## Uninstall / rollback

All four workbenches live in this plugin and the original npm packages are gone from the profile, so there is no runtime dependency to unwind. To return to "two plugins installed separately":

1. The backups are in `/root/workspace/plugins/_backup/`: `dsh-media-desk-2.7.1.tgz` and `dsh-guizang-design-0.1.4.tgz`.
2. Turn `dsh-creative-studio` off on the plugins page.
3. `pnpm add dsh-media-desk@2.7.1 dsh-guizang-design@0.1.4` in the profile (or point at the unpacked backups) and enable both bundles again.

## License

This plugin is released under **AGPL-3.0-only**, because it embeds AGPL-3.0 code from `dsh-guizang-design`. Upstream attribution and the list of modifications are in [NOTICE.md](./NOTICE.md):

| Bundled project | Version | License | Copyright |
| --- | --- | --- | --- |
| `dsh-media-desk` | 2.7.1 | MIT | woniuniuniu |
| `dsh-guizang-design` | 0.1.4 | AGPL-3.0-only | op7418 |
| `pixel-logo-lab` | local | own code, previously a Python service | this project |
| `threeui-demo` gallery | build output of `@designcodeio/threeui` 1.2.0 | MIT component library | designcodeio |

Each vendored directory keeps its upstream `LICENSE`, so the per-component terms stay intact.
