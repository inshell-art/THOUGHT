# THOUGHT CLI Copy And Logic Summary

This is a handoff summary of the current THOUGHT operator CLI. It is meant for copy review and product logic discussion, not as implementation documentation.

## Purpose

The CLI is the primary operator surface for the THOUGHT page.

It lets a user:

- choose how to reach a model
- set a prompt
- run one model round with `THOUGHT.md`
- inspect generated works
- mint a generated work as an onchain `THOUGHT`

The prompt line is:

```text
thought>
```

## Core Terms

- `work`: a generated result from `run`. It includes the normalized canvas text, image/thumbnail, prompt, model return, model route, model id, spec metadata, and provenance JSON.
- `output`: legacy alias for `work`. Current copy should prefer `work`.
- `THOUGHT`: a minted generated work onchain. Its id is the contract token id, not the CLI session work id.
- `$PATH`: the permission NFT used to mint. One `THOUGHT` consumes one `$PATH`.
- `THOUGHT.md`: the generation spec/instructions loaded from the active onchain spec registry.
- `spec`: alias/concept for `THOUGHT.md` metadata.
- `provenance`: JSON record of run and mint context. Current copy says it is a record, not proof.
- `route`: how THOUGHT reaches a model: `local`, `connect`, `direct`, or `my-brain`.
- `model`: the selected model id. Older “engine” wording is intended to be replaced by “model”.
- `provider`: service/provider behind a route, for example `ollama`, `openrouter`, `openai`, `anthropic`, or `me`.

## CLI Interaction Rules

- Pressing Enter submits the command in `thought>`.
- Clicking the THOUGHT operator page refocuses `thought>`.
- Typing anywhere on the THOUGHT operator page refocuses `thought>`.
- `Ctrl+C` clears the current input when there is typed input.
- Up/Down with an empty input cycles command history.
- Up/Down with non-empty input cycles command completion matches for the typed prefix.
- Command history is stored in `sessionStorage`.
- Transcript output is stored in `sessionStorage`.
- Generated works are stored in `sessionStorage`.
- API keys are session-only and per direct provider.
- API key values are masked in the transcript and are not recorded in command history.

## Opening Copy

Initial transcript copy:

```text
THOUGHT operator.

one model round.
prompt + THOUGHT.md in.
canvas out.

quick start:
config
prompt <text>
run
mint
```

## Output Style

- Commands are printed as green transcript entries with `>`.
- Normal output is gray.
- Errors are red.
- Running progress starts with an animated `running...` line.
- Section spacing is automatically inserted before labels such as `use:`, `routes:`, `flow:`, `more:`, `need $PATH:`, and `alternatives:`.
- Follow-up action lines use prefixes like `use:`, `next:`, `clear:`, `run:`, and `detect:`.

## State Summary Commands

### `current` / `status`

Outputs the current route, provider, model, prompt, spec state, wallet, work, provenance, mint state, `THOUGHT`, and tx state.

Main fields:

```text
route: <route>
provider: <provider>
openrouter: linked | not linked
api key: set | not set
ollama: detected | not detected | checking
endpoint: <url>
model: <model>
prompt: "<prompt>" | empty
THOUGHT.md: ready | missing
wallet: connected 0x.... | not connected
work: #<id> "<text>" | empty
provenance: <bytes> bytes | empty
$PATH: #<id> | not selected
mint: idle | ready | needs wallet | needs $PATH | needs authorization | authorized | confirming | minted | already minted | failed
THOUGHT: #<tokenId> | empty
tx: 0x... | empty
```

Open copy question: `mint: ready` and `work: #n "..."` may need final wording depending on whether “ready” means “ready to mint” or simply “work exists”.

## Help Commands

### `help`

Explains the full flow:

```text
THOUGHT takes a prompt and THOUGHT.md,
runs one model round,
then renders the returned text to canvas.

flow:
config   choose route, provider, model
prompt   write intention
run      one model round
return   enter my-brain model return
mint     keep the work onchain

more:
help flow
commands
current
config
prompt
THOUGHT.md
work
mint
wallet
$PATH
provenance
my-brain
```

Open copy question: because most commands now print mini-help directly, the `more:` list may be reducible.

### `commands`

Prints the full command list. It includes:

