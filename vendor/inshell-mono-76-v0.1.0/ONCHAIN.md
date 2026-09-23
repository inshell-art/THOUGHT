# On-chain architecture

## What this package provides

`onchain/packed/400.bin` is a deterministic binary container for the exact
Regular 400 path stream. It contains:

| Offset | Bytes | Meaning |
| ---: | ---: | --- |
| 0 | 4 | ASCII magic `IM76` |
| 4 | 1 | encoding version `1` |
| 5 | 2 | big-endian weight `400` |
| 7 | 1 | glyph count `76` |
| 8 | 154 | 77 big-endian uint16 path offsets |
| 162 | 20,053 | concatenated UTF-8 SVG paths |

Total geometry-container size is 20,215 bytes. The `.hex` file contains the
same bytes for deployment tooling. `decoder.mjs` and
`InshellMono76Decoder.sol` implement the lookup contract.

These numbers are data sizes, not deployed bytecode sizes.

## Build-time source versus chain state

`@inshell/mono-76` is the build-time integration source of truth consumed by
THOUGHT and PATH repositories. On-chain state is an immutable release
snapshot. Updating the package does not update an existing deployment.

## Deployment shapes

### Embed per downstream deployment

Each THOUGHT or PATH renderer embeds the pinned packed data it needs.

- Advantage: no external runtime dependency.
- Cost: repeated deployment bytes and potentially severe runtime-code
  pressure.

### Shared immutable glyph-data contract

Deploy the packed Regular 400 blob once, record its address and package hash,
and let THOUGHT and PATH renderer contracts retrieve it.

- Advantage: one canonical on-chain copy shared across products.
- Cost: another contract dependency and retrieval/decoder gas.

The shared contract must be immutable or explicitly versioned. Never point a
released artwork at silently mutable font geometry.

## Size warning

The packed data alone is 20,215 bytes, close to Ethereum's 24,576-byte
runtime-code limit before adding retrieval, decoding, SVG serialization, text
layout, or renderer logic. Do not claim that a complete renderer fits one
contract from this data figure.

Before deployment, compile and measure the complete selected architecture,
including storage framing, link/delegate overhead, the decoder, character
lookup, layout, escaping, and final SVG assembly.

## Required deployment record

Store or publish:

- package version;
- `manifest.json` SHA-256;
- packed binary SHA-256;
- source TTF SHA-256;
- chain ID;
- deployed address;
- deployed runtime-bytecode hash;
- renderer version and compiled size;
- OFL/notice URI.
