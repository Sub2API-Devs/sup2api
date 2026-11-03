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

//@ chunk-rr03x1jm.js:510-1001 fingerprint = getStdinOverride (0.316)
function getStdinOverride() {
  if (process.stdin.isTTY) return { kind: "stdin" };
  if (isEnvTruthy(!1)) return { kind: "unavailable", reason: "ci" };
  if (eagerFirstOperand() === "mcp") return { kind: "unavailable", reason: "mcp" };
  try {
    let ttyFd = openSync("/dev/tty", "r"),
      ttyStream = new ReadStream(ttyFd);
    return (
      handleStreamGoneErrors(ttyStream),
      ttyStream.on("error", (r) => {
        (logEvent("tengu_tty_stream_error", errorTelemetryFields(r)),
          logForDebugging(`/dev/tty stream error: ${r}`, { level: "debug" }));
      }),
      (ttyStream.isTTY = !0),
      { kind: "override", stream: ttyStream }
    );
  } catch (err) {
    return (
      logForDebugging(`Could not open /dev/tty for stdin override: ${err}`, { level: "error" }),
      { kind: "unavailable", reason: "tty_unavailable" }
    );
  }
}
//@ chunk-rr03x1jm.js:1001-1075 layout
class i {
  input = null;
  get() {
    return (this.input ??= getStdinOverride());
  }
  reset() {
    this.input = null;
  }
}
//@ chunk-rr03x1jm.js:1075-1089 facade-exports
var stdinOverrideCache = new i();
//@ chunk-rr03x1jm.js:1089-1225 facade-exports = getBaseRenderOptions (0.509)
function getBaseRenderOptions(exitOnCtrlC = !1) {
  applyRelaunchTerminalSize();
  let e = stdinOverrideCache.get(),
    options = { exitOnCtrlC: exitOnCtrlC };
  if (e.kind === "override") options.stdin = e.stream;
  return ((options.isScreenReaderEnabled = isScreenReaderMode()), options);
}

export { getBaseRenderOptions, stdinOverrideCache };
