# THOUGHT CLI Copy + Logic Handoff

Date: 2026-04-30
Branch context: `thought-full-cli-panel`
Primary source: `src/main.ts`

This document summarizes the current CLI copy, vocabulary, command logic, state handling, and known polish targets for the THOUGHT panel. It is written for another chat to continue copy polish without rediscovering the implementation.

## Core Vocabulary

Use these terms consistently:

- `config`: setup umbrella for route, provider, and model.
- `route`: how THOUGHT reaches a model. Values: `local`, `connect`, `direct`.
- `provider`: model service/runtime. Values currently include `ollama`, `openrouter`, `openai`, `anthropic`.
- `model`: selected AI model id. Avoid visible `engine`; `engine` remains only as a backward-compatible parser alias.
- `prompt`: user intention for the run.
- `THOUGHT.md`: generation spec / instruction layer / project context.
- `run`: one model call that produces a generated work.
- `work`: generated result from `run`, stored in browser session with text, thumbnail, and run context.
- `THOUGHT`: minted generated work, kept onchain as the THOUGHT token.
- `$PATH`: permission token consumed to mint one THOUGHT.
- `provenance`: JSON record of run context for minting; it is a record, not proof.
- `wallet`: used for `$PATH` ownership and mint transactions.

Main product flow:

```text
config
prompt <text>
run
mint
```

## Current Opening Copy

Shown when the CLI transcript is empty:

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

Logic:

- Stored transcript is loaded from `sessionStorage`.
- If transcript exists, the intro is not regenerated.
- `clear` wipes transcript and re-adds this intro.

## Transcript And Input Behavior

Entry kinds:

- `intro`: opening copy.
- `command`: echoed as `> command`.
- `output`: normal gray output.
- `error`: red output.

Storage:

- Transcript key: `thought-cli-transcript`.
- Command history key: `thought-cli-command-history`.
- Transcript stores the last 80 entries.
- Each stored entry keeps up to 48 lines.
- Command history stores the last 80 commands.
- API keys are masked in command echo and not stored in history unless the command is `clear` or `help`.

Input navigation:

- Empty input + up/down cycles command history.
- Non-empty input + up/down cycles command completion matches.
- Active history navigation stays in history; completion only starts from typed text.
- `ctrl+c` clears the current prompt input when there is text.
- Clicking most areas of the THOUGHT page, or typing while unfocused, refocuses `thought>`.

Loading:

- Only the first `running...` line animates dots.
- Provider request timeout is 45 seconds.
- On refresh while a run is active, the last running entry is followed by:

```text
run interrupted.
refresh stopped the request.
use: retry run
```

## Help Copy

Command: `help`

```text
THOUGHT takes a prompt and THOUGHT.md,
runs one round on the selected model,
then renders the returned text to canvas.

flow:
config    choose route, provider, model
prompt    write intention
run       make canvas
work      show generated works
mint      keep it onchain

more:
work
thought
spec
wallet
path
provenance
current
commands
```

Command: `help flow`

```text
flow:
1 config
  choose how THOUGHT reaches a model.

2 prompt
  set the user intention.

3 run
  one round only.
  prompt + THOUGHT.md in.
  canvas out.

4 mint
  one THOUGHT needs one $PATH.
  select $PATH · authorize · confirm
```

Note: this copy contains a middle dot in source for the mint steps. If standardizing to ASCII, change it to `select $PATH / authorize / confirm` or `select $PATH, authorize, confirm`.

Command: `commands`

Lists full inventory:

```text
commands:
config
config route <local|connect|direct>
config local | connect | direct
config local detect
config local endpoint <url>
config local model list
config local model <id>
config connect authorize
config connect disconnect
config connect model list
config connect model <id>
config direct provider list
config direct provider <id>
config direct key <api-key>
config direct key clear
config direct model list
config direct model <id>

prompt <text>
prompt clear
spec
spec text
THOUGHT.md
THOUGHT.md text

run
rerun
retry run
work
output
work list
work <id>
work previous
work next
work latest
thought
thought list

mint
path
path list
path <id>
authorize
confirm
wallet connect
wallet disconnect
mint-path

current
provenance
provenance --json
gallery
view tx
view THOUGHT <id>
clear
reset
help
commands
```

