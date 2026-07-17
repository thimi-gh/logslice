import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { matchesFilters } from "./filters.js";
import { parseLogLine } from "./parser.js";
import type { LogEntry, LogFilters } from "./types.js";

export type ProcessLogFileOptions = {
  context: number;
  limit?: number;
  onMatch: (entry: LogEntry) => void;
  onContext: (entry: LogEntry) => void;
};

export type ProcessLogFileResult = {
  linesRead: number;
  matches: number;
};

export async function processLogFile(
  filePath: string,
  filters: LogFilters,
  options: ProcessLogFileOptions
): Promise<ProcessLogFileResult> {
  return new Promise((resolve, reject) => {
    const input = createReadStream(filePath, { encoding: "utf8" });
    const reader = createInterface({ input, crlfDelay: Infinity });
    const previousLines: LogEntry[] = [];

    let lineNumber = 0;
    let matches = 0;
    let afterContextRemaining = 0;
    let lastPrintedLine = 0;
    let stopAfterContext = false;
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      resolve({ linesRead: lineNumber, matches });
    };

    const fail = (error: NodeJS.ErrnoException) => {
      if (settled) {
        return;
      }

      settled = true;
      reject(error);
    };

    input.on("error", fail);
    reader.on("error", fail);
    reader.on("close", finish);

    reader.on("line", (line) => {
      lineNumber += 1;
      const entry = parseLogLine(line, lineNumber);

      if (!stopAfterContext && matchesFilters(entry, filters)) {
        matches += 1;
        printPreviousContext(previousLines, options, lastPrintedLine, (printedLine) => {
          lastPrintedLine = printedLine;
        });

        if (entry.lineNumber > lastPrintedLine) {
          options.onMatch(entry);
          lastPrintedLine = entry.lineNumber;
        }

        afterContextRemaining = options.context;

        if (options.limit !== undefined && matches >= options.limit) {
          stopAfterContext = true;

          if (afterContextRemaining === 0) {
            reader.close();
            input.destroy();
          }
        }
      } else if (afterContextRemaining > 0) {
        if (entry.lineNumber > lastPrintedLine) {
          options.onContext(entry);
          lastPrintedLine = entry.lineNumber;
        }

        afterContextRemaining -= 1;

        if (stopAfterContext && afterContextRemaining === 0) {
          reader.close();
          input.destroy();
        }
      }

      rememberLine(previousLines, entry, options.context);
    });
  });
}

function printPreviousContext(
  previousLines: LogEntry[],
  options: ProcessLogFileOptions,
  lastPrintedLine: number,
  setLastPrintedLine: (lineNumber: number) => void
): void {
  if (options.context === 0) {
    return;
  }

  for (const entry of previousLines) {
    if (entry.lineNumber <= lastPrintedLine) {
      continue;
    }

    options.onContext(entry);
    setLastPrintedLine(entry.lineNumber);
  }
}

function rememberLine(previousLines: LogEntry[], entry: LogEntry, maxSize: number): void {
  if (maxSize === 0) {
    return;
  }

  previousLines.push(entry);

  if (previousLines.length > maxSize) {
    previousLines.shift();
  }
}
