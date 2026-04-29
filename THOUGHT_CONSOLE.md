# THOUGHT Console

The THOUGHT page uses a CLI-style operator console. The console is command-only; route, model, prompt, provider, key, wallet, run, and mint operations are all driven through `thought>`.

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
- Secret-bearing `key <api-key>`, `config key <api-key>`, and `config direct key <api-key>` commands are masked and excluded from command history.
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

`run` sends prompt + THOUGHT.md to the selected model and renders the returned text to canvas. `mint` starts the $PATH-gated THOUGHT mint flow.

Each successful `run` records a session work. A work is the returned THOUGHT text, its canvas thumbnail, and the run context needed to reload it.

```text
thought> work list
thought> work <id>
thought> last work
```

`work list` lists session works. `work <id>` loads a specific work back into the canvas. `last work` loads the previous work relative to the current work, or the newest work when no work is active.

## Config

`config` sets the route and model for one round.

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
config local detect
config local endpoint <url>
config local model list
config local model <id>
config connect
config connect authorize
config connect disconnect
config connect model list
config connect model <id>
config direct
config direct provider list
config direct provider <id>
config direct key <api-key>
config direct key clear
config direct model list
config direct model <id>
```

Aliases still work for older muscle memory: `mode`, `model`, `model list`, `provider`, `key`, `connect openrouter`, `disconnect openrouter`, `config model`, `config provider`, `config key`, `config connect openrouter`, and `config disconnect openrouter`.

## Command Usage

Most commands show usage when called without arguments.

`prompt` prints the prompt text because it is not secret:

```text
prompt: "when will we be done?"
use: prompt <text>
clear: prompt clear
```

`config direct key` never prints the key:

```text
api key: not set
policy: session only. per provider.
use: config direct key <api-key>
```

`config local` detects Ollama from the user's browser machine. The default endpoint is `http://127.0.0.1:11434`.

```text
route: local
runs on this machine.
status: ollama not detected
endpoint: http://127.0.0.1:11434
first: start ollama on this machine.
use:
config local detect
config local endpoint <url>
config local model list
run

or use another route:
config connect
config direct
```

Use `config local endpoint <url>` when Ollama is exposed somewhere other than the default local endpoint.

`config connect` includes both OpenRouter authorization and disconnect commands:

```text
route: connect
delegated cloud access.
service: openrouter
authorization: linked
use:
config connect authorize
config connect disconnect
config connect model list
config connect model <id>
run
```

`config direct` shows raw-key state as `not set` until a session key is provided:

```text
route: direct
raw provider key. session only.
provider: openai
api key: not set
use:
config direct provider list
config direct provider <id>
config direct key <api-key>
config direct key clear
config direct model list
config direct model <id>
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

- Console transcript is stored in `sessionStorage` and survives page refresh.
- `clear` resets the visible transcript and starts a fresh intro.
- The current generated THOUGHT output and run context are stored in `sessionStorage` so the canvas can be restored after refresh.
- Session works are stored in `sessionStorage`; they survive refresh but not browser-session clearing.
- Command history is stored in `sessionStorage`.
- Prompt, route, model, provider, and OpenRouter connect credential are session-scoped browser state.
- Direct API keys are session-only, stored per direct provider, and never shown by usage output.
- No backend receives provider keys from this app path.
