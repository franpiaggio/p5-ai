# Blog

Long-form articles about how this project works. Each post is a Markdown file
(versioned, kebab-case: `N.M-slug.md`) that later gets distilled into
LinkedIn / X posts. `N` is the article number; `M` bumps on major revisions
(e.g. `1.0` condensed original, `1.1` annotated edition with sources) so both
editions stay readable side by side.

## Workflow

1. Draft the article as `N.M-title.md` in this folder. Use ` ```mermaid ` blocks
   for diagrams — GitHub renders them natively.
2. Preview it styled: serve this folder and open `preview.html`:

   ```bash
   npx serve blog        # from the repo root
   # then open http://localhost:3000/preview.html?post=1.1-building-a-cursor-like-editor-for-p5js-annotated
   ```

   (Any static server works; `preview.html` fetches the `.md` given in `?post=`,
   so it needs http, not `file://`.)
3. Screenshots live in `images/` and are captured from the real app by
   `capture-screenshots.mjs` (Playwright against the dev server on :5173,
   LLM mocked at the network layer like the e2e tests):

   ```bash
   pnpm dev                          # app must be running
   node blog/capture-screenshots.mjs # regenerates blog/images/*.png
   ```

4. When a post is final, extract the social snippets (hook + 2-3 key ideas +
   link) into a `N.M-title.social.md` alongside it.

## Posts

| # | Title | Status |
|---|-------|--------|
| 1.0 | [Building a Cursor-like AI editor for p5.js](1.0-building-a-cursor-like-editor-for-p5js.md) — condensed original | Draft |
| 1.1 | [Building a Cursor-like AI editor for p5.js (annotated edition)](1.1-building-a-cursor-like-editor-for-p5js-annotated.md) — expanded, friendlier, with sources | Draft |
| 1.2 | [Building a Cursor-like AI editor for p5.js (illustrated edition)](1.2-building-a-cursor-like-editor-for-p5js-illustrated.md) — prose rewrite + app screenshots | Draft |
| 1.3 | [Building a Cursor-like AI editor for p5.js](1.3-building-a-cursor-like-editor-for-p5js.html) — standalone designed HTML (own typography, numbered figures, sources; no preview.html needed) | Draft, latest of article 1 |
| 2.0 | [Six ways an LLM can edit your code](2.0-six-ways-an-llm-can-edit-your-code.html) — standalone HTML; focused taxonomy of edit formats, one running example, verdict per format | Draft, latest of article 2 |
| 3.0 | [What a tiny AI editor taught me](3.0-learning-by-building-a-p5js-ai-editor.html) — standalone HTML; personal-journey angle: the project as a learning machine, LLMs as tutor, four case files | Draft, latest of article 3 |
