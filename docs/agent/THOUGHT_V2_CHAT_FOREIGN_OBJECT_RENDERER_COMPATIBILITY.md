# THOUGHT V2 Chat `foreignObject` Renderer Compatibility

Date: 2026-07-20

Status: **experimental; blocked for contract adoption**

## Candidate under test

The chat-renderer branch uses a 960 × 960 SVG with a black background and two XHTML text fields inside SVG `<foreignObject>` elements. Prompt and Agent source lines remain exact plain text with a maximum of 64 UTF-8 bytes. CSS inside the SVG performs visual-width wrapping. The gallery and detail page load the exact SVG as a base64 `data:image/svg+xml` image rather than mounting it as inline DOM.

## Compatibility results

| Renderer | Input path | Result | Observation |
| --- | --- | --- | --- |
| Chrome | base64 SVG data image | Pass | Both fields render, wrap, align, and preserve bidirectional text. |
| Firefox | base64 SVG data image | Pass | Both fields render with behavior consistent with the browser candidate. |
| macOS Quick Look | raw SVG file | Pass | Both XHTML fields render in the generated preview. |
| resvg (`@resvg/resvg-js`) | raw SVG file | **Fail** | The black SVG background renders, but both `foreignObject` fields are omitted. |
| sharp/libvips | raw SVG file | **Fail** | The black SVG background renders, but both `foreignObject` fields are omitted. |
| Safari | base64 SVG data image | Not tested | Safari WebDriver was unavailable because Allow Remote Automation is disabled. |
| macOS `sips` | raw SVG file | Not applicable | It could not decode the plain SVG control in this environment. |
| FFmpeg | raw SVG file | Not applicable | The installed build has no SVG decoder. |

The resvg and sharp checks included a plain SVG `<text>` control. Both rendered the control correctly, so their black-only candidate output is specifically attributable to unsupported or omitted `<foreignObject>` content rather than invalid SVG input.

## Adoption decision

Do not replace the contract renderer with this candidate. A token image that depends on `<foreignObject>` can appear correct in browsers while becoming blank in other SVG consumers and server-side rasterization pipelines. The experiment stays useful for evaluating browser-native wrapping, but it is not a portable on-chain renderer.

The next contract candidate should preserve pure SVG text primitives and define deterministic visual-width layout outside viewer-specific HTML/CSS wrapping. Any proposed replacement must repeat this compatibility matrix before contract adoption.
