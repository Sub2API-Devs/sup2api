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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1362512-1362563 placement
/**
 * 记忆写入检查的入口；当前实现在取 vscodeClient 后直接返回（未启用检查）。
 */
function lintMemoryWrite(payload, opts, ctx) {
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
function collectHiddenChars(text) {
  let hidden = [];
  for (let char of text) if (isDisallowedMemoryChar(char)) hidden.push(char);
  return hidden;
}
//@ chunk-e6aww6q8.js:1362720-1362795 placement
/**
 * 判断这次记忆写入来自交互会话还是后台会话。
 */
function memoryWriteSource(context) {
  return context.agentId === undefined && !getIsNonInteractiveSession() ? "interactive" : "background";
}
//@ chunk-e6aww6q8.js:1362795-1362914 placement
function getAutoMemRelativePath(filePath) {
  let filePath_2 = getAutoMemPathOrNull();
  if (filePath_2 === null) return null;
  let normalizedPath = normalizeMemoryPath(filePath);
  let autoMemPath = normalizeMemoryPath(filePath_2);
  return normalizedPath.startsWith(autoMemPath) ? normalizedPath.slice(autoMemPath.length) : null;
}
//@ chunk-e6aww6q8.js:1362914-1363028 placement
function normalizeMemoryPath(filePath) {
  return nfcLower_2(
    normalize(filePath)
      .split(/[/\\]/u)
      .map((segment) => (segment === "." || segment === ".." ? segment : segment.replace(/[. ]+$/u, "")))
      .join("/"),
  );
}
//@ chunk-e6aww6q8.js:1363028-1363136 placement
function shouldLintMemoryWrite(filePath) {
  let fileName = basenameOfPath(filePath);
  return (
    (MARKDOWN_EXT_RE.test(fileName) || MARKDOWN_EXT_RE.test(fileName.replace(/:.*$/u, ""))) &&
    getAutoMemRelativePath(filePath) !== null &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MEMDIR_WRITE_LINT, false)
  );
}
//@ chunk-e6aww6q8.js:1363136-1363198 placement
/**
 * 判断记忆文本里是否有不可见字符以及是否含 HTML 标签。
 */
function classifyMemoryText(text) {
  return {
    hidden: collectHiddenChars(text).length > 0,
    tags: neutralizeInboundTags(text) !== text,
  };
}
//@ chunk-e6aww6q8.js:1363198-1363320 placement
function logMemoryWriteLint(member, action, classification) {
  logEvent("tengu_memdir_write_lint", {
    caller: fromEnum(member),
    action: fromEnum(action),
    hidden_characters: classification.hidden,
    harness_tags: classification.tags,
  });
}
//@ chunk-e6aww6q8.js:1363320-1364118 placement
/**
 * 拒绝路径含不可见或控制字符的记忆文件。
 */
function lintMemoryFilePath(filePath, content, source) {
  if (!shouldLintMemoryWrite(filePath)) return null;
  let chars = [...(getAutoMemRelativePath(filePath) ?? normalize(filePath))].filter(isDisallowedChar);
  if (chars.length > 0) {
    logMemoryWriteLint(source, "refused", {
      hidden: true,
      tags: false,
    });
    return `This memory file's path contains invisible or control characters (${describeHiddenCharacters(chars)}). Name it without them and write the file again; nothing was written.`;
  }
  if (source !== "interactive") return null;
  let classification = classifyMemoryText(content);
  if (!classification.hidden && !classification.tags) return null;
  logMemoryWriteLint(source, "refused", classification);
  let reasons = [];
  if (classification.hidden)
    reasons.push(
      `invisible or control characters (${describeHiddenCharacters(collectHiddenChars(content))})`,
    );
  if (classification.tags) {
    let mapped = inboundTagOpenerOffsets(content)
      .slice(0, 3)
      .map((offset) => jsonStringify(getFirstLine(truncateToLength(content.slice(offset), 24))));
    let tagExamples = mapped.length > 0 ? mapped.join(", ") : "for example <system-reminder>";
    reasons.push(`text shaped like a harness tag (${tagExamples}), which a memory file must not carry`);
  }
  return `This memory file's text contains ${reasons.join(" and ")}. Remove that and write the file again; nothing was written.`;
}
//@ chunk-e6aww6q8.js:1364118-1364253 placement
/**
 * 后台写入自动记忆目录的文本时（开关打开且路径匹配），检测隐藏字符与 harness 标签，有则打点并剥离后返回，否则原样返回。
 */
function lintBackgroundMemoryWrite(filePath, content, source) {
  if (source !== "background" || !shouldLintMemoryWrite(filePath)) return content;
  let classification = classifyMemoryText(content);
  if (!classification.hidden && !classification.tags) return content;
  logMemoryWriteLint(source, "stripped", classification);
  return stripHiddenChars(content);
}
//@ chunk-e6aww6q8.js:1364253-1364294 placement
/**
 * 若启用写入检查，去掉不可见字符并归一化，否则原样返回。
 */
function lintMemoryTextIfEnabled(filePath, content) {
  return shouldLintMemoryWrite(filePath) ? stripHiddenChars(content) : content;
}
//@ chunk-e6aww6q8.js:1364414-1364449 placement
/**
 * 按宿主记录已检查过的记忆写入 id（最多 256 个，超出淘汰最早）。
 */
var lintedWriteIds; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_LINTED_WRITE_IDS;
deferInit("chunk-e6aww6q8.js:1364414", () => {
  lintedWriteIds = new HostScoped(() => new Set());
  MAX_LINTED_WRITE_IDS = 256;
});
//@ chunk-e6aww6q8.js:1364449-1364561 placement
/**
 * 把一次写入的标识记进会话级的有限集合（超过上限淘汰最早的）。
 */
function rememberLintedWrite(host, toolUseId) {
  if (toolUseId === undefined) return;
  let ids = lintedWriteIds.of(host);
  ids.add(toolUseId);
  if (ids.size > MAX_LINTED_WRITE_IDS) ids.delete(ids.values().next().value);
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
function stripHiddenChars(text) {
  let kept = "";
  for (let char of text) if (!isDisallowedMemoryChar(char)) kept += char;
  return neutralizeInboundTags(kept);
}
//@ chunk-e6aww6q8.js:1364687-1364947 placement
function describeHiddenCharacters(chars) {
  let counts = new Map();
  for (let char of chars) {
    let code = `U+${char.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  let mapped = [...counts].slice(0, 6).map(([code, count]) => (count > 1 ? `${code} \xD7${count}` : code));
  return counts.size > 6 ? `${mapped.join(", ")} and more` : mapped.join(", ");
}
//@ chunk-e6aww6q8.js:1364947-1365030 placement
/**
 * 取最后一段路径
 */
function basenameOfPath(filePath) {
  return filePath.slice(Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\")) + 1);
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
