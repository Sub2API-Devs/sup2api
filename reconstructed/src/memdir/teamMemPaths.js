/**
 * memdir/teamMemPaths.ts
 *
 * 团队/个人记忆 store 的路径计算与路径安全校验（键清洗、realpath 防逃逸）；混有大量被误配为 isRealPathWithinTeamDir 的通用 ENOENT 辅助函数。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/memdir/teamMemPaths.ts
 * pieces: chunk-82kqcve8.js (17)
 * attribution: fingerprint 5, layout 11, file-local 1
 */
import {
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
} from "path";
import { realpath, realpath as realpath_2, lstat, lstat as lstat_2, lstat as lstat_3 } from "fs/promises";
import {
  isAutoMemoryEnabled,
  getAutoMemPath,
  getAccountMemoryMirrorPath,
  getAutoMemPathOrNull,
} from "./paths.js";
import { getRootSession } from "../bootstrap/state.js";
import { parseMemoryStoresEnv } from "../services/orgMemory/memoryStores.js";
import { HostScoped } from "../utils/hostScoped.js";
import { isTeamSubscriber_2 } from "../utils/auth.js";
import { getErrnoCode } from "../utils/errors.js";
import { nfcLower } from "./memdir.js";

//@ chunk-82kqcve8.js:129449-129528 fingerprint = PathTraversalError (1)
class PathTraversalError extends Error {
  constructor(e) {
    super(e);
    this.name = "PathTraversalError";
  }
}
//@ chunk-82kqcve8.js:129528-129626 layout
class PathUnverifiableError extends PathTraversalError {
  code;
  constructor(e, n) {
    super(e);
    this.code = n;
    this.name = "PathUnverifiableError";
  }
}
/**
 * 校验团队记忆相对路径键：拒绝 NUL、URL 编码与 Unicode 归一化后的穿越、绝对路径等，抛 PathTraversalError。
 */
//@ chunk-82kqcve8.js:129626-130171 fingerprint = sanitizePathKey (1)
function sanitizePathKey(key) {
  if (key.includes("\x00")) throw new PathTraversalError(`Null byte in path key: "${key}"`);
  let decoded;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    decoded = key;
  }
  if (decoded !== key && (decoded.includes("..") || decoded.includes("/")))
    throw new PathTraversalError(`URL-encoded traversal in path key: "${key}"`);
  let normalized = key.normalize("NFKC");
  if (
    normalized !== key &&
    (normalized.includes("..") ||
      normalized.includes("/") ||
      normalized.includes("\\") ||
      normalized.includes("\x00"))
  )
    throw new PathTraversalError(`Unicode-normalized traversal in path key: "${key}"`);
  if (key.includes("\\")) throw new PathTraversalError(`Backslash in path key: "${key}"`);
  if (key.startsWith("/")) throw new PathTraversalError(`Absolute path key: "${key}"`);
  return key;
}
//@ chunk-82kqcve8.js:130171-130216 layout
function a4() {
  if (!isAutoMemoryEnabled()) return !1;
  return AJo();
}
//@ chunk-82kqcve8.js:130216-130269 layout
function AJo() {
  return pf.of(getRootSession().host).hasTeamStore();
}
//@ chunk-82kqcve8.js:130269-130474 layout
class TeamStoreProbe {
  raw = void 0;
  valid = !1;
  hasTeamStore() {
    let envClaudeMemoryStores = process.env.CLAUDE_MEMORY_STORES;
    if (envClaudeMemoryStores !== this.raw) {
      this.raw = envClaudeMemoryStores;
      try {
        this.valid = parseMemoryStoresEnv()?.some((n) => n.scope === "team") ?? !1;
      } catch {
        this.valid = !1;
      }
    }
    return this.valid;
  }
}
//@ chunk-82kqcve8.js:130474-130499 layout
var pf = new HostScoped(() => new TeamStoreProbe());
//@ chunk-82kqcve8.js:130499-130554 layout = setCwdState (1)
function getMemoryDirNfc() {
  return (join_7(getAutoMemPath(), isTeamSubscriber_2) + sep_4).normalize("NFC");
}
/**
 * 记忆 store 的本地目录：user→自动记忆目录，account→<配置目录>/memory/personal/，team→<自动记忆目录>/team/<mount>/。
 */
