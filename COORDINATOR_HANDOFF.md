# THOUGHT / PATH / inshell.art Coordinator Handoff

Date: 2026-05-08

## Goal

Integrate `inshell.art`, `THOUGHT`, and `PATH` against one shared local Anvil node.

Use this as the starting context for a fresh coordinator session that can see all repos.

## Repos

- `THOUGHT`: `/Users/bigu/Projects/THOUGHT`
- `PATH`: use the local PATH repo that owns `PathNFT`
- `inshell.art`: use the local inshell.art repo that links to THOUGHT

## Current THOUGHT Branch

- Branch: `thought-full-cli-panel`
- Baseline before this handoff file: `cb3e185 Polish THOUGHT contract and invalid return flow`
- Main should include this branch after the requested merge.

## Shared Local Chain

Use one Anvil node for PATH and THOUGHT. Do not use Hardhat node.

Current intended devnode:

```sh
npm run devnode:start
```

Expected chain:

```text
rpc: http://192.168.0.104:8545
local fallback: http://127.0.0.1:8545
chain id: 31337
chain name: Anvil Local
```

State persistence lives under:

```text
evm/devnode-state/
```

Useful commands:

```sh
npm run devnode:save-state
npm run devnode:load-state
```

Blunt rule: Anvil state persistence preserves deployed contract storage only if the same deployed addresses are still used by the app config. Redeploying a changed contract creates a new address and a fresh collection.

## Current THOUGHT Dev Addresses

From `evm/addresses.anvil.json`:

```json
{
  "rpcUrl": "http://192.168.0.104:8545",
  "chainId": 31337,
  "pathNft": "0xb185E9f6531BA9877741022C92CE858cDCc5760E",
  "seedGenerator": "0x79E8AB29Ff79805025c9462a2f2F12e9A496f81d",
  "thoughtPreviewer": "0x0Dd99d9f56A14E9D53b2DdC62D9f0bAbe806647A",
  "thoughtSpecRegistry": "0xeAd789bd8Ce8b9E94F5D0FCa99F8787c7e758817",
  "thoughtNft": "0xd9fEc8238711935D6c8d79Bef2B9546ef23FC046"
}
```

Active spec:

```text
ref: THOUGHT.v1.md
hash: 0x0377a92a403e22fa1f0c7d08ad6f41e8556d491fce1e18e44cb91a3513fc16db
bytes: 7046
```

Current dev PATH tokens from this deploy:

```text
$PATH #1-10 owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

If visitor accounts need PATH, mint them on the shared Anvil node, then save state.

## Deployment Order

For a clean shared local stack:

1. Start/load Anvil.
2. Deploy or reuse PATH `PathNFT`.
3. Deploy THOUGHT contracts using the selected `PathNFT`.
4. Configure PATH movement:

```text
movement: THOUGHT
contract: ThoughtNFT address
quota: 1
```

5. Write the same chain/contract addresses into THOUGHT and inshell.art configs.
6. Mint dev `$PATH` tokens to test wallets.
7. Save Anvil state.

## THOUGHT Local Commands

```sh
npm run build:evm
npm run test:evm
npm test
npm run build
npm run dev -- --host 0.0.0.0 --port 5174
```

Keep THOUGHT dev server on port `5174`.

## Integration Requirements

- `inshell.art` should link to THOUGHT, preferably same-window unless product direction changes.
- THOUGHT and PATH must point to the same Anvil RPC and chain id.
- Wallet/Rabby must use chain id `31337` and the same RPC URL reachable by the browser machine.
- LAN clients must use a reachable RPC host, not `127.0.0.1` unless Anvil is running on their own machine.
- THOUGHT fetches `THOUGHT.md` from the onchain `ThoughtSpecRegistry`, so the registry RPC must be reachable from the browser.

## Contract Facts

- Contract name is now `ThoughtNFT`, aligned with `PathNFT`.
- `ThoughtNFT.previewWork(rawReturn)` is the authority for text normalization, validation, and SVG rendering.
- Successful `run` stores a browser-session `work` only after `previewWork().ok === true`.
- Rejected model returns do not create works.
- `tokenURI()` returns mainstream NFT JSON metadata with an onchain SVG image.
- Canonical text uniqueness is enforced onchain: the same canonical THOUGHT text can mint only once.

## Coordinator Risks

- Do not redeploy casually. It changes active addresses and makes old local mints disappear from the app view.
- If a contract code change requires redeploy, record old and new addresses explicitly.
- Avoid running separate Anvil nodes for PATH and THOUGHT. That is the fastest way to break wallet reads and `$PATH` ownership checks.
- If LAN cannot fetch `THOUGHT.md`, check RPC reachability first.

## Suggested Coordinator First Steps

1. Open all three repos in one session.
2. Confirm one Anvil process and one chain id.
3. Confirm THOUGHT `evm/addresses.anvil.json`.
4. Confirm PATH repo sees the same `PathNFT`.
5. Confirm inshell.art link target and env.
6. Run THOUGHT on `5174`.
7. Test wallet flow: `wallet connect -> run -> mint -> path -> authorize -> confirm`.
8. Save Anvil state after any useful mint/setup.
