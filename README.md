# Logslice

Logslice is a TypeScript Node.js CLI for exploring large log files without a logging platform. It reads files as a stream, parses each line, and prints only the entries that match your filters.

## Local Development

```bash
npm install
npm run typecheck
npm run build
```

Run locally with `tsx`:

```bash
npm run dev -- ./example.log --level error
```

After building, run the compiled CLI:

```bash
npm run build
node dist/index.js ./example.log --contains database
```

You can also link it locally:

```bash
npm link
logslice ./example.log --level warn --context 2
```

## Example Log File

```text
2026-07-09T12:34:56.000Z ERROR Failed to connect to database
2026-07-09 12:34:57 [warn] Retrying in 2 seconds
[2026-07-09 12:35:01] INFO Server started
DEBUG Cache warmed
ERROR Something went wrong
```

## Usage

```bash
logslice <file> [options]
```

Examples:

```bash
logslice ./app.log --level error
logslice ./app.log --contains database --ignore-case
logslice ./app.log --from "2026-07-09T12:00:00Z" --to "2026-07-09T13:00:00Z"
logslice ./app.log --level warn --context 3
logslice ./app.log --contains timeout --limit 20
```

## Filters

Filters are combined with AND logic:

- `--level <level>` matches `trace`, `debug`, `info`, `warn`, `error`, `fatal`, or `unknown`. The aliases `warning` and `err` are normalized to `warn` and `error`.
- `--contains <text>` matches a substring in the raw log line.
- `--ignore-case` makes `--contains` case-insensitive.
- `--from <datetime>` only includes entries at or after the given datetime.
- `--to <datetime>` only includes entries at or before the given datetime.
- `--context <number>` prints surrounding lines before and after each match.
- `--limit <number>` stops after the requested number of matches.

If a time range is provided and a log line has no parseable timestamp, that line is excluded.

## JSON Output

Use `--json` to stream matches as a JSON array:

```bash
logslice ./app.log --level error --json
```

Each object includes `lineNumber`, `raw`, `level`, `message`, and `timestamp` when one could be parsed.

## Large Files

Logslice uses `fs.createReadStream`, `readline`, and a small rolling context buffer. It does not load the whole file into memory, so it can process large logs while keeping memory usage stable.
