# colak.sh portfolio implementation plan

> **for agentic workers:** REQUIRED SUB-SKILL: use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. steps use checkbox (`- [ ]`) syntax for tracking.

**goal:** build and publish `colak.sh` as a terminal-native portfolio where a human visitor and an ai agent operate the same browser-local shell, with the agent using terminal actions to surface curated portfolio content.

**architecture:** a Vite/React client renders wterm and owns a single browser-local `BashShell` backed by `just-bash`. a small Node 24 server serves the built client and runs a websocket model loop; its `terminal_exec` tool delegates execution to the connected browser and waits for the browser's result. production is exposed from `services-1` only through a Cloudflare Tunnel published application.

**tech stack:** TypeScript, React, Vite, Node 24, pnpm, `@wterm/react`, `@wterm/dom`, `@wterm/just-bash`, `just-bash`, `@wterm/markdown`, `ai`, `@ai-sdk/openai-compatible`, `ws`, `zod`, Vitest, Testing Library, Playwright, Docker Compose, Cloudflare Tunnel.

**spec:** `docs/superpowers/specs/2026-08-27-colak-sh-design.md`

## global constraints

- public terminal MUST be browser-local. no server-side shell, pty, ssh, host filesystem mount, or command execution endpoint.
- human and agent MUST operate one `BashShell` instance through the same `handleInput()` path.
- do not call `shell.bash.exec()` as the agent execution path; that would bypass the interactive shell's cwd/history semantics.
- `just-bash` network access MUST remain disabled.
- never set `dangerouslyAllowFullInternetAccess`.
- model api credentials MUST exist only on the server.
- keep `*.net.colak.sh` / netbird operator surfaces outside this deployment.
- v0 has no database, auth, persistent chat memory, vector store, github synchronization, analytics product, or general-purpose agent tools.
- only one active agent request and one active agent terminal command per browser session.
- max 8 `terminal_exec` tool calls per user prompt.
- max terminal command length: 500 characters.
- terminal-result timeout: 15 seconds.
- suggestions: 0-3 items, each concrete and specific; reject generic filler.
- use Node 24 in development and production.
- use a lockfile and pin the first known-good dependency set before implementation continues.
- package versions verified on 2026-08-27: `@wterm/*` 0.3.4, `just-bash` 3.4.1, `ai` 7.0.79, `@ai-sdk/openai-compatible` 3.0.37. start with these exact versions unless installation demonstrates a peer incompatibility; if changed, record the resolved set in `docs/dependency-notes.md`.
- do not expose a container port on `0.0.0.0` in production; bind the origin to loopback on `services-1`.
- commit after each task when its tests pass.

---

## locked file structure

```text
colak-sh/
├── content/
│   └── home/ata/
│       ├── README.md
│       ├── about/
│       │   ├── me.md
│       │   └── stack.md
│       ├── now/
│       │   └── current.md
│       ├── projects/
│       │   ├── speech-core/
│       │   │   ├── README.md
│       │   │   └── architecture.md
│       │   └── browser-ops/
│       │       ├── README.md
│       │       └── architecture.md
│       └── contact/
│           └── README.md
├── docs/
│   ├── dependency-notes.md
│   └── superpowers/
│       ├── specs/2026-08-27-colak-sh-design.md
│       └── plans/2026-08-27-colak-sh-implementation-plan.md
├── server/
│   ├── agent/
│   │   ├── model.ts
│   │   ├── prompt.ts
│   │   ├── run-agent.ts
│   │   └── suggestions.ts
│   ├── protocol/
│   │   ├── schema.ts
│   │   └── types.ts
│   ├── sessions/
│   │   ├── pending-terminal-calls.ts
│   │   └── session.ts
│   ├── app.ts
│   ├── config.ts
│   └── index.ts
├── src/
│   ├── agent/
│   │   ├── agent-client.ts
│   │   └── use-agent.ts
│   ├── app/
│   │   ├── App.tsx
│   │   └── app.css
│   ├── chat/
│   │   ├── ChatPanel.tsx
│   │   ├── PromptChips.tsx
│   │   └── chat-state.ts
│   ├── content/
│   │   ├── assets.ts
│   │   └── portfolio-files.ts
│   ├── terminal/
│   │   ├── OutputCapture.ts
│   │   ├── SessionController.ts
│   │   ├── TerminalPane.tsx
│   │   └── normalize-output.ts
│   ├── protocol/
│   │   └── types.ts
│   ├── main.tsx
│   └── vite-env.d.ts
├── tests/
│   ├── e2e/
│   │   ├── agent-drives-terminal.spec.ts
│   │   └── terminal.spec.ts
│   ├── server/
│   │   ├── pending-terminal-calls.test.ts
│   │   ├── protocol.test.ts
│   │   └── suggestions.test.ts
│   └── unit/
│       ├── normalize-output.test.ts
│       ├── portfolio-files.test.ts
│       └── session-controller.test.ts
├── .dockerignore
├── .env.example
├── .gitignore
├── compose.yaml
├── Dockerfile
├── index.html
├── package.json
├── playwright.config.ts
├── pnpm-lock.yaml
├── tsconfig.json
├── tsconfig.server.json
├── vite.config.ts
└── vitest.config.ts
```

