/**
 * services/memoryStore/memoryKeys.ts
 *
 * 2.1.316 新增：内容含疑似密钥时的拒绝/警告文本；把键解析为个人记忆目录下的路径（拒绝越界、symlink）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b3a6nm9h.js (17)
 * attribution: placement 17
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { sep, join, resolve } from "path";
import { realpath } from "fs/promises";
import { getAutoMemPath, getAutoMemPathOrNull, hasNoAutoMemPath } from "../../memdir/paths.js";
import {
  resolveRealAutoMemPath,
  sanitizePathKey,
  PathTraversalError,
  realpathDeepestExisting,
  getMemoryDirNfc,
  isTeamMemPath,
} from "../../memdir/teamMemPaths.js";
import { getErrnoCode } from "../../utils/errors.js";
import { isDisallowedMemoryChar, INVISIBLE_MEMORY_CODE_POINTS } from "../../memdir/memdir.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { parseMemoryStoresEnv } from "../orgMemory/memoryStores.js";
import { scanForSecrets } from "../teamMemorySync/secretScanner.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-b3a6nm9h.js:1365-1412 placement
/**
 * 记忆存储里排除的顶层目录（team、logs、sessions、proposals）。
 */
var EXCLUDED_TOP_LEVEL_DIRS = ["team", "logs", "sessions", "proposals"];
//@ chunk-b3a6nm9h.js:1412-1489 placement (2.1.88 match: setCwdState, 1)
/**
 * 归一化记忆键路径段（NFC、去尾部点空格、小写）。
 */
function normalizeKeySegment(cwd) {
  return cwd
    .normalize("NFC")
    .replace(/[. ]+$/, "")
    .toLowerCase();
}
//@ chunk-b3a6nm9h.js:1489-1622 placement
/**
 * 键是否指向被排除的个人记忆子树或隐藏路径。
 */
function isExcludedMemoryKey(key) {
  let parts = key.split("/");
  if (parts.length === 0) return true;
  if (parts.some((segment) => segment.startsWith("."))) return true;
  return EXCLUDED_TOP_LEVEL_DIRS.includes(normalizeKeySegment(parts[0]));
}
//@ chunk-b3a6nm9h.js:1715-1742 placement
function getPersonalMemoryDir() {
  return getAutoMemPath();
}
//@ chunk-b3a6nm9h.js:1742-1900 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
async function isRealPathWithinAutoMemDir(realCandidate) {
  let realTeamDir;
  try {
    realTeamDir = await resolveRealAutoMemPath();
  } catch (e) {
    let code = getErrnoCode(e);
    if (code === "ENOENT" || code === "ENOTDIR") return true;
    return false;
  }
  if (realCandidate === realTeamDir) return true;
  return realCandidate.startsWith(realTeamDir + sep);
}
//@ chunk-b3a6nm9h.js:1900-2377 placement
/**
 * 把键解析为个人记忆目录下的路径（拒绝越界、symlink）。
 */
async function resolvePersonalMemoryPath(key) {
  sanitizePathKey(key);
  if (isExcludedMemoryKey(key))
    throw new PathTraversalError(`Key targets an excluded personal-memory subtree: "${key}"`);
  let personalMemoryDir = getPersonalMemoryDir();
  let candidatePath = join(personalMemoryDir, key);
  let resolvedPath = resolve(candidatePath);
  if (!resolvedPath.startsWith(personalMemoryDir))
    throw new PathTraversalError(`Key escapes personal memory directory: "${key}"`);
  let realCandidate = await realpathDeepestExisting(resolvedPath);
  if (!(await isRealPathWithinAutoMemDir(realCandidate)))
    throw new PathTraversalError(`Key escapes personal memory directory via symlink: "${key}"`);
  for (let excludedDir of await isTeamSubscriber())
    if (realCandidate === excludedDir || realCandidate.startsWith(excludedDir + sep))
      throw new PathTraversalError(
        `Key resolves into an excluded subtree (${EXCLUDED_TOP_LEVEL_DIRS.join("/, ")}/): "${key}"`,
      );
  return resolvedPath;
}
//@ chunk-b3a6nm9h.js:2377-2526 placement (2.1.88 match: isTeamSubscriber, 1)
async function isTeamSubscriber() {
  let mapped = EXCLUDED_TOP_LEVEL_DIRS.map((subtree) =>
    subtree === "team" ? getMemoryDirNfc().replace(/[/\\]+$/, "") : join(getAutoMemPath(), subtree),
  );
  let resolvedDirs = [];
  for (let subtree of mapped)
    try {
      resolvedDirs.push(await realpath(subtree));
    } catch {}
  return resolvedDirs;
}
//@ chunk-b3a6nm9h.js:2526-2737 placement (2.1.88 match: setCwdState, 1)
function isOutsideAllowedRoot(cwd) {
  let autoMemPathOrNull = getAutoMemPathOrNull();
  if (autoMemPathOrNull === null) return false;
  let lower = resolve(cwd).normalize("NFC").toLowerCase();
  let lower_2 = autoMemPathOrNull.normalize("NFC").toLowerCase();
  if (!lower.startsWith(lower_2)) return false;
  let replaced = lower.slice(lower_2.length).replaceAll(sep, "/");
  return !isExcludedMemoryKey(replaced);
}
//@ chunk-b3a6nm9h.js:2737-2776 placement
/**
 * 记忆文档的扩展名列表。
 */
