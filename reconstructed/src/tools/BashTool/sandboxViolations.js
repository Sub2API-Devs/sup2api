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
  let violations = [];
  let seen = new Set();
  for (let { line } of violationsForCommand) {
    let violationLine = parseViolationLine(line);
    let dedupeKey = violationLine.kind === "network" ? `n ${violationLine.host} ${violationLine.port}` : "o";
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    violations.push(violationLine);
    if (violations.length === MAX_VIOLATIONS) break;
  }
  return violations;
}
//@ chunk-e6aww6q8.js:3097903-3098115 placement
function parseViolationLine(line) {
  let match = DENY_NETWORK_OUTBOUND_RE.exec(line);
  if (match) return networkViolation(match[1], Number(match[2]));
  let match_2 = DENY_HTTP_REQUEST_RE.exec(line);
  let parsedUrl = match_2 ? URL.parse(match_2[1]) : null;
  if (parsedUrl && parsedUrl.hostname !== "")
    return networkViolation(parsedUrl.hostname, parsedUrl.port === "" ? undefined : Number(parsedUrl.port));
  return {
    kind: "other",
  };
}
//@ chunk-e6aww6q8.js:3098115-3098294 placement
function networkViolation(hostname, port) {
  if (!HOST_TOKEN_RE.test(hostname))
    return {
      kind: "other",
    };
  return {
    kind: "network",
    host: truncateToLength(hostname.replace(/^\[(.*)\]$/, "$1"), MAX_VIOLATION_HOST_LENGTH),
    ...(port !== undefined &&
      Number.isSafeInteger(port) &&
      port <= 65535 && {
        port,
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
function evictOldestUntil(set, maxSize) {
  while (set.size >= maxSize) {
    let oldest = set.values().next().value;
    if (oldest === undefined) return;
    set.delete(oldest);
  }
}
//@ chunk-e6aww6q8.js:3098521-3098582 placement
/**
 * 用会话 id、命令与输出计算违规报告的去重哈希。
 */
function violationReportKey(toolName, command) {
  return computeContentHash(`${getSessionId()}\x00${toolName}\x00${command.trim()}`);
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
function claimedViolationKeys(toolState) {
  return toolState.get(SandboxViolationState).attempts;
}
//@ chunk-e6aww6q8.js:3098649-3098819 placement
/**
 * 认领一次沙箱违规报告（同一命令只报一次），返回释放函数；未启用时返回 null。
 */
function claimViolationReport(toolName, command, toolState, options) {
  if (!isViolationReportingEnabled() || !options.useSandbox) return null;
  let claimed = claimedViolationKeys(toolState);
  let key = violationReportKey(toolName, command);
  if (claimed.has(key)) return null;
  evictOldestUntil(claimed, MAX_REPORTED_VIOLATIONS);
  claimed.add(key);
  let isActive = true;
  return () => {
    if (isActive) {
      isActive = false;
      claimed.delete(key);
    }
  };
}
//@ chunk-e6aww6q8.js:3098819-3098878 placement
/**
 * 占位的工具使用钩子，不做任何事。
 */
function noopToolUseHook(hookInput) {
  let { toolName, input, context } = hookInput;
  return;
}
export { noopToolUseHook, getParsedSandboxViolations, claimViolationReport };
