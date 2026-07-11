# THOUGHT V1 Sepolia Archive

V1 is the historical Color Font / single-text THOUGHT rehearsal. It is not the active contract surface and must not be deployed for new THOUGHT work or used by active frontend integrations.

## Preserved Material

- `evm/legacy/ThoughtNFTV1.sol`
- `evm/legacy/ThoughtSpecRegistryV1.sol`
- `evm/legacy/ColorFontV1.sol`
- `evm/test/legacy/`
- `scripts/deploy-evm-v1-local.sh`
- `artifacts/sepolia/current/ops-bundles/sepolia-thought-deploy-20260515T031414Z/`
- `artifacts/sepolia/current/signing-os-packs/sepolia-thought-signing-os-pack-20260515T050730Z/`

## Address Record

The executed V1 release is recorded by the `inshell.art` Sepolia release manifest:

| Field | Value |
| --- | --- |
| Network | Sepolia (`11155111`) |
| ThoughtNFT | `0x413efb5C95Bf3158F0E563FB9E19CB650Fc3760a` |
| Deployment transaction | `0x575a3308d5af8de0b932c065ffddfa9369f422c43e7a5a70ef3fd40c6f6c9825` |
| Deployment block | `10872879` |
| ThoughtSpecRegistry | `0xBB8FD738b01b4a14F5E9bCFE408239a05d84621D` |
| ColorFont v1 | `0xC223507ab7801Fdf234766fa1A87F09eae3494af` |
| ThoughtPreviewer | `0x0A0100Ef4c25a50A8E16bED818E6Bda82d3b923F` |
| SeedGenerator | `0xAaA5a9D3F7C5eFaB8b7DA19F9CeC17c3895cc287` |
| Registered spec | `THOUGHT.v1.md` |
| Observed ThoughtNFT runtime hash | `0x6dd987086e7379de72e848d34645231e015eb55d212983d6a7fea3afe568ad54` |

Evidence sources in the active `inshell.art` checkout:

- `packages/contracts/src/releases/thought-release.sepolia.json`
- `packages/contracts/src/releases/source-bytecode-map.sepolia.json`
- `packages/contracts/src/addresses/addresses.sepolia.json`

The release record identifies the contract and deployment transaction, while its source-commit status is `unproven`. Treat the runtime hash and deployment transaction as the available deployment evidence; do not claim a fully verified source match until the historical source commit is recovered or the contract is verified independently.

The active public deployment path is the unversioned `ThoughtNFT` described in [THOUGHT_MAINNET_DEPLOYMENT.md](THOUGHT_MAINNET_DEPLOYMENT.md) and the generated Sepolia Signing OS pack.
