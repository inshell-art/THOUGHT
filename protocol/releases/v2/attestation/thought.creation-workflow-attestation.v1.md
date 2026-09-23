# THOUGHT Creation Workflow Attestation v1

## Identity

- Profile name: `inshell.thought.creation-workflow-attestation.v1`
- Profile ID: `keccak256(UTF8(profile name))` = `0x0dc216b0e8f18cabaa4afee047e80f349ed3c2de67ace911157300279f74c669`
- Signature scheme: EIP-712 with one canonical 65-byte low-s ECDSA signature
- ERC-1271 support: deferred

## EIP-712 domain

- `name`: `Inshell THOUGHT Creation Attestation`
- `version`: `1`
- `chainId`: the current EVM chain ID
- `verifyingContract`: the immutable `CreationAttestationVerifier` address used by `ThoughtNFT`

## Claim

The primary type name is `CreationAttestation`. Its fields, order, and Solidity types are exactly:

```text
bytes32 profileId
address thoughtNft
bytes32 protocolReleaseId
bytes32 thoughtSpecId
bytes32 thoughtSpecHash
bytes32 workHash
bytes32 provenanceHash
bytes32 declaredAgentHash
bytes32 declaredModelHash
bytes32 runIdHash
address intendedMinter
uint64 deadline
uint32 authorityEpoch
```

The exact type string is:

```text
CreationAttestation(bytes32 profileId,address thoughtNft,bytes32 protocolReleaseId,bytes32 thoughtSpecId,bytes32 thoughtSpecHash,bytes32 workHash,bytes32 provenanceHash,bytes32 declaredAgentHash,bytes32 declaredModelHash,bytes32 runIdHash,address intendedMinter,uint64 deadline,uint32 authorityEpoch)
```

`thoughtSpecId` and `thoughtSpecHash` are the exact pair from `MintThoughtInput` after that same pair passes `ThoughtSpecRegistry.isRegisteredThoughtSpec`; they are also the pair stored for the token. `declaredAgentHash` and `declaredModelHash` are Keccak-256 hashes of the exact UTF-8 declaration bytes. `provenanceHash` is Keccak-256 of the exact stored `provenanceJson` bytes. `workHash` is the contract-derived V2 work hash. `runIdHash` is a nonzero public-safe hash; raw run identifiers are not stored by the contracts. `intendedMinter` is the caller of `ThoughtNFT.mint`. `profileId`, `thoughtNft`, `protocolReleaseId`, both selected-spec fields, the work/provenance/declaration hashes, and `intendedMinter` are built by `ThoughtNFT`, not accepted as duplicate trusted proof fields.

PATH token ID, PATH authorization, PATH deadline, transaction or token facts, provenance-conformance status, provider claims, and signature bytes are not claim fields. The signature is never inserted into the provenance bytes it commits to.

## Meaning and limits

A valid signature maps to the metadata label `Inshell THOUGHT App`: an Inshell-controlled authority approved the exact committed creation payload, including the selected registered creative-spec pair, under this profile. It does not prove that a browser was the transaction caller, that a named Agent or model executed, that one internal inference occurred, or that a model authored the Agent line. `Declared Agent` and `Declared Model` remain declarations. Provenance remains opaque exact bytes to the contracts.

The sole unattested proof encoding is an all-zero `runIdHash`, deadline, and authority epoch with empty signature bytes. It skips verifier execution, stores digest zero, and maps to `Unattested`. This label does not mean invalid or nonconforming. Every partially populated proof is invalid.

## Verification and replay

The verifier accepts only its profile ID, its current nonzero authority and epoch, a nonzero run ID hash, an inclusive deadline, the calling `ThoughtNFT` as `thoughtNft`, and a canonical valid signature. Authority rotation increments the epoch exactly once. Pause blocks only attested mints. The verifier is read-only and records no nonce or proof use.

Before mint success, the intended minter may retry the same proof before its deadline. After success, global Agent-line uniqueness prevents a second token for that work. A different caller, collection, chain, release, selected spec ID, selected spec hash, work, provenance, declaration, run commitment, deadline, or epoch does not validate. A proof for one registered pair cannot be reused with another independently registered pair. Failed verification consumes no PATH unit and reserves no work. Rotation and pause do not alter an already stored attestation digest or historical metadata.
