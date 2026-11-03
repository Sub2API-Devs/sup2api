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
import {
  normalize,
  normalize as normalize_2,
  normalize as normalize_3,
  normalize as normalize_4,
  normalize as normalize_5,
  normalize as normalize_6,
  normalize as normalize_7,
  normalize as normalize_8,
  normalize as normalize_9,
} from "path";
import { ht } from "../services/mcp/cliOwnedClients.js";
import { isDisallowedMemoryChar, nfcLower as nfcLower_2, mpr } from "./memdir.js";
import { getIsNonInteractiveSession } from "../bootstrap/state.js";
import { getAutoMemPathOrNull } from "./paths.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { l8, TAi } from "../utils/sessionPeers.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { getFirstLine, truncateToLength } from "../utils/stringUtils.js";
import { HostScoped } from "../utils/hostScoped.js";

//@ chunk-e6aww6q8.js:1362512-1362563 placement
function wSt(e, n, r) {
  let vscodeClient = ht().vscodeClient;
  return;
}
//@ chunk-e6aww6q8.js:1362598-1362651 placement
var TENGU_MEMDIR_WRITE_LINT = "tengu_memdir_write_lint",
  eXt = /\.md[. ]*$/iu;
//@ chunk-e6aww6q8.js:1362651-1362720 placement
function rXt(e) {
  let n = [];
  for (let r of e) if (isDisallowedMemoryChar(r)) n.push(r);
  return n;
}
//@ chunk-e6aww6q8.js:1362720-1362795 placement
function IL(e) {
  return e.agentId === void 0 && !getIsNonInteractiveSession() ? "interactive" : "background";
}
//@ chunk-e6aww6q8.js:1362795-1362914 placement
function getAutoMemRelativePath(e) {
  let n = getAutoMemPathOrNull();
  if (n === null) return null;
  let r = normalizeMemoryPath(e),
    s = normalizeMemoryPath(n);
  return r.startsWith(s) ? r.slice(s.length) : null;
}
//@ chunk-e6aww6q8.js:1362914-1363028 placement
function normalizeMemoryPath(e) {
  return nfcLower_2(
    normalize_4(e)
      .split(/[/\\]/u)
      .map((n) => (n === "." || n === ".." ? n : n.replace(/[. ]+$/u, "")))
      .join("/"),
  );
}
//@ chunk-e6aww6q8.js:1363028-1363136 placement
function shouldLintMemoryWrite(e) {
  let n = Sqo(e);
  return (
    (eXt.test(n) || eXt.test(n.replace(/:.*$/u, ""))) &&
    getAutoMemRelativePath(e) !== null &&
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MEMDIR_WRITE_LINT, !1)
  );
}
//@ chunk-e6aww6q8.js:1363136-1363198 placement
function iXt(e) {
  return { hidden: rXt(e).length > 0, tags: l8(e) !== e };
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
/**
 * 拒绝路径含不可见或控制字符的记忆文件。
 */
//@ chunk-e6aww6q8.js:1363320-1364118 placement
function lintMemoryFilePath(e, n, r) {
  if (!shouldLintMemoryWrite(e)) return null;
  let filtered = [...(getAutoMemRelativePath(e) ?? normalize_4(e))].filter(mpr);
  if (filtered.length > 0)
    return (
      logMemoryWriteLint(r, "refused", { hidden: !0, tags: !1 }),
      `This memory file's path contains invisible or control characters (${describeHiddenCharacters(filtered)}). Name it without them and write the file again; nothing was written.`
    );
  if (r !== "interactive") return null;
  let h = iXt(n);
  if (!h.hidden && !h.tags) return null;
  logMemoryWriteLint(r, "refused", h);
  let y = [];
  if (h.hidden) y.push(`invisible or control characters (${describeHiddenCharacters(rXt(n))})`);
  if (h.tags) {
    let mapped = TAi(n)
        .slice(0, 3)
        .map((L) => jsonStringify(getFirstLine(truncateToLength(n.slice(L), 24)))),
      w = mapped.length > 0 ? mapped.join(", ") : "for example <system-reminder>";
    y.push(`text shaped like a harness tag (${w}), which a memory file must not carry`);
  }
  return `This memory file's text contains ${y.join(" and ")}. Remove that and write the file again; nothing was written.`;
}
/**
 * 后台写入自动记忆目录的文本时（开关打开且路径匹配），检测隐藏字符与 harness 标签，有则打点并剥离后返回，否则原样返回。
 */
//@ chunk-e6aww6q8.js:1364118-1364253 placement
function lintBackgroundMemoryWrite(e, n, r) {
  if (r !== "background" || !shouldLintMemoryWrite(e)) return n;
  let s = iXt(n);
  if (!s.hidden && !s.tags) return n;
  return (logMemoryWriteLint(r, "stripped", s), dXt(n));
}
//@ chunk-e6aww6q8.js:1364253-1364294 placement
function eSe(e, n) {
  return shouldLintMemoryWrite(e) ? dXt(n) : n;
}
//@ chunk-e6aww6q8.js:1364414-1364449 placement
var aXt = new HostScoped(() => new Set()),
  yqo = 256;
/**
 * 把一次写入的标识记进会话级的有限集合（超过上限淘汰最早的）。
 */
//@ chunk-e6aww6q8.js:1364449-1364561 placement
function rememberLintedWrite(e, n) {
  if (n === void 0) return;
  let of = aXt.of(e);
  if ((of.add(n), of.size > yqo)) of.delete(of.values().next().value);
}
//@ chunk-e6aww6q8.js:1364561-1364618 placement
function rSe(e, n) {
  return n !== void 0 && aXt.of(e).delete(n);
}
//@ chunk-e6aww6q8.js:1364618-1364687 placement
function dXt(e) {
  let n = "";
  for (let r of e) if (!isDisallowedMemoryChar(r)) n += r;
  return l8(n);
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
function Sqo(e) {
  return e.slice(Math.max(e.lastIndexOf("/"), e.lastIndexOf("\\")) + 1);
}

export { wSt, lintMemoryFilePath, lintBackgroundMemoryWrite, rememberLintedWrite, eSe, IL, rSe };
