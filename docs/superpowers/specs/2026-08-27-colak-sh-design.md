# colak.sh portfolio design

date: 2026-08-27

## purpose

build `colak.sh` as a public, terminal-native portfolio where a visitor and an ai agent operate the same browser-local shell. the terminal is the canonical world; the chat panel is a natural-language navigator and narrator over that world.

the interface should demonstrate, rather than merely state, the thesis:

> technical substrate remains available to technical users, while an agent can operate the same substrate on behalf of everyone else.

## core invariants

1. **one shell, two operators.** human keyboard input and agent-issued commands enter the same shell instance, with one cwd, one history, and one virtual filesystem.
2. **the terminal is canonical.** if information exists in the portfolio filesystem, the agent should normally navigate to it and surface it through terminal actions rather than replacing it with a prose-only answer.
3. **the public terminal is not a host shell.** no visitor or model ever receives a shell on `services-1`. the shell runs in the browser using `just-bash` and an in-memory filesystem.
4. **the agent drives the visitor's browser shell.** server-side model tools request terminal execution over the visitor's websocket session; the client executes the command and returns the result.
5. **public ingress is narrow.** `colak.sh` exposes only the portfolio service through cloudflare tunnel. private/operator services under the existing netbird/private namespace remain private.
6. **content is curated before it is synchronized.** v0 uses deliberately authored portfolio content. github/repo synchronization comes later.
7. **agent output is small.** the agent narrates briefly and uses terminal actions as the primary explanatory surface.
8. **suggested prompts are navigational edges.** after each completed interaction the agent returns up to three specific next questions; generic "tell me more" suggestions are rejected.

## user experience

desktop target:

```text
┌───────────────────────────────────────────────┬─────────────────────────┐
│                                               │ ask ata's machine       │
│                                               │                         │
│                    wterm                      │ what is ata building rn?│
│                                               │                         │
│                                               │ show me something weird│
│                                               │                         │
│                                               │ why should i talk to him│
│                                               │                         │
│                                               │ > ask anything _        │
└───────────────────────────────────────────────┴─────────────────────────┘
```

target split is approximately 70/30. the terminal is the stage.

first-load terminal:

```text
ata@colak:~$ 
```

initial sidebar prompts:

- what is ata working on lately?
- show me something impressive
- what kind of engineer is ata?
- why should i talk to him?

example interaction:

```text
visitor clicks:
  what is ata working on lately?

agent:
  mostly agent infrastructure and speech systems. i'll show you.

terminal:
  $ cd /home/ata/now
  $ cat current.md
  ...

agent:
  speech-core and browser-ops are probably the two interesting threads.

suggestions:
  [show me speech-core]
  [what makes browser-ops unusual?]
  [show me something completely different]
```

agent commands should visibly type into the terminal and execute there. while an agent command is actively typing/executing, v0 serializes terminal ownership and temporarily ignores ordinary human terminal keystrokes to avoid input corruption. selection/scrolling remain available.

## architecture

```text
internet
   |
cloudflare edge
   |
cloudflare tunnel (outbound from services-1)
   |
portfolio service on services-1
   |
   +-- static vite/react app
   |
   +-- websocket agent endpoint
            |
            +-- model driver
            |
            +-- terminal_exec tool
                     |
                     | websocket exec_request
                     v
               visitor browser
                     |
               session controller
                     |
             ONE BashShell instance
                     |
         @wterm/just-bash + just-bash
                     |
          in-memory public filesystem
```

the model process never gets filesystem or shell access on the server.

## terminal/session design

use `@wterm/react` for rendering and `@wterm/just-bash` for the browser shell.

the current `BashShell` api exposes:

- `attach(write)`
- `handleInput(data)`
- `cwd`
- underlying `bash`

its implementation maintains its own cwd/history and routes entered commands through the same underlying `just-bash` instance. therefore the session controller MUST preserve `BashShell.handleInput()` as the common execution path for both operators.

do not execute agent commands separately through `shell.bash.exec(...)`, because `just-bash` documents that each `exec()` has isolated shell state and that would create a second effective cwd/history path.

### programmatic agent execution

the session controller owns the write sink passed to `BashShell.attach()`.

for agent execution:

1. mark session mode `agent`.
2. visibly feed command characters into `BashShell.handleInput()` with a short animation delay.
3. enable output capture immediately before feeding carriage return.
4. await `handleInput("\r")`; it completes after the command and cwd update.
5. disable capture.
6. normalize captured terminal output into plain text for the model.
7. return `{ command, output, cwd }`.
8. return session mode to `idle`.

this guarantees that a command issued by the agent also lands in the same command history and updates the exact cwd seen by the human.

## content filesystem

v0 content root:

```text
/home/ata/
├── README.md
├── about/
│   ├── me.md
│   └── stack.md
├── now/
│   └── current.md
├── projects/
│   ├── speech-core/
│   │   ├── README.md
│   │   └── architecture.md
│   └── browser-ops/
│       ├── README.md
│       └── architecture.md
├── experiments/
├── writing/
└── contact/
    └── README.md
```

