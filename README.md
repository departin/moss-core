<p align="center">
  <img src="docs/icon.png" width="96" alt="Moss">
</p>

<h1 align="center">moss-core</h1>

<p align="center">The part of <a href="https://github.com/mosscord/moss">Moss</a> that runs inside Discord: the look, the setup, the server manager and every plugin.<br>
Looking for the app? <a href="https://github.com/mosscord/moss/releases/latest"><b>Download Moss</b></a>.</p>

---

## What's in here

| Folder | What it is |
| --- | --- |
| `src/mossplugins/mossTheme` | Colours, gradients, fonts and the five animation styles |
| `src/mossplugins/mossSetup` | The first-run setup, the welcome screen and the tour |
| `src/mossplugins/serverManager` | Server manager with bulk leave, mark read, mute and Recently left |
| `src/mossplugins/quickActions` | Mark everything read, mute all servers, tone down pings |
| `src/mossplugins/focusMode` | Do Not Disturb with a timer, and a hidden member list |
| `src/mossplugins/catchUp` | AI summaries of what you missed, through OpenRouter |
| `src/mossplugins/bookmarkDrop` | Drag channels and DMs onto the bookmark bar |
| `src/mossplugins/mossUpdates` | Tells you when a new version is ready to install |
| `src/moss/i18n` | Moss's text in 11 languages |
| `src/moss/defaults.ts` | Which plugins are on out of the box |

Hundreds of other plugins live in `src/plugins` and `src/equicordplugins` and can be switched on from Settings.

## Build

You need [Node.js](https://nodejs.org) and [pnpm](https://pnpm.io).

```sh
pnpm install --frozen-lockfile
pnpm build --standalone --disable-updater
```

The output in `dist/` is bundled into the [Moss app](https://github.com/mosscord/moss) when you build it. That repo's README covers the full build.

### Adding a translation

Copy `src/moss/i18n/en.ts` to a new file named after the language code, translate the text, and add it to `src/moss/i18n/packs.ts`. Keep the `{placeholders}` as they are.

## Licence

GPL-3.0-or-later, see [LICENSE](LICENSE). Built on Equicord, which builds on Vencord.
