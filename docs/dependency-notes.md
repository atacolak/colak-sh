# dependency notes

recorded 2026-08-27 after first successful `pnpm install`, `pnpm test`, `pnpm typecheck`, and `pnpm build`.

## toolchain

- node: `v24.20.0`
- pnpm: `10.33.0`

## resolved top-level packages (`pnpm list --depth 0`)

### runtime

- `@ai-sdk/openai-compatible@3.0.37`
- `@wterm/dom@0.3.4`
- `@wterm/just-bash@0.3.4`
- `@wterm/markdown@0.3.4`
- `@wterm/react@0.3.4`
- `ai@7.0.79`
- `just-bash@3.4.1`
- `react@19.2.8`
- `react-dom@19.2.8`
- `ws@8.21.3`
- `zod@4.4.3`

### dev

- `@playwright/test@1.62.1`
- `@testing-library/dom@10.4.1`
- `@testing-library/jest-dom@6.10.0`
- `@testing-library/react@16.3.2`
- `@types/node@24.13.3`
- `@types/react@19.2.18`
- `@types/react-dom@19.2.5`
- `@types/ws@8.18.1`
- `@vitejs/plugin-react@5.2.0`
- `jsdom@26.1.0`
- `tsx@4.23.12`
- `typescript@5.9.3`
- `vite@7.3.6`
- `vitest@3.2.7`

pinned versions from the implementation plan were kept:

- `@wterm/*` `0.3.4`
- `just-bash` `3.4.1`
- `ai` `7.0.79`
- `@ai-sdk/openai-compatible` `3.0.37`

## shell adapter choice

`@wterm/just-bash` is the interactive adapter: it owns line editing, tab completion, history, and prompt, and its `BashShell` keeps cwd/history in that adapter. human and agent input MUST share `BashShell.handleInput()`.

`just-bash` `exec()` calls have isolated shell state. they are therefore not the agent's execution path. using `shell.bash.exec()` would create a second cwd/history and violate the one-shell invariant.

## peer warning

`@wterm/just-bash@0.3.4` declares `peerDependencies.just-bash: ^2`. the plan pins `just-bash@3.4.1`. installation succeeds with an unmet-peer warning. keep 3.4.1 unless a later task observes a real incompatibility in `BashShell` behavior.