do not split files further until a real complexity signal appears.

---

### task 1: repository bootstrap and deterministic toolchain

**files:**
- create: all root toolchain/config files required by Vite, TypeScript, Vitest, Playwright
- create: `docs/dependency-notes.md`
- copy approved spec to: `docs/superpowers/specs/2026-08-27-colak-sh-design.md`
- copy this plan to: `docs/superpowers/plans/2026-08-27-colak-sh-implementation-plan.md`

**interfaces:**
- consumes: none.
- produces: `pnpm dev`, `pnpm test`, `pnpm typecheck`, `pnpm build`, `pnpm test:e2e`.

- [ ] **step 1: create the repo and base package manifest**

use Node 24 and pnpm. initialize git if this is a fresh directory.

minimum runtime dependencies:

```json
{
  "@ai-sdk/openai-compatible": "3.0.37",
  "@wterm/dom": "0.3.4",
  "@wterm/just-bash": "0.3.4",
  "@wterm/markdown": "0.3.4",
  "@wterm/react": "0.3.4",
  "ai": "7.0.79",
  "just-bash": "3.4.1",
  "react": "^19.0.0",
  "react-dom": "^19.0.0",
  "ws": "^8.18.0",
  "zod": "^4.0.0"
}
```

minimum dev dependencies: Vite, TypeScript, `@vitejs/plugin-react`, Vitest, jsdom, Testing Library, Playwright, `tsx`, and the required `@types/*` packages.

scripts:

```json
{
  "dev": "tsx watch server/index.ts",
  "dev:client": "vite",
  "test": "vitest run",
  "test:watch": "vitest",
  "typecheck": "tsc --noEmit && tsc -p tsconfig.server.json --noEmit",
  "build:client": "vite build",
  "build:server": "tsc -p tsconfig.server.json",
  "build": "pnpm build:client && pnpm build:server",
  "start": "node dist-server/index.js",
  "test:e2e": "playwright test"
}
```

the development server implemented later will proxy/serve Vite; until then `pnpm dev:client` is sufficient.

- [ ] **step 2: add a smoke test before app code**

create a Vitest test that imports a trivial exported constant from `src/app/version.ts` and expects `"v0"`.

run:

```bash
pnpm test
```

expected: fail because `src/app/version.ts` does not exist.

- [ ] **step 3: add the minimal module**

```ts
// src/app/version.ts
export const portfolioVersion = "v0";
```

run:

```bash
pnpm test
pnpm typecheck
```

expected: pass.

- [ ] **step 4: verify production compilation**

run:

```bash
pnpm build
```

expected: successful client/server compilation. if the server entry does not yet exist, add the smallest `server/index.ts` that logs startup only; do not add application behavior.

- [ ] **step 5: pin and record dependencies**

write `docs/dependency-notes.md` with:
- resolved versions from `pnpm list --depth 0`;
- Node and pnpm versions;
- note that `@wterm/just-bash` was selected because its current `BashShell` maintains cwd/history in the interactive adapter;
- note that `just-bash` `exec()` calls have isolated shell state and therefore are not used as the agent's direct execution path.

- [ ] **step 6: commit**

```bash
git add .
git commit -m "chore: bootstrap colak.sh portfolio"
```

---

### task 2: curated portfolio filesystem

**files:**
- create: `content/home/ata/**`
- create: `src/content/portfolio-files.ts`
- test: `tests/unit/portfolio-files.test.ts`

**interfaces:**
- consumes: Vite `import.meta.glob`.
- produces:
  - `loadPortfolioFiles(): Record<string, string>`
  - every returned key is an absolute `/home/ata/...` path.

- [ ] **step 1: write the failing content-loader test**

