# AGENTS.md

The Wheel Deal: car dealership inventory app, built as a TDD kata.

## Layout
- backend/  FastAPI, Python 3.12+, SQLAlchemy 2.0 (sync), Alembic, PostgreSQL via psycopg 3, pytest
- frontend/ React + TypeScript + Vite + Tailwind, Vitest + React Testing Library

## How we work
- Backend is strict TDD. For each behaviour: write the failing test, run it, confirm it fails
  for the right reason (an assertion, not an ImportError), commit. Then the minimum code to pass,
  run the full suite, commit. Refactor only on green, in its own commit.
- Commit prefixes: test: (red), feat:/fix: (green), refactor:, chore:, docs:
- Never commit with a failing suite, except a red `test:` commit that says it's expected to fail.
- Every commit you make ends with two blank lines, then:
  Co-authored-by: OpenAI Codex <codex@users.noreply.github.com>
- Commit body: one or two lines on what and why.
- Ask before adding any dependency I didn't name.
- Don't touch git config, don't push, don't rewrite pushed history.

## Backend conventions
- Layers: api/routes -> services -> repositories -> models. Routes stay thin.
- Services raise domain errors (VehicleNotFound, OutOfStock, EmailAlreadyRegistered...).
  One exception handler maps them to HTTP. No HTTPException inside services.
- Pydantic v2, separate Create/Update/Read schemas. password_hash never leaves the backend.
- Money is Numeric(10,2) / Decimal end to end. Never float.
- Config via pydantic-settings from env. Keep .env.example current. No secrets in code.
- Tests run against a real Postgres test DB (wheeldeal_test), never SQLite. Each test rolls back.
- Before every green commit: `pytest -q` passes and `ruff check .` is clean.

## Frontend conventions
- Function components and hooks. All HTTP goes through src/api, never fetch() in components.
- Tailwind only, no component libraries (MUI, Chakra etc). A small icon set is fine.

## Agents and token budget
- The main thread does all writing and committing, one TDD cycle at a time. Never run agents
  that edit files in parallel: we share one working tree and one git index, and the red/green
  order in the history has to stay clean.
- Run pytest, vitest, ruff and coverage through the `test-runner` agent and work from its summary.
  Don't pull full logs into the main thread.
- For "where is X / how does Y work" questions across the repo, use the built-in `explorer`
  instead of reading whole files yourself.
- When you finish everything a prompt asked for, spawn `reviewer`, wait for it, fix what's real
  in fix:/refactor: commits, and tell me what you skipped and why.
- Keep replies short: what changed, the test result line, the commit hashes. Don't restate the plan.
