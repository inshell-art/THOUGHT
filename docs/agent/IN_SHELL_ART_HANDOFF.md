# inshell.art Handoff: THOUGHT Formal Agent Flow

This repository now defines the active formal contract as unversioned `ThoughtNFT` and `ThoughtSpecRegistry`, while keeping V1 as an archive. Update `inshell.art` against the contract artifacts from this repository; do not carry forward `ThoughtNFTV2`, `ThoughtSpecRegistryV2`, Color Font, or preview-contract dependencies.

## Required Integration Changes

1. Use `thought-agent/2` for new runs.
2. Create one sealed task containing `rawPrompt`, `promptLine`, exact spec name/id/hash/ref/text, and expected `thought.agent-result.v2` result schema.
3. Give Agent integrations a task fetch operation, a one-result submit operation, and status operation. Do not send a full spec solely in a deep-link query.
4. Keep human controls separate: choose PATH, authorize PATH, then call unversioned `ThoughtNFT.mint(MintThoughtInput)`.
5. Allow a direct/manual mint path without a run receipt. Agent participation is optional and must not become an onchain requirement.
6. Derive `binaryField` using UTF-8 `promptLine` bytes followed by `agentLine` bytes, repeat short data or truncate long data to exactly 1024 bits. Include that result in `thought.provenance.v2`.
7. Use `thought.svg.v2.fixed-a-32` to describe the render contract. Marketplace metadata public naming is `THOUGHT`, not `THOUGHT V2`.
8. Validate visible lines with the shared deterministic rules before opening the wallet: prompt `320` UTF-8 bytes / `433` display units; Agent `180` UTF-8 bytes / `162` display units. Check Agent-line identity before wallet pressure when a read path is available; the contract remains authoritative.

## ABI Change

```solidity
struct MintThoughtInput {
    string promptLine;
    string agentLine;
    uint256 pathId;
    bytes32 thoughtSpecId;
    bytes32 thoughtSpecHash;
    string provenanceJson;
    uint256 deadline;
    bytes pathSignature;
}

function mint(MintThoughtInput calldata input) external returns (uint256 tokenId);
```

The active constructor is `new ThoughtNFT(pathNft, thoughtSpecRegistry)`. New integration code must not pass a Color Font address.

## Identity Rule

`workHash` is a domain-separated hash of `agentLineHash` only. The same exact Agent line is already an existing THOUGHT even if the prompt or binary field differs. `promptLine` remains stored, rendered, hashed, and included in the binary-field source, but is not an edition key. Handle `AgentLineAlreadyMinted(workHash, tokenId)` as: `Agent line already exists as a THOUGHT.`

## Artifact Source

Before wiring UI code, fetch the active release artifacts from this repository and verify the manifest/checksums. The source of truth is the current `main` artifact bundle generated from `ThoughtNFT.tokenURI` and `thought.svg.v2.fixed-a-32`; frontend CSS must not substitute a different token SVG framing.
