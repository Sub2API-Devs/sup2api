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
import { normalizeUuidOrNull } from "../utils/agentId.js";
import { emitLoadError } from "./print.js";
import { withDeadline } from "../utils/sleep.js";

//@ chunk-3hsy16d3.js:375-386 placement
var FLUSH_BEFORE_RESULT_TIMEOUT_MS = 1000;
//@ chunk-3hsy16d3.js:386-479 placement
function isStreamJsonLaunch(argv = process.argv.slice(2)) {
  return detectNonInteractiveLaunch(argv) && eagerParseCliFlag("--output-format", argv) === "stream-json";
}
//@ chunk-3hsy16d3.js:479-553 placement
function isStartupFailureResultRequested() {
  return isEnvTruthy(process.env.CLAUDE_CODE_STARTUP_FAILURE_RESULTS);
}
//@ chunk-3hsy16d3.js:553-625 placement
var ORG_CONFIG_FAILURE_REASONS = new Set(["org_config_required_unavailable", "org_config_refused"]);
//@ chunk-3hsy16d3.js:625-662 placement
function needsStartupFailureResult(reason) {
  return ORG_CONFIG_FAILURE_REASONS.has(reason) || isStartupFailureResultRequested();
}
//@ chunk-3hsy16d3.js:662-775 placement
function startupResultSessionId(sessionId, argv = process.argv.slice(2)) {
  let r = eagerParseCliFlag("--session-id", argv);
  return (eagerParseCliFlag("--sdk-url", argv) === undefined ? normalizeUuidOrNull(r) : r) || sessionId;
}
//@ chunk-3hsy16d3.js:775-931 placement
function buildStartupFailureResult({ sessionId, message, reason, resultIndex = 0 }) {
  return {
    ...emitLoadError(sessionId, [message]),
    ...(reason !== undefined && {
      startup_failure_reason: reason,
    }),
    ...(resultIndex !== null && {
      result_index: resultIndex,
    }),
  };
}
//@ chunk-3hsy16d3.js:931-1019 placement
async function writeStartupFailureResult(e) {
  if (needsStartupFailureResult(e.reason))
    await writeStartupFrames([
      buildStartupFailureResult({
        ...e,
        sessionId: startupResultSessionId(e.sessionId),
      }),
    ]);
}
//@ chunk-3hsy16d3.js:1019-1342 placement
/**
 * stream-json 启动失败时写出启动帧与失败结果（org_config_required_unavailable 等）。
 */
async function writeStartupFrames(e, { goesOn: t = false } = {}) {
  let stdout = process.stdout;
  if (!isStreamJsonLaunch() || stdout.writableEnded || stdout.destroyed) return false;
  let joined = e
    .map(
      (o) =>
        JSON.stringify(o) +
        `
`,
    )
    .join("");
  let s = (o) => {};
  let promise = new Promise((resolve) => {
    s = resolve;
  });
  let i = () => s(false);
  stdout.once("error", i);
  try {
    stdout.write(joined, (o) => s(!o));
  } catch {
    return false;
  }
  let a = (await withDeadline(promise, FLUSH_BEFORE_RESULT_TIMEOUT_MS)) ?? false;
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
