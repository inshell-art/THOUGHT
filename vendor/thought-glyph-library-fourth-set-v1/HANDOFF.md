# THOUGHT Glyph Library — Fourth Set — downstream handoff

## Exact set contract

“Fourth Set” means exactly these three ordered members:

| Order | Family ID | Stable slug | Source |
| ---: | --- | --- | --- |
| 1 | `S401` | `tile-vertical-ledger` | Set 1 `S11` Vertical Ledger |
| 2 | `S402` | `tile-column-relay` | Set 2 `S202` Column Relay |
| 3 | `S403` | `tile-humanist-smooth` | Set 3 `S301` Humanist Smooth |

Stable set ID: `inshell.thought.glyph-library.set-04`  
Package: `@inshell/thought-glyph-library-fourth-set`  
Version: `1.0.0`

Each member contains the complete 76-character restricted repertoire. Source paths remain color-neutral and byte-identical to the corresponding source font. Set 4 adds family-level optical normalization and a shared background-tile renderer.

This is a native-SVG data and rendering package. It is not an operating-system font, OpenType `COLR`/`CPAL` font, TTF, WOFF, or WOFF2 file. Installing it creates an ESM package, not a CSS `font-family`.

## Export from the glyph lab

Build the three source sets and Set 4, run the complete checks, then export to a new destination:

```sh
npm run build:fourth-set
npm run check
npm run export:fourth-set -- --out /absolute/path/to/downstream/vendor/thought-glyph-library-fourth-set-v1
```

The exporter refuses existing destinations, the source bundle, filesystem roots, and protected reference repositories. It verifies the source, copies the complete distribution, and verifies the copy.

## Install in a downstream repository

Keep the complete exported directory. Do not copy only the three glyph JSON files.

```sh
node ./vendor/thought-glyph-library-fourth-set-v1/verify.mjs
npm install --save ./vendor/thought-glyph-library-fourth-set-v1
```

Add the standalone verification to downstream CI:

```json
{
  "scripts": {
    "verify:thought-glyph-set-4": "node ./vendor/thought-glyph-library-fourth-set-v1/verify.mjs"
  }
}
```

## Load and render all three fonts

```js
import {
  loadFourthSetManifest,
  listFourthSetFonts,
  loadFourthSetFont,
  loadAllFourthSetFonts,
  listFourthSetTileProfiles,
  resolveFourthSetTilePaint,
  renderFourthSetLine,
  renderAllFourthSetLines
} from "@inshell/thought-glyph-library-fourth-set";

const manifest = await loadFourthSetManifest();
const index = await listFourthSetFonts();
// tile-vertical-ledger, tile-column-relay, tile-humanist-smooth

const all = await loadAllFourthSetFonts();
// [{ record, font }, ...] in immutable Set 4 order

const one = await loadFourthSetFont("tile-column-relay");
const oneSvg = renderFourthSetLine(one, "THOUGHT 04?");

const everySvg = await renderAllFourthSetLines("THOUGHT 04?");
// [{ slug, name, memberId, construction, svg }, ...]

const profiles = listFourthSetTileProfiles();
// one approved profile: tight-v1
```

The renderer emits native SVG `<rect>`, `<path>`, `<g>`, and `<use>` elements. It emits no SVG `<text>`, external fonts, images, `foreignObject`, keylines, or fallback glyphs.

## Approved Tight profile

Set 4 has one canonical presentation profile:

```json
{
  "id": "tight-v1",
  "glyphScale": 0.96,
  "tileWidth": 6.5,
  "tileHeight": 8,
  "tileGap": 0.2,
  "edgeStyle": "square",
  "cornerRadius": 0.15,
  "effectiveCornerRadius": 0,
  "advanceWidth": 6.5,
  "spaceAdvanceWidth": 6.5,
  "monospaced": true
}
```

The stored `cornerRadius` records the approved Tight preset. Square edges make its effective radius zero.

