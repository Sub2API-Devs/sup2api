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
import {
  sep,
  sep as sep_2,
  sep as sep_3,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  resolve,
  resolve as resolve_2,
} from "path";
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
import { isDisallowedMemoryChar, xos } from "../../memdir/memdir.js";
import { uniq } from "../../utils/collections.js";
import { parseMemoryStoresEnv } from "../orgMemory/memoryStores.js";
import { scanForSecrets } from "../teamMemorySync/secretScanner.js";

//@ chunk-a477qqne.js:1332-1379 placement
var Thn = ["team", "logs", "sessions", "proposals"];
/**
 * 归一化记忆键路径段（NFC、去尾部点空格、小写）。
 */
//@ chunk-a477qqne.js:1379-1456 placement = setCwdState (1)
function normalizeKeySegment(cwd) {
  return cwd
    .normalize("NFC")
    .replace(/[. ]+$/, "")
    .toLowerCase();
}
/**
 * 键是否指向被排除的个人记忆子树或隐藏路径。
 */
//@ chunk-a477qqne.js:1456-1589 placement
function isExcludedMemoryKey(e) {
  let parts = e.split("/");
  if (parts.length === 0) return !0;
  if (parts.some((r) => r.startsWith("."))) return !0;
  return Thn.includes(normalizeKeySegment(parts[0]));
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
  } catch (error) {
    let code = getErrnoCode(error);
    if (code === "ENOENT" || code === "ENOTDIR") return !0;
    return !1;
  }
  if (realCandidate === realTeamDir) return !0;
  return realCandidate.startsWith(realTeamDir + sep);
}
/**
 * 把键解析为个人记忆目录下的路径（拒绝越界、symlink）。
 */
//@ chunk-a477qqne.js:1867-2344 placement
async function resolvePersonalMemoryPath(e) {
  if ((sanitizePathKey(e), isExcludedMemoryKey(e)))
    throw new PathTraversalError(`Key targets an excluded personal-memory subtree: "${e}"`);
  let n = getPersonalMemoryDir(),
    r = join(n, e),
    s = resolve(r);
  if (!s.startsWith(n)) throw new PathTraversalError(`Key escapes personal memory directory: "${e}"`);
  let i = await realpathDeepestExisting(s);
  if (!(await isRealPathWithinAutoMemDir(i)))
    throw new PathTraversalError(`Key escapes personal memory directory via symlink: "${e}"`);
  for (let d of await isTeamSubscriber())
    if (i === d || i.startsWith(d + sep))
      throw new PathTraversalError(`Key resolves into an excluded subtree (${Thn.join("/, ")}/): "${e}"`);
  return s;
}
//@ chunk-a477qqne.js:2344-2493 placement = isTeamSubscriber (1)
async function isTeamSubscriber() {
  let mapped = Thn.map((r) =>
      r === "team" ? getMemoryDirNfc().replace(/[/\\]+$/, "") : join(getAutoMemPath(), r),
    ),
    n = [];
  for (let r of mapped)
    try {
      n.push(await realpath(r));
    } catch {}
  return n;
}
//@ chunk-a477qqne.js:2493-2704 placement = setCwdState (1)
function isOutsideAllowedRoot(cwd) {
  let n = getAutoMemPathOrNull();
  if (n === null) return !1;
  let lower = resolve(cwd).normalize("NFC").toLowerCase(),
    lower_2 = n.normalize("NFC").toLowerCase();
  if (!lower.startsWith(lower_2)) return !1;
  let replaced = lower.slice(lower_2.length).replaceAll(sep, "/");
  return !isExcludedMemoryKey(replaced);
}
//@ chunk-a477qqne.js:2704-2743 placement
var Ue = [".md", ".txt", ".json", ".jsonl"];
//@ chunk-a477qqne.js:2743-2824 placement
function oVr(e) {
  if (e.startsWith(".")) return !1;
  return Ue.some((n) => e.endsWith(n));
}
//@ chunk-a477qqne.js:2824-2917 placement
var regExp = new RegExp(`(?:${Ue.map((e) => e.replace(".", "\\.")).join("|")})\\.tmp\\.[0-9a-f]{8}$`);
//@ chunk-a477qqne.js:2917-2970 placement
function LJs(e) {
  return !e.startsWith(".") && regExp.test(e);
}
/**
 * 键是否为记忆文档。
 */
//@ chunk-a477qqne.js:2970-3079 placement
function isMemoryDocumentKey(e) {
  let parts = e.replace(/^\/+/, "").split("/");
  return parts.every((r) => !r.startsWith(".")) && oVr(parts.at(-1));
}
/**
 * 生成密钥扫描用的文本变体（原文、去掉忽略字符、再去掉特定码位）。
 */
//@ chunk-a477qqne.js:3079-3202 placement
function getSecretScanVariants(e) {
  let n = "",
    r = "";
  for (let s of e) {
    if (isDisallowedMemoryChar(s)) continue;
    if (((n += s), !xos.has(s.codePointAt(0)))) r += s;
  }
  return uniq([e, n, r]);
}
//@ chunk-a477qqne.js:3202-3297 placement
function Lt() {
  try {
    return (parseMemoryStoresEnv() ?? []).some((e) => e.scope === "user" && e.mode === "rw");
  } catch {
    return !1;
  }
}
/**
 * 内容含疑似密钥时的拒绝/警告文本。
 */
//@ chunk-a477qqne.js:3297-4043 placement
function secretWarning(e, n) {
  let r = hasNoAutoMemPath(),
    s = !r && isTeamMemPath(e),
    i = !r && !s && isOutsideAllowedRoot(e) && Lt();
  if (!r && !s && !i) return null;
  let d = k7n(n);
  if (d.length === 0) return null;
  let joined = uniq(d.map((h) => h.label)).join(", ");
  if (r)
    return `Content contains potential secrets (${joined}) and cannot be written. This session has no memory folder, so every file it writes is checked as a memory file would be. Remove the sensitive content and try again.`;
  if (s)
    return `Content contains potential secrets (${joined}) and cannot be written to team memory. Team memory is shared with all repository collaborators. Remove the sensitive content and try again.`;
  return `Content contains potential secrets (${joined}) and cannot be written to memory. Memory is synced to your account. Remove the sensitive content and try again.`;
}
//@ chunk-a477qqne.js:4043-4094 placement
function k7n(e) {
  return getSecretScanVariants(e).flatMap((n) => scanForSecrets(n));
}

export {
  getSecretScanVariants,
  isExcludedMemoryKey,
  secretWarning,
  isMemoryDocumentKey,
  k7n,
  Thn,
  normalizeKeySegment,
  isOutsideAllowedRoot,
  getPersonalMemoryDir,
  oVr,
  resolvePersonalMemoryPath,
  LJs,
};
