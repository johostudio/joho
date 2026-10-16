# Joho Portfolio

Temporary portfolio for engineering, design, multimedia, and life updates.

## Editing the site

- Open `/edit` on the deployed site for a live Markdown editor and preview.
  Publishing requires a fine-grained GitHub token limited to this repository
  with `Contents: read and write`; the token is held only in the current tab.
- The editable homepage copy is stored in `content/site.md`. Use headings for
  sections, hyphens for list items, and `[label](https://example.com)` for
  inline links. Publishing from `/edit` commits this file to `main`, which
  triggers the Vercel deployment.
- Secondary-page messages are editable in that file's top metadata block;
  navigation remains in `src/content.js`.
- The home photo's hover caption is the `profileImageCaption` field in
  `content/site.md`.
- The `nodes` tab in `/edit` adds, removes, links, and connects thoughts without
  touching code. Each node has a short hover preview and a Markdown-style page
  that opens when the node is clicked. Its data is stored in
  `content/nodes.json` and publishing from the editor commits it to `main` like
  the site copy.
- Add another page by copying one object in the `navigation` list. If it should
  use a clean Vercel URL, add the same path to `vercel.json`.
- The layout measurements in `src/styles.css` reproduce the current temporary
  reference design. Edit that file only when you want to change the design.
- The circular home-page photo lives at `public/images/profile.jpg`.
- The browser tab icon lives at `public/favicon.ico`.

## Development

```sh
npm install
npm run dev
```

Run `npm run check` before committing. Commit messages follow the
[Conventional Commits](https://www.conventionalcommits.org/) specification and
are checked by the included Git hook.

## Production

```sh
npm run build
npm run preview
```
