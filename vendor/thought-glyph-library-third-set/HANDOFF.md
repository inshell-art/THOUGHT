# THOUGHT Glyph Library — Third Set — downstream handoff

## Exact scope

“Third Set” means exactly these two ordered members from [manifest.json](manifest.json):

| Order | Stable member ID | Slug | Construction |
| ---: | --- | --- | --- |
| 1 | `inshell.thought.glyph-library.set-03.humanist-smooth` | `humanist-smooth` | smooth quadratic, closed filled outlines |
| 2 | `inshell.thought.glyph-library.set-03.humanist-quantized` | `humanist-quantized` | quarter-unit-quantized, closed filled outlines |

Both fonts contain the complete restricted 76-character repertoire. They are renamed derivatives informed by Source Code Pro; neither font is Source Code Pro itself. They are conventional outline fonts, not routed-path fonts.

Set 3 is separate from Sets 1 and 2. It does not replace either set, and no experiment, reference extraction, comparison font, or gallery-only artifact outside these two manifest members belongs to Set 3.

Both members passed the source-inspired experiment’s visual legibility and identity review. Both deliberately carry a **metric-contract exception**:

- Humanist Smooth uses a visual baseline of `5.58`;
- Humanist Quantized uses a visual baseline of `5.63`;
- the existing THOUGHT study contract used by Sets 1 and 2 declares baseline `7`.

Set membership therefore records a visually accepted outline exploration; it does not claim drop-in metric compatibility with Sets 1 and 2.

## Preferred vendoring and installation flow

From the glyph-lab repository:

```sh
npm run check
npm run export:third-set -- --out /absolute/path/to/downstream/vendor/thought-glyph-library-third-set
```

The exporter refuses an existing destination, the source bundle, and the read-only THOUGHT reference repository. It verifies both the source and the copied bundle.

In the downstream repository:

```sh
node ./vendor/thought-glyph-library-third-set/verify.mjs
npm install ./vendor/thought-glyph-library-third-set
```

Commit the complete vendored directory, including `manifest.json`, `SHA256SUMS`, the OFL license and copyright notice, rather than copying only the two geometry files. Run the verifier in CI before packaging or deployment:

```json
{
  "scripts": {
    "verify:thought-glyph-set-3": "node ./vendor/thought-glyph-library-third-set/verify.mjs"
  }
}
```

## JavaScript API

The installed package is `@inshell/thought-glyph-library-third-set`.

```js
import {
  listThirdSetFonts,
  loadThirdSetFont,
  loadAllThirdSetFonts,
  renderThirdSetLine,
  renderAllThirdSetLines
} from "@inshell/thought-glyph-library-third-set";

const index = await listThirdSetFonts(); // two records, in immutable set order

const smooth = await loadThirdSetFont("humanist-smooth");
const oneSvg = renderThirdSetLine(smooth, "Agent & Thought?");

const all = await loadAllThirdSetFonts(); // [{ record, font }, ...]
const previews = await renderAllThirdSetLines("THOUGHT 03? Agent &");

for (const { record, font } of all) {
  const svg = renderThirdSetLine(font, "Agent & Thought?", {
    fill: "#00ba00"
  });
  console.log(
    record.memberId,
    font.metrics.visualBaseline,
    font.metrics.baselineContractStatus,
    svg
  );
}
```

Use the stable `memberId`, or its immutable slug, as the downstream key. Experimental family labels such as `E-SRC-01` are provenance and must not become public integration IDs.

`renderThirdSetLine` and `renderAllThirdSetLines` produce deterministic, self-contained native SVG with no installed system-font dependency. They are single-line integration primitives, not a frozen production wrapping or deployment architecture.

## Direct glyph JSON imports

The package exports each authoritative glyph payload at `./fonts/<slug>`. In runtimes that support JSON modules:

```js
import smooth from
  "@inshell/thought-glyph-library-third-set/fonts/humanist-smooth"
  with { type: "json" };

import quantized from
  "@inshell/thought-glyph-library-third-set/fonts/humanist-quantized"
  with { type: "json" };

console.log(smooth.librarySet.memberId);
console.log(quantized.glyphs.length);
```

Prefer `loadThirdSetFont` when the downstream runtime or bundler does not support JSON import attributes. Do not address files through `node_modules` internals; use the declared package exports.

The authoritative direct-data contract is:

