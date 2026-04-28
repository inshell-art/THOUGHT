# THOUGHT Console

The THOUGHT page uses a CLI-style operator console. The console is command-only; route, engine, prompt, provider, key, wallet, run, and mint operations are all driven through `thought>`.

## Opening

The console starts with:

```text
THOUGHT operator.

one round on a model.
prompt + THOUGHT.md in.
canvas out.

quick start:
config
prompt <text>
run
mint
```

## Interaction

- The input prompt is always `thought>`.
- Clicking or typing anywhere on the THOUGHT page focuses the `thought>` input unless another editable field is active.
- Enter runs the command currently typed after `thought>`.
- Up and Down walk command history stored in `sessionStorage`.
- Ctrl+C clears the current prompt input.
- Secret-bearing `key <api-key>` and `config key <api-key>` commands are masked and excluded from command history.
- The transcript scrolls to the bottom after each command.
- Commands print in green as `> command`; normal output is grey; errors are red.

## Main Flow

```text
thought> config
thought> prompt when will we be done?
thought> run
thought> mint
thought> path 1
thought> authorize
thought> confirm
```

`run` sends prompt + THOUGHT.md to the selected engine and renders the returned text to canvas. `mint` starts the $PATH-gated THOUGHT mint flow.

## Config

`config` sets the route and engine for one round.

Routes:

```text
local     runs on this machine.
connect   delegated cloud access.
direct    raw provider key. session only.
```

Usage:

```text
config
config local
config connect
config direct
config engine list
config engine <id>
config connect openrouter
config disconnect openrouter
config provider <id>
config key <api-key>
config key clear
```

Aliases still work for older muscle memory: `mode`, `model`, `model list`, `provider`, `key`, `connect openrouter`, and `disconnect openrouter`.

## Command Usage

Most commands show usage when called without arguments.

`prompt` prints the prompt text because it is not secret:

```text
prompt: "when will we be done?"
use: prompt <text>
clear: prompt clear
```

`config key` never prints the key:

```text
api key: not set
policy: session only.
use: config key <api-key>
```

`config connect` includes both OpenRouter authorization and disconnect commands:

```text
route: connect
delegated cloud access.
provider: openrouter
authorization: linked
use:
config connect openrouter
config disconnect openrouter
config engine list
config engine <id>
run
```

`config direct` shows raw-key state as `not set` until a session key is provided:

```text
route: direct
raw provider key. session only.
provider: openai
api key: not set
use:
config provider <id>
config key <api-key>
config key clear
config engine list
config engine <id>
run
```

## THOUGHT.md

`THOUGHT.md` is the active generation spec.

```text
thought> THOUGHT.md
thought> THOUGHT.md text
```

If the frontend cannot fetch the active spec, `run` reports:

```text
run failed.
Failed to fetch THOUGHT.md.
```

That is a frontend/spec availability problem, not something the user can fix from the console.

## Mint Flow

`mint` keeps the current THOUGHT onchain. One THOUGHT needs one $PATH.

CLI flow:

```text
thought> mint
thought> wallet connect
thought> path <id>
thought> authorize
thought> confirm
```

The CLI mint path hides any stale sheet-mode mint dialog, keeps the mint state in console mode, and prints the next command after wallet connect, path selection, authorization, and confirmation.

After minting:

```text
thought> view tx
thought> view THOUGHT
```

`view tx` opens the configured explorer when available. On local Anvil, it exposes the tx hash instead of using an explorer URL.

## Storage

- Console transcript is in memory and resets on page refresh.
- Command history is stored in `sessionStorage`.
- Prompt, route, engine, provider, and OpenRouter connect credential are session-scoped browser state.
- Direct API keys are session-only and never shown by usage output.
- No backend receives provider keys from this app path.