test the pure path-normalization helper separately from Vite globbing:

```ts
import { mapContentModules } from "../../src/content/portfolio-files";

it("maps repository content paths into /home/ata", () => {
  const files = mapContentModules({
    "/content/home/ata/README.md": "# ata",
    "/content/home/ata/now/current.md": "# now",
  });

  expect(files).toEqual({
    "/home/ata/README.md": "# ata",
    "/home/ata/now/current.md": "# now",
  });
});
```

run:

```bash
pnpm vitest run tests/unit/portfolio-files.test.ts
```

expected: fail.

- [ ] **step 2: implement the pure mapper and Vite loader**

```ts
export function mapContentModules(
  modules: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(modules).map(([path, value]) => [
      path.replace(/^\/content\/home\/ata/, "/home/ata"),
      value,
    ]),
  );
}

export function loadPortfolioFiles(): Record<string, string> {
  const modules = import.meta.glob("/content/home/ata/**/*.{md,txt,json}", {
    eager: true,
    query: "?raw",
    import: "default",
  }) as Record<string, string>;

  return mapContentModules(modules);
}
```

run unit test + typecheck.

- [ ] **step 3: author only enough real content for the vertical slice**

write concise real content for:
- `/home/ata/README.md`
- `/home/ata/now/current.md`
- `/home/ata/projects/speech-core/README.md`
- `/home/ata/projects/browser-ops/README.md`
- `/home/ata/about/me.md`
- `/home/ata/contact/README.md`

create the remaining listed files only if they contain real information; no placeholder lorem ipsum.

content should be factual, public-safe, and not include hostnames, keys, private urls, private repo details, personal addresses, phone numbers, or secrets.

- [ ] **step 4: add coverage assertions**

test that the six required absolute paths exist and that no key escapes `/home/ata/`.

run:

```bash
pnpm test
```

expected: pass.

- [ ] **step 5: commit**

```bash
git add content src/content tests/unit/portfolio-files.test.ts
git commit -m "feat: add curated portfolio filesystem"
```

---

### task 3: one shared interactive shell for human and agent

**files:**
- create: `src/terminal/OutputCapture.ts`
- create: `src/terminal/normalize-output.ts`
- create: `src/terminal/SessionController.ts`
- test: `tests/unit/normalize-output.test.ts`
- test: `tests/unit/session-controller.test.ts`

**interfaces:**
- consumes:
  - `BashShell` from `@wterm/just-bash`
  - terminal writer `(data: string) => void`
- produces:

```ts
export type TerminalExecResult = {
  command: string;
  output: string;
  cwd: string;
};

export type SessionMode = "idle" | "agent";

export class SessionController {
  readonly shell: BashShell;
  get mode(): SessionMode;
  get cwd(): string;
  attach(write: (data: string) => void): Promise<void>;
  handleHumanInput(data: string): Promise<void>;
  execAsAgent(command: string, charDelayMs?: number): Promise<TerminalExecResult>;
}
```

- [ ] **step 1: write failing normalization tests**

cover:
- strips ANSI escape sequences;
- converts `\r\n` to `\n`;
- removes exactly one leading newline produced by enter;
- removes the final rendered prompt from captured output;
- preserves meaningful command output.

use a prompt marker that can be deterministically recognized, for example `ata@colak:<cwd>$ ` after ANSI stripping.

- [ ] **step 2: implement `normalizeTerminalCapture(raw, renderedPrompt)`**

keep it pure. do not reach into DOM terminal state.

run test; expected pass.

- [ ] **step 3: write failing session-controller tests with a fake writer**

test sequence:

```ts
await controller.attach(write);
await controller.handleHumanInput("cd /home/ata/projects");
await controller.handleHumanInput("\r");
expect(controller.cwd).toBe("/home/ata/projects");

const result = await controller.execAsAgent("pwd", 0);
expect(result.cwd).toBe("/home/ata/projects");
expect(result.output).toContain("/home/ata/projects");

await controller.handleHumanInput("\x1b[A");
expect(joinedWrites()).toContain("pwd");
```

this test is the core invariant: agent execution shares cwd and history with the human.

- [ ] **step 4: implement `OutputCapture`**

```ts
export class OutputCapture {
  private active = false;
  private chunks: string[] = [];

  start(): void {
    this.chunks = [];
    this.active = true;
  }

  push(data: string): void {
    if (this.active) this.chunks.push(data);
  }

  stop(): string {
    this.active = false;
    return this.chunks.join("");
  }
}
```