- `manifest.json`: ordered membership, stable member IDs, review state and file locations;
- `fonts/<slug>/glyphs.json`: canonical outline geometry, metrics and provenance;
- `storage-model.json`: measured expanded sizes and compact-data estimates;
- `fixtures/<slug>/canonical-line.svg`: byte-stable rendering fixtures;
- `SHA256SUMS`: exact distribution integrity list.

## Rendering and metric contract

- Canonical order is exactly ` ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'"-()/&`.
- Both fonts use an 8-unit em square and a fixed 6-unit advance.
- SPACE advances by 6 units and draws no path.
- Glyphs are closed, filled outline paths with absolute commands and even-odd fill.
- Unsupported characters must be rejected, never silently substituted.
- Consumers must read `font.metrics.visualBaseline` and `font.metrics.baselineContractStatus`.

Do not hard-code baseline `7` for these two fonts. Real descenders in `g`, `j`, `p`, `q`, `y`, comma and semicolon require their approximately `5.6` visual baseline. Translating them onto baseline `7` inside the unchanged 8-unit cell can clip or compress those forms.

Humanist Quantized also reaches `x = 0.25` and `y = 7.25`, outside the earlier THOUGHT safe bounds of `xMin = 0.45` and `yMax = 7.2`. A downstream system mixing Set 3 with Sets 1 or 2 must either:

1. keep each set’s native metrics and align it deliberately at layout time; or
2. adopt and document a revised common metric contract, then regenerate and reverify the affected geometry and fixtures.

Do not silently rescale, translate, clip or rewrite the canonical Set 3 paths.

## Storage contract and data-floor caveat

The distributed `glyphs.json` files contain expanded SVG paths for deterministic interchange. The compact figures in `storage-model.json` are estimates of encoded geometry data only:

| Member | Expanded path text | Compact fixed-width data floor |
| --- | ---: | ---: |
| Humanist Smooth | 191,288 bits / 23,911 bytes | 54,706 bits / 6,839 bytes |
| Humanist Quantized | 145,880 bits / 18,235 bytes | 33,763 bits / 4,221 bytes |

Those floors exclude the decoder, SVG serialization, metadata, glyph placement, wrapping, lookup, retrieval and executable runtime. They are not deployable bytecode sizes and do not prove that a complete renderer fits a chain or contract limit.

For contrast, the Set 1 Circuit Nodes dot family has a much smaller shared generative data floor—2,625 bitmap bits / 329 packed bytes, or 422 bytes with its current grammar descriptor—even though its expanded SVG path text is larger. Compare like with like: expanded interchange against expanded interchange, or compact data plus its complete decoder against another complete compact runtime.

## OFL derivative licensing

These two font geometries are modified derivatives of Adobe’s Source Code Pro and are distributed under the [SIL Open Font License 1.1](LICENSE-OFL.md). The upstream Reserved Font Name is `Source`; Set 3 uses the distinct names Humanist Smooth and Humanist Quantized.

Downstream users must:

- retain the Adobe copyright notice and the complete OFL license with redistributed copies;
- keep the Font Software and any further font derivative under the OFL;
- not use the Reserved Font Name `Source` as the primary name of a modified font without the copyright holder’s written permission;
- not sell the Font Software by itself;
- not use Adobe’s or the authors’ names to promote a modified version except as attribution, without permission.

The OFL permits bundling, embedding and redistribution with software under its stated conditions. Documents and rendered SVG output created with the fonts are not required by the OFL to use the OFL merely because these fonts rendered them. Preserve the package’s provenance fields and bundled notice so recipients can identify the source and modifications.

## Update contract

Treat the exported Third Set directory as an immutable, versioned, two-member bundle:

- do not append another font to Set 3;
- create a later set for new designs;
- do not edit installed or vendored glyph JSON in place;
- address any unavoidable correction by incrementing the package/set version, rebuilding every generated artifact, regenerating fixtures and `SHA256SUMS`, and verifying the new export;
- vendor an update into a new destination, then review the `manifest.json`, metrics, license/provenance and checksum diff before changing the downstream dependency;
- keep stable member IDs and slugs unchanged for compatible corrections; use a new member identity for a materially different design.

If a later revision resolves the baseline exception, treat that as a metric-contract change requiring explicit visual review and downstream migration—not as an invisible patch.
