# THOUGHT Glyph Library — Fifth Set — downstream handoff

## Exact package contract

- Package: `@inshell/thought-glyph-library-fifth-set`
- Package version: `1.7.0`
- Set manifest version: `8`
- Set ID: `inshell.thought.glyph-library.set-05`
- License state: private `UNLICENSED`
- Source geometry commit:
  `a0ac1dafd2bc73ad023fc0e32e9b95b5385f608c`

“Fifth Set” means exactly these four ordered members:

| Order | Stable family ID | Stable slug | Source candidate |
| ---: | --- | --- | --- |
| 1 | `S501` | `classic-line` | `C01` |
| 2 | `S502` | `classic-book` | `C02` |
| 3 | `S503` | `classic-round` | `C04` |
| 4 | `S504` | `classic-compact` | `C06` |

The source-candidate labels record the selection decision. Use the stable slug
or full member ID downstream. C03 Classic Slab and C05 Classic Bracket remain
experiment candidates and are not Fifth Set members.

## Export and install

From the `inshell-mono-76` source repository at the reviewed Set 5 commit:

```sh
cd sets/fifth-set
npm run verify
npm run export -- \
  --out /absolute/path/to/downstream/vendor/thought-glyph-library-fifth-set-v8
```

The exporter refuses an existing destination, verifies the source, copies the
complete standalone package, and verifies the copy.

In the downstream repository:

```sh
node ./vendor/thought-glyph-library-fifth-set-v8/verify.mjs
npm install --save ./vendor/thought-glyph-library-fifth-set-v8
```

Commit the complete vendored directory and pin the source repository commit in
the downstream change record. Do not copy only `glyphs.json` or `packed.bin`.

Suggested downstream CI:

```json
{
  "scripts": {
    "verify:thought-glyph-set-5": "node ./vendor/thought-glyph-library-fifth-set-v8/verify.mjs"
  }
}
```

## Load and render

```js
import {
  listFifthSetFonts,
  loadFifthSetFont,
  loadAllFifthSetFonts,
  renderFifthSetLine,
  renderAllFifthSetLines,
  supportsFifthSetText
} from "@inshell/thought-glyph-library-fifth-set";

const index = await listFifthSetFonts();
// classic-line, classic-book, classic-round, classic-compact

const round = await loadFifthSetFont("classic-round");
const sloganSvg = renderFifthSetLine(round, "THOUGHT WILL AWA!", {
  stroke: "#00ff35",
  background: "#000000",
  padding: 2
});

const everyFont = await loadAllFifthSetFonts();
const everySlogan = await renderAllFifthSetLines("THOUGHT WILL AWA!");

console.log(index.length); // 4
console.log(everyFont.length); // 4
console.log(everySlogan.length); // 4
console.log(supportsFifthSetText(round, "PATH 610")); // true
console.log(supportsFifthSetText(round, "PATH #610")); // false
```

## C02 / Classic Book 76 only

Install and verify the complete package, then select the stable C02 slug
`classic-book`. Do not make a reduced vendored copy:

```js
import {
  loadFifthSetFont,
  loadFifthSetPacked,
  renderFifthSetLine
} from "@inshell/thought-glyph-library-fifth-set";

const c02 = await loadFifthSetFont("classic-book");
const c02Packed = await loadFifthSetPacked("classic-book");
const svg = renderFifthSetLine(c02, "THOUGHT WILL AWA!", {
  stroke: "#00ff35",
  background: "#000000"
});

console.log(c02.family.id); // S502
console.log(c02.librarySet.version); // 8
console.log(c02Packed.byteLength); // 2540
console.log(svg);
```

C02 revision 8 cumulatively includes the accepted `A`, `?`, smooth-rise and
optically spaced `f`, smooth digit-`2`, lowercase-`k` junction, and vertically
centered U+002D HYPHEN-MINUS paths, plus the smooth uppercase-`G` lower join.
Revision 5 translates every `f` x coordinate one logical unit right:

