# Joho Portfolio

Portfolio for engineering, design, and video work. The current release is an
intentional placeholder while the card system and custom animation work are
developed.

## Editing the site

- Change all home-page words, the masthead, clock, and featured card in
  `src/content.js`.
- Change the full color palette, page width, and fonts in the token block at the
  top of `src/styles.css`.
- To show a project image, place it in `public/images/` and set the featured
  `image` value in `src/content.js` to `/images/your-file.jpg`.
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
