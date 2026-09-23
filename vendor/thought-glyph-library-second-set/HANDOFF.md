# THOUGHT Glyph Library — Second Set — downstream handoff

## Exact scope

“Second Set” means exactly the 36 ordered members in [manifest.json](manifest.json):

- approach 02 / `segment-mask`: 12 fonts;
- approach 03 / `stroke-graph`: 12 fonts;
- approach 04 / `routed-path`: 12 fonts.

Set 1 remains immutable and separate. Nothing in this bundle replaces or appends to it.

Set 2 membership means **exploratory-complete**, not final visual or deployment qualification. The manifest exposes per-font `review` fields. Current review counts are:

- legibility: 21 pass / 15 hold;
- identity: 20 pass / 16 hold;
- both visual gates: 9 dual-pass candidates / 27 holds;
- expanded native-SVG protocol: 36 pass;
- compact/on-chain storage: 36 unmeasured holds.

## Preferred vendoring flow

From the glyph-lab workspace:

```sh
npm run check
npm run export:second-set -- --out /absolute/path/to/downstream/vendor/thought-glyph-library-second-set
```

In the downstream repository:

```sh
npm install ./vendor/thought-glyph-library-second-set
node ./vendor/thought-glyph-library-second-set/verify.mjs
```

Commit `manifest.json` and `SHA256SUMS` with the vendored bundle.

## Load and use all 36 fonts

```js
import {
  listSecondSetTypes,
  listSecondSetFonts,
  loadAllSecondSetFonts,
  loadSecondSetFont,
  renderSecondSetLine,
  renderAllSecondSetLines
} from "@inshell/thought-glyph-library-second-set";

const types = await listSecondSetTypes();
const index = await listSecondSetFonts();           // ordered metadata for all 36
const dualPass = index.filter(
  (record) => record.review.combined === "dual-pass-candidate"
);                                                  // 9 current visual candidates
const all = await loadAllSecondSetFonts();           // [{ record, font }, ...]
const previews = await renderAllSecondSetLines("THOUGHT 01? Agent &");

for (const { record, font } of all) {
  const svg = renderSecondSetLine(font, "Agent & Thought?");
  console.log(record.type, record.memberId, svg);
}
```

## Load one construction group

```js
const segments = await loadAllSecondSetFonts({ type: "segment-mask" }); // 12
const graphs = await loadAllSecondSetFonts({ type: "stroke-graph" });   // 12
const routes = await loadAllSecondSetFonts({ type: "routed-path" });    // 12
```

Use a stable `memberId`, for example `inshell.thought.glyph-library.set-02.<slug>`, or the immutable slug as the downstream key. The `S2xx` family IDs are study provenance, not public integration IDs.

## Rendering contract

- Canonical order is exactly ` ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,?!:;'"-()/&`.
- Every font is monospaced on an 8-unit em with a 6-unit advance.
- SPACE advances but draws no path.
- Paths use finite, absolute `M/L/H/V/Q/C/Z` commands, even-odd fill, and at most two decimal places.
- Glyph source contains no transforms; line rendering may translate complete glyph paths.
- Unsupported characters are rejected, never silently substituted.

`renderSecondSetLine` is a deterministic single-line preview/integration primitive. It does not freeze the production THOUGHT wrapping or deployment architecture.

## Storage contract

The distributed `glyphs.json` files contain fully expanded SVG paths for review and deterministic interchange. They are **not** a proposed Ethereum runtime encoding.

[storage-model.json](storage-model.json) separates:

- measured expanded path bytes;
- the shared 5×7 alphabet bitmap data floor;
- one-byte family selectors;
- decoder/runtime work that remains unmeasured.

Do not quote the compact data floor as deployed bytecode size. A later Solidity architecture pass must measure the shared segment/graph/route decoders together with renderer logic.

## Licensing

This is an `UNLICENSED`, private study bundle until the rights holder supplies explicit distribution terms.
