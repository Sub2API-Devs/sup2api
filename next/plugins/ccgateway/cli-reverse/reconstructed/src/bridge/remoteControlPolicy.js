/**
 * bridge/remoteControlPolicy.ts
 *
 * 2.1.316 新增：组织策略关闭 Remote Control、无法验证策略等情形的用户提示文本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3h512xck.js (1)
 * attribution: placement 1
 */
//@ chunk-3h512xck.js:191-474 placement
/**
 * 组织策略关闭 Remote Control、无法验证策略等情形的用户提示文本。
 */
var REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE =
  "Remote Control is disabled by your organization's policy (managed setting `disableRemoteControl`).";
var REMOTE_CONTROL_POLICY_UNVERIFIED_MESSAGE =
  "Couldn't verify your organization's Remote Control policy. Retry, or run `claude doctor` for details.";
var REMOTE_CONTROL_TURNED_OFF_MESSAGE = "Remote Control was turned off by your organization's policy.";
export {
  REMOTE_CONTROL_DISABLED_BY_POLICY_MESSAGE,
  REMOTE_CONTROL_TURNED_OFF_MESSAGE,
  REMOTE_CONTROL_POLICY_UNVERIFIED_MESSAGE,
};
