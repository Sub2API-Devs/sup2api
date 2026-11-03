/**
 * services/memoryStore/memoryKeys.ts
 *
 * 2.1.316 新增：内容含疑似密钥时的拒绝/警告文本；把键解析为个人记忆目录下的路径（拒绝越界、symlink）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a477qqne.js (17)
 * attribution: placement 17
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
import { uniq } from "../../utils/collections.js";
import { parseMemoryStoresEnv } from "../orgMemory/memoryStores.js";
import { scanForSecrets } from "../teamMemorySync/secretScanner.js";

//@ chunk-a477qqne.js:1332-1379 placement
/**
 * 记忆存储里排除的顶层目录（team、logs、sessions、proposals）。
 */
var EXCLUDED_TOP_LEVEL_DIRS = ["team", "logs", "sessions", "proposals"];
//@ chunk-a477qqne.js:1379-1456 placement = setCwdState (1)
/**
 * 归一化记忆键路径段（NFC、去尾部点空格、小写）。
 */
function normalizeKeySegment(cwd) {
  return cwd
    .normalize("NFC")
    .replace(/[. ]+$/, "")
    .toLowerCase();
}
//@ chunk-a477qqne.js:1456-1589 placement
/**
 * 键是否指向被排除的个人记忆子树或隐藏路径。
 */
function isExcludedMemoryKey(e) {
  let parts = e.split("/");
  if (parts.length === 0) return true;
  if (parts.some((r) => r.startsWith("."))) return true;
  return EXCLUDED_TOP_LEVEL_DIRS.includes(normalizeKeySegment(parts[0]));
}
//@ chunk-a477qqne.js:1682-1709 placement
function getPersonalMemoryDir() {
  return getAutoMemPath();
}
//@ chunk-a477qqne.js:1709-1867 placement = isRealPathWithinTeamDir (1)
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
//@ chunk-a477qqne.js:1867-2344 placement
/**
 * 把键解析为个人记忆目录下的路径（拒绝越界、symlink）。
 */
async function resolvePersonalMemoryPath(e) {
  sanitizePathKey(e);
  if (isExcludedMemoryKey(e))
    throw new PathTraversalError(`Key targets an excluded personal-memory subtree: "${e}"`);
  let personalMemoryDir = getPersonalMemoryDir();
  let r = join(personalMemoryDir, e);
  let s = resolve(r);
  if (!s.startsWith(personalMemoryDir))
    throw new PathTraversalError(`Key escapes personal memory directory: "${e}"`);
  let realCandidate = await realpathDeepestExisting(s);
  if (!(await isRealPathWithinAutoMemDir(realCandidate)))
    throw new PathTraversalError(`Key escapes personal memory directory via symlink: "${e}"`);
  for (let d of await isTeamSubscriber())
    if (realCandidate === d || realCandidate.startsWith(d + sep))
      throw new PathTraversalError(
        `Key resolves into an excluded subtree (${EXCLUDED_TOP_LEVEL_DIRS.join("/, ")}/): "${e}"`,
      );
  return s;
}
//@ chunk-a477qqne.js:2344-2493 placement = isTeamSubscriber (1)
async function isTeamSubscriber() {
  let mapped = EXCLUDED_TOP_LEVEL_DIRS.map((r) =>
    r === "team" ? getMemoryDirNfc().replace(/[/\\]+$/, "") : join(getAutoMemPath(), r),
  );
  let n = [];
  for (let r of mapped)
    try {
      n.push(await realpath(r));
    } catch {}
  return n;
}
//@ chunk-a477qqne.js:2493-2704 placement = setCwdState (1)
function isOutsideAllowedRoot(cwd) {
  let autoMemPathOrNull = getAutoMemPathOrNull();
  if (autoMemPathOrNull === null) return false;
  let lower = resolve(cwd).normalize("NFC").toLowerCase();
  let lower_2 = autoMemPathOrNull.normalize("NFC").toLowerCase();
  if (!lower.startsWith(lower_2)) return false;
  let replaced = lower.slice(lower_2.length).replaceAll(sep, "/");
  return !isExcludedMemoryKey(replaced);
}
//@ chunk-a477qqne.js:2704-2743 placement
/**
 * 记忆文档的扩展名列表。
 */
