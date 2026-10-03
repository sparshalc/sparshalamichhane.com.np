# Placeholders and open items

No placeholder chips are left on the page. If you add new stand-in content, wrap it
in `<span class="ph">…</span>` (dashed red chip) so it's easy to find later.

## Filled from LinkedIn (Oct 2026)

Education years, Danphe titles and dates, and the 2020 design roles now come from
your LinkedIn export. Update the story timeline in `#story` if any of it changes.

## Resume

Your LinkedIn profile stands in for a resume for now (the LinkedIn row in the
contact links says "# my resume, for now"). To add a PDF later, put `resume.pdf`
in the site root and add a row to `.links` in `#hello`:

```html
<li><a href="resume.pdf" data-log="Sending file {b:resume.pdf}"><span class="links__k">resume</span><span class="links__v">.pdf</span><span aria-hidden="true">↓</span></a></li>
```

## Draft copy to review

All of these are written in your voice but are my wording, not quotes:

- Hero lede, story paragraphs, section intros.
- Every `# quip` in the offline tiles, and the design piece names
  ("Slow Kingdom", "CR7") in the `#peek-data` JSON.
- Log-panel jokes in `js/main.js` → `LAYER_LINES`, the vim command replies in
  `initVim`, and `BOOT_LINES`.

## Domain

`https://sparshalamichhane.com.np/` is hard-coded in `index.html` (canonical,
Open Graph, JSON-LD), `robots.txt` and `sitemap.xml`. Change all of them if the
site moves.
