/**
 * services/selfHostedRunner/idleRelease.ts
 *
 * self-hosted runner 空闲释放策略：解析 CCR_SHR_IDLE_RELEASE_DEFAULT_MINUTES 的分钟上/下限，并在 session 结果里回传最新空闲上限（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-asf5gh8x.js (5)
 * attribution: placement 5
 */
import { hasEnvVar } from "./launcherHooks.js";
import { isReviewOriginSession } from "./handleSession.js";

//@ chunk-asf5gh8x.js:66336-66398 placement
var CCR_SHR_IDLE_RELEASE_DEFAULT_MINUTES = "CCR_SHR_IDLE_RELEASE_DEFAULT_MINUTES";
var MIN_IDLE_RELEASE_MINUTES = 0.1;
var MAX_IDLE_RELEASE_MINUTES = 10080;
//@ chunk-asf5gh8x.js:66398-66460 placement
function getRunnerIdleMs() {
  return hasEnvVar("SELF_HOSTED_RUNNER_SESSION_IDLE_MS");
}
//@ chunk-asf5gh8x.js:66460-66869 placement
/**
 * 说明空闲释放策略当前是“一律不提前释放”还是“仅限特定安全会话”。
 */
function describeIdleRelease() {
  return getRunnerIdleMs()
    ? "none is released early (--release-idle-session-min is 0 or unusable)"
    : "only a session with an idle limit from Anthropic's control plane, whose checkouts hold no uncommitted changes and are still at the commit that the runner checked out and whose own folder under --base-dir/_sessions holds only what the runner put there, is released early (--release-idle-session-min is not set)";
}
//@ chunk-asf5gh8x.js:66869-67108 placement
function idleReleaseMsFromSession(session) {
  let environmentVariables = session.environment_variables ?? {};
  if (
    !Object.hasOwn(environmentVariables, CCR_SHR_IDLE_RELEASE_DEFAULT_MINUTES) ||
    isReviewOriginSession(session)
  )
    return 0;
  let raw = environmentVariables[CCR_SHR_IDLE_RELEASE_DEFAULT_MINUTES];
  if (typeof raw !== "string" || !/^\d+(\.\d+)?$/.test(raw)) return;
  let callCount = Number(raw);
  if (callCount === 0) return 0;
  if (callCount < MIN_IDLE_RELEASE_MINUTES || callCount > MAX_IDLE_RELEASE_MINUTES) return;
  return Math.round(callCount * 60000);
}
//@ chunk-asf5gh8x.js:67108-67214 placement
function withLatestIdleRelease(fn, onChange) {
  let callId = 0;
  let latestCallId = 0;
  return async (...args) => {
    let mine = ++callId;
    let result = await fn(...args);
    if (mine > latestCallId) {
      latestCallId = mine;
      onChange(idleReleaseMsFromSession(result));
    }
    return result;
  };
}
export { withLatestIdleRelease, getRunnerIdleMs, CCR_SHR_IDLE_RELEASE_DEFAULT_MINUTES, describeIdleRelease };
