/**
 * utils/agentListing.ts
 *
 * 2.1.316 新增：代理列表
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import {
  isSillyShoreGateOn,
  tagUntrustedArtifactContent,
  m3,
  Fkn,
} from "./messages/untrustedArtifactContent.js";
import { jb } from "../bootstrap/sessionSlices.js";
import { uniq } from "./collections.js";
import { xre, UNREADABLE_TOOLS_USED_BEFORE_SUMMARY } from "../bootstrap/stateSlices.js";
import { isMainAgent, isSubagentContext } from "./agentContext.js";
import { getConversationToolsUsed } from "../bootstrap/state.js";

/**
 * 列出摘要前使用过但不可读的工具名（去掉可信的），开关关闭时为空。
 */
//@ chunk-e6aww6q8.js:168410-168581 placement
function listUnreadableToolsUsed(e, n) {
  if (!isSillyShoreGateOn() || e.length === 0) return [];
  let r = new Set(tagUntrustedArtifactContent(n.filter((s) => !jb(s))));
  return uniq(e.filter((s) => s !== "").map(xre))
    .filter((s) => s === UNREADABLE_TOOLS_USED_BEFORE_SUMMARY || !r.has(s))
    .sort();
}
//@ chunk-e6aww6q8.js:168581-168673 placement
function klo(e, n) {
  if (e === void 0) return n === void 0;
  return isMainAgent(e) || (isSubagentContext(e) && e.isMainSession === !0);
}
/**
 * 生成用于摘要的已用工具列表（必要时并入整个对话中用过的工具）。
 */
//@ chunk-e6aww6q8.js:168673-168813 placement
function getToolsUsedForSummary(e, n, r) {
  if (!isSillyShoreGateOn()) return tagUntrustedArtifactContent(e);
  let s = getConversationToolsUsed(),
    h = tagUntrustedArtifactContent(e, void 0, (y) => s.has(y));
  if (!klo(n, r)) return h;
  return uniq([...s.names(), ...h]).sort();
}
//@ chunk-e6aww6q8.js:168813-168884 placement
function fq(e) {
  if (!isSillyShoreGateOn()) return [];
  let n = getConversationToolsUsed();
  return tagUntrustedArtifactContent(e, (r) => n.has(r));
}
//@ chunk-e6aww6q8.js:168884-168946 placement
function Bbt(e, n) {
  let r = listUnreadableToolsUsed(e, n);
  return r.length === 0 ? void 0 : r;
}
//@ chunk-e6aww6q8.js:168946-169019 placement
function TZ(e, n) {
  let r = Bbt(e, n);
  return r === void 0 ? void 0 : m3(r).trimEnd();
}
//@ chunk-e6aww6q8.js:169019-169085 placement
function a3n(e) {
  return { content: Fkn(e), isMeta: !0, turnCompanion: !0 };
}
//@ chunk-e6aww6q8.js:169085-169135 placement
function Z1t(e, n) {
  return n === void 0
    ? e
    : `${e}
${n}`;
}
/**
 * 把偏移数组最后一项加上追加文本的长度。
 */
//@ chunk-e6aww6q8.js:169135-169253 placement
function adjustLastOffset(e, n) {
  if (n === void 0 || e === void 0 || e.length === 0) return e;
  return e.map((r, s) => (s === e.length - 1 ? r + n.length + 1 : r));
}

export { fq, TZ, Bbt, a3n, Z1t, adjustLastOffset, getToolsUsedForSummary, listUnreadableToolsUsed };
