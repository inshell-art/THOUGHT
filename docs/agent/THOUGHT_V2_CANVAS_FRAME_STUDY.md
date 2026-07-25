# THOUGHT V2 canvas-frame study

> Resolved 2026-07-24. Current V2 adopts a 1024×1024 SVG artboard, 32-unit
> `#006100` outer frame, unscaled 960×960 black canvas at `(32,32)`, and
> `#00ff00` Humanist Smooth native-path glyphs. Any Source Code Pro /
> `foreignObject` language below is historical study context only.

Date: 2026-07-23
Branch: `codex/thought-v2-canvas-frame-study`
Status: geometry approved for the current V2 implementation candidate

## Recovered earlier discussion

The previous V2 renderer experiment made the outer work frame part of the SVG
artifact rather than gallery CSS:

```xml
<rect id="work-frame" width="960" height="960" fill="#202020"/>
<g id="work-canvas"
   transform="translate(16 16) scale(0.9666666666666667)">
  <rect id="canvas-bg" width="960" height="960" fill="#000000"/>
  ...
</g>
```

The rule was recorded in commit `ce3cef9` (“Embed THOUGHT V2 work frame in
artifacts”). Commit `ba0d45c` later restored hollow rounded frames around the
old Agent/prompt areas. Those message frames are a separate design decision.

The later binary-weave design explicitly removed the outer work frame and the
message rectangles. That decision belongs to the unpublished historical
binary-weave attempt and does not prevent a new frame study for the current
terminal-chat composition.

## Approved configuration

Visual review selected an artifact-owned outer frame with this exact geometry:

```xml
<svg width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect id="work-frame" width="1024" height="1024" fill="#006100"/>
  <g id="work-canvas" transform="translate(32 32)">
    <rect id="canvas-bg" width="960" height="960" fill="#000000"/>
    ...
  </g>
</svg>
```

- outer SVG artboard is `1024 × 1024`;
- frame size is `32` SVG units on every side;
- frame color is `#006100`, the original dark THOUGHT terminal green;
- the black internal canvas remains exactly `960 × 960`;
- the internal canvas is translated by `32,32` and is not scaled;
- prompt and Agent fields keep their fixed positions relative to that internal
  canvas: prompt `(57.6,128,844.8,256)`, Agent
  `(57.6,576,844.8,256)`;
- the prompt field is top aligned, fixing its first glyph-row baseline at
  `140.8`; the Agent field is bottom aligned, fixing its final glyph-row
  baseline at `780.8`;
- prompt and Agent fields remain frameless;
- Humanist Smooth native paths are the selected glyph implementation;
- canonical glyph green is `#00ff00`;
- SVG `<text>`, `foreignObject`, browser font lookup, and embedded font files
  are excluded from the canonical renderer.

The frame is encoded in the SVG from the renderer. Galleries, marketplaces,
and detail pages display the exact token image and must not recreate a second
frame with CSS.

## Decision boundary

The width, colors, artboard, canvas size, no-scaling rule, and Humanist Smooth
native-path renderer are approved for the current V2 implementation
candidate. This decision does not authorize a stable artifact, registry
entry, Sepolia or mainnet deployment, or production rollout; those still
require parity review and a clean release.
