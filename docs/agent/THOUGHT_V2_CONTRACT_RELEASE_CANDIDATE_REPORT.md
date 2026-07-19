# THOUGHT V2 Contract-Side Release Candidate Report

Date: 2026-07-19

Status: contract-side implementation and deterministic draft package finalized,
locally verified, and consolidated as candidate tag
`thought-v2-contract-release-candidate-20260719`; production approval,
immutable publication, protocol registration, public-chain deployment, and
production consumer rollout remain separate operator actions

## Outcome

The current THOUGHT V2 contract and protocol implementation is ready for
source review and candidate consolidation. The release package now binds the
consumer-facing contract interface, all five active ABIs, contract hash
vectors, exact protocol and provenance formats, renderer/work profiles, and
all conformance vectors in one deterministic 24-artifact manifest.

The contract deployment and operator runbooks now match the implementation's
six immutable dependencies, including the separately deployed
`CreationAttestationVerifier`. A fresh disposable Anvil chain deployed this
exact candidate and minted all 60 positive gallery fixtures: 30 Unattested and
30 mock-attested.

This is not yet a production release. The generated manifest remains the draft
candidate by design. The candidate source commit and tag do not authorize an
immutable upload, registry transaction, public-chain deployment, production
signature, or downstream production rollout.

## Source State

```text
repository: /Users/bigu/Projects/THOUGHT
branch:     codex/thought-v2-protocol-refinement
base HEAD:      ec46cbf2f9ed5f7627c374bdf9963a38b5dad4c3
base tag:       thought-v2-protocol-release-binding-20260716
candidate tag:  thought-v2-contract-release-candidate-20260719
```

The base tag is historical source evidence only. The candidate tag identifies
the complete reviewed source state described here; resolve its exact commit
with `git rev-parse thought-v2-contract-release-candidate-20260719`.

## Exact Candidate Identity

```text
manifest file:          protocol/releases/v2/release.manifest.draft.json
artifact count:         24
manifest byte length:   6,508
manifest keccak256:     0x88816286211e657f07e94a4728543c92c6463fece9701fb0cee0b1ae29ef0ef2
manifest sha256:        163f475747a2ca5832b40d7aa996967e7ecb1b8c81b77cc59b44cd23d248fe95
protocol release ID:    0x6950429fdb8c369226b47f5308590de7cc601c037cdbf816dead7eb3e6aa7bd5
registration authorized:false

embedded bundle file:   src/generated/thought-v2-release-bundle.json
embedded bundle bytes:  1,423,526
embedded bundle sha256: 0dd03a095297e8e1795a07d5411d1448e6d6d6e5f43d2c33d4aac29775aa8186
```

The manifest contains exact-byte Keccak-256 commitments for:

- creative and Agent declaration/result specifications;
- creation-attestation profile;
- active contract interface, mint-input schema, and contract hash vectors;
- `ThoughtNFT`, `ThoughtRenderer`, `ThoughtSpecRegistry`, protocol registry,
  and `CreationAttestationVerifier` ABIs;
- canonical provenance profile and closed JSON schema;
- work and renderer profiles; and
- text, raw UTF-8, loom, provenance, trait, SVG, tokenURI, and creation-
  attestation vectors.

Consumer ABI SHA-256 pins are:

```text
ThoughtNFT:                     cbc2cad36e3b73871447da8e82d0060678b4a72427d9e2f978f61c7666399ecf
ThoughtRenderer:                d63dc09ec4741e3b1ff19a9afd15e6bdc7c6ca0d3fed505df7c7db57a00abc65
ThoughtSpecRegistry:            0c571de489bb482d25dfe60744ae2fca15a7dc21605da960786474a4ab458830
ThoughtSpecRegistryV2:          eceef2d84fca79a0b4306d200092d6da918cdf57196417fa089a3bd69dea3266
CreationAttestationVerifier:    5691c13c79b5a76ef5e1b7bf8b2f11cc620f088a61347aaa304fca59d422e8e7
```

## Final Contract Topology

The active collection constructor is:

```solidity
ThoughtNFT(
    address pathNft,
    address thoughtSpecRegistry,
    address thoughtRenderer,
    address protocolRegistry,
    bytes32 protocolReleaseId,
    address creationAttestationVerifier
)
```

The collection immutably binds PATH consumption, exact selected-spec registry,
canonical renderer, registered protocol release, and creation-attestation
verifier. There is no active/latest spec gate. Multiple registered exact spec
pairs remain mintable.

The verifier is deployed separately as:

```solidity
CreationAttestationVerifier(address initialOwner, address initialAuthority)
```

For production, `initialOwner` is the reviewed Ledger-backed ADMIN and
`initialAuthority` is only the public address of the protected App signing
service. No authority private key belongs in this repository, a browser build,
the signing pack, provenance, fixtures, or a Codex task.