var MEMORY_FILE_EXTENSIONS = [".md", ".txt", ".json", ".jsonl"];
//@ chunk-a477qqne.js:2743-2824 placement
/**
 * 判断文件名是否带记忆文档扩展名且不以 . 开头。
 */
function hasMemoryExtension(e) {
  if (e.startsWith(".")) return false;
  return MEMORY_FILE_EXTENSIONS.some((n) => e.endsWith(n));
}
//@ chunk-a477qqne.js:2824-2917 placement
var regExp = new RegExp(
  `(?:${MEMORY_FILE_EXTENSIONS.map((e) => e.replace(".", "\\.")).join("|")})\\.tmp\\.[0-9a-f]{8}$`,
);
//@ chunk-a477qqne.js:2917-2970 placement
/**
 * 判断键是否为记忆文档（非隐藏且扩展名匹配）。
 */
function isMemoryDocumentKey(e) {
  return !e.startsWith(".") && regExp.test(e);
}
//@ chunk-a477qqne.js:2970-3079 placement
/**
 * 键是否为记忆文档。
 */
function isMemoryDocumentKey_2(e) {
  let parts = e.replace(/^\/+/, "").split("/");
  return parts.every((r) => !r.startsWith(".")) && hasMemoryExtension(parts.at(-1));
}
//@ chunk-a477qqne.js:3079-3202 placement
/**
 * 生成密钥扫描用的文本变体（原文、去掉忽略字符、再去掉特定码位）。
 */
function getSecretScanVariants(content) {
  let n = "";
  let r = "";
  for (let s of content) {
    if (isDisallowedMemoryChar(s)) continue;
    n += s;
    if (!INVISIBLE_MEMORY_CODE_POINTS.has(s.codePointAt(0))) r += s;
  }
  return uniq([content, n, r]);
}
//@ chunk-a477qqne.js:3202-3297 placement
/**
 * 是否存在用户态可读写的记忆存储。
 */
function hasUserRwStore() {
  try {
    return (parseMemoryStoresEnv() ?? []).some((e) => e.scope === "user" && e.mode === "rw");
  } catch {
    return false;
  }
}
//@ chunk-a477qqne.js:3297-4043 placement
/**
 * 内容含疑似密钥时的拒绝/警告文本。
 */
function secretWarning(absolutePath, n) {
  let r = hasNoAutoMemPath();
  let s = !r && isTeamMemPath(absolutePath);
  let i = !r && !s && isOutsideAllowedRoot(absolutePath) && hasUserRwStore();
  if (!r && !s && !i) return null;
  let d = scanSecretsInVariants(n);
  if (d.length === 0) return null;
  let joined = uniq(d.map((h) => h.label)).join(", ");
  if (r)
    return `Content contains potential secrets (${joined}) and cannot be written. This session has no memory folder, so every file it writes is checked as a memory file would be. Remove the sensitive content and try again.`;
  if (s)
    return `Content contains potential secrets (${joined}) and cannot be written to team memory. Team memory is shared with all repository collaborators. Remove the sensitive content and try again.`;
  return `Content contains potential secrets (${joined}) and cannot be written to memory. Memory is synced to your account. Remove the sensitive content and try again.`;
}
//@ chunk-a477qqne.js:4043-4094 placement
/**
 * 对所有脱敏变体扫描密钥。
 */
function scanSecretsInVariants(e) {
  return getSecretScanVariants(e).flatMap((n) => scanForSecrets(n));
}
export {
  getSecretScanVariants,
  isExcludedMemoryKey,
  secretWarning,
  isMemoryDocumentKey_2,
  scanSecretsInVariants,
  EXCLUDED_TOP_LEVEL_DIRS,
  normalizeKeySegment,
  isOutsideAllowedRoot,
  getPersonalMemoryDir,
  hasMemoryExtension,
  resolvePersonalMemoryPath,
  isMemoryDocumentKey,
};