## Current / Status

Commands: `current`, `status`

Output shape:

```text
route: <local|connect|direct>
provider: <provider>
authorization: <linked|not linked>        # connect only
api key: <set|not set>                    # direct only
status: <ollama detected|ollama not detected|checking> # local only
endpoint: <url>                           # local only
model: <model id|empty>
prompt: "<prompt text>"|empty
THOUGHT.md: <ready|unavailable>
wallet: connected|not connected
work: #<id> "<TEXT>"|empty|ready|minted|failed
provenance: <bytes>/1024 bytes. ~602,800 gas.|empty
$PATH: <id|not selected>                  # shown when output/mint flow exists
mint: idle|ready to mint|needs wallet|needs $PATH|needs authorization|authorized|confirming|minted|already minted|failed
THOUGHT #<token id>                       # shown after mint
tx: <hash>                                # shown when tx hash exists
```

Logic:

- `current` is the primary state command.
- `status` is an alias.
- Prompt value is printed, not just `set`.
- Wallet state should say `not connected`, not `disconnected`.
- `$PATH` empty state should say `not selected`.
- Work line currently summarizes generated work, not minted THOUGHT.

Potential polish:

- `work: ready #8` was replaced conceptually by `work: #8 "TEXT"`, but recheck all live states.
- Consider hiding provenance gas estimate from `current` if it feels too technical.

## Config

Command: `config`

Current shape:

```text
config sets the route and model for one round.

route: <route>
provider: <provider>
status/api key/authorization: <state>
endpoint: <url>       # local
model: <model>

routes:
local     runs on this machine.
connect   delegated cloud access.
direct    raw provider key. session only.

use:
config route <local|connect|direct>
config local
config connect
config direct
config <route> model list
config <route> model <id>
...route-specific commands
```

Logic:

- `config` summarizes the active route.
- `config route <local|connect|direct>` is supported.
- `config local`, `config connect`, `config direct` are still supported and used heavily.
- `mode` is a compatibility alias to route config.
- `model` and `models` are compatibility aliases for route-specific model commands.
- `engine` remains a parser alias only and should not appear in visible copy.

### Config Local

Command: `config local`

```text
route: local
runs on this machine.
status: <ollama detected|ollama not detected|checking>
endpoint: <url>       # if available
use:
config local model list
config local model <id>
run
config local endpoint <url>
```

If Ollama is not detected, the output uses local setup usage lines instead.

Other local commands:

- `config local detect`: rechecks Ollama at the current endpoint.
- `config local endpoint <url>`: sets endpoint, then detects.
- `config local model list`: lists local model ids.
- `config local model <id>`: sets model.

Detection logic:

- Browser fetches the configured Ollama endpoint from the user's browser machine.
- Default endpoint is `http://127.0.0.1:11434`.
- Non-default endpoints must be set manually with `config local endpoint <url>`.
- Local mode does not claim provider web search.

### Config Connect

Command: `config connect`

```text
route: connect
delegated cloud access.
provider: openrouter
authorization: linked|not linked
use:
config connect authorize
config connect disconnect
config connect model list
config connect model <id>
run
```

Logic:

- Provider is OpenRouter.
- Authorization is OAuth/PKCE-style OpenRouter connect.
- `config connect authorize` opens OpenRouter.
- `config connect disconnect` clears the OpenRouter key.
- `config connect model list` is unavailable when authorization is not linked.
- `connect openrouter` is a compatibility alias.
- `disconnect openrouter` is a compatibility alias.

Potential polish:

- The command name `authorize` is overloaded with `$PATH` authorization. For route config, `config connect authorize` is clear enough because the namespace disambiguates it.

### Config Direct

Command: `config direct`

```text
route: direct
raw provider key. session only.
provider: <openai|openrouter|anthropic>
api key: set|not set
use:
config direct provider list
config direct provider <id>
config direct key <api-key>
config direct key clear
config direct model list
config direct model <id>
run
```

Logic:

- Direct uses raw provider API keys in session only.
- Keys are kept per provider.
- Switching provider restores that provider's session key if it was set before.
- Keys are masked in command echo and not stored in history.
- `provider`, `key`, `model` top-level commands are compatibility aliases into config.

Provider list:

```text
providers:
openai
openrouter
anthropic

use: config direct provider <id>
```

Key help:

```text
api key: set|not set
policy: session only. per provider.
use: config direct key <api-key>
clear: config direct key clear
```

## Model List / Model Set

Command shape:

```text
config <route> model list
config <route> model <id>
```

Output shape:

```text
models:
<model id>
<model id>

use: config <route> model <id>
```

Errors:

```text
model list unavailable.
authorization: not linked
use: config connect authorize
```

```text
model not found.
use: config <route> model list
```

Set success:

```text
model set.
model: <id>
use: run
```

## Prompt

Command: `prompt`

```text
prompt: "<current prompt>"|empty
use: prompt <text>
clear: prompt clear
```

Command: `prompt <text>`

```text
prompt: "<text>"
next: run
```

Command: `prompt clear`

```text
prompt: empty
next: prompt <text>
```

Logic:

- Prompt is user intention.
- Prompt text is not secret and is printed with quotes.
- Setting or clearing prompt resets mint runtime state.

## THOUGHT.md / Spec

Commands: `spec`, `THOUGHT.md`

Output shape:

```text
THOUGHT.md spec.
generation contract for a run.
state: ready
ref: <ref>
id: <short id>
hash: <short hash>
bytes: <byte count>
source: <pointer>
use: spec text
use: THOUGHT.md text
```

Commands: `spec text`, `THOUGHT.md text`

- Prints the full active THOUGHT.md text.
- Uses preserve-spacing mode.

If unavailable:

```text
THOUGHT.md unavailable.
error: <message>
use: THOUGHT.md text
```

Logic:

- THOUGHT.md is fetched/registered spec input.
- It maps to provider system/instructions layer.
- It is distinct from prompt.

## Run

Commands: `run`, `rerun`, `retry run`

Validation before provider call:

- Prompt must be set.
- Model must be set.
- Connect route needs OpenRouter authorization.
- Direct route needs API key.
- Local route needs Ollama detection.
- THOUGHT.md must be ready.

Progress copy:

```text
running...
one round on a model.
prompt + THOUGHT.md in.
canvas out.
```

Only `running...` animates.

Success copy:

```text
work #<id> is done.
provenance <bytes>/1024 bytes. ~602,800 gas.
use: mint
use: provenance
use: work list
```

Errors:

```text
run failed.
prompt empty.
next: prompt <text>
```

```text
run failed.
model empty.
use: config <route> model list
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
<local setup usage lines>
```

```text
run failed.
<provider or panel warning message>
```

Logic:

- A successful run creates a `work`.
- Works are stored in session storage via `src/works.ts`.
- A run builds provider-neutral `ThoughtRunPayload` first.
- Max output is hidden and fixed at 128 tokens.
- Provider-side web search is enabled internally only where supported.
- Provider output is normalized/validated before canvas/mint readiness.

Potential polish:

- Success copy says `provenance ... gas`; decide if gas estimate belongs here.
- Error messages from providers are passed through; long provider errors can dominate the panel.

## Work

Command: `work`

```text
work is generated by a model.
current: #<id> "<TEXT>"|empty
use: work list
use: work <id>
use: work previous
use: work next
use: work latest
```

Command: `work list`

```text
generated works from run.
#1 "TEXT"
#2 "TEXT"

use: work <id>
use: work previous
use: work next
use: work latest
```

If empty:

```text
generated works from run.
empty.
next: run
```

Command: `work <id>`, `work previous`, `work next`, `work latest`

```text
work #<id> loaded.
text: "TEXT"
use: mint
use: provenance
```

Aliases:

- `output` is a legacy alias to `work`.
- `works` lists works.
- `work latest` also accepts old `work last`.

Logic:

- Work id is session work id, not THOUGHT token id.
- Loading a work restores canvas/output context for minting.
- `previous`, `next`, and `latest` are relative to current work state.

Potential polish:

- Consider dropping visible `output` alias from `commands` if product vocabulary is fully moved to `work`.

## Thought / Minted THOUGHTs

Command: `thought`, `thought list`

If minted tokens exist:

```text
THOUGHT works minted.
tokens kept onchain.
#<token id> "<TITLE>" $PATH #<path id>

use: gallery
use: view THOUGHT <id>
```

If empty:

```text
THOUGHT works minted.
tokens kept onchain.
empty.
use: mint
use: gallery
```

Logic:

- THOUGHT id is onchain token id, not session work id.
- Reads minted THOUGHTs from contract logs.
- `view THOUGHT <id>` opens the detail page in the same window.

Potential polish:

- `THOUGHT works minted.` may read awkwardly because THOUGHT itself means minted work. Possible alternatives: `minted THOUGHTs.` or `THOUGHT tokens kept onchain.`

## Provenance

Command: `provenance`

```text
records the run context for mint.
schema: thought.provenance.v1
spec: <THOUGHT.md ref>
bytes: <bytes>/1024
gas: ~602,800
run: provenance --json
```

Command: `provenance --json`

- Prints formatted provenance JSON.

If no work:

```text
no work ready.
next: run
```

Logic:

- Provenance records route, provider, model, prompt, THOUGHT.md spec anchor, hashes, capabilities, and hidden request config.
- Provenance does not include API keys, OpenRouter tokens, wallet private data, headers, IP, or browser fingerprint.
- Provenance is used by mint.

Potential polish:

- `gas: ~602,800` is an estimate and may not belong in the same block as provenance identity.
- Consider wording `run: provenance --json` as `use: provenance --json` for consistency.

## Mint

Command: `mint`

If no current work:

```text
no work to mint.
use: run
```

Start copy:

```text
mint THOUGHT.
keeps current work onchain.
one THOUGHT needs one $PATH.
select $PATH · authorize · confirm.
```

Mint state copy:

- Checking THOUGHT:

```text
checking THOUGHT...
```

- Wallet needed:

```text
wallet not connected.
use: wallet connect
```

- Path needed:

```text
wallet linked: 0x1234...abcd
select $PATH.
use: path <id>
use: mint-path
```

- Path checking:

```text
checking $PATH #<id>...
```

- Path ready:

```text
$PATH #<id> selected.
use: authorize
```

- Authorizing:

```text
signing authorization...
```

- Authorized:

```text
$PATH #<id> authorized.
use: confirm
```

- Minting:

```text
confirming mint...
```

- Minted:

```text
minted.
use: view tx
use: view THOUGHT <id>
```

- Existing minted work:

```text
already minted:
THOUGHT #<id> already minted.
use: view THOUGHT <id>

to mint another:
run makes a new work.
wallet linked: <address>|wallet not connected.
select $PATH after run.|use: wallet connect
use: path <id>
use: run
```

Logic:

- One THOUGHT requires one $PATH.
- Mint flow is CLI-backed; old floating sheet should not open from CLI actions.
- Mint consumes selected $PATH.
- A successful mint sets token id and tx hash.
- The same title/text cannot mint twice; command reports existing THOUGHT.

Potential polish:

- Replace `select $PATH · authorize · confirm` middle dots with consistent separators.
- `confirming mint...` can be confused with wallet prompt vs tx wait; split if needed.

## Path

Command: `path`

```text
$PATH selects permission for minting.

one THOUGHT needs one $PATH.
select $PATH · authorize · confirm.

current: #<id>|not selected

use:
path list
path <id>
mint-path
```

Command: `path list`

```text
wallet $PATHs for THOUGHT mint.
wallet: 0x1234...abcd

#1 available
#2 spent
#3 not ready

use: path <id>
use: mint-path
```

Status meanings:

- `available`: wallet owns the $PATH, movement is authorized to THOUGHT, quota exists, and the path is unspent.
- `spent`: the $PATH has already been consumed for its movement quota.
- `not ready`: PATH contract movement is not authorized for THOUGHT or quota is zero.
- `unknown`: contract read failed.

Command: `path <id>`

Success:

```text
checking $PATH #<id>...

$PATH #<id> selected.
use: authorize
```