- [ ] **step 5: implement `SessionController.attach()`**

construct exactly one `BashShell`:

```ts
this.shell = new BashShell({
  files,
  cwd: "/home/ata",
  env: {
    HOME: "/home/ata",
    USER: "ata",
    SHELL: "/bin/bash",
    TERM: "xterm-256color",
  },
  greeting: [],
  prompt: (cwd) => renderPrompt(cwd),
});
```

the writer passed to `shell.attach()` must fan out to:
1. the real wterm writer;
2. `OutputCapture.push()`.

do not provide a `network` option.

- [ ] **step 6: implement human input**

```ts
async handleHumanInput(data: string): Promise<void> {
  if (this.mode !== "idle") return;
  await this.shell.handleInput(data);
}
```

v0 deliberately serializes ownership.

- [ ] **step 7: implement agent execution through `handleInput()`**

requirements:
- reject empty command;
- reject command length > 500;
- reject if mode is already `agent`;
- set mode `agent`;
- feed every command character through `shell.handleInput(ch)`;
- char delay defaults to a visually quick value such as 8 ms; tests pass `0`;
- start capture only after visible typing is complete;
- `await shell.handleInput("\r")`;
- stop capture;
- normalize using the prompt for the shell's new cwd;
- always restore mode `idle` in `finally`.

DO NOT execute the command via `shell.bash.exec()`.

- [ ] **step 8: run all tests**

```bash
pnpm test
pnpm typecheck
```

expected: pass.

- [ ] **step 9: commit**

```bash
git add src/terminal tests/unit
git commit -m "feat: add shared human-agent terminal session"
```

---

### task 4: terminal-first desktop ui

**files:**
- create/modify: `src/app/App.tsx`
- create: `src/app/app.css`
- create: `src/terminal/TerminalPane.tsx`
- create: `src/chat/ChatPanel.tsx`
- create: `src/chat/PromptChips.tsx`
- create: `src/chat/chat-state.ts`
- modify: `src/main.tsx`
- e2e test: `tests/e2e/terminal.spec.ts`

**interfaces:**
- consumes: `SessionController`, `loadPortfolioFiles()`.
- produces:
  - one visible terminal;
  - sidebar prompt UI;
  - no agent backend required yet.

- [ ] **step 1: write the failing Playwright test**

assert:
- page contains terminal;
- page contains text `ask ata's machine`;
- initial prompt chip `what is ata working on lately?`;
- clicking terminal and typing `pwd` displays `/home/ata`;
- typing `ls` displays `about`, `now`, and `projects`.

run:

```bash
pnpm test:e2e tests/e2e/terminal.spec.ts
```

expected: fail.

- [ ] **step 2: build `TerminalPane`**

use:

```tsx
const { ref, write } = useTerminal();
```

on ready:
- instantiate/attach `SessionController` exactly once;
- use `autoResize`;
- focus on explicit visitor click, not aggressively on every render.

on data:
- call `controller.handleHumanInput(data)`.

- [ ] **step 3: build the 70/30 layout**

desktop:
- main terminal region: `minmax(0, 7fr)`;
- sidebar: `minmax(280px, 3fr)`;
- full viewport height;
- no card-within-card terminal chrome;
- terminal visually dominates.

sidebar:
- title `ask ata's machine`;
- initial prompt chips;
- one text input;
- empty compact response area.

do not imitate chatgpt bubble styling.

- [ ] **step 4: make mobile intentional**

below 800px:
- terminal remains first;
- sidebar becomes a lower sheet/panel;
- prompt chips remain tappable;
- do not hide the terminal.

- [ ] **step 5: run tests**

```bash
pnpm test
pnpm typecheck
pnpm test:e2e tests/e2e/terminal.spec.ts
```

expected: pass.

- [ ] **step 6: commit**

```bash
git add src tests/e2e/terminal.spec.ts
git commit -m "feat: add terminal-first portfolio interface"
```

---

### task 5: typed websocket protocol and terminal-call rendezvous

**files:**
- create: `src/protocol/types.ts`
- create: `server/protocol/types.ts`
- create: `server/protocol/schema.ts`
- create: `server/sessions/pending-terminal-calls.ts`
- test: `tests/server/protocol.test.ts`
- test: `tests/server/pending-terminal-calls.test.ts`

**interfaces:**
- produces the exact protocol types from the design spec.
- produces:

