# Classic Book 76 current candidate — downstream handoff

Date: 2026-07-31
Package: `@inshell/classic-book-76-current-candidate`
Candidate package version: `0.19.0-candidate.20260731`
Candidate revision: `c02-current-study-v19-20260731`

## Status boundary

This directory is an immutable, installable snapshot of the current
Classic Book 76 lab geometry. It contains all 76 restricted records, an ESM
renderer, an IM76 payload, checksums, and a verifier.

It is **not** the released Fifth Set V8 package and must not overwrite
`@inshell/thought-glyph-library-fifth-set`. The released V8 package remains
the production fallback until this candidate is promoted through a new
font-owner release.

## Exact visual contract

- Repertoire:
  ` ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'"-()/&`
- Records: `76` — metrics-only SPACE plus `75` visible glyphs
- Fixed advance: `10`
- Default renderer-wide x-origin shift: `+1`
- Paint: `fill="none"`, stroke `1.23`, round cap, round join
- Geometry source: the current A–Z, a–z, digit, and punctuation study paths
  in comparison report `inshell.set-05.c02-vs-mono-76.audit.v19`
- Kerning: none
- Applied per-glyph spacing offsets: none

The shared `+1` shift places the candidate consistently in its SVG stage but
does not change the gap between adjacent fixed-advance glyphs.

The pair-spacing lab exposes a mechanical reference for
`j & r 4 , ; t`. Those seven offsets are intentionally **not** baked into
this snapshot because exact bounding-box centering is not the same as optical
spacing. If all seven reference offsets were baked exactly, the current lab
estimates a `+39` raw-path-byte delta. Keep them out of production until
their real-string specimens are approved.

| Glyph | Mechanical reference x offset |
| --- | ---: |
| `j` | `+0.6` |
| `&` | `-0.518681` |
| `r` | `+0.5` |
| `4` | `-0.45` |
| `,` | `+0.45` |
| `;` | `+0.45` |
| `t` | `+0.3` |

## Integrity

- Candidate `glyphs.json` SHA-256:
  `0069b4bcc764bb1ffd9707b06a1bdd70a17e523c06dc8b50922e67c21016f0a6`
- Candidate IM76 SHA-256:
  `7ccb7fc26c0f7d8a25a70b85acea02ef270f7c10f1bb851eb68301dfadb24567`
- Candidate IM76 Keccak-256:
  `0x4ea6450fce37dc4079370ee798f5bb29f7ed677dcd1300c7fd9b3e27bb4b273e`
- Candidate packed bytes: `4,263`
- Candidate packed path bytes: `4,101`
- Header and offsets: `162` bytes
- Raw/packed byte delta from released V8:
  `+1,723`
- Base released V8 face SHA-256:
  `2789bd55606ddb20933414a64cc150ca78346714d1e04040b11ed3db6d718a38`
- Base released V8 packed SHA-256:
  `3ab51d7dcdce7e358e7c76002b8f78ddaa448a99de2116a238f7e22209f2bd60`
- Base source commit:
  `a0ac1dafd2bc73ad023fc0e32e9b95b5385f608c`
- Comparison report SHA-256:
  `f0df92e8cb4b4636dcea418bc43a216aedcd0958695543da950b1460e08daeb5`
- Pair-spacing audit SHA-256:
  `1ea3c0c1d889d6c90408b2c323bd9d722be66733c7742493ccfefbb520247666`
- Deployment gas: not measured for this candidate snapshot

## Vendor and install

Copy this complete directory into the downstream repository. Do not copy only
`glyphs.json` or `packed.bin`.

```sh
mkdir -p vendor
cp -R /absolute/path/to/current-candidate \
  vendor/classic-book-76-current-candidate
node ./vendor/classic-book-76-current-candidate/verify.mjs
npm install --save ./vendor/classic-book-76-current-candidate
```

Commit the complete vendored directory and its lockfile change. The dependency
must remain a local, private candidate pin; do not publish it to a public
registry.

Suggested CI:

```json
{
  "scripts": {
    "verify:classic-book-76-candidate": "node ./vendor/classic-book-76-current-candidate/verify.mjs"
  }
}
```

## Render

```js
import {
  loadCurrentCandidateFont,
  renderCurrentCandidateLine,
  supportsCurrentCandidateText
} from "@inshell/classic-book-76-current-candidate";

const font = await loadCurrentCandidateFont();
if (!supportsCurrentCandidateText(font, "THOUGHT WILL AWA!")) {
  throw new Error("unsupported candidate text");
}

const svg = renderCurrentCandidateLine(font, "THOUGHT WILL AWA!", {
  background: "#000000",
  stroke: "#00ff35",
  padding: 2
});

console.log(font.candidate.revision); // c02-current-study-v19-20260731
console.log(svg);
```

Do not pass `glyphOffsets` in production. That option exists only so a
downstream visual-review route can reproduce a spacing experiment without
editing the font data.

## On-chain payload

```js
import { loadCurrentCandidatePacked } from
  "@inshell/classic-book-76-current-candidate";
import {
  decodeMono76PackedGlyph,
  inspectMono76Packed
} from "@inshell/classic-book-76-current-candidate/onchain/decoder";

const packed = await loadCurrentCandidatePacked();
const metadata = inspectMono76Packed(packed);
const aPath = decodeMono76PackedGlyph(packed, "a");

console.log(metadata.bytes.length); // 4263
console.log(aPath);
```

The IM76 payload contains raw SVG path strings only. Stroke width, round
cap/join, fixed advance, and the global `+1` origin shift remain renderer
metadata. A Solidity or another on-chain renderer must reproduce those values
explicitly.

## Downstream acceptance

1. Run `node ./verify.mjs` in the vendored candidate.
2. Pin `0069b4bcc764bb1ffd9707b06a1bdd70a17e523c06dc8b50922e67c21016f0a6` and `7ccb7fc26c0f7d8a25a70b85acea02ef270f7c10f1bb851eb68301dfadb24567`.
3. Render `THOUGHT WILL AWA!`, `PATH`, lowercase, uppercase, digits, and
   all 13 punctuation marks.
4. Confirm the downstream renderer uses advance `10`, origin shift `+1`,
   stroke `1.23`, round cap/join, and no fill.
5. Confirm unsupported characters throw and no fallback glyph is substituted.
6. Keep the released Fifth Set V8 package available for rollback.
7. Do not present this candidate package as a formal Set 5 release.
