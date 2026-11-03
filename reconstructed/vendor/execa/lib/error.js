/**
 * execa/lib/error.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-fingerprint 1
 */
import { default as Mr } from "process";
import { Xt } from "../../human-signals/build/src/main.js";

//@ chunk-m4p5zn6n.js:14620-15759 esm-fingerprint
var getErrorPrefix = ({ timedOut, timeout, errorCode, signal, signalDescription, exitCode, isCanceled }) => {
  if (timedOut) return `timed out after ${timeout} milliseconds`;
  if (isCanceled) return "was canceled";
  if (errorCode !== undefined) return `failed with ${errorCode}`;
  if (signal !== undefined) return `was killed with ${signal} (${signalDescription})`;
  if (exitCode !== undefined) return `failed with exit code ${exitCode}`;
  return "failed";
};
var makeError = ({
  stdout,
  stderr,
  all,
  error,
  signal,
  exitCode,
  command,
  escapedCommand,
  timedOut,
  isCanceled,
  killed,
  parsed: {
    options: { timeout, cwd = Mr.cwd() },
  },
}) => {
  exitCode = exitCode === null ? undefined : exitCode;
  signal = signal === null ? undefined : signal;
  let signalDescription = signal === undefined ? undefined : Xt[signal].description;
  let errorCode = error && error.code;
  let execaMessage = `Command ${getErrorPrefix({
    timedOut,
    timeout,
    errorCode,
    signal,
    signalDescription,
    exitCode,
    isCanceled,
  })}: ${command}`;
  let isError = Object.prototype.toString.call(error) === "[object Error]";
  let shortMessage = isError
    ? `${execaMessage}
${error.message}`
    : execaMessage;
  let message = [shortMessage, stderr, stdout].filter(Boolean).join(`
`);
  if (isError) {
    error.originalMessage = error.message;
    error.message = message;
  } else error = Error(message);
  error.shortMessage = shortMessage;
  error.command = command;
  error.escapedCommand = escapedCommand;
  error.exitCode = exitCode;
  error.signal = signal;
  error.signalDescription = signalDescription;
  error.stdout = stdout;
  error.stderr = stderr;
  error.cwd = cwd;
  if (all !== undefined) error.all = all;
  if ("bufferedData" in error) delete error.bufferedData;
  error.failed = true;
  error.timedOut = Boolean(timedOut);
  error.isCanceled = isCanceled;
  error.killed = killed && !timedOut;
  return error;
};
export { makeError };
