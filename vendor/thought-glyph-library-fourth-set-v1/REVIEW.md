# THOUGHT Glyph Library — Fourth Set — review

## Decision

Set 4 contains exactly three ordered members:

1. `S401 tile-vertical-ledger`, sourced from Set 1 `S11` Vertical Ledger.
2. `S402 tile-column-relay`, sourced from Set 2 `S202` Column Relay.
3. `S403 tile-humanist-smooth`, sourced from Set 3 `S301` Humanist Smooth.

The earlier four-font foreground-color study bundle was preliminary and was replaced before downstream export.

## Approved presentation

The selected profile is `tight-v1`: 96% glyph scale, 6.5-unit fixed advance, 0.2-unit tile gap, square edges, and a stored Tight preset corner parameter of 0.15 units whose effective square-edge radius is zero. SPACE keeps the same 6.5-unit advance and draws nothing, preserving the strict monospaced contract.

Color Font v1 owns letter backgrounds. Lowercase aliases uppercase. All 23 visible digits and punctuation characters use `#ffffff`. The glyph foreground is black or white, whichever has the larger WCAG contrast ratio; ties choose black. The minimum selected letter contrast is 4.7734:1 on T/teal, so no outline is used.

## Source geometry

All 76 source paths per member are preserved byte-for-byte. Family-level normalization aligns each source optically inside the Tight tile. Humanist Smooth uses a safe matrix for `gjpqy,;()/` so descenders and deep punctuation stay inside the tile.

## Storage

The shared compact paint-data floor is 88 bytes: 78 RGB24 palette bytes, a four-byte foreground mask, and shared black/white RGB24 values. Geometry, normalization, runtime code, SVG serialization, and deployed-bytecode cost are reported separately in `storage-model.json`.
