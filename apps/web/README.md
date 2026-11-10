# web

Next.js 16 (App Router, React Compiler, Cache Components) with Panda CSS.
Only the setup is here so far; the screens are still to be planned.

```sh
bun run dev        # from the repo root: turbo runs this with the server
bun run --filter web dev
```

`panda codegen` writes `styled-system/` (gitignored) before `dev`, `build`
and `typecheck`. Import styles from `styled-system/css`.
