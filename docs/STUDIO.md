# Video Studio (Hyperframes)

The **Studio** page of the dashboard embeds [Hyperframes Studio](https://hyperframes.heygen.com) —
a browser-based video-composition editor with a visual timeline, a code editor
(HTML + GSAP), live preview, and MP4/WebM rendering.

## How it's wired

The studio edits real files and renders video on a machine, so it can't run on
the static web host. Instead:

- `studio-project/` holds the composition (a committed Hyperframes project —
  `index.html` is the video).
- `npm run studio` starts the studio server locally on port **3002**
  (`hyperframes preview studio-project`). The `hyperframes` CLI is a
  devDependency and ships the studio UI inside it.
- `studio.html` (the dashboard's Studio page) probes `http://localhost:3002`
  every few seconds. The moment the server is up, the page embeds the full
  editor in place; when it isn't, it shows launch instructions instead.

Browsers treat `localhost` as a trustworthy origin, so the hosted (https)
dashboard is allowed to embed your local studio. If your browser is strict
about it (older Safari), use the **Open in tab ↗** button in the page header.

## Daily use

```bash
npm run studio     # start the editor server (leave the terminal open)
```

Then open the **🎬 Studio** page in the dashboard. Edits save straight into
`studio-project/` — commit them like any other change. Rendered videos land in
`studio-project/renders/` (gitignored).

The default port is 3002; if you run it elsewhere
(`npx hyperframes preview studio-project --port=4000`), change the port in the
launch card on the Studio page — it's remembered per browser.

## Rendering from the terminal

The scaffolded project has its own scripts too:

```bash
cd studio-project
npm run check      # lint + validate the composition
npm run render     # render to MP4 (needs Chromium + ffmpeg via the CLI)
```

## Gotcha: don't add `@hyperframes/studio` as a dependency

`hyperframes preview` switches into a "develop the studio from source" mode
whenever it can resolve `@hyperframes/studio` from the project folder — that
mode needs the studio's dev toolchain and breaks here. The CLI already embeds
the same studio build, so the dashboard intentionally depends only on the
`hyperframes` CLI.
