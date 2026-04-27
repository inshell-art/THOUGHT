# Deferred Tweaks

Small follow-up tasks to do at a better timing, not during the current implementation pass.

## Contract naming alignment

- Current THOUGHT mint contract name: `ThoughtToken`.
- PATH NFT contract name: `PathNFT`.
- Preferred aligned THOUGHT contract name: `ThoughtNFT`.
- Scope when scheduled: rename Solidity contract/file/artifacts/deploy scripts/frontend ABI references/tests/docs from `ThoughtToken` to `ThoughtNFT`.
- Keep token-level public `name` and `symbol` as `THOUGHT` unless product naming changes separately.
- Rationale: align contract identifier style with PATH (`PathNFT`) while avoiding all-caps Solidity type names like `THOUGHTNFT`.