```ts
export class PendingTerminalCalls {
  request(
    callId: string,
    command: string,
    send: (message: ServerMessage) => void,
    timeoutMs?: number,
  ): Promise<TerminalResultMessage>;

  resolve(message: TerminalResultMessage): boolean;
  rejectAll(reason: Error): void;
}
```

- [ ] **step 1: define shared message schemas**

use zod discriminated unions. do not accept arbitrary JSON fields as trusted.

client messages:
- `prompt`
- `terminal_result`

server messages:
- `assistant_delta`
- `terminal_exec`
- `suggestions`
- `done`
- `error`

- [ ] **step 2: test malformed messages**

tests must reject:
- missing `requestId`;
- non-string command;
- command > 500 chars;
- more than three suggestions;
- unknown message type.

- [ ] **step 3: implement schemas and infer types**

keep server as source-of-truth schema. client may duplicate compile-time types for now; do not add a code generator.

- [ ] **step 4: test pending-call resolution**

cover:
- matching `callId` resolves;
- unknown `callId` returns false;
- timeout rejects;
- `rejectAll` rejects every waiter;
- a second request reusing the same active `callId` throws.

- [ ] **step 5: implement rendezvous map**

use `Map<string, { resolve, reject, timer }>` and delete entries on every terminal path.

- [ ] **step 6: commit**

```bash
git add src/protocol server/protocol server/sessions tests/server
git commit -m "feat: define agent websocket protocol"
```

---

### task 6: server session and deterministic fake-agent vertical slice

**files:**
- create: `server/sessions/session.ts`
- create/modify: `server/app.ts`
- create/modify: `server/index.ts`
- create: `src/agent/agent-client.ts`
- create: `src/agent/use-agent.ts`
- modify: `src/chat/ChatPanel.tsx`
- e2e: `tests/e2e/agent-drives-terminal.spec.ts`

**interfaces:**
- server websocket path: `/ws`.
- health endpoint: `GET /healthz -> 200 {"ok":true}`.
- before any real model is connected, the server implements a deterministic fake path for the exact initial prompt.

- [ ] **step 1: write the e2e test FIRST**

the test should click `what is ata working on lately?` and assert, in order:
1. sidebar shows brief commentary;
2. terminal visibly receives `cd /home/ata/now`;
3. terminal visibly receives `cat current.md`;
4. terminal displays content from `current.md`;
5. sidebar receives exactly three suggestion chips;
6. pressing terminal up-arrow after completion surfaces `cat current.md`.

this is the product's core end-to-end contract.

- [ ] **step 2: implement websocket server upgrade**

use `ws`.

on connect:
- create a new in-memory `Session`;
- one session per websocket;
- reject binary frames;
- max incoming frame size should be small (e.g. 16 KiB);
- close cleanly and `rejectAll()` pending tool calls on disconnect.

- [ ] **step 3: implement deterministic fake-agent handler**

when `FAKE_AGENT=1` and prompt equals the initial question:
- send brief `assistant_delta`;
- request terminal exec `cd /home/ata/now`;
- await result;
- request terminal exec `cat current.md`;
- await result;
- send three deterministic suggestions;
- send `done`.

the fake agent exists only to prove browser/server/tool orchestration without model nondeterminism.

- [ ] **step 4: implement `AgentClient`**

responsibilities:
- one websocket;
- reconnect only when no request is active;
- send prompt;
- on `terminal_exec`, invoke the current `SessionController.execAsAgent(command)` and reply `terminal_result`;
- update chat state from deltas/suggestions/done/error.

- [ ] **step 5: wire the sidebar**

initial chips and freeform input both call the same `sendPrompt(text)` path.

while a prompt is active:
- disable prompt submission;
- terminal remains visible;
- terminal keyboard is already serialized by `SessionController` during agent commands.

- [ ] **step 6: make fake-agent e2e pass**

run:

```bash
FAKE_AGENT=1 pnpm test:e2e tests/e2e/agent-drives-terminal.spec.ts
```

expected: pass.

then:

```bash
pnpm test
pnpm typecheck
```

expected: pass.

- [ ] **step 7: commit**

```bash
git add server src tests/e2e/agent-drives-terminal.spec.ts
git commit -m "feat: prove agent-driven terminal vertical slice"
```

**this commit is the first meaningful milestone. stop and manually demo it before continuing.**

---

### task 7: real model loop with browser-executed `terminal_exec`

**files:**
- create: `server/config.ts`
- create: `server/agent/model.ts`
- create: `server/agent/prompt.ts`
- create: `server/agent/run-agent.ts`
- create: `server/agent/suggestions.ts`
- modify: `server/sessions/session.ts`
- test: `tests/server/suggestions.test.ts`
- create: `.env.example`

