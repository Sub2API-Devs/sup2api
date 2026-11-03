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
var MAX_VIOLATION_HOST_LENGTH = 256,
  HOST_TOKEN_RE = /^(?:[\w.-]+|\[[0-9a-f:.]+\]|[0-9a-f:.]+)$/i,
  MAX_VIOLATIONS = 20,
  DENY_NETWORK_OUTBOUND_RE = /^deny network-outbound (\S+):(\d+)(?:\s|$)/,
  DENY_HTTP_REQUEST_RE = /^deny http-request \S+ (\S+)/;
//@ chunk-e6aww6q8.js:3097627-3097712 placement
function OWr(e) {
  return parseViolations(SandboxManager.getSandboxViolationStore().getViolationsForCommand(e));
}
//@ chunk-e6aww6q8.js:3097712-3097903 placement
function parseViolations(e) {
  let n = [],
    r = new Set();
  for (let { line: line } of e) {
    let h = parseViolationLine(line),
      y = h.kind === "network" ? `n ${h.host} ${h.port}` : "o";
    if (r.has(y)) continue;
    if ((r.add(y), n.push(h), n.length === MAX_VIOLATIONS)) break;
  }
  return n;
}
//@ chunk-e6aww6q8.js:3097903-3098115 placement
function parseViolationLine(e) {
  let match = DENY_NETWORK_OUTBOUND_RE.exec(e);
  if (match) return networkViolation(match[1], Number(match[2]));
  let match_2 = DENY_HTTP_REQUEST_RE.exec(e),
    s = match_2 ? URL.parse(match_2[1]) : null;
  if (s && s.hostname !== "") return networkViolation(s.hostname, s.port === "" ? void 0 : Number(s.port));
  return { kind: "other" };
}
//@ chunk-e6aww6q8.js:3098115-3098294 placement
function networkViolation(e, n) {
  if (!HOST_TOKEN_RE.test(e)) return { kind: "other" };
  return {
    kind: "network",
    host: truncateToLength(e.replace(/^\[(.*)\]$/, "$1"), MAX_VIOLATION_HOST_LENGTH),
    ...(n !== void 0 && Number.isSafeInteger(n) && n <= 65535 && { port: n }),
  };
}
//@ chunk-e6aww6q8.js:3098294-3098409 placement
class SandboxViolationState {
  attempts = new Set();
  emittedToolUseIds = new Set();
  clear() {
    (this.attempts.clear(), this.emittedToolUseIds.clear());
  }
}
//@ chunk-e6aww6q8.js:3098409-3098422 placement
var rRr = 5000;
//@ chunk-e6aww6q8.js:3098422-3098521 placement
function sRr(e, n) {
  while (e.size >= n) {
    let r = e.values().next().value;
    if (r === void 0) return;
    e.delete(r);
  }
}
//@ chunk-e6aww6q8.js:3098521-3098582 placement
function iRr(e, n) {
  return computeContentHash(`${getSessionId()}\x00${e}\x00${n.trim()}`);
}
//@ chunk-e6aww6q8.js:3098582-3098606 placement
function aRr() {
  return !1;
}
//@ chunk-e6aww6q8.js:3098606-3098649 placement
function lRr(e) {
  return e.get(SandboxViolationState).attempts;
}
/**
 * 认领一次沙箱违规报告（同一命令只报一次），返回释放函数；未启用时返回 null。
 */
//@ chunk-e6aww6q8.js:3098649-3098819 placement
function claimViolationReport(e, n, r, s) {
  if (!aRr() || !s.useSandbox) return null;
  let h = lRr(r),
    y = iRr(e, n);
  if (h.has(y)) return null;
  (sRr(h, rRr), h.add(y));
  let S = !0;
  return () => {
    if (S) ((S = !1), h.delete(y));
  };
}
//@ chunk-e6aww6q8.js:3098819-3098878 placement
function DWr(e) {
  let { toolName: toolName, input: input, context: context } = e;
  return;
}

export { DWr, OWr, claimViolationReport };
