# THOUGHT Glyph Library — First Set — downstream handoff

## Exact scope

“First Set” means exactly the 24 ordered members in [manifest.json](manifest.json). Every member passed the complete legibility, identity/context, and technical study gates.

Excluded:

- the eight complete systems under `workbench/complete/`, which remain identity-hold research controls;
- the 16 incomplete systems under `workbench/seeds/`;
- comparison sheets, raster images, iteration histories, and Solidity measurement artifacts.

If a downstream project needs all 32 completed study outputs, call that the **Study 1 complete corpus: 24 qualified plus 8 identity holds**. Do not call it the First Set.

## Preferred vendoring flow

From the glyph-lab repository:

```sh
npm run check
npm run export:first-set -- --out /absolute/path/to/downstream/vendor/thought-glyph-library-first-set
```

The export command refuses to overwrite an existing destination, verifies the source bundle first, copies only this frozen distribution, and verifies the copy.

In the downstream repository:

```sh
npm install ./vendor/thought-glyph-library-first-set
node ./vendor/thought-glyph-library-first-set/verify.mjs
```

Keep `manifest.json` and `SHA256SUMS` committed with the vendored files. Review their diff whenever the bundle changes.

## JavaScript API

```js
import {
  listFirstSetFonts,
  loadAllFirstSetFonts,
  loadFirstSetFont,
  renderFirstSetLine,
  renderAllFirstSetLines
} from "@inshell/thought-glyph-library-first-set";

const index = await listFirstSetFonts();       // ordered metadata for all 24
const circuit = await loadFirstSetFont("circuit-nodes");
const oneSvg = renderFirstSetLine(circuit, "Agent & Thought?");

const allFonts = await loadAllFirstSetFonts(); // [{ record, font }, ...] in set order
const allSvgs = await renderAllFirstSetLines("Agent & Thought?");
```

`renderFirstSetLine` is a deterministic, single-line native-SVG primitive with no installed-font dependency. It rejects unsupported characters. It is suitable for previews and as a reference for path placement; it is not a claim that the unresolved production THOUGHT wrapping/deployment architecture has been frozen.

## Direct data contract

The authoritative bundle files are:

- `manifest.json`: ordered membership and immutable public member IDs;
- `fonts/<slug>/glyphs.json`: canonical geometry plus embedded metrics;
- `schemas/`: normative JSON schemas;
- `fixtures/<slug>/canonical-line.svg`: byte-stable integration fixture;
- `SHA256SUMS`: distribution integrity list.

Use the stable `memberId`, such as `inshell.thought.glyph-library.set-01.circuit-nodes`, or the immutable slug as an API key. `Sxx` and `Bxx` are retained only as study provenance and must not become public integration IDs.

Do not consume `gallery-data/candidates.json` as geometry, files outside candidate `current/`, or any `workbench/` artifact.

## Rendering contract

- Canonical order is exactly ` ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'"-()/&`.
- Every family is monospaced on an 8-unit em with a 6-unit advance.
- SPACE advances but draws no path.
- Paths use finite, absolute `M/L/H/V/Q/C/Z` commands, even-odd fill, and at most two decimal places.
- Source geometry contains no transforms; placement may translate complete glyph paths.
- Consumers must reject unsupported characters rather than silently substitute another font.

## Update contract

Treat this directory as an immutable versioned bundle. Build future sets beside it; do not append new members to First Set. If a First Set correction is unavoidable, increment the package version, regenerate all hashes and fixtures, and review the exact manifest diff downstream.

## Licensing and publication

This workspace does not contain a rights-holder-supplied license. The bundle is therefore marked `UNLICENSED` and `private`. Internal technical handoff does not grant permission to publish, sublicense, or redistribute it. Before external distribution, the rights holder must add explicit terms for the path geometry, renderer code, generated SVGs, and THOUGHT/Inshell names and marks.