**interfaces:**
- environment:

```text
LLM_BASE_URL=
LLM_API_KEY=
LLM_MODEL=
PORT=8787
FAKE_AGENT=0
```

- `runAgent({ prompt, session, send }): Promise<void>`
- `terminal_exec` tool returns:

```ts
{
  command: string;
  output: string;
  cwd: string;
}
```

- [ ] **step 1: validate config**

fail startup when `FAKE_AGENT != 1` and any required LLM variable is missing.

never expose config through an http endpoint.

- [ ] **step 2: create the provider**

use `createOpenAICompatible`:

```ts
const provider = createOpenAICompatible({
  name: "portfolio",
  baseURL: config.llmBaseUrl,
  apiKey: config.llmApiKey,
});

export const model = provider.chatModel(config.llmModel);
```

- [ ] **step 3: implement the system prompt**

include every model-behavior rule from the spec.

explicitly tell the model:
- show evidence through terminal actions;
- keep narration brief;
- never infer private state;
- curated filesystem only;
- max 8 tool calls.

- [ ] **step 4: implement `terminal_exec` as a remote tool**

the tool's execute handler MUST NOT run anything server-side.

it should:
1. validate command length;
2. create `callId`;
3. call `session.pendingTerminalCalls.request(...)`;
4. send `{type:"terminal_exec", ...}` to browser;
5. await browser result;
6. return browser result to the model.

- [ ] **step 5: implement bounded multi-step model execution**

use AI SDK tool calling with an explicit step limit of 8.

stream text deltas to the browser as `assistant_delta`.

do not stream hidden reasoning.

after tool loop completes, obtain final visible response.

- [ ] **step 6: implement suggestion generation as structured output or strict parse**

requirements:
- 0-3 strings;
- each <= 90 chars;
- no duplicates;
- reject case-insensitive generic forms including:
  - `tell me more`
  - `learn more`
  - `what else`
  - `continue`
  - `explain further`

if suggestion generation fails, send an empty list rather than failing the answer.

write unit tests for filter behavior.

- [ ] **step 7: keep fake model mode**

`FAKE_AGENT=1` remains supported for e2e and deployment smoke tests. real-model tests must not run in ordinary CI.

- [ ] **step 8: manual acceptance**

with a real compatible model, ask:
- `what has ata been doing lately?`
- `show me speech-core`
- `what kind of engineer is ata?`

verify the model actually inspects files and does not merely hallucinate summaries.

- [ ] **step 9: commit**

```bash
git add server .env.example tests/server
git commit -m "feat: add portfolio agent model loop"
```

---

### task 8: markdown and rich artifact surfaces

**files:**
- modify/create: `src/content/assets.ts`
- create: `src/terminal/ArtifactOverlay.tsx`
- create: `src/terminal/MarkdownView.tsx`
- modify: `src/terminal/TerminalPane.tsx`
- modify: `src/app/app.css`
- add real public-safe assets under: `content/home/ata/projects/**`

**interfaces:**
- produces:
  - `AssetDescriptor { path, url, mediaType, alt }`
  - `openArtifact(path): void`
- no binary asset is granted to the shell as host data.

- [ ] **step 1: add one real image asset and one test fixture**

choose a public-safe architecture diagram or screenshot from a project.

create an asset registry from Vite `?url` imports keyed by `/home/ata/...`.

- [ ] **step 2: make assets discoverable in shell**

for every registered binary asset, add a text placeholder at the same virtual path if the text loader would otherwise omit it. content should state:

```text
[binary portfolio artifact]
view this item in the rich viewer.
```

therefore `ls` shows the filename and `cat` is never broken.

- [ ] **step 3: implement artifact overlay**

image:
- responsive `<img>`;
- real alt text;
- escape closes.

video:
- native controls;
- no autoplay with sound.

markdown:
- use `@wterm/markdown` for terminal-styled rendering where appropriate.
- do not rewrite ordinary shell output into HTML behind the visitor's back.

- [ ] **step 4: add an explicit ui path to open rich artifacts**

minimum acceptable v0:
- when agent surfaces a known asset path, render a compact `view artifact` action adjacent to the agent narration or terminal overlay control.
- clicking it opens the artifact over the terminal region and preserves shell state underneath.

do not fork `@wterm/just-bash` merely to create an `open` command.

