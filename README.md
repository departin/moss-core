<p align="center">
  <img src="docs/icon.png" width="96" alt="">
</p>

<h1 align="center">moss-core</h1>

<p align="center">
  The client mod behind <a href="https://github.com/departin/moss">Moss</a>.
</p>

---

This repository contains the code that runs inside Discord when you use Moss. The desktop app loads it on startup, and it provides the theme, the first-run setup, Server Manager, Quick Actions, Focus Mode, Catch Up and the bundled plugins.

If you just want to use Moss, download it from the [releases page](https://github.com/departin/moss/releases/latest). You only need this repository if you want to build Moss yourself or work on it.

## Project layout

Moss's own code lives in two folders:

- `src/mossplugins` contains Moss's plugins: the theme, setup and welcome tour, Server Manager, Quick Actions, Focus Mode, Catch Up, bookmark drag and drop, and update notices.
- `src/moss` contains shared code: translations, the list of plugins enabled by default, and common UI components.

Everything else follows the upstream Equicord layout, which keeps it straightforward to pull in upstream fixes when Discord changes something.

## Building

Requires [Node.js](https://nodejs.org) 22 or newer and [pnpm](https://pnpm.io).

```sh
pnpm install --frozen-lockfile
pnpm build --standalone --disable-updater
```

The output in `dist/` is bundled into the Moss desktop app. See the [Moss README](https://github.com/departin/moss#building-from-source) for the full build.

## Translations

Moss's interface text is in `src/moss/i18n`. To add a language, copy `en.ts`, translate the strings while leaving any `{placeholders}` as they are, and register the new file in `packs.ts`.

## License

Released under the [GNU General Public License v3.0](LICENSE). Based on Equicord, which is a fork of Vencord.