```text
before: M2 0L2 8Q2 11 4 11Q5 11 6 10M0 7L6 7
after:  M3 0L3 8Q3 11 5 11Q6 11 7 10M1 7L7 7
```

The `f` extent changes from x=0..6 to x=1..7, balancing `eft` and `ft`
inside the unchanged 10-unit advance. Its curve, y coordinates, ascender,
crossbar width, and render style remain unchanged. No kerning or
renderer-specific translation is required. The canonical render style remains
stroke `0.82`, round cap, round join. Stroke `1.23` is a diagnostic
visual-weight study only and is not stored in the installed font.

Revision 6 moves only the `k` lower-arm start near the intersection of its
upper and lower diagonals:

```text
before: M1 0L1 10M7 7L1 2M3 4L7 0
after:  M1 0L1 10M7 7L1 2M3.18 3.82L7 0
```

The stored `(3.18,3.82)` is a two-decimal approximation of the mathematical
intersection `(35/11,42/11)`. It removes the protruding round-cap crossing
while preserving the stem, diagonal endpoints, lower-arm direction, fixed
advance, metrics, and render style.

Revision 7 raises only U+002D HYPHEN-MINUS to the vertical midpoint of the
baseline-to-cap-height interval:

```text
before: M1 4L7 4
after:  M1 5L7 5
```

The new y=5 centerline is halfway between baseline y=0 and cap height y=10.
Its x=1..7 extent, line length, fixed advance, metrics, canonical stroke
`0.82`, round cap, and round join are unchanged.

Revision 8 smooths only the uppercase `G` lower-bowl connection:

```text
before: M7 8Q6 10 4 10Q1 10 1 5Q1 0 4 0Q6 0 7 2L7 5L4 5
after:  M7 8Q6 10 4 10Q1 10 1 5Q1 0 4 0Q7 0 7 2L7 5L4 5
```

The final lower-bowl quadratic control moves from `(6,0)` to `(7,0)`. The
curve enters `(7,2)` vertically and continues tangent to the right stem while
retaining its horizontal departure from `(4,0)`. Bounds, fixed advance,
metrics, command count, path byte length, canonical stroke `0.82`, round cap,
and round join are unchanged.

### Revision-8 integrity and deployment record

- lowercase-`f` after-path bytes: `36`;
- lowercase-`f` after-path SHA-256:
  `127b8029c9d1498b34d01979df8e39d8038254097c72925645c5ad31c03d08ac`;
- lowercase-`k` after-path bytes: `31`;
- lowercase-`k` after-path SHA-256:
  `d39c1506891f378003f993d2987840ba60190907eb5a224d619b8bb7c85ff6ff`;
- U+002D after-path bytes: `8`;
- U+002D after-path SHA-256:
  `8502b6a652a5682ad07fad0e848ab34a7ee52c90b6b1b72dfa2f36e463ad50ee`;
- uppercase-`G` after-path bytes: `47`;
- uppercase-`G` after-path SHA-256:
  `7522b25e1d85cad968bc84c4a4961b4588cbbcc8b982506a763a0947b6137db3`;
- C02 packed payload bytes: `2,540`;
- C02 packed-path bytes: `2,378`;
- C02 IM76 header and offsets: `162` bytes;
- C02 packed SHA-256:
  `3ab51d7dcdce7e358e7c76002b8f78ddaa448a99de2116a238f7e22209f2bd60`;
- C02 packed Keccak-256:
  `0xa1505ed49c1e2b8d78d088de1a6b0b1cefcd6087cd47415bb29c39b4a3394430`;
- measured Anvil Prague creation gas: `602,572`;
- revision-7-to-8 packed-byte delta: `0`;
- revision-7-to-8 measured-creation-gas delta: `0`.

The authoritative source JSON SHA-256 is the Classic Book record’s
`fileSha256` in `manifest.json`, which is also covered by `SHA256SUMS`.
Downstream must copy that exact generated value into its dependency pin rather
than hashing an experiment candidate or editing the JSON.

Classic Line, Classic Round, and Classic Compact retain byte-identical glyph paths
and IM76 packed payloads. Their expanded `glyphs.json` files change
because Set version 8 and the new source commit are metadata embedded in every
face; do not misreport those complete JSON files as byte-identical.