- [ ] **step 5: optional `open` command only if cheap**

inspect the installed `@wterm/just-bash` 0.3.4 adapter. if it now exposes stable custom-command injection, register `open`. if it still does not, STOP there; keep the explicit rich-view action. do not vendor/fork the line editor in v0.

- [ ] **step 6: add Playwright coverage**

verify:
- opening image does not reset terminal cwd;
- closing image returns to same terminal;
- manual commands still work.

- [ ] **step 7: commit**

```bash
git add src content tests
git commit -m "feat: add rich portfolio artifact viewing"
```

---

### task 9: public-app hardening and abuse bounds

**files:**
- modify: `server/app.ts`
- modify: `server/sessions/session.ts`
- create: `server/rate-limit.ts`
- tests: `tests/server/rate-limit.test.ts`
- modify: response/security headers configuration

**interfaces:**
- per-ip prompt rate: start at 20 prompts / 10 minutes.
- per-session concurrent prompt limit: 1.
- websocket max message: 16 KiB.
- prompt max length: 2,000 characters.
- terminal command max length: 500.
- terminal calls per prompt: 8.

- [ ] **step 1: write rate-limit tests**

use an injected clock. test:
- first 20 allowed;
- 21st rejected;
- window reset;
- different keys independent.

- [ ] **step 2: implement in-memory sliding/fixed window limiter**

single-instance service is sufficient for v0. no Redis.

- [ ] **step 3: enforce bounds before model invocation**

respond with typed `error` messages. do not let malformed/oversized input reach model code.

- [ ] **step 4: add security headers**

serve:
- CSP suitable for the app and websocket endpoint;
- `X-Content-Type-Options: nosniff`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- frame restrictions unless deliberate embedding is wanted.

do not put secrets in CSP or client env.

- [ ] **step 5: audit shell construction**

test/source-review must confirm:
- no `network` option;
- no server tool forwards arbitrary fetch/network capability to shell;
- no server command execution package is imported.

a grep-based CI guard may fail build on suspicious imports in `server/` such as `child_process`, `node:child_process`, `node-pty`.

- [ ] **step 6: logs**

structured logs may include:
- request id;
- session id (random, ephemeral);
- event type;
- latency;
- tool-call count;
- error class.

do not log prompt text or terminal results by default.

- [ ] **step 7: run complete test suite**

```bash
pnpm test
pnpm typecheck
pnpm build
FAKE_AGENT=1 pnpm test:e2e
```

expected: all pass.

- [ ] **step 8: commit**

```bash
git add server tests package.json
git commit -m "feat: harden public portfolio runtime"
```

---

### task 10: containerize for services-1

**files:**
- create: `Dockerfile`
- create: `.dockerignore`
- create: `compose.yaml`
- modify: `server/index.ts`
- add docs: `docs/deploy-services-1.md`

**interfaces:**
- container listens internally on `8787`.
- host publishes loopback only: `127.0.0.1:8787:8787`.
- `GET /healthz` is container healthcheck.

- [ ] **step 1: write multi-stage Dockerfile**

shape:

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
USER node
EXPOSE 8787
CMD ["node", "dist-server/index.js"]
```

adjust exact built paths to actual TypeScript output; do not copy source or `.env`.

- [ ] **step 2: write compose file**

minimum:

```yaml
services:
  portfolio:
    build: .
    restart: unless-stopped
    ports:
      - "127.0.0.1:8787:8787"
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:8787/healthz"]
      interval: 30s
      timeout: 5s
      retries: 3
```

if runtime image lacks `wget`, use a Node healthcheck instead. keep loopback binding.

- [ ] **step 3: local container smoke**

```bash
docker compose build
docker compose up -d
curl http://127.0.0.1:8787/healthz
```

expected:
```json
{"ok":true}
```

then run browser smoke against local service.

- [ ] **step 4: write deployment doc**

`docs/deploy-services-1.md` must contain:
- repo checkout/update;
- `.env` placement;
- compose build/up;
- health check;
- rollback to previous git revision/container;
- log command;
- explicit warning that origin port remains loopback-only.

- [ ] **step 5: commit**

```bash
git add Dockerfile .dockerignore compose.yaml docs/deploy-services-1.md
git commit -m "chore: containerize portfolio service"
```

---

### task 11: publish `colak.sh` through cloudflare tunnel

**files:**
- infrastructure location depends on the existing `services-1` infra repo/config; do not create duplicate tunnel management if one already exists.
- update: `docs/deploy-services-1.md` with the actual chosen method after deployment.

**interfaces:**
- public hostname: `colak.sh`
- origin: `http://127.0.0.1:8787`
- websocket path `/ws` passes through the same published HTTP application.

