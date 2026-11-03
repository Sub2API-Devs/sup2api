/**
 * tools/BashTool/sandboxViolations.ts
 *
 * 2.1.316 新增：沙箱违规记录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (13)
 * attribution: placement 13
 */
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { getSessionId } from "../../bootstrap/state.js";

//@ chunk-e6aww6q8.js:3097475-3097627 placement
var MAX_VIOLATION_HOST_LENGTH = 256;
var HOST_TOKEN_RE = /^(?:[\w.-]+|\[[0-9a-f:.]+\]|[0-9a-f:.]+)$/i;
var MAX_VIOLATIONS = 20;
var DENY_NETWORK_OUTBOUND_RE = /^deny network-outbound (\S+):(\d+)(?:\s|$)/;
var DENY_HTTP_REQUEST_RE = /^deny http-request \S+ (\S+)/;
//@ chunk-e6aww6q8.js:3097627-3097712 placement
/**
 * 取出某命令的沙箱违规列表并解析。
 */
function getParsedSandboxViolations(toolUseId) {
  return parseViolations(SandboxManager.getSandboxViolationStore().getViolationsForCommand(toolUseId));
}
//@ chunk-e6aww6q8.js:3097712-3097903 placement
function parseViolations(violationsForCommand) {
  let n = [];
  let r = new Set();
  for (let { line } of violationsForCommand) {
    let violationLine = parseViolationLine(line);
    let y = violationLine.kind === "network" ? `n ${violationLine.host} ${violationLine.port}` : "o";
    if (r.has(y)) continue;
    r.add(y);
    n.push(violationLine);
    if (n.length === MAX_VIOLATIONS) break;
  }
  return n;
}
//@ chunk-e6aww6q8.js:3097903-3098115 placement
function parseViolationLine(line) {
  let match = DENY_NETWORK_OUTBOUND_RE.exec(line);
  if (match) return networkViolation(match[1], Number(match[2]));
  let match_2 = DENY_HTTP_REQUEST_RE.exec(line);
  let s = match_2 ? URL.parse(match_2[1]) : null;
  if (s && s.hostname !== "") return networkViolation(s.hostname, s.port === "" ? undefined : Number(s.port));
  return {
    kind: "other",
  };
}
//@ chunk-e6aww6q8.js:3098115-3098294 placement
function networkViolation(hostname, n) {
  if (!HOST_TOKEN_RE.test(hostname))
    return {
      kind: "other",
    };
  return {
    kind: "network",
    host: truncateToLength(hostname.replace(/^\[(.*)\]$/, "$1"), MAX_VIOLATION_HOST_LENGTH),
    ...(n !== undefined &&
      Number.isSafeInteger(n) &&
      n <= 65535 && {
        port: n,
      }),
  };
}
//@ chunk-e6aww6q8.js:3098294-3098409 placement
class SandboxViolationState {
  attempts = new Set();
  emittedToolUseIds = new Set();
  clear() {
    this.attempts.clear();
    this.emittedToolUseIds.clear();
  }
}
//@ chunk-e6aww6q8.js:3098409-3098422 placement
/**
 * 违规去重键集合的上限（5000），超出先逐出最旧的。
 */
var MAX_REPORTED_VIOLATIONS = 5000;
//@ chunk-e6aww6q8.js:3098422-3098521 placement
/**
 * 在集合达到上限时循环删除最旧元素（Map 迭代顺序）。
 */
function evictOldestUntil(e, n) {
  while (e.size >= n) {
    let r = e.values().next().value;
    if (r === undefined) return;
    e.delete(r);
  }
}
//@ chunk-e6aww6q8.js:3098521-3098582 placement
/**
 * 用会话 id、命令与输出计算违规报告的去重哈希。
 */
function violationReportKey(e, n) {
  return computeContentHash(`${getSessionId()}\x00${e}\x00${n.trim()}`);
}
//@ chunk-e6aww6q8.js:3098582-3098606 placement
/**
 * 沙箱违规上报是否启用（当前恒为 false）。
 */
function isViolationReportingEnabled() {
  return false;
}
//@ chunk-e6aww6q8.js:3098606-3098649 placement
/**
 * 取出工具状态里已上报过的违规键集合。
 */
function claimedViolationKeys(e) {
  return e.get(SandboxViolationState).attempts;
}
//@ chunk-e6aww6q8.js:3098649-3098819 placement
/**
 * 认领一次沙箱违规报告（同一命令只报一次），返回释放函数；未启用时返回 null。
 */
function claimViolationReport(e, command, toolState, s) {
  if (!isViolationReportingEnabled() || !s.useSandbox) return null;
  let h = claimedViolationKeys(toolState);
  let y = violationReportKey(e, command);
  if (h.has(y)) return null;
  evictOldestUntil(h, MAX_REPORTED_VIOLATIONS);
  h.add(y);
  let S = true;
  return () => {
    if (S) {
      S = false;
      h.delete(y);
    }
  };
}
//@ chunk-e6aww6q8.js:3098819-3098878 placement
/**
 * 占位的工具使用钩子，不做任何事。
 */
function noopToolUseHook(e) {
  let { toolName, input, context } = e;
  return;
}
export { noopToolUseHook, getParsedSandboxViolations, claimViolationReport };
