# Inshell Mono 76 downstream handoff

## Scope

This package contains exactly one face:

- primary family name: `Inshell Mono 76`;
- style and weight: `Regular 400`;
- repertoire: the ordered 76-character table in `manifest.json`;
- geometry: exact native SVG paths extracted from pinned Source Code Pro
  Regular v2.042;
- metrics: 1000 UPM, baseline `0`, fixed advance `600`, native y-up
  coordinates.

It is separate from THOUGHT Glyph Library Sets 1–4 and does not modify or
replace any numbered set.

## Preferred tagged Git installation

Install the immutable private release tag directly in a downstream repository:

```sh
npm install \
  "git+ssh://git@github.com/inshell-art/inshell-mono-76.git#v0.1.0"
```

Verify the installed release:

```sh
node ./node_modules/@inshell/mono-76/verify.mjs
```

Pin the exact tag or commit in the downstream lockfile. Do not use an
unversioned branch dependency for production or on-chain releases.

Suggested CI script:

```json
{
  "scripts": {
    "verify:inshell-mono-76": "node ./node_modules/@inshell/mono-76/verify.mjs"
  }
}
```

## Vendored release

If a downstream repository must commit the package contents instead of using a
Git dependency, export the exact tag without its Git metadata:

```sh
git clone --branch v0.1.0 --depth 1 \
  git@github.com:inshell-art/inshell-mono-76.git \
  /private/tmp/inshell-mono-76-v0.1.0
mkdir -p ./vendor/inshell-mono-76-v0.1.0
git -C /private/tmp/inshell-mono-76-v0.1.0 archive v0.1.0 \
  | tar -x -C ./vendor/inshell-mono-76-v0.1.0
node ./vendor/inshell-mono-76-v0.1.0/verify.mjs
npm install ./vendor/inshell-mono-76-v0.1.0
```

Commit the complete exported directory. Do not copy only `glyphs.json`; retain
the manifest, upstream pin, Adobe copyright notice, OFL license, provenance,
checksums, verifier, fixtures, and byte reports.

## JavaScript API

```js
import {
  loadMono76Weight,
  renderMono76Line,
  renderMono76Text,
  supportsMono76Text
} from "@inshell/mono-76";

const regular = await loadMono76Weight(400);

const websiteSvg = renderMono76Line(
  regular,
  "THOUGHT WILL AWA!",
  { fontSize: 120, fill: "#087b12" }
);

const pathSvg = await renderMono76Text(
  "THOUGHT WILL AWA!",
  {
    weight: 400,
    fontSize: 28,
    fill: "#00ff35",
    background: "#000000",
    padding: 24
  }
);

console.log(supportsMono76Text(regular, "PATH 610")); // true
console.log(supportsMono76Text(regular, "PATH #610")); // false: # is outside the 76-character table
```

Both `400` and `"regular"` address the only face. Any other weight throws.
Unsupported characters also throw with their Unicode code point.

The direct JSON export is:

```js
import regular from "@inshell/mono-76/weights/400"
  with { type: "json" };
```

## Terminology

- A slogan is **set in** or **typeset in** Inshell Mono 76.
- The SVG pipeline **renders with** Inshell Mono 76.
- THOUGHT and PATH repositories **consume** the package.
- A distributed renderer **embeds** the restricted font geometry.

## Website and on-chain responsibilities

The website may continue loading full Source Code Pro as its normal webfont.
Use this package when deterministic native SVG paths are required, especially
for the on-chain THOUGHT/PATH rendering path.

A repository dependency is a build-time source. An on-chain contract cannot
read npm or Git directly. A downstream deployment must either:

1. embed the pinned `400.bin` release snapshot; or
2. reference an immutable shared glyph-data contract whose address and
   package version are recorded in deployment metadata.

See `ONCHAIN.md` before choosing either layout.

## Update contract

- Do not edit installed or vendored paths.
- Do not move a release tag.
- Do not add another weight silently.
- A source-font, repertoire, metric, encoding, or path change requires a new
  package version, regenerated fixtures and checksums, and a downstream review.
- Existing deployed contracts remain immutable snapshots of their pinned
  package release.
