/**
 * cli/startupFailureResult.ts
 *
 * 2.1.316 新增。stream-json 启动失败时写出启动帧与失败结果（org_config_required_unavailable 等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3hsy16d3.js (9)
 * attribution: placement 9
 */
import { detectNonInteractiveLaunch, eagerParseCliFlag } from "../utils/cliArgs.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { Vt } from "../utils/agentId.js";
import { emitLoadError } from "./print.js";
import { withDeadline } from "../utils/sleep.js";

//@ chunk-3hsy16d3.js:375-386 placement
var l = 1000;
//@ chunk-3hsy16d3.js:386-479 placement
function isStreamJsonLaunch(e = process.argv.slice(2)) {
  return detectNonInteractiveLaunch(e) && eagerParseCliFlag("--output-format", e) === "stream-json";
}
//@ chunk-3hsy16d3.js:479-553 placement
function isStartupFailureResultRequested() {
  return isEnvTruthy(process.env.CLAUDE_CODE_STARTUP_FAILURE_RESULTS);
}
//@ chunk-3hsy16d3.js:553-625 placement
var d = new Set(["org_config_required_unavailable", "org_config_refused"]);
//@ chunk-3hsy16d3.js:625-662 placement
function c(e) {
  return d.has(e) || isStartupFailureResultRequested();
}
//@ chunk-3hsy16d3.js:662-775 placement
function startupResultSessionId(e, t = process.argv.slice(2)) {
  let r = eagerParseCliFlag("--session-id", t);
  return (eagerParseCliFlag("--sdk-url", t) === void 0 ? Vt(r) : r) || e;
}
//@ chunk-3hsy16d3.js:775-931 placement
function buildStartupFailureResult({
  sessionId: sessionId,
  message: message,
  reason: reason,
  resultIndex: resultIndex = 0,
}) {
  return {
    ...emitLoadError(sessionId, [message]),
    ...(reason !== void 0 && { startup_failure_reason: reason }),
    ...(resultIndex !== null && { result_index: resultIndex }),
  };
}
//@ chunk-3hsy16d3.js:931-1019 placement
async function writeStartupFailureResult(e) {
  if (c(e.reason))
    await writeStartupFrames([
      buildStartupFailureResult({ ...e, sessionId: startupResultSessionId(e.sessionId) }),
    ]);
}
/**
 * stream-json 启动失败时写出启动帧与失败结果（org_config_required_unavailable 等）。
 */
//@ chunk-3hsy16d3.js:1019-1342 placement
async function writeStartupFrames(e, { goesOn: t = !1 } = {}) {
  let stdout = process.stdout;
  if (!isStreamJsonLaunch() || stdout.writableEnded || stdout.destroyed) return !1;
  let joined = e
      .map(
        (o) =>
          JSON.stringify(o) +
          `
`,
      )
      .join(""),
    s = (o) => {},
    promise = new Promise((o) => {
      s = o;
    }),
    i = () => s(!1);
  stdout.once("error", i);
  try {
    stdout.write(joined, (o) => s(!o));
  } catch {
    return !1;
  }
  let a = (await withDeadline(promise, l)) ?? !1;
  if (t && a) stdout.off("error", i);
  return a;
}

export {
  writeStartupFailureResult,
  buildStartupFailureResult,
  isStartupFailureResultRequested,
  isStreamJsonLaunch,
  writeStartupFrames,
  startupResultSessionId,
};
