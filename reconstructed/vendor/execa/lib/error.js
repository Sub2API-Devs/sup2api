/**
 * execa/lib/error.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: execa@8.0.1
 * pieces: chunk-m4p5zn6n.js (1)
 * attribution: esm-fingerprint 1
 */
import pe, { default as re, default as Mr, default as No } from "process";
import { Xt } from "../../human-signals/build/src/main.js";

//@ chunk-m4p5zn6n.js:14620-15759 esm-fingerprint
var Dr = ({
    timedOut: timedOut,
    timeout: timeout,
    errorCode: errorCode,
    signal: signal,
    signalDescription: signalDescription,
    exitCode: exitCode,
    isCanceled: isCanceled,
  }) => {
    if (timedOut) return `timed out after ${timeout} milliseconds`;
    if (isCanceled) return "was canceled";
    if (errorCode !== void 0) return `failed with ${errorCode}`;
    if (signal !== void 0) return `was killed with ${signal} (${signalDescription})`;
    if (exitCode !== void 0) return `failed with exit code ${exitCode}`;
    return "failed";
  },
  M = ({
    stdout: stdout,
    stderr: stderr,
    all: all,
    error: error,
    signal: signal,
    exitCode: exitCode,
    command: command,
    escapedCommand: escapedCommand,
    timedOut: timedOut,
    isCanceled: isCanceled,
    killed: killed,
    parsed: {
      options: { timeout: S, cwd: y = Mr.cwd() },
    },
  }) => {
    ((exitCode = exitCode === null ? void 0 : exitCode), (signal = signal === null ? void 0 : signal));
    let w = signal === void 0 ? void 0 : Xt[signal].description,
      E = error && error.code,
      A = `Command ${Dr({ timedOut: timedOut, timeout: S, errorCode: E, signal: signal, signalDescription: w, exitCode: exitCode, isCanceled: isCanceled })}: ${command}`,
      H = Object.prototype.toString.call(error) === "[object Error]",
      V = H
        ? `${A}
${error.message}`
        : A,
      joined = [V, stderr, stdout].filter(Boolean).join(`
`);
    if (H) ((error.originalMessage = error.message), (error.message = joined));
    else error = Error(joined);
    if (
      ((error.shortMessage = V),
      (error.command = command),
      (error.escapedCommand = escapedCommand),
      (error.exitCode = exitCode),
      (error.signal = signal),
      (error.signalDescription = w),
      (error.stdout = stdout),
      (error.stderr = stderr),
      (error.cwd = y),
      all !== void 0)
    )
      error.all = all;
    if ("bufferedData" in error) delete error.bufferedData;
    return (
      (error.failed = !0),
      (error.timedOut = Boolean(timedOut)),
      (error.isCanceled = isCanceled),
      (error.killed = killed && !timedOut),
      error
    );
  };

export { M };
