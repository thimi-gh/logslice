import type { LogEntry, LogLevel } from "./types.js";

type TimestampMatch = {
  date: Date;
  start: number;
  end: number;
};

const LEVEL_PATTERN = /^(?:[-:|]\s*)?\[?\s*(trace|debug|info|warn|warning|error|err|fatal|unknown)\s*\]?/i;

const TIMESTAMP_PATTERNS = [
  /^\s*\[(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)\]/,
  /^\s*(\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)/
];

export function normalizeLevel(value: string | undefined): LogLevel {
  const normalized = value?.trim().toLowerCase();

  switch (normalized) {
    case "trace":
    case "debug":
    case "info":
    case "warn":
    case "error":
    case "fatal":
    case "unknown":
      return normalized;
    case "warning":
      return "warn";
    case "err":
      return "error";
    default:
      return "unknown";
  }
}

export function parseLogLine(raw: string, lineNumber: number): LogEntry {
  const timestampMatch = extractTimestamp(raw);
  const afterTimestamp = timestampMatch
    ? raw.slice(timestampMatch.end).trimStart()
    : raw.trimStart();
  const levelMatch = afterTimestamp.match(LEVEL_PATTERN);
  const level = normalizeLevel(levelMatch?.[1]);
  const message = extractMessage(raw, timestampMatch, levelMatch?.[0]);

  return {
    lineNumber,
    raw,
    timestamp: timestampMatch?.date,
    level,
    message
  };
}

function extractTimestamp(raw: string): TimestampMatch | undefined {
  for (const pattern of TIMESTAMP_PATTERNS) {
    const match = raw.match(pattern);
    const candidate = match?.[1];

    if (!candidate || match.index === undefined) {
      continue;
    }

    const date = parseTimestamp(candidate);

    if (!date) {
      continue;
    }

    const fullMatch = match[0];
    const candidateOffset = fullMatch.indexOf(candidate);
    const start = match.index + candidateOffset;
    const end = match.index + fullMatch.length;

    return { date, start, end };
  }

  return undefined;
}

function parseTimestamp(candidate: string): Date | undefined {
  const normalized = candidate
    .replace(" ", "T")
    .replace(/\.(\d{3})\d+/, ".$1")
    .replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function extractMessage(
  raw: string,
  timestampMatch: TimestampMatch | undefined,
  matchedLevelToken: string | undefined
): string {
  let message = timestampMatch ? raw.slice(timestampMatch.end) : raw;
  message = message.trimStart().replace(/^[-:|]\s*/, "");

  if (matchedLevelToken && message.startsWith(matchedLevelToken)) {
    message = message.slice(matchedLevelToken.length);
  }

  return message.trimStart().replace(/^[-:|]\s*/, "").trimEnd();
}