//@ chunk-82kqcve8.js:130554-130693 fingerprint = getTeamMemPath (0.729)
function getTeamMemPath(e) {
  switch (e.scope) {
    case "user":
      return getAutoMemPath();
    case "account":
      return getAccountMemoryMirrorPath();
    case "team":
      return (join_7(getMemoryDirNfc(), e.mount) + sep_4).normalize("NFC");
  }
}
//@ chunk-82kqcve8.js:130693-130745 layout
function getTeamMemFilePath(e, n) {
  return join_7(getTeamMemPath(e), ...n.split("/"));
}
//@ chunk-82kqcve8.js:130745-130781 layout
var stripTrailingSeparators = (e) => e.replace(/[/\\]+$/, "");
//@ chunk-82kqcve8.js:130781-130863 layout
async function resolveRealAutoMemPath(...e) {
  let n = stripTrailingSeparators(getAutoMemPath()),
    r = await realpath_2(dirname_4(n));
  return join_7(r, basename_3(n), ...e);
}
//@ chunk-82kqcve8.js:130863-131039 layout
async function checkPathInTeamMemDir(e, ...n) {
  try {
    let r = await resolveRealAutoMemPath(...n);
    return (await realpath_2(stripTrailingSeparators(e))) === r ? "ok" : "escape";
  } catch (error) {
    let s = getErrnoCode(error);
    if (s === "ENOENT" || s === "ENOTDIR") return "absent";
    return "escape";
  }
}
/**
 * 对最深的已存在祖先做 realpath，再拼回不存在的部分；检测悬空符号链接。
 */
//@ chunk-82kqcve8.js:131039-131582 fingerprint = realpathDeepestExisting (1)
async function realpathDeepestExisting(absolutePath) {
  let tail = [],
    current = absolutePath;
  for (let parent = dirname_4(current); current !== parent; parent = dirname_4(current))
    try {
      let realCurrent = await realpath_2(current);
      return tail.length === 0 ? realCurrent : join_7(realCurrent, ...tail.reverse());
    } catch (error) {
      let code = getErrnoCode(error);
      if (code === "ENOENT")
        try {
          if ((await lstat(current)).isSymbolicLink())
            throw new PathTraversalError(`Dangling symlink detected (target does not exist): "${current}"`);
        } catch (lstatErr) {
          if (lstatErr instanceof PathTraversalError) throw lstatErr;
        }
      else if (code === "ELOOP") throw new PathTraversalError(`Symlink loop detected in path: "${current}"`);
      else if (code !== "ENOTDIR" && code !== "ENAMETOOLONG")
        throw new PathUnverifiableError(`Cannot verify path containment (${code}): "${current}"`, code);
      (tail.push(current.slice(parent.length + sep_4.length)), (current = parent));
    }
  return absolutePath;
}
//@ chunk-82kqcve8.js:131582-131765 layout = isRealPathWithinTeamDir (1)
async function isRealPathWithinTeamDir(realCandidate) {
  let realTeamDir;
  try {
    realTeamDir = await realpath_2(getMemoryDirNfc().replace(/[/\\]+$/, ""));
  } catch (error) {
    let code = getErrnoCode(error);
    if (code === "ENOENT" || code === "ENOTDIR") return !0;
    return !1;
  }
  if (realCandidate === realTeamDir) return !0;
  return realCandidate.startsWith(realTeamDir + sep_4);
}
/**
 * 路径是否位于团队记忆目录内（词法判断）。
 */
//@ chunk-82kqcve8.js:131765-131864 file-local
function isTeamMemPath(filePath) {
  if (getAutoMemPathOrNull() === null) return !1;
  let resolvedPath = nfcLower(resolve_2(filePath)),
    r = nfcLower(getMemoryDirNfc());
  return resolvedPath + sep_4 === r || resolvedPath.startsWith(r);
}
/**
 * 把团队记忆键解析为绝对路径并确认（含 realpath）未逃出团队目录。
 */
//@ chunk-82kqcve8.js:131864-132114 fingerprint = validateTeamMemKey (1)
async function validateTeamMemKey(relativeKey) {
  sanitizePathKey(relativeKey);
  let teamDir = getMemoryDirNfc(),
    fullPath = join_7(teamDir, relativeKey),
    resolvedPath = resolve_2(fullPath);
  if (!resolvedPath.startsWith(teamDir))
    throw new PathTraversalError(`Key escapes team memory directory: "${relativeKey}"`);
  let realPath = await realpathDeepestExisting(resolvedPath);
  if (!(await isRealPathWithinTeamDir(realPath)))
    throw new PathTraversalError(`Key escapes team memory directory via symlink: "${relativeKey}"`);
  return resolvedPath;
}

export {
  getMemoryDirNfc,
  isTeamMemPath,
  resolveRealAutoMemPath,
  a4,
  sanitizePathKey,
  PathTraversalError,
  realpathDeepestExisting,
  getTeamMemPath,
  validateTeamMemKey,
  checkPathInTeamMemDir,
  getTeamMemFilePath,
  AJo,
};