Unsupported characters throw when rendered. There is no fallback glyph.

## Direct JSON imports

The package declares one direct export per font:

```js
import line from
  "@inshell/thought-glyph-library-fifth-set/fonts/classic-line"
  with { type: "json" };

import book from
  "@inshell/thought-glyph-library-fifth-set/fonts/classic-book"
  with { type: "json" };

import round from
  "@inshell/thought-glyph-library-fifth-set/fonts/classic-round"
  with { type: "json" };

import compact from
  "@inshell/thought-glyph-library-fifth-set/fonts/classic-compact"
  with { type: "json" };
```

Prefer `loadFifthSetFont` where the runtime or bundler does not support JSON
import attributes. Never address undeclared `node_modules` internals.

## Rendering contract

- Canonical order is exactly
  ` ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'"-()/&`.
- Every font has 76 records: metrics-only SPACE plus 75 visible glyphs.
- All use a fixed 10-unit advance, cap height 10, x-height 7, baseline 0,
  descender -3, and Regular 400 as the IM76 header weight. C02 alone declares
  ascender 11 for its lowercase `f`; the other members declare ascender 10.
- Canonical paths use absolute `M`, `L`, `Q`, and `Z` commands in y-up logical
  coordinates.
- The paths are centerlines. Always use `fill="none"`.
- Read `strokeWidth`, `strokeLinecap`, and `strokeLinejoin` from
  `font.renderStyle`; these values are not stored in the packed path stream.
- Do not rewrite, quantize, fit, rescale, or merge canonical paths in place.

## On-chain payloads

Load a selected packed payload through the package API:

```js
import {
  loadFifthSetPacked
} from "@inshell/thought-glyph-library-fifth-set";
import {
  inspectMono76Packed,
  decodeMono76PackedGlyph
} from "@inshell/thought-glyph-library-fifth-set/onchain/decoder";

const payload = await loadFifthSetPacked("classic-book");
const header = inspectMono76Packed(payload);
const thoughtPath = decodeMono76PackedGlyph(payload, "T");

console.log(header.glyphCount); // 76
console.log(thoughtPath);
```

The package also includes `onchain/InshellMono76Decoder.sol`. All four payloads
use the existing IM76 v1 format, so no new path decoder is required.

An on-chain deployment must record:

- Set 5 package version and source commit;
- stable member ID and slug;
- packed SHA-256;
- declared stroke width, cap, and join;
- chain ID and glyph-data contract address; and
- deployed bytecode hash.

For C02 revision 8, record both the packed SHA-256 and packed Keccak-256 above.
SHA3-256 is not Ethereum Keccak-256 and must not be substituted.

Measured creation gas in the reports covers four independent immutable
glyph-data deployments. It excludes the SVG renderer, stroke serialization,
retrieval calls, mint logic, and repeated rendering. The sum of the four
measurements is not a measured combined-contract deployment.

## Required vendored files

Keep `manifest.json`, `fonts/`, `onchain/packed/`, both decoders, fixtures,
byte reports, storage model, gallery, verifier, checksum inventory, provenance,
review, notice, private-license file, this handoff, and package metadata.

Treat any checksum change as a package change. Never edit an installed or
vendored copy in place.

## Ownership and redistribution

The four centerline alphabets and integration material are recorded as
original Inshell work. No third-party font outline is included in Set 5.

The package is private and `UNLICENSED`: installation for an authorized
downstream Inshell repository does not grant public redistribution,
sublicensing, npm publication, or external deployment rights. Preserve
`NOTICE.md`, `PROVENANCE.md`, and `UNLICENSED.md`.

## Update contract

Version 8 freezes the four-member order, stable IDs and slugs, 76-character
repertoire, every canonical path (including the cumulative C02 revision-8
geometry), render styles, packed bytes, fixtures, and checksums. A geometry,
membership, metric, style, encoding, or repertoire change requires a new
reviewed package version and a new export destination.
