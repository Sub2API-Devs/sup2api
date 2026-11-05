/**
 * cli/startupFailureResult.ts
 *
 * 2.1.316 新增。stream-json 启动失败时写出启动帧与失败结果（org_config_required_unavailable 等）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-04tkxamq.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { detectNonInteractiveLaunch, eagerParseCliFlag } from "../utils/cliArgs.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { normalizeUuidOrNull } from "../utils/agentId.js";
import { emitLoadError } from "./print.js";
import { withDeadline } from "../utils/sleep.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-04tkxamq.js:375-386 placement
var FLUSH_BEFORE_RESULT_TIMEOUT_MS = 1000;
//@ chunk-04tkxamq.js:386-479 placement
function isStreamJsonLaunch(argv = process.argv.slice(2)) {
  return detectNonInteractiveLaunch(argv) && eagerParseCliFlag("--output-format", argv) === "stream-json";
}
//@ chunk-04tkxamq.js:479-553 placement
function isStartupFailureResultRequested() {
  return isEnvTruthy(process.env.CLAUDE_CODE_STARTUP_FAILURE_RESULTS);
}
//@ chunk-04tkxamq.js:553-647 placement
var ORG_CONFIG_FAILURE_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-04tkxamq.js:553", () => {
  ORG_CONFIG_FAILURE_REASONS = new Set([
    "org_config_required_unavailable",
    "org_config_refused",
    "config_file_invalid",
  ]);
});
//@ chunk-04tkxamq.js:647-684 placement
function needsStartupFailureResult(reason) {
  return ORG_CONFIG_FAILURE_REASONS.has(reason) || isStartupFailureResultRequested();
}
//@ chunk-04tkxamq.js:684-797 placement
function startupResultSessionId(sessionId, argv = process.argv.slice(2)) {
  let flag = eagerParseCliFlag("--session-id", argv);
  return (eagerParseCliFlag("--sdk-url", argv) === undefined ? normalizeUuidOrNull(flag) : flag) || sessionId;
}
//@ chunk-04tkxamq.js:797-953 placement
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
//@ chunk-04tkxamq.js:953-1041 placement
async function writeStartupFailureResult(failure) {
  if (needsStartupFailureResult(failure.reason))
    await writeStartupFrames([
      buildStartupFailureResult({
        ...failure,
        sessionId: startupResultSessionId(failure.sessionId),
      }),
    ]);
}
//@ chunk-04tkxamq.js:1041-1364 placement
/**
 * stream-json 启动失败时写出启动帧与失败结果（org_config_required_unavailable 等）。
 */
async function writeStartupFrames(frames, { goesOn = false } = {}) {
  let stdout = process.stdout;
  if (!isStreamJsonLaunch() || stdout.writableEnded || stdout.destroyed) return false;
  let joined = frames
    .map(
      (frame) =>
        JSON.stringify(frame) +
        `
`,
    )
    .join("");
  let resolve = (err) => {};
  let promise = new Promise((resolve_2) => {
    resolve = resolve_2;
  });
  let onError = () => resolve(false);
  stdout.once("error", onError);
  try {
    stdout.write(joined, (err) => resolve(!err));
  } catch {
    return false;
  }
  let ok = (await withDeadline(promise, FLUSH_BEFORE_RESULT_TIMEOUT_MS)) ?? false;
  if (goesOn && ok) stdout.off("error", onError);
  return ok;
}
export {
  buildStartupFailureResult,
  isStartupFailureResultRequested,
  writeStartupFailureResult,
  startupResultSessionId,
  writeStartupFrames,
  isStreamJsonLaunch,
};
