# Repository instructions

- Browser only: target `https://claude.ai/*`. Do not detect, launch, inspect, or
  modify the native Claude application, its files, or processes.
- Edit `assets/claude-custom.css` and `assets/browser-inject.js` as source.
  `userscripts/claude-restyle.user.js` is a generated, version-controlled artifact;
  regenerate with `npm run build:userscript`, never edit it by hand.
- Keep userscript privileges minimal. No page internals, conversation API access,
  runtime JavaScript downloads, or background services are needed for typography.
- `npm test` checks the generated artifact read-only before running tests.
  Do not make tests automatically rebuild it.
- Before publishing a behavioral update, increment `package.json`'s three-part
  version, run `npm run prepare:pr`, and include the source and generated file.
- Do not commit credentials, local browser state, or private conversation content.
