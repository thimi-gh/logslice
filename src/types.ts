export type LogLevel =
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "fatal"
  | "unknown";

export type LogEntry = {
  lineNumber: number;
  raw: string;
  timestamp?: Date;
  level: LogLevel;
  message: string;
};

export type LogFilters = {
  level?: LogLevel;
  contains?: string;
  from?: Date;
  to?: Date;
  ignoreCase?: boolean;
};