Solidity continues to store and hash exact provenance bytes opaquely. It does
not parse JSON or fetch an external provenance object. Every positive producer
must submit canonical JCS `inshell.thought.provenance.v2` bytes built and
verified offchain; malformed opaque bytes remain testable only at the explicit
contract-boundary negative path.

## Fresh Anvil Evidence

The disposable chain was reset and redeployed from this candidate:

```text
RPC:        http://127.0.0.1:8545
chain ID:   31337
PATH NFT:   0x5FbDB2315678afecb367f032d93F642f64180aa3
THOUGHT:    0x4C4a2f8c81640e47606d3fd77B353E87Ba015584
verifier:   0x04C89607413713Ec9775E14b954286519d836FEf
supply:     60
attested:   30
unattested: 30
```

Independent readback confirmed:

```text
ThoughtNFT.totalSupply()                   60
ThoughtNFT.protocolReleaseId()             0x6950429fdb8c369226b47f5308590de7cc601c037cdbf816dead7eb3e6aa7bd5
ThoughtNFT.protocolManifestHash()          0x88816286211e657f07e94a4728543c92c6463fece9701fb0cee0b1ae29ef0ef2
ThoughtNFT.creationAttestationVerifier()   0x04C89607413713Ec9775E14b954286519d836FEf
PATH THOUGHT minter                        0x4C4a2f8c81640e47606d3fd77B353E87Ba015584
PATH THOUGHT quota                         1
PATH THOUGHT movement frozen               true
```

The local gallery and work-detail pages both returned HTTP 200 and served the
new candidate runtime configuration. These addresses and signatures are
disposable test evidence and must never be copied into a production lock.

## Verification Evidence

Final sequential verification produced:

```text
npm run protocol:check   PASS; 24 artifacts; deterministic manifest and offline bundle
npm test                 PASS; 14 files, 88 tests
npm run build            PASS; TypeScript and Vite production build
npx tsc --noEmit         PASS
npm run build:evm        PASS
npm run test:evm         PASS; 149 tests
  ThoughtSpecRegistryV2         5
  CreationAttestationVerifier  11
  active ThoughtNFT V2         77
  archived V1                  56
forge fmt --check        PASS for all changed active Solidity and active tests
git diff --check         PASS
gitleaks source scan     PASS; no leaks found with ignored generated `dist/` excluded
npm run devnode:gallery  PASS; 60/60 positive fixtures minted
```

A full working-directory scan also traversed the ignored minified `dist/`
output and produced one generic-key false positive where the literal UI label
`api key` is adjacent to minified property text. The source scan is clean; no
credential value is embedded by that label. The ignored build output is not a
release source artifact.

A repository-wide `forge fmt --check` still reports formatting differences in
unchanged base/legacy files (`ThoughtSpecRegistry.sol`, `ContractCodeStorage.sol`,
`Base64.sol`, and archived V1 tests). Those unrelated files were not
mechanically rewritten as part of this candidate. All changed active Solidity
files and active tests pass the formatter gate.

## Downstream Handoff

The integration contract for the `inshell.art` agent is:

```text
docs/agent/IN_SHELL_ART_V2_PROTOCOL_REFINEMENT_HANDOFF.md
```

In brief, the consumer must:

1. embed and verify an immutable approved release rather than `latest`, a
   branch, `CURRENT.json`, or Anvil state;
2. gate Agent execution and mint submission on exact contract, release,
   renderer, work-profile, attestation-profile, ABI, and artifact parity;
3. build every positive provenance record through the shared canonical builder
   and verifier before wallet intent or signing;
4. obtain official signatures from a protected service, never from a browser-
   resident private key;
5. use the same selected spec pair in provenance, optional attestation, mint
   calldata, and post-mint checks; and
6. replace pre-mint predictions with exact onchain `tokenURI()` or `svgOf()`
   output after mint.

The THOUGHT repository owns the protocol, contracts, ABIs, exact artifacts,
onchain renderer, conformance vectors, and reviewed deployment metadata. The
`inshell.art` repository owns the production App, embedded consumer lock,
wallet/Agent orchestration, signing-service integration, and frontend rollout.

## Remaining Non-Repository Operator Actions

These actions remain intentionally incomplete and require explicit authority:

1. Approve the exact candidate manifest bytes and copy those same bytes to
   `release.manifest.json` without rebuilding a different manifest.
2. Publish the package at an immutable location and record its retrieval URI.
3. Register the manifest hash using the Ledger-backed registry owner.
4. Deploy the five active THOUGHT contracts on the intended public network,
   configure/freeze PATH, and capture complete transaction/address/readback
   evidence.
5. Produce immutable per-network deployment metadata and the umbrella consumer
   release, then have `inshell.art` write and test one exact consumer lock.
6. Preserve the previous compatible lock and deployment record for rollback.

Until those steps complete, the candidate is suitable for review and Anvil
integration only, not production registration or rollout.
