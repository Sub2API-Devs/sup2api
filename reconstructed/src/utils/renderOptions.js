/**
 * utils/renderOptions.ts
 *
 * Ink 渲染选项：stdin 不可用时改用 /dev/tty 等 override。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/renderOptions.ts
 * pieces: chunk-rr03x1jm.js (4)
 * attribution: fingerprint 1, layout 1, facade-exports 2
 */
import { openSync } from "fs";
import { ReadStream } from "tty";
import { isEnvTruthy } from "./envUtils.js";
import { eagerFirstOperand } from "./cliArgs.js";
import { handleStreamGoneErrors } from "./process.js";
import { logEvent } from "../services/analytics/index.js";
import { errorTelemetryFields, isScreenReaderMode } from "./accessibility/screenReader.js";
import { logForDebugging } from "./debug.js";
import { applyRelaunchTerminalSize } from "./relaunchTerminalSize.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-rr03x1jm.js:510-1001 fingerprint = getStdinOverride (0.316)
function getStdinOverride() {
  if (process.stdin.isTTY)
    return {
      kind: "stdin",
    };
  if (isEnvTruthy(false))
    return {
      kind: "unavailable",
      reason: "ci",
    };
  if (eagerFirstOperand() === "mcp")
    return {
      kind: "unavailable",
      reason: "mcp",
    };
  try {
    let ttyFd = openSync("/dev/tty", "r");
    let ttyStream = new ReadStream(ttyFd);
    handleStreamGoneErrors(ttyStream);
    ttyStream.on("error", (error) => {
      logEvent("tengu_tty_stream_error", errorTelemetryFields(error));
      logForDebugging(`/dev/tty stream error: ${error}`, {
        level: "debug",
      });
    });
    ttyStream.isTTY = true;
    return {
      kind: "override",
      stream: ttyStream,
    };
  } catch (err) {
    logForDebugging(`Could not open /dev/tty for stdin override: ${err}`, {
      level: "error",
    });
    return {
      kind: "unavailable",
      reason: "tty_unavailable",
    };
  }
}
//@ chunk-rr03x1jm.js:1001-1075 layout
class stdinOverrideCell {
  input = null;
  get() {
    return (this.input ??= getStdinOverride());
  }
  reset() {
    this.input = null;
  }
}
//@ chunk-rr03x1jm.js:1075-1089 facade-exports
var stdinOverrideCache; // deferred: uses stdinOverrideCell of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rr03x1jm.js:1075", () => {
  stdinOverrideCache = new stdinOverrideCell();
});
//@ chunk-rr03x1jm.js:1089-1225 facade-exports = getBaseRenderOptions (0.509)
function getBaseRenderOptions(exitOnCtrlC = false) {
  applyRelaunchTerminalSize();
  let stdin = stdinOverrideCache.get();
  let options = {
    exitOnCtrlC,
  };
  if (stdin.kind === "override") options.stdin = stdin.stream;
  options.isScreenReaderEnabled = isScreenReaderMode();
  return options;
}
export { getBaseRenderOptions, stdinOverrideCache };