Errors:

```text
wallet not connected.
use: wallet connect
```

```text
<path error>
use: path <id>
use: mint-path
```

Logic:

- `path list` scans transfer logs for wallet-owned PATH ids and verifies current owner.
- It then checks authorized minter and quota.
- `path <id>` opens/continues mint flow and checks eligibility.
- `mint-path` opens the PATH mint page/op.

## Authorize

Command: `authorize`

If not ready:

```text
not ready.
use: path <id>
```

If already authorized:

```text
authorized.
use: confirm
```

Normal flow:

```text
authorize $PATH #<id> for THOUGHT mint.
no gas.
does not mint.
expires in 1 hour.
sign in wallet...

authorized.
use: confirm
```

Failure:

```text
authorization failed.
use: path <id>
```

Logic:

- Authorization is a signature, no gas.
- It permits THOUGHT mint to consume this $PATH.
- It does not mint by itself.
- It expires in 1 hour.

Potential polish:

- Wallet signature currently may show raw/unknown signature type in Rabby. The CLI copy explains intent before wallet opens.

## Confirm

Command: `confirm`

If not authorized:

```text
not authorized.
use: authorize
```

Preview before wallet tx:

```text
confirm THOUGHT mint.
THOUGHT: "TEXT"
$PATH: #<id>
provenance: <bytes>/1024 bytes.
spec: THOUGHT.md@v1
price: 0.0 ETH
spends gas.
consumes this $PATH.
confirm in wallet...
```

Submitted tx copy from mint handler:

```text
transaction submitted.
tx: 0x1234...abcd
waiting for mint...
use: view tx
```

Mint event success:

```text
minted.
use: view tx
use: view THOUGHT <id>
```

Failure:

```text
mint failed.
use: current
```

Logic:

- Confirm sends the onchain transaction.
- It spends gas.
- It consumes selected $PATH.
- It waits for mint event/receipt.
- Pending nonce or wallet tx state can make mint appear stuck; `current` shows tx hash and mint state.

Potential polish:

- Duplicate `transaction submitted` entries were seen earlier; verify event/listener path if it reappears.
- `waiting for mint...` could be clearer as `waiting for chain confirmation...`.

## Wallet

Command: `wallet`

```text
wallet is used for $PATH and minting.
wallet: linked 0x1234...abcd|not connected
use: wallet connect
clear: wallet disconnect
```

Command: `wallet connect`

```text
connecting wallet...

wallet linked.
use: mint
```

If wallet was needed in active mint flow, it proceeds to path-required state instead of only saying `use: mint`.

Command: `wallet disconnect`

```text
wallet disconnected.
use: wallet connect
```

Logic:

- `wallet connect` may reconnect immediately without a new wallet popup if the site already has permission.
- Disconnect is app-local state reset, not necessarily Rabby permission reset.
- Disconnect resets mint runtime state.

Potential polish:

- User prefers `wallet not connected` in state outputs, not `wallet disconnected`.
- `wallet linked` may become `wallet connected` for consistency.

## Gallery / View

Command: `gallery`

```text
opening gallery...
```

Action: sets `window.location.href = galleryUrl()`.

Command: `view tx`

```text
opening tx...
```

Action: opens tx explorer/current tx handler.

Command: `view THOUGHT <id>`

Errors:

```text
THOUGHT id invalid.
use: view THOUGHT <id>
```

```text
THOUGHT id required.
use: view THOUGHT <id>
```

Success:

```text
opening THOUGHT #<id>...
```

Action: opens detail page in the same window.

Logic:

- `<id>` is onchain THOUGHT token id.
- If omitted, it falls back to current minted token id or existing token id if available.

## Reset / Clear

Command: `clear`

Logic:

- Clears CLI transcript.
- Re-adds opening intro.
- Does not reset work/canvas/session state.

Command: `reset`

```text
reset current work, canvas, and mint state.
next: prompt <text>
```

Logic:

- Calls `resetThought()`.
- Clears current work/canvas/mint runtime state.
- Does not necessarily clear command history or transcript before the output line.

## Completion / Suggestions

Completion catalog includes:

