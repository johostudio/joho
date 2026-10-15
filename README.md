# Joho Portfolio

Temporary portfolio for engineering, design, multimedia, and life updates.

## Editing the site

- Change the name, introduction, navigation, profile image, section lists,
  footer links, and every secondary-page message in `src/content.js`.
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
