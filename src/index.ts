#!/usr/bin/env node
import { access, stat } from "node:fs/promises";
import { constants } from "node:fs";
import chalk from "chalk";
import { Command, InvalidArgumentError } from "commander";
import { formatPrettyEntry, JsonArrayWriter } from "./output.js";
import { normalizeLevel } from "./parser.js";
import { processLogFile } from "./stream.js";
import type { LogFilters, LogLevel } from "./types.js";

type CliOptions = {
  level?: LogLevel;
  contains?: string;
  from?: Date;
  to?: Date;
  context: number;
  json?: boolean;
  limit?: number;
  ignoreCase?: boolean;
};

const program = new Command();

program
  .name("logslice")
  .description("Explore large log files with streaming filters.")
  .argument("<file>", "log file to read")
  .option("--level <level>", "filter by log level", parseLevel)
  .option("--contains <text>", "filter by keyword or text")
  .option("--from <datetime>", "only include logs at or after this datetime", parseDate)
  .option("--to <datetime>", "only include logs at or before this datetime", parseDate)
  .option("--context <number>", "print N lines before and after each match", parseNonNegativeInteger, 0)
  .option("--json", "output matching entries as JSON")
  .option("--limit <number>", "stop after N matches", parsePositiveInteger)
  .option("--ignore-case", "make text filtering case-insensitive")
  .showHelpAfterError()
  .action(async (file: string, options: CliOptions) => {
    await run(file, options);
  });

process.stdout.on("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EPIPE") {
    process.exit(0);
  }

  throw error;
});

program.parseAsync(process.argv).catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`Error: ${message}`));
  process.exitCode = 1;
});

async function run(file: string, options: CliOptions): Promise<void> {
  await assertReadableFile(file);

  const filters: LogFilters = {
    level: options.level,
    contains: options.contains,
    from: options.from,
    to: options.to,
    ignoreCase: options.ignoreCase
  };

  if (options.json) {
    const writer = new JsonArrayWriter();

    await processLogFile(file, filters, {
      context: 0,
      limit: options.limit,
      onMatch: (entry) => writer.writeEntry(entry),
      onContext: () => undefined
    });

    writer.finish();
    return;
  }

  await processLogFile(file, filters, {
    context: options.context,
    limit: options.limit,
    onMatch: (entry) => {
      console.log(formatPrettyEntry(entry, {
        contains: options.contains,
        ignoreCase: options.ignoreCase,
        kind: "match"
      }));
    },
    onContext: (entry) => {
      console.log(formatPrettyEntry(entry, {
        contains: options.contains,
        ignoreCase: options.ignoreCase,
        kind: "context"
      }));
    }
  });
}

async function assertReadableFile(file: string): Promise<void> {
  let fileStat;

  try {
    fileStat = await stat(file);
    await access(file, constants.R_OK);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read file "${file}": ${message}`);
  }

  if (!fileStat.isFile()) {
    throw new Error(`"${file}" is not a file`);
  }
}

function parseDate(value: string): Date {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new InvalidArgumentError(`Invalid datetime "${value}"`);
  }

  return date;
}

function parseLevel(value: string): LogLevel {
  const level = normalizeLevel(value);

  if (level === "unknown" && value.trim().toLowerCase() !== "unknown") {
    throw new InvalidArgumentError(`Invalid log level "${value}"`);
  }

  return level;
}

function parseNonNegativeInteger(value: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new InvalidArgumentError(`Expected a non-negative integer, got "${value}"`);
  }

  return parsed;
}

function parsePositiveInteger(value: string): number {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new InvalidArgumentError(`Expected a positive integer, got "${value}"`);
  }

  return parsed;
}
