import type { LogEntry, LogFilters } from "./types.js";

export function matchesFilters(entry: LogEntry, filters: LogFilters): boolean {
  if (filters.level && entry.level !== filters.level) {
    return false;
  }

  if (filters.contains && !containsText(entry.raw, filters.contains, filters.ignoreCase)) {
    return false;
  }

  if ((filters.from || filters.to) && !entry.timestamp) {
    return false;
  }

  if (filters.from && entry.timestamp && entry.timestamp < filters.from) {
    return false;
  }

  if (filters.to && entry.timestamp && entry.timestamp > filters.to) {
    return false;
  }

  return true;
}

function containsText(raw: string, text: string, ignoreCase = false): boolean {
  if (ignoreCase) {
    return raw.toLowerCase().includes(text.toLowerCase());
  }

  return raw.includes(text);
}
