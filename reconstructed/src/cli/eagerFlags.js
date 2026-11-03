/**
 * cli/eagerFlags.ts
 *
 * 2.1.316 新增：需要在 commander 之前提前解析的带值 CLI 标志集合（--settings、--prefill、深链接等）；后台会话子命令、非交互标志与调试标志集合，供启动早期判断运行模式等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c5gdqf78.js (4)
 * attribution: placement 4
 */

/**
 * 判断本次启动是否进入远程/附着会话：非交互时看 headlessCloud；--continue 为否；否则有 remote、助手聊天会话或发现、connect URL 或 SSH 主机即为真。
 */
//@ chunk-c5gdqf78.js:191-471 placement
function isRemoteSessionLaunch({
  remote: remote,
  isNonInteractiveSession: isNonInteractiveSession,
  headlessCloud: headlessCloud,
  headlessCloudPrint: headlessCloudPrint = !1,
  isContinue: isContinue,
  pendingAssistantChat: pendingAssistantChat,
  pendingConnectUrl: pendingConnectUrl,
  pendingSSHHost: pendingSSHHost,
}) {
  if (isNonInteractiveSession) return headlessCloud || headlessCloudPrint;
  if (isContinue) return !1;
  return (
    remote !== null ||
    Boolean(pendingAssistantChat?.sessionId) ||
    Boolean(pendingAssistantChat?.discover) ||
    Boolean(pendingConnectUrl) ||
    Boolean(pendingSSHHost)
  );
}
//@ chunk-c5gdqf78.js:471-505 placement
function IMi(e, n) {
  return e ? null : n;
}
//@ chunk-c5gdqf78.js:505-545 placement
var l = /^(?:session|cse)_[A-Za-z0-9_]+$/;
/**
 * 从参数（可能是 URL/路径）里抽出合法的仓库名片段。
 */
//@ chunk-c5gdqf78.js:545-682 placement
function extractRepoSlug(e) {
  if (l.test(e)) return e;
  if (e.includes("/") && !/\s/.test(e)) {
    for (let n of e.split(/[/?#]/)) if (l.test(n)) return n;
  }
  return null;
}

export { extractRepoSlug, IMi, isRemoteSessionLaunch };