- config route commands
- prompt commands
- spec / `THOUGHT.md` commands
- run / return commands
- work commands
- thought commands
- mint / wallet / path commands
- provenance / gallery / view commands
- system commands

## Config Commands

### `config`

Summarizes route, provider, and model, then lists routes and route-specific usage.

Core copy:

```text
config sets route, provider, and model for one round.

route: <route>
provider: <provider>
...

routes:
local     runs on this machine.
connect   delegated cloud access.
direct    raw provider key. session only.
my-brain  runs in my brain.

use:
config route <local|connect|direct|my-brain>
config local
config connect
config direct
config my-brain
...
```

### `config route <local|connect|direct|my-brain>`

Aliases and older forms still exist:

- `mode <route>` aliases to route config.
- `config local`, `config connect`, `config direct`, `config my-brain` also switch route and print route help.

### `config local`

Uses local Ollama from the browser machine.

When detected:

```text
route: local
provider: ollama
runs on this machine.
ollama: detected
endpoint: <url>
model: <model>
use:
config local model list
config local model <id>
config local endpoint <url>
run
```

When not detected:

```text
endpoint: <url>
first: start ollama on this machine.
use:
config local detect
config local endpoint <url>
config local model list
run

or use another route:
config connect
config direct
config my-brain
```

Local subcommands:

- `config local detect`
- `config local endpoint <url>`
- `config local model list`
- `config local model <id>`

### `config connect`

Uses OpenRouter delegated authorization.

Core copy:

```text
route: connect
provider: openrouter
delegated cloud access.
openrouter: linked | not linked
model: <model>
use:
config connect authorize
config connect disconnect
config connect model list
config connect model <id>
run
```

Connect subcommands:

- `config connect authorize`: starts OpenRouter authorization, copy is `opening openrouter...`.
- `config connect disconnect`: unlinks OpenRouter.
- `config connect model list`: lists available models only when linked.
- `config connect model <id>`: selects model.

### `config direct`

Uses a raw provider API key in browser session.

Core copy:

```text
route: direct
raw provider key. session only.
provider: <provider>
api key: set | not set
use:
config direct provider list
config direct provider <id>
config direct key <api-key>
config direct key clear
config direct model list
config direct model <id>
run
```

Direct subcommands:

- `config direct provider list`
- `config direct provider <id>`
- `config direct key <api-key>`
- `config direct key clear`
- `config direct model list`
- `config direct model <id>`

Provider key policy copy:

```text
policy: session only. per provider.
```

### `config my-brain`

Manual route where the user acts as the model.

Core copy:

```text
route: my-brain
provider: me
model: my-brain
my-brain runs in my brain.
no config needed.
use:
prompt <text>
run
return <text>
```

## Prompt Commands

### `prompt`

Shows current prompt and usage:

```text
prompt: "<prompt>" | empty
use: prompt <text>
clear: prompt clear
```

### `prompt <text>`

Sets the prompt:

```text
prompt: "<text>"
next: run
```

### `prompt clear`

Clears prompt and resets runtime mint state:

```text
prompt: empty
next: prompt <text>
```

## Spec / THOUGHT.md Commands

### `spec` / `THOUGHT.md`

Fetches active onchain spec and prints metadata:

```text
THOUGHT.md spec.
generation spec for a run.
state: ready
ref: THOUGHT.md@v1
id: 0x...
hash: 0x...
bytes: <n>
source: <pointer>
use: spec text
use: THOUGHT.md text
```

If unavailable:

```text
THOUGHT.md unavailable.
error: <reason>
use: THOUGHT.md text
```

Common errors are normalized to:

- `Failed to fetch THOUGHT.md.`
- `THOUGHT.md unavailable.`
- `THOUGHT.md spec mismatch.`

### `spec text` / `THOUGHT.md text`

Prints the full active spec text:

```text
THOUGHT.md: THOUGHT.md@v1 from chain
<full text>
```

## Run Commands

### `run`, `rerun`, `retry run`

Preflight checks:

- prompt must be set
- model must be set
- connect route must be linked
- direct route must have API key
- local route must detect Ollama
- THOUGHT.md must be fetchable

Progress copy:

```text
running...
one model round.
prompt + THOUGHT.md in.
canvas out.
```

Success copy:

```text
work #<id> is done.
text: "<normalized canvas text>"
model return: "<raw model return>" | same as text
provenance <n> bytes.
use: mint
use: provenance
use: work <id>
```