var MEMORY_FILE_EXTENSIONS = [".md", ".txt", ".json", ".jsonl"];
//@ chunk-b3a6nm9h.js:2776-2857 placement
/**
 * 判断文件名是否带记忆文档扩展名且不以 . 开头。
 */
function hasMemoryExtension(fileName) {
  if (fileName.startsWith(".")) return false;
  return MEMORY_FILE_EXTENSIONS.some((extension) => fileName.endsWith(extension));
}
//@ chunk-b3a6nm9h.js:2857-2950 placement
var regExp; // deferred: uses MEMORY_FILE_EXTENSIONS of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-b3a6nm9h.js:2857", () => {
  regExp = new RegExp(
    `(?:${MEMORY_FILE_EXTENSIONS.map((extension) => extension.replace(".", "\\.")).join("|")})\\.tmp\\.[0-9a-f]{8}$`,
  );
});
//@ chunk-b3a6nm9h.js:2950-3003 placement
/**
 * 判断键是否为记忆文档（非隐藏且扩展名匹配）。
 */
function isMemoryDocumentKey(fileName) {
  return !fileName.startsWith(".") && regExp.test(fileName);
}
//@ chunk-b3a6nm9h.js:3003-3112 placement
/**
 * 键是否为记忆文档。
 */
function isMemoryDocumentKey_2(path) {
  let parts = path.replace(/^\/+/, "").split("/");
  return parts.every((segment) => !segment.startsWith(".")) && hasMemoryExtension(parts.at(-1));
}
//@ chunk-b3a6nm9h.js:3112-3235 placement
/**
 * 生成密钥扫描用的文本变体（原文、去掉忽略字符、再去掉特定码位）。
 */
function getSecretScanVariants(content) {
  let withoutDisallowed = "";
  let withoutInvisible = "";
  for (let char of content) {
    if (isDisallowedMemoryChar(char)) continue;
    withoutDisallowed += char;
    if (!INVISIBLE_MEMORY_CODE_POINTS.has(char.codePointAt(0))) withoutInvisible += char;
  }
  return normalizeCaseForComparison_2([content, withoutDisallowed, withoutInvisible]);
}
//@ chunk-b3a6nm9h.js:3235-3330 placement
/**
 * 是否存在用户态可读写的记忆存储。
 */
function hasUserRwStore() {
  try {
    return (parseMemoryStoresEnv() ?? []).some((store) => store.scope === "user" && store.mode === "rw");
  } catch {
    return false;
  }
}
//@ chunk-b3a6nm9h.js:3330-4076 placement
/**
 * 内容含疑似密钥时的拒绝/警告文本。
 */
function secretWarning(absolutePath, content) {
  let hasNoMemFolder = hasNoAutoMemPath();
  let isTeamMem = !hasNoMemFolder && isTeamMemPath(absolutePath);
  let outsideRoot = !hasNoMemFolder && !isTeamMem && isOutsideAllowedRoot(absolutePath) && hasUserRwStore();
  if (!hasNoMemFolder && !isTeamMem && !outsideRoot) return null;
  let findings = scanSecretsInVariants(content);
  if (findings.length === 0) return null;
  let joined = normalizeCaseForComparison_2(findings.map((finding) => finding.label)).join(", ");
  if (hasNoMemFolder)
    return `Content contains potential secrets (${joined}) and cannot be written. This session has no memory folder, so every file it writes is checked as a memory file would be. Remove the sensitive content and try again.`;
  if (isTeamMem)
    return `Content contains potential secrets (${joined}) and cannot be written to team memory. Team memory is shared with all repository collaborators. Remove the sensitive content and try again.`;
  return `Content contains potential secrets (${joined}) and cannot be written to memory. Memory is synced to your account. Remove the sensitive content and try again.`;
}
//@ chunk-b3a6nm9h.js:4076-4127 placement
/**
 * 对所有脱敏变体扫描密钥。
 */
function scanSecretsInVariants(content) {
  return getSecretScanVariants(content).flatMap((variant) => scanForSecrets(variant));
}
export {
  isOutsideAllowedRoot,
  getSecretScanVariants,
  isExcludedMemoryKey,
  EXCLUDED_TOP_LEVEL_DIRS,
  normalizeKeySegment,
  secretWarning,
  getPersonalMemoryDir,
  isMemoryDocumentKey_2,
  hasMemoryExtension,
  scanSecretsInVariants,
  resolvePersonalMemoryPath,
  isMemoryDocumentKey,
};