```text
config
config route local
config route connect
config route direct
config local
config local detect
config local endpoint
config local model list
config local model
config connect
config connect authorize
config connect disconnect
config connect model list
config connect model
config direct
config direct provider list
config direct provider
config direct key
config direct key clear
config direct model list
config direct model
prompt
prompt clear
spec
spec text
THOUGHT.md
THOUGHT.md text
run
rerun
retry run
work
work list
work previous
work next
work latest
output
thought
thought list
mint
path
path list
path
authorize
confirm
wallet
wallet connect
wallet disconnect
mint-path
current
status
provenance
provenance --json
gallery
view tx
view THOUGHT
clear
reset
help
commands
```

Suggestion buttons are context-aware:

- During command in flight: `current`, `help`.
- Help context: `config`, `prompt <text>`, `run`, `current`.
- Config context adapts by active route and missing auth/key/Ollama.
- Mint flow suggests wallet/path/authorize/confirm/view tx/view THOUGHT.
- Output-ready suggests `mint`, `rerun`, `provenance`, `work list`.
- Run-failed suggests `retry run`, `current`, `help`.
- No prompt suggests `config`, `prompt <text>`, `run`, `mint`.

## Copy Style Rules Already Implied

- Commands are lowercase except `THOUGHT.md`, `THOUGHT`, and `$PATH`.
- Use `use:` for actionable next commands.
- Use `next:` for recommended next step after state change.
- Use `clear:` for clear/reset variants.
- Use short sentence fragments, not paragraphs.
- Separate sections with blank lines before labels like `use:`, `routes:`, `flow:`, `more:`, `need $PATH:`, `alternatives:`.
- Errors should be specific and followed by a recovery command.
- Secrets must never be printed.

## Known Aliases And Backward Compatibility

Visible canonical commands:

- `config`
- `config route <local|connect|direct>`
- `config <route> model list`
- `config <route> model <id>`
- `prompt`
- `run`
- `work`
- `mint`
- `current`

Compatibility aliases still handled:

- `mode` -> config route help.
- `mode local|connect|direct` -> route change.
- `model list` -> current route model list.
- `model <id>` -> current route model set.
- `models` -> current route model list.
- `provider` -> direct provider command.
- `key` -> direct key command.
- `status` -> current.
- `output` -> work.
- `works` -> work list.
- `connect openrouter` -> config connect authorize.
- `disconnect openrouter` -> config connect disconnect.
- `engine` parser alias -> model, hidden from copy.

## High-Value Polish Targets

1. Remove all remaining visible middle-dot separators if ASCII consistency is desired.
2. Decide whether `provenance ... gas` belongs in run/current/provenance output.
3. Decide whether `THOUGHT works minted.` should become `minted THOUGHTs.`.
4. Decide whether `wallet linked` should become `wallet connected` everywhere.
5. Decide whether visible `output` alias should be removed from `commands`.
6. Check all command outputs for redundant first lines that repeat the command itself.
7. Standardize `use:` vs `run:` in provenance output.
8. Review `confirming mint...` / `waiting for mint...` wording for clearer chain state.
9. Recheck duplicate transaction-submitted output after mint confirmation.
10. Keep `model`, not `engine`, in all visible copy.

## Source Map

- CLI transcript, history, completion, input focus: `src/main.ts` around CLI storage/navigation helpers.
- Help and command inventory: `cliHelpLines`, `cliCommandsHelpLines`.
- Current state output: `buildCliCurrentLines`.
- Config commands: `outputCliConfig`, `outputCliMode`, route-specific config handlers.
- Prompt/model/provider/key commands: `setCliPrompt`, `setCliModel`, `setCliProvider`, `setCliApiKey`.
- Run flow: `runFromCli`, `runAgent`, `ThoughtRunPayload` in `src/thought-run-payload.ts`.
- Work storage: `src/works.ts`, work CLI handlers in `src/main.ts`.
- Mint flow: `startCliMint`, `checkCliPath`, `authorizeFromCli`, `confirmFromCli`.
- Gallery/detail navigation: `galleryUrl`, `thoughtDetailUrl`, `handleViewThought`.
