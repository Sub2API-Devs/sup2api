/**
 * cli/eagerFlags.ts
 *
 * 2.1.316 新增：需要在 commander 之前提前解析的带值 CLI 标志集合（--settings、--prefill、深链接等）；后台会话子命令、非交互标志与调试标志集合，供启动早期判断运行模式等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3hvemz80.js (4)
 * attribution: placement 4
 */

//@ chunk-3hvemz80.js:191-471 placement
/**
 * 判断本次启动是否进入远程/附着会话：非交互时看 headlessCloud；--continue 为否；否则有 remote、助手聊天会话或发现、connect URL 或 SSH 主机即为真。
 */
function isRemoteSessionLaunch({
  remote,
  isNonInteractiveSession,
  headlessCloud,
  headlessCloudPrint = false,
  isContinue,
  pendingAssistantChat,
  pendingConnectUrl,
  pendingSSHHost,
}) {
  if (isNonInteractiveSession) return headlessCloud || headlessCloudPrint;
  if (isContinue) return false;
  return (
    remote !== null ||
    Boolean(pendingAssistantChat?.sessionId) ||
    Boolean(pendingAssistantChat?.discover) ||
    Boolean(pendingConnectUrl) ||
    Boolean(pendingSSHHost)
  );
}
//@ chunk-3hvemz80.js:471-505 placement
/**
 * e 为真返回 null，否则返回 n；语义不确定的占位辅助。
 */
function nullIfTruthy(isSet, initialMessage) {
  return isSet ? null : initialMessage;
}
//@ chunk-3hvemz80.js:505-545 placement
var SESSION_ID_PATTERN = /^(?:session|cse)_[A-Za-z0-9_]+$/;
//@ chunk-3hvemz80.js:545-682 placement
/**
 * 从参数（可能是 URL/路径）里抽出合法的仓库名片段。
 */
function extractRepoSlug(value) {
  if (SESSION_ID_PATTERN.test(value)) return value;
  if (value.includes("/") && !/\s/.test(value)) {
    for (let part of value.split(/[/?#]/)) if (SESSION_ID_PATTERN.test(part)) return part;
  }
  return null;
}
export { extractRepoSlug, nullIfTruthy, isRemoteSessionLaunch };