Failure examples:

```text
run failed.
prompt empty.
next: prompt <text>
```

```text
run failed.
openrouter not linked.
use: config connect authorize
```

```text
run failed.
api key not set.
use: config direct key <api-key>
```

```text
run failed.
ollama not detected.
<local setup usage>
```

```text
run failed.
<provider returned error>
use: retry run
```

If refresh interrupts an in-flight request, transcript appends:

```text
run interrupted.
refresh stopped the request.
use: retry run
```

### `return <text>` / `model return <text>`

Used only for `my-brain`.

After `run` on `my-brain`, copy is:

```text
run with my-brain.
one model round.
prompt + THOUGHT.md in.
canvas out.

my-brain runs in my brain.
enter model return.
use: return <text>
```

Then `return <text>` completes the work through the same normalization/provenance path.

## Work Commands

### `work`

Mini-help for generated works:

```text
work is generated by a model.
current: #<id> "<text>" | current: empty

use: work current
use: work list
use: work <id>
use: work previous
use: work next
use: work latest
```

### `work list`

Lists session-generated works:

```text
generated works from run.
#1 "..."
#2 "..."

use: work <id>
use: work current
use: work previous
use: work next
use: work latest
```

### `work current`, `work <id>`, `work previous`, `work next`, `work latest`

Loads a work and prints details:

```text
work #<id> loaded.

prompt:
"..."

model return:
"..." | same as text

text:
"..."

model: <provider>/<model>
spec: THOUGHT.md@v1
normalizer: thought.normalize.v1
provenance: <n> bytes.

use: mint
use: provenance
```

Open copy question: if `work latest` is preferred over `last work`, old aliases should stay hidden or be removed from completion.

## Provenance Commands

### `provenance`

Requires current work.

```text
provenance records run context for mint.
schema: thought.provenance.v1
spec: THOUGHT.md@v1
prompt: included | unavailable
model return: included | unavailable
bytes: <n>
use: provenance --json
```

### `provenance --json`

Prints formatted provenance JSON.

If provenance exceeds cap:

```text
work blocked.
provenance too large.
bytes: <actual>/<max>
use: rerun
```

Exact cap logic comes from the current `MAX_PROVENANCE_BYTES` constant.

## Wallet Commands

### `wallet`

```text
wallet handles $PATH and mint.
wallet: connected 0x.... | not connected
use: wallet connect
clear: wallet disconnect
```

### `wallet connect`

```text
connecting wallet...
wallet connected.
use: mint
```

If a mint flow is active, it continues into the mint state output.

### `wallet disconnect`

```text
wallet disconnected.
use: wallet connect
```

Disconnect resets runtime mint state.

## PATH Commands

### `path`

Mini-help:

```text
$PATH is mint permission.

one THOUGHT needs one $PATH.
select $PATH / authorize / confirm.

current: #<id> | not selected

use:
path list
path <id>
need $PATH: mint-path
```

### `path list`

Reads wallet-owned PATH tokens and statuses:

```text
wallet $PATHs for THOUGHT mint.
wallet: 0x....

#1 available
#2 consumed
#3 not ready

use: path <id>
need $PATH: mint-path
```

Status meanings:

- `available`: wallet controls it and THOUGHT permission remains.
- `consumed`: THOUGHT permission has already been consumed.
- `not ready`: PATH is not configured for THOUGHT mint.
- `unknown`: read failed.

### `path <id>`

Checks and selects a PATH:

```text
checking $PATH #<id>...

$PATH #<id> selected.
use: authorize
```

Failure:

```text
wallet does not hold $PATH #<id>.
use: path <id>
need $PATH: mint-path
```

### `mint-path`

Opens the PATH mint surface:

```text
opening $PATH...
```

## Mint Commands

### `mint`

Requires current work.

Intro copy:

```text
mint THOUGHT.
keeps current work onchain.
one THOUGHT needs one $PATH.
select $PATH / authorize / confirm.
```

State copy may follow:

```text
wallet not connected.
use: wallet connect
```

```text
wallet: connected 0x....
select $PATH.
use: path <id>
use: path list
need $PATH: mint-path
```

```text
$PATH #<id> selected.
use: authorize
```

```text
$PATH #<id> authorized.
use: confirm
```

