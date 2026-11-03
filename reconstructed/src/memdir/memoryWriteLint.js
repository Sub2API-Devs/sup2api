/**
 * memdir/memoryWriteLint.ts
 *
 * 2.1.316 新增：写入记忆文件时的格式与内容检查
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: placement 18
 */
import { normalize } from "path";
import { getCliOwnedState } from "../services/mcp/cliOwnedClients.js";
import { isDisallowedMemoryChar, nfcLower as nfcLower_2, isDisallowedChar } from "./memdir.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";
import { getAutoMemPathOrNull } from "./paths.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { neutralizeInboundTags, inboundTagOpenerOffsets } from "../utils/sessionPeers.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { getFirstLine, truncateToLength } from "../utils/stringUtils.js";
import { HostScoped } from "../utils/hostScoped.js";

//@ chunk-e6aww6q8.js:1362512-1362563 placement
/**
 * 记忆写入检查的入口；当前实现在取 vscodeClient 后直接返回（未启用检查）。
 */
function lintMemoryWrite(e, n, r) {
  let vscodeClient = getCliOwnedState().vscodeClient;
  return;
}
//@ chunk-e6aww6q8.js:1362598-1362651 placement
/**
 * 记忆写入检查开关名
 */
var TENGU_MEMDIR_WRITE_LINT = "tengu_memdir_write_lint";
var MARKDOWN_EXT_RE = /\.md[. ]*$/iu;
//@ chunk-e6aww6q8.js:1362651-1362720 placement
/**
 * 收集不可见/控制字符
 */
function collectHiddenChars(e) {
  let n = [];
  for (let r of e) if (isDisallowedMemoryChar(r)) n.push(r);
  return n;
}
//@ chunk-e6aww6q8.js:1362720-1362795 placement
/**
 * 判断这次记忆写入来自交互会话还是后台会话。
 */
function memoryWriteSource(e) {
  return e.agentId === undefined && !getIsNonInteractiveSession() ? "interactive" : "background";
}
//@ chunk-e6aww6q8.js:1362795-1362914 placement
function getAutoMemRelativePath(e) {
  let autoMemPathOrNull = getAutoMemPathOrNull();
  if (autoMemPathOrNull === null) return null;
  let r = normalizeMemoryPath(e);
  let s = normalizeMemoryPath(autoMemPathOrNull);
  return r.startsWith(s) ? r.slice(s.length) : null;
}
//@ chunk-e6aww6q8.js:1362914-1363028 placement
function normalizeMemoryPath(e) {
  return nfcLower_2(
    normalize(e)
      .split(/[/\\]/u)
      .map((n) => (n === "." || n === ".." ? n : n.replace(/[. ]+$/u, "")))
      .join("/"),
  );
}
//@ chunk-e6aww6q8.js:1363028-1363136 placement
function shouldLintMemoryWrite(e) {
  let n = basenameOfPath(e);
  return (
    (MARKDOWN_EXT_RE.test(n) || MARKDOWN_EXT_RE.test(n.replace(/:.*$/u, ""))) &&
    getAutoMemRelativePath(e) !== null &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MEMDIR_WRITE_LINT, false)
  );
}
//@ chunk-e6aww6q8.js:1363136-1363198 placement
/**
 * 判断记忆文本里是否有不可见字符以及是否含 HTML 标签。
 */
function classifyMemoryText(e) {
  return {
    hidden: collectHiddenChars(e).length > 0,
    tags: neutralizeInboundTags(e) !== e,
  };
}
//@ chunk-e6aww6q8.js:1363198-1363320 placement
function logMemoryWriteLint(e, n, r) {
  logEvent("tengu_memdir_write_lint", {
    caller: fromEnum(e),
    action: fromEnum(n),
    hidden_characters: r.hidden,
    harness_tags: r.tags,
  });
}
//@ chunk-e6aww6q8.js:1363320-1364118 placement
/**
 * 拒绝路径含不可见或控制字符的记忆文件。
 */