Every character, including SPACE, advances exactly `6.5` units. SPACE emits no tile or glyph. This differs from the exploratory demo’s narrower visual SPACE and preserves the library’s strict monospaced contract.

## Background and foreground policy

Color Font v1 itself remains a strict uppercase `A–Z` authority.

- Uppercase letters: direct Color Font v1 background.
- Lowercase letters: corresponding uppercase Color Font v1 background.
- All ten digits and all thirteen supported punctuation marks: white `#ffffff` background.
- SPACE: no background and no glyph.
- Unsupported characters: rejected.

The visible glyph is automatically black or white, whichever has the higher WCAG 2.x contrast ratio against its tile. Exact ties choose black.

```js
resolveFourthSetTilePaint("A");
// background #00ffff, foreground #000000

resolveFourthSetTilePaint("B");
// background #0000ff, foreground #ffffff

resolveFourthSetTilePaint("7");
// background #ffffff, foreground #000000,
// paletteBacked false, resolvedLetter null

resolveFourthSetTilePaint(" ");
// drawsTile false, drawsGlyph false
```

The letter foreground groups are:

- white glyph: `BCGIMNTU`;
- black glyph: `ADEFHJKLOPQRSVWXYZ`.

Lowercase follows its uppercase background and foreground. All digits and punctuation use black on white. The minimum selected letter contrast is `4.7734:1`; no outline is used.

## Complete repertoire

```text
 ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'"-()/&
```

That is exactly:

- one metrics-only SPACE;
- 52 palette-background letters;
- ten white-background digits;
- thirteen white-background punctuation marks.

No fallback character exists. Any other Unicode code point throws.

## Direct package exports

Consumers with JSON-module support may import:

```js
import manifest from
  "@inshell/thought-glyph-library-fourth-set/manifest"
  with { type: "json" };

import palette from
  "@inshell/thought-glyph-library-fourth-set/palette"
  with { type: "json" };

import tilePolicy from
  "@inshell/thought-glyph-library-fourth-set/tile-policy"
  with { type: "json" };

import tileProfiles from
  "@inshell/thought-glyph-library-fourth-set/tile-profiles"
  with { type: "json" };

import verticalLedger from
  "@inshell/thought-glyph-library-fourth-set/fonts/tile-vertical-ledger"
  with { type: "json" };
```

Equivalent font exports exist for:

- `fonts/tile-column-relay`;
- `fonts/tile-humanist-smooth`.

Do not reach through `node_modules` to undeclared internal paths.

## Required vendored files

Commit the entire exported directory, including:

- `manifest.json`;
- `palette.json` and canonical `COLOR_FONT.v1.txt`;
- `tile-policy.json` and `tile-profiles.json`;
- `fonts/`, `fixtures/`, and `byte-reports/`;
- runtime modules and `verify.mjs`;
- `README.md`, `REVIEW.md`, `NOTICE.md`, and this handoff;
- `UNLICENSED.md` and `LICENSE-OFL.md`;
- `SHA256SUMS`.

Treat any checksum change as a release change. Never edit a vendored copy in place.

## Licensing boundary

The complete package is private and is not generally licensed for redistribution.

`tile-humanist-smooth` includes a renamed modified derivative based on Adobe Source Code Pro reference outlines and remains subject to the SIL Open Font License 1.1 in `LICENSE-OFL.md`. That component license does not license Vertical Ledger, Column Relay, the Set 4 renderer, palette material, package metadata, or THOUGHT/Inshell names.

Internal installation does not grant permission to publish the package to npm or redistribute it externally.

## Update contract

Set 4 version 1 freezes:

- the three-member order and IDs `S401–S403`;
- the three source path hashes;
- the `tight-v1` profile;
- white digit/punctuation backgrounds;
- maximum-contrast black/white foreground selection;
- the 76-character repertoire;
- exact package checksums.

Any membership, source geometry, profile, background, contrast, metric, or repertoire change requires a new reviewed package/set version and a new versioned export destination.