source files live in the repo under `content/home/ata/...`.

vite loads text assets into a `Record<string, string>` passed to `BashShell`. directories emerge from the file paths.

network access in `just-bash` remains disabled. do not set `dangerouslyAllowFullInternetAccess`.

## rich content

markdown has two jobs:

1. `.md` shown inside the terminal should be readable and terminal-native.
2. agent commentary may use markdown in the sidebar.

for v0, ordinary `cat` output remains the shell's output. add a focused `md <path>` portfolio command only if the installed shell adapter exposes a stable custom-command seam; otherwise defer the command alias and provide markdown-friendly authored files first. do not fork `wterm` merely to gain a cosmetic command.

images/video are phase-2 within this plan, but before public launch. binary assets are not mounted into `just-bash` as real buffers because the wterm adapter accepts text-file mappings. maintain a browser-side asset registry keyed by portfolio path. a terminal-safe textual placeholder exists at the same virtual path so `ls` reveals the asset. selecting/clicking a surfaced artifact or using the rich-view control opens an overlay in the terminal region. do not give the backend binary filesystem access.

## agent protocol

websocket messages are explicitly typed.

client -> server:

```ts
type ClientMessage =
  | { type: "prompt"; requestId: string; text: string }
  | {
      type: "terminal_result";
      callId: string;
      command: string;
      output: string;
      cwd: string;
    };
```

server -> client:

```ts
type ServerMessage =
  | { type: "assistant_delta"; requestId: string; text: string }
  | { type: "terminal_exec"; requestId: string; callId: string; command: string }
  | { type: "suggestions"; requestId: string; items: string[] }
  | { type: "done"; requestId: string }
  | { type: "error"; requestId?: string; message: string };
```

the backend implements `terminal_exec` as an ai tool whose execution callback sends `terminal_exec` to the connected browser and awaits the matching `terminal_result`.

tool call limits:

- max 8 terminal calls per user prompt.
- max command length 500 characters.
- one active prompt per websocket session.
- one active terminal command per browser session.
- server-side timeout for a requested terminal result: 15 seconds.
- no network-enabled shell commands.

## model behavior

system prompt rules:

- you are a guide to ata's public portfolio.
- prefer inspecting the terminal filesystem before making claims.
- use `terminal_exec` to navigate and show evidence to the visitor.
- keep chat narration brief.
- never claim access to private systems, private repositories, host state, secrets, email, calendar, or infrastructure.
- the terminal is a curated public filesystem, not ata's actual workstation.
- do not invent files or projects; inspect them.
- use absolute paths if cwd is uncertain.
- after answering, produce zero to three specific next-question suggestions that lead to meaningful unexplored content.
- suggestions must not be generic filler.

the model backend is provider-neutral through AI SDK's OpenAI-compatible provider. configure with environment variables:

```text
LLM_BASE_URL
LLM_API_KEY
LLM_MODEL
```

no model credential ever reaches the browser.

## server

use a small Node 24 TypeScript server.

responsibilities:

- serve Vite production assets.
- `GET /healthz`.
- accept websocket sessions at `/ws`.
- validate websocket messages.
- enforce per-ip and per-session rate limits.
- run the model loop.
- proxy terminal tool calls to the correct browser session.
- emit structured logs without storing message content by default.

non-responsibilities:

- no real terminal.
- no arbitrary server-side file access.
- no database in v0.
- no login.
- no vector database.
- no memory system.
- no github synchronization.

## deployment

`services-1` has no public ipv4 and is already intended to keep ordinary workload access on netbird while selected public services use cloudflare tunnel.

production shape:

```text
docker compose
  portfolio:
    bind 127.0.0.1:<chosen-port>
    restart unless-stopped
    read-only root filesystem where practical
    env from host secret file / secret mechanism

cloudflared:
    published application:
      colak.sh -> http://localhost:<chosen-port>
```

use a remotely-managed tunnel unless the existing host deliberately standardizes on locally-managed tunnels; cloudflare currently recommends remotely-managed tunnels for most use cases. websocket traffic is compatible with an HTTP published application.

do not publish the origin port to the internet. no firewall inbound rule should be required for the app.

## launch definition

the first public release is done only when all of these are true:

- `colak.sh` loads over HTTPS.
- terminal supports `ls`, `cd`, `pwd`, `cat`, history, completion.
- visitor can manually navigate curated content.
- initial prompt chips work.
- one prompt causes the agent to visibly drive the same terminal.
- agent-issued `cd` changes the cwd later observed by the human.
- agent-issued commands appear in the same terminal history.
- agent receives terminal output and can use it in the next model step.
- final reply produces up to three relevant suggestions.
- no server-side shell is reachable through the app.
- `just-bash` network access is disabled.
- model credentials remain server-side.
- basic rate limiting is active.
- desktop and mobile smoke tests pass.
- private `*.net.colak.sh` infrastructure remains unaffected.