function lintMemoryFilePath(absolutePath, n, r) {
  if (!shouldLintMemoryWrite(absolutePath)) return null;
  let filtered = [...(getAutoMemRelativePath(absolutePath) ?? normalize(absolutePath))].filter(
    isDisallowedChar,
  );
  if (filtered.length > 0) {
    logMemoryWriteLint(r, "refused", {
      hidden: true,
      tags: false,
    });
    return `This memory file's path contains invisible or control characters (${describeHiddenCharacters(filtered)}). Name it without them and write the file again; nothing was written.`;
  }
  if (r !== "interactive") return null;
  let h = classifyMemoryText(n);
  if (!h.hidden && !h.tags) return null;
  logMemoryWriteLint(r, "refused", h);
  let y = [];
  if (h.hidden)
    y.push(`invisible or control characters (${describeHiddenCharacters(collectHiddenChars(n))})`);
  if (h.tags) {
    let mapped = inboundTagOpenerOffsets(n)
      .slice(0, 3)
      .map((L) => jsonStringify(getFirstLine(truncateToLength(n.slice(L), 24))));
    let w = mapped.length > 0 ? mapped.join(", ") : "for example <system-reminder>";
    y.push(`text shaped like a harness tag (${w}), which a memory file must not carry`);
  }
  return `This memory file's text contains ${y.join(" and ")}. Remove that and write the file again; nothing was written.`;
}
//@ chunk-e6aww6q8.js:1364118-1364253 placement
/**
 * 后台写入自动记忆目录的文本时（开关打开且路径匹配），检测隐藏字符与 harness 标签，有则打点并剥离后返回，否则原样返回。
 */
function lintBackgroundMemoryWrite(absolutePath, n, r) {
  if (r !== "background" || !shouldLintMemoryWrite(absolutePath)) return n;
  let s = classifyMemoryText(n);
  if (!s.hidden && !s.tags) return n;
  logMemoryWriteLint(r, "stripped", s);
  return stripHiddenChars(n);
}
//@ chunk-e6aww6q8.js:1364253-1364294 placement
/**
 * 若启用写入检查，去掉不可见字符并归一化，否则原样返回。
 */
function lintMemoryTextIfEnabled(e, n) {
  return shouldLintMemoryWrite(e) ? stripHiddenChars(n) : n;
}
//@ chunk-e6aww6q8.js:1364414-1364449 placement
/**
 * 按宿主记录已检查过的记忆写入 id（最多 256 个，超出淘汰最早）。
 */
var lintedWriteIds = new HostScoped(() => new Set());
var MAX_LINTED_WRITE_IDS = 256;
//@ chunk-e6aww6q8.js:1364449-1364561 placement
/**
 * 把一次写入的标识记进会话级的有限集合（超过上限淘汰最早的）。
 */
function rememberLintedWrite(host, toolUseId) {
  if (toolUseId === undefined) return;
  let r = lintedWriteIds.of(host);
  r.add(toolUseId);
  if (r.size > MAX_LINTED_WRITE_IDS) r.delete(r.values().next().value);
}
//@ chunk-e6aww6q8.js:1364561-1364618 placement
/**
 * 移除写入 id 记录
 */
function forgetLintedWrite(host, toolUseId) {
  return toolUseId !== undefined && lintedWriteIds.of(host).delete(toolUseId);
}
//@ chunk-e6aww6q8.js:1364618-1364687 placement
/**
 * 去掉不可见字符后归一化
 */
function stripHiddenChars(e) {
  let n = "";
  for (let r of e) if (!isDisallowedMemoryChar(r)) n += r;
  return neutralizeInboundTags(n);
}
//@ chunk-e6aww6q8.js:1364687-1364947 placement
function describeHiddenCharacters(e) {
  let n = new Map();
  for (let s of e) {
    let h = `U+${s.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
    n.set(h, (n.get(h) ?? 0) + 1);
  }
  let mapped = [...n].slice(0, 6).map(([s, h]) => (h > 1 ? `${s} \xD7${h}` : s));
  return n.size > 6 ? `${mapped.join(", ")} and more` : mapped.join(", ");
}
//@ chunk-e6aww6q8.js:1364947-1365030 placement
/**
 * 取最后一段路径
 */
function basenameOfPath(e) {
  return e.slice(Math.max(e.lastIndexOf("/"), e.lastIndexOf("\\")) + 1);
}
export {
  lintMemoryWrite,
  lintMemoryFilePath,
  lintBackgroundMemoryWrite,
  rememberLintedWrite,
  lintMemoryTextIfEnabled,
  memoryWriteSource,
  forgetLintedWrite,
};