If work is already minted:

```text
already minted.
THOUGHT #<tokenId> exists.
use: view THOUGHT <id>

to mint another:
run makes a new work.
use: run
```

### `authorize`

Prepares PATH authorization signature. No gas, does not mint.

```text
authorize $PATH #<id> for THOUGHT mint.
no gas.
does not mint.
expires in 1 hour.
sign in wallet...
```

Success:

```text
authorized.
use: confirm
```

### `confirm`

Shows mint preview, then asks wallet to submit the transaction.

Preview copy:

```text
confirm THOUGHT mint.
work: "<work text>"
prompt: "<prompt>"
model return: "<model return>" | same as work
$PATH: #<id>
provenance: <n> bytes.
spec: THOUGHT.md@v1
price: <n> ETH
spends gas.
publishes prompt + model return + provenance.
consumes this $PATH.
confirm in wallet...
```

Transaction submitted copy is produced by mint flow state:

```text
transaction submitted.
tx: 0x...
waiting for chain confirmation...

use: view tx
```

Minted copy:

```text
minted.
use: view tx
use: view THOUGHT <tokenId>
```

## THOUGHT Commands

### `thought` / `thought list`

Lists minted onchain THOUGHTs:

```text
minted THOUGHTs.
kept onchain.
#1 "TITLE" $PATH #1
#2 "TITLE" $PATH #2

use: gallery
use: view THOUGHT <id>
```

Empty:

```text
minted THOUGHTs.
kept onchain.
empty.
use: mint
use: gallery
```

### `view THOUGHT <id>`

Opens the detail page for the onchain THOUGHT token id in the same window:

```text
opening THOUGHT #<id>...
```

Invalid:

```text
THOUGHT id invalid.
use: view THOUGHT <id>
```

Missing id:

```text
THOUGHT id required.
use: view THOUGHT <id>
```

### `gallery`

Opens gallery in the same window:

```text
opening gallery...
```

## Transaction Commands

### `view tx`

Opens tx explorer/indexer if configured; otherwise copies/falls back according to tx handler behavior.

CLI copy:

```text
opening tx...
```

## System Commands

### `clear`

Clears transcript and reinitializes opening copy.

### `reset`

Resets current work, canvas, and mint state.

```text
reset current work, canvas, and mint state.
next: prompt <text>
```

### Unknown command

```text
unknown command.
use: help
```

## Known Aliases And Compatibility Commands

Visible or still handled:

- `status` -> `current`
- `mode` -> `config route`
- `models` -> model list for current route
- `model list` / `model <id>` -> route-aware model commands
- `provider` -> `config direct provider`
- `key` -> `config direct key`
- `connect openrouter` -> `config connect authorize`
- `disconnect openrouter` -> `config connect disconnect`
- `output` -> `work`
- `works` -> `work list`
- `rerun` and `retry run` -> `run`
- `model return <text>` -> `return <text>`

Open copy question: decide which aliases should remain in docs/completion versus silently supported for old sessions.

## Persistence And Disposal

Stored in `sessionStorage`:

- CLI transcript, trimmed to the latest 80 entries.
- CLI command history, with sensitive key commands excluded.
- Generated works from `run`.
- Direct provider API keys, per provider, session-only.

Disposed when:

- Browser tab/session storage is cleared.
- User runs `clear` for transcript only.
- User runs `reset` for current work/canvas/mint state.
- Browser/session ends depending on browser sessionStorage behavior.
- Runtime state is reset by route/model/prompt changes where the implementation calls mint reset helpers.

## Copy Review Questions

- Should `current` be renamed to `status`, or should both remain?
- Should `$PATH` use `$PATH` everywhere, or plain `PATH` in explanatory copy?
- Should `work #n is done.` become `work #n ready.` or stay action-complete?
- Should `mint: ready` become `ready to mint` in `current`?
- Should `THOUGHT.md` and `spec` both remain visible, or should `spec` be an advanced alias?
- Should alias commands be omitted from `commands` and completion to make the CLI stricter?
- Should route names be noun-like (`local`, `connect`, `direct`, `my-brain`) or command-like (`local model`, `openrouter`, `api key`, `my brain`)?
- Should provider errors be printed raw, lightly normalized, or both?
- Should `provenance` copy say “record” only, or mention “evidence” now that detail pages expose evidence?
