/**
 * remote/controlRequestErrors.ts
 *
 * 2.1.316 新增：控制请求错误分类与超时错误。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-6vnxsn99.js (5)
 * attribution: placement 5
 */
import { AbortError } from "../utils/errors.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";

//@ chunk-6vnxsn99.js:21583-21749 placement
class ControlRequestTimeoutError extends Error {
  subtype;
  constructor(e, n) {
    super(`control_request '${e}' got no response after ${n / 1000}s \u2014 the worker may still apply it`);
    this.subtype = e;
  }
}
//@ chunk-6vnxsn99.js:21749-21868 placement
class ControlRequestNotDeliveredError extends Error {
  subtype;
  constructor(subtype) {
    super("Request was not delivered to the cloud session");
    this.subtype = subtype;
  }
}
//@ chunk-6vnxsn99.js:21868-22265 placement
function classifyControlRequestError(error) {
  if (error instanceof AbortError) return "aborted";
  if (error instanceof ControlRequestTimeoutError) return "timeout";
  if (error instanceof ControlRequestNotDeliveredError) return "not_delivered";
  if (
    error instanceof Error &&
    (error.message.endsWith("Disconnected") || error.message.endsWith("Connection to remote lost"))
  )
    return "disconnected";
  if (
    error instanceof Error &&
    (error.message.endsWith("not connected") || error.message.includes("Cannot send:"))
  )
    return "not_connected";
  return "server_error";
}
//@ chunk-6vnxsn99.js:22265-22391 placement = abortSpeculation (0.378)
/**
 * 执行异步函数并记成功/中止/失败遥测。旧版名 abortSpeculation 为错配。
 */
async function withOutcomeTelemetry(e, n) {
  try {
    let r = await n();
    logFeatureOk(e);
    return r;
  } catch (error) {
    if (error instanceof AbortError) logFeatureSad(e, "aborted");
    else logFeatureBad(e, classifyControlRequestError(error));
    throw error;
  }
}
//@ chunk-6vnxsn99.js:22391-22659 placement
function controlResponseError(response) {
  if (response.subtype === "error" && typeof response.error === "string") return Error(response.error);
  let n =
    response.subtype === "error"
      ? "non-string error"
      : `subtype ${typeof response.subtype === "string" ? "unrecognized" : typeof response.subtype}`;
  return Error(`Malformed control_response from worker (${n})`);
}
export {
  controlResponseError,
  withOutcomeTelemetry,
  ControlRequestNotDeliveredError,
  ControlRequestTimeoutError,
  classifyControlRequestError,
};
