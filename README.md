# Joho Portfolio

Temporary portfolio for engineering, design, multimedia, and life updates.

## Editing the site

- Change every navigation label, URL, and page message in `src/content.js`.
- Add another page by copying one object in the `pages` list. If it should use a
  clean Vercel URL, add the same path to `vercel.json`.
- Change the minimal layout and typography in `src/styles.css`.
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