- [ ] **step 1: inspect existing cloudflared ownership before changing anything**

on `services-1`, determine whether cloudflared is:
- already installed;
- already enrolled in a remotely-managed tunnel;
- managed by systemd, compose, or another infra repo.

do not create a second unmanaged copy if an existing tunnel/service should own this route.

- [ ] **step 2: prefer the existing tunnel; otherwise create a remotely-managed tunnel**

cloudflare currently recommends remotely-managed tunnels for most use cases.

add a published application route:

```text
hostname: colak.sh
service:  http://127.0.0.1:8787
```

do not publish ssh, netbird management, vaultwarden, openbao, or any other operator service as part of this change.

- [ ] **step 3: verify tunnel/origin without model first**

deploy with `FAKE_AGENT=1`.

verify externally:

```text
https://colak.sh/
https://colak.sh/healthz
```

verify websocket by running the fake-agent browser flow over the public hostname.

- [ ] **step 4: verify origin is not directly exposed**

from another machine, confirm there is no public path to port 8787 on `services-1`.

the only intended path is Cloudflare -> tunnel -> loopback origin.

- [ ] **step 5: enable real model**

install real server-side environment values using the existing secret-management convention on `services-1`.

restart only the portfolio service.

never put `LLM_API_KEY` in:
- Vite `VITE_*` variables;
- frontend source;
- compose committed values;
- Cloudflare client-side config.

- [ ] **step 6: final public smoke**

manual checklist:

```text
[ ] colak.sh loads over https
[ ] terminal `pwd` => /home/ata
[ ] terminal `ls` shows curated filesystem
[ ] `cd` + up-arrow history work
[ ] initial prompt chips work
[ ] freeform prompt works
[ ] agent visibly types into same terminal
[ ] agent `cd` changes subsequent human cwd
[ ] agent command exists in same up-arrow history
[ ] agent uses terminal output in subsequent step
[ ] suggestions are specific and <= 3
[ ] rich image view works
[ ] websocket reconnect/error state is understandable
[ ] mobile layout is usable
[ ] no model credential appears in browser devtools/source
[ ] no origin port is publicly reachable
[ ] private *.net.colak.sh services unchanged
```

- [ ] **step 7: record deployed topology**

update `docs/deploy-services-1.md` with:
- service name;
- loopback port;
- where cloudflared route is managed;
- health check;
- rollback commands.

do not record credentials.

- [ ] **step 8: commit infra documentation/config changes in their owning repo**

commit message should describe only the public portfolio route.

---

## phase boundary: STOP HERE for v0

do not build any of these until real usage demonstrates the need:

- github automatic mirroring;
- hindsight/memory integration;
- visitor accounts;
- persistent conversations;
- vector search;
- general web search;
- server-side shells/containers;
- multiple agents;
- voice;
- analytics dashboard;
- cms;
- custom terminal language;
- elaborate fake unix commands;
- automatic ingestion of all repos;
- per-visitor remote compute.

the v0 artifact is successful when the interface itself communicates the idea: a technical visitor can drive the terminal directly; a nontechnical visitor can ask the agent, watch it use the same terminal, and continue exploring through specific suggested questions.

## execution order

tasks are sequential because each introduces an interface consumed by later tasks:

```text
1 bootstrap
  ↓
2 content
  ↓
3 shared shell invariant
  ↓
4 terminal ui
  ↓
5 protocol
  ↓
6 fake-agent vertical slice  ← FIRST PRODUCT MILESTONE
  ↓
7 real model
  ↓
8 rich artifacts
  ↓
9 hardening
  ↓
10 container
  ↓
11 cloudflare/public launch
```

parallelism is acceptable only inside a task where files/interfaces do not overlap. do not parallelize tasks 3, 5, 6, or 7 against their dependencies.

## verification before completion

before any agent claims the project is complete, it must run and capture successful output from:

```bash
pnpm test
pnpm typecheck
pnpm build
FAKE_AGENT=1 pnpm test:e2e
```

for deployment completion it must additionally verify:

```bash
curl -fsS http://127.0.0.1:8787/healthz
```

and externally verify `https://colak.sh/healthz` plus the fake-agent websocket interaction before enabling the real model.

a passing build without the shared-shell e2e invariant is NOT completion.
