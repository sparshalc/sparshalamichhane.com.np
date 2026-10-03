# sparshalamichhane.com.np

Personal site of Sparsha Lamichhane. The whole page is one Rails request:
scrolling moves a ruby down the stack (router → controller → model →
association → view → response), and a small server log narrates each layer.

Hand-written HTML, CSS and JS. No framework, no build step, no trackers.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly also works; only `404.html` needs a server
(it uses root-absolute paths).

## Structure

```
index.html          all content (SEO-friendly; works without JS)
404.html            Rails-style RoutingError page (GitHub Pages / Netlify / Cloudflare pick it up)
css/style.css       tokens → base → chrome → sections → motion states
js/main.js          progressive enhancement: log, rail, boot, filters, vim mode, composer
fonts/              self-hosted Bricolage Grotesque + JetBrains Mono (latin, OFL)
img/                portrait + project covers (webp, 640/1200 widths)
                    sparshalc.jpg is the portrait master; sparshalc-640/1080 are 4:5 crops of it
og.png              1200×630 social preview
favicon.svg/.ico, apple-touch-icon.png, icon-512.png, site.webmanifest
robots.txt, sitemap.xml
PLACEHOLDERS.md     what still needs real content
```

## Editing content

- **Projects:** each featured project is an `<article class="record">` in
  `#work`; smaller ones are `<li>` rows in `.more__list`. `data-tags` drives the
  scope filters (`rails`, `hotwire`, `hardware`, `tools`). If you add a project,
  update the `18 rows` count in `.scopes__count` and the `12 rows` in
  `.more__query`.
- **Open source:** `#oss`, one `<section class="repo">` per repository.
- **Timeline:** `#story` → `.callbacks`. Each `<li id="cb-…">` matches a
  `before_action` link in the code panel above it (`data-cb`).
- **Log lines:** `LAYER_LINES` in `js/main.js`. Markup: `{r:ruby}`, `{g:green}`,
  `{m:muted}`, `{b:bold}`. Hover lines come from `data-log` attributes in the HTML.
- **Colours / type:** the tokens at the top of `css/style.css`. Day and night
  themes are defined there; the page follows the OS until someone flips the
  `env=` toggle.

## Off-duty tiles (`#offline`)

Hovering a tile shows a card that follows the pointer; clicking (or tapping)
turns sound on and plays. Content is the JSON block `<script id="peek-data">`
at the end of that section in `index.html`:

```json
"music": { "items": [
  { "title": "Russ — 3:15 (Breathe)",
    "images": ["img/artists/russ-480.webp", "img/artists/russ-2-480.webp"],
    "audio": "https://audio-ssl.itunes.apple.com/…m4a",
    "link":  "https://music.apple.com/…" }
] }
```

- `images` are 480×480 webp crops of the originals in `img/artists`, `img/games`
  and `img/design`. Several images flip as the pointer moves. An image can also be
  `{ "src": "…", "title": "…" }` to give it its own caption.
- `audio` is Apple Music's official 30-second preview, streamed from Apple (never
  self-hosted). To add a song, look it up and copy `previewUrl` and `trackViewUrl`:
  `https://itunes.apple.com/search?term=artist+song&entity=song&limit=5`
- Several items in one tile: clicking moves to the next one. An optional
  `"kicker"` adds a small `# comment` line above the title on the card. `"vim": true` renders
  the little editor card with synthesised key clicks instead of an image.
- Sound is off until the visitor turns it on (toggle or click). Nothing plays on
  page load.

## Interactions

- `env=day/night` theme toggle (remembered per browser).
- Scope filters on the work section.
- GlowCart cover: hover/tap to "place an order"; the LED stays on for 7 s, like
  the real Arduino sketch.
- Vim keys: `j`/`k` sections, `gg`/`G` top/bottom, `:` command line
  (`:help`, `:work`, `:theme`, `:log`, `:q`). Toggle in the footer or `:set novim`.
- Contact composer builds a `mailto:` link. Nothing is sent from the page.
- `prefers-reduced-motion` turns off the boot sequence, typing, the gem morph
  and all reveals.

## Deploy

Any static host. For GitHub Pages, push these files to the root of the
`portfolio_site` repo (or a `gh-pages` branch). Fonts and images are already
optimised; there is nothing to build.
