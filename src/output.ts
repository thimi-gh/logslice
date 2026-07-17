import chalk from "chalk";
import type { LogEntry, LogLevel } from "./types.js";

export type LineKind = "match" | "context";

export type PrettyOutputOptions = {
  contains?: string;
  ignoreCase?: boolean;
  kind: LineKind;
};

type SerializableLogEntry = {
  lineNumber: number;
  raw: string;
  timestamp?: string;
  level: LogLevel;
  message: string;
};

export function formatPrettyEntry(entry: LogEntry, options: PrettyOutputOptions): string {
  const marker = options.kind === "match" ? chalk.cyan(">") : chalk.dim("-");
  const lineNumber = chalk.dim(entry.lineNumber.toString().padStart(6));
  const body = entry.level === "unknown"
    ? entry.raw
    : `${entry.level.toUpperCase().padEnd(5)} ${entry.message}`;
  const highlightedBody = highlight(body, options.contains, options.ignoreCase);
  const coloredBody = options.kind === "context"
    ? chalk.dim(highlightedBody)
    : colorForLevel(entry.level)(highlightedBody);

  return `${marker} ${lineNumber} ${coloredBody}`;
}

export function serializeLogEntry(entry: LogEntry): SerializableLogEntry {
  return {
    lineNumber: entry.lineNumber,
    raw: entry.raw,
    timestamp: entry.timestamp?.toISOString(),
    level: entry.level,
    message: entry.message
  };
}

export class JsonArrayWriter {
  private hasWrittenEntry = false;

  writeEntry(entry: LogEntry): void {
    const prefix = this.hasWrittenEntry ? ",\n" : "[\n";
    process.stdout.write(`${prefix}${JSON.stringify(serializeLogEntry(entry), null, 2)}`);
    this.hasWrittenEntry = true;
  }

  finish(): void {
    if (this.hasWrittenEntry) {
      process.stdout.write("\n]\n");
      return;
    }

    process.stdout.write("[]\n");
  }
}

function colorForLevel(level: LogLevel): (text: string) => string {
  switch (level) {
    case "fatal":
    case "error":
      return chalk.red;
    case "warn":
      return chalk.yellow;
    case "info":
      return chalk.green;
    case "debug":
    case "trace":
      return chalk.gray;
    case "unknown":
      return (text: string) => text;
  }
}

function highlight(text: string, query: string | undefined, ignoreCase = false): string {
  if (!query) {
    return text;
  }

  const flags = ignoreCase ? "gi" : "g";
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const matcher = new RegExp(escapedQuery, flags);

  return text.replace(matcher, (match) => chalk.inverse(match));
}
