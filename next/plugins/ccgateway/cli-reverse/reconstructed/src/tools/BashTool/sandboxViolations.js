/**
 * tools/BashTool/sandboxViolations.ts
 *
 * 2.1.316 新增：沙箱违规记录
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (13)
 * attribution: placement 13
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { getSessionId } from "../../bootstrap/state.js";

//@ chunk-5xgkngpb.js:3183864-3184016 placement
var MAX_VIOLATION_HOST_LENGTH = 256;
var HOST_TOKEN_RE = /^(?:[\w.-]+|\[[0-9a-f:.]+\]|[0-9a-f:.]+)$/i;
var MAX_VIOLATIONS = 20;
var DENY_NETWORK_OUTBOUND_RE = /^deny network-outbound (\S+):(\d+)(?:\s|$)/;
var DENY_HTTP_REQUEST_RE = /^deny http-request \S+ (\S+)/;
//@ chunk-5xgkngpb.js:3184016-3184101 placement
/**
 * 取出某命令的沙箱违规列表并解析。
 */
function getParsedSandboxViolations(toolUseId) {
  return parseViolations(SandboxManager.getSandboxViolationStore().getViolationsForCommand(toolUseId));
}
//@ chunk-5xgkngpb.js:3184101-3184292 placement
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
//@ chunk-5xgkngpb.js:3184292-3184504 placement
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
//@ chunk-5xgkngpb.js:3184504-3184682 placement
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
//@ chunk-5xgkngpb.js:3184682-3184797 placement
class SandboxViolationState {
  attempts = new Set();
  emittedToolUseIds = new Set();
  clear() {
    this.attempts.clear();
    this.emittedToolUseIds.clear();
  }
}
//@ chunk-5xgkngpb.js:3184797-3184810 placement
/**
 * 违规去重键集合的上限（5000），超出先逐出最旧的。
 */
var MAX_REPORTED_VIOLATIONS = 5000;
//@ chunk-5xgkngpb.js:3184810-3184909 placement
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
//@ chunk-5xgkngpb.js:3184909-3184970 placement
/**
 * 用会话 id、命令与输出计算违规报告的去重哈希。
 */
function violationReportKey(toolName, command) {
  return computeContentHash(`${getSessionId()}\x00${toolName}\x00${command.trim()}`);
}
//@ chunk-5xgkngpb.js:3184970-3184994 placement
/**
 * 沙箱违规上报是否启用（当前恒为 false）。
 */
function isViolationReportingEnabled() {
  return false;
}
//@ chunk-5xgkngpb.js:3184994-3185037 placement
/**
 * 取出工具状态里已上报过的违规键集合。
 */
function claimedViolationKeys(toolState) {
  return toolState.get(SandboxViolationState).attempts;
}
//@ chunk-5xgkngpb.js:3185037-3185207 placement
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
//@ chunk-5xgkngpb.js:3185207-3185266 placement
/**
 * 占位的工具使用钩子，不做任何事。
 */
function noopToolUseHook(hookInput) {
  let { toolName, input, context } = hookInput;
  return;
}
export { getParsedSandboxViolations, claimViolationReport, noopToolUseHook };
