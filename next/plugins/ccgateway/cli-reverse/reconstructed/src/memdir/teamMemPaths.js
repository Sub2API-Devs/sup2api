/**
 * memdir/teamMemPaths.ts
 *
 * 团队/个人记忆 store 的路径计算与路径安全校验（键清洗、realpath 防逃逸）；混有大量被误配为 isRealPathWithinTeamDir 的通用 ENOENT 辅助函数。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/memdir/teamMemPaths.ts
 * pieces: chunk-a2q0x549.js (17)
 * attribution: fingerprint 5, layout 11, file-local 1
 */
import { join as join_2, sep as sep_2, dirname as dirname_2, basename, resolve } from "path";
import { realpath, lstat } from "fs/promises";
import {
  isAutoMemoryEnabled,
  getAutoMemPath,
  getAccountMemoryMirrorPath,
  getAutoMemPathOrNull,
} from "./paths.js";
import { getRootSession } from "../bootstrap/state.js";
import { parseMemoryStoresEnv } from "../services/orgMemory/memoryStores.js";
import { HostScoped } from "../utils/hostScoped.js";
import { TEAM_MEMORY_SCOPE } from "../utils/auth.js";
import { getErrnoCode } from "../utils/errors.js";
import { nfcLower } from "./memdir.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-a2q0x549.js:127518-127597 fingerprint (2.1.88 match: PathTraversalError, 1)
class PathTraversalError extends Error {
  constructor(message) {
    super(message);
    this.name = "PathTraversalError";
  }
}
//@ chunk-a2q0x549.js:127597-127695 layout
let PathUnverifiableError; // deferred: uses PathTraversalError of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a2q0x549.js:127597", () => {
  PathUnverifiableError = class PathUnverifiableError extends PathTraversalError {
    code;
    constructor(message, code) {
      super(message);
      this.code = code;
      this.name = "PathUnverifiableError";
    }
  };
});
//@ chunk-a2q0x549.js:127695-128240 fingerprint (2.1.88 match: sanitizePathKey, 1)
/**
 * 校验团队记忆相对路径键：拒绝 NUL、URL 编码与 Unicode 归一化后的穿越、绝对路径等，抛 PathTraversalError。
 */
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
//@ chunk-a2q0x549.js:128240-128285 layout
/**
 * 自动记忆开启且团队存储可用
 */
function canUseTeamMemory() {
  if (!isAutoMemoryEnabled()) return false;
  return hasTeamStore();
}
//@ chunk-a2q0x549.js:128285-128338 layout
/**
 * 当前宿主有团队记忆存储
 */
function hasTeamStore() {
  return teamStoreProbeSlot.of(getRootSession().host).hasTeamStore();
}
//@ chunk-a2q0x549.js:128338-128543 layout
class TeamStoreProbe {
  raw = undefined;
  valid = false;
  hasTeamStore() {
    let envClaudeMemoryStores = process.env.CLAUDE_MEMORY_STORES;
    if (envClaudeMemoryStores !== this.raw) {
      this.raw = envClaudeMemoryStores;
      try {
        this.valid = parseMemoryStoresEnv()?.some((store) => store.scope === "team") ?? false;
      } catch {
        this.valid = false;
      }
    }
    return this.valid;
  }
}
//@ chunk-a2q0x549.js:128543-128568 layout
/**
 * HostScoped 的团队存储探测
 */
var teamStoreProbeSlot; // deferred: uses TeamStoreProbe of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a2q0x549.js:128543", () => {
  teamStoreProbeSlot = new HostScoped(() => new TeamStoreProbe());
});
//@ chunk-a2q0x549.js:128568-128623 layout (2.1.88 match: setCwdState, 1)
function getMemoryDirNfc() {
  return (join_2(getAutoMemPath(), TEAM_MEMORY_SCOPE) + sep_2).normalize("NFC");
}
//@ chunk-a2q0x549.js:128623-128762 fingerprint (2.1.88 match: getTeamMemPath, 0.73)
/**
 * 记忆 store 的本地目录：user→自动记忆目录，account→<配置目录>/memory/personal/，team→<自动记忆目录>/team/<mount>/。
 */
function getTeamMemPath(store) {
  switch (store.scope) {
    case "user":
      return getAutoMemPath();
    case "account":
      return getAccountMemoryMirrorPath();
    case "team":
      return (join_2(getMemoryDirNfc(), store.mount) + sep_2).normalize("NFC");
  }
}
//@ chunk-a2q0x549.js:128762-128814 layout
function getTeamMemFilePath(store, relativePath) {
  return join_2(getTeamMemPath(store), ...relativePath.split("/"));
}
//@ chunk-a2q0x549.js:128814-128850 layout
var stripTrailingSeparators = (path) => path.replace(/[/\\]+$/, "");
//@ chunk-a2q0x549.js:128850-128932 layout
async function resolveRealAutoMemPath(...rest) {
  let autoMemPath = stripTrailingSeparators(getAutoMemPath());
  let realParent = await realpath(dirname_2(autoMemPath));
  return join_2(realParent, basename(autoMemPath), ...rest);
}
//@ chunk-a2q0x549.js:128932-129108 layout
async function checkPathInTeamMemDir(filePath, ...rest) {
  try {
    let realAutoMemPath = await resolveRealAutoMemPath(...rest);
    return (await realpath(stripTrailingSeparators(filePath))) === realAutoMemPath ? "ok" : "escape";
  } catch (error) {
    let code = getErrnoCode(error);
    if (code === "ENOENT" || code === "ENOTDIR") return "absent";
    return "escape";
  }
}
//@ chunk-a2q0x549.js:129108-129651 fingerprint (2.1.88 match: realpathDeepestExisting, 1)
/**
 * 对最深的已存在祖先做 realpath，再拼回不存在的部分；检测悬空符号链接。
 */
async function realpathDeepestExisting(absolutePath) {
  let tail = [];
  let current = absolutePath;
  for (let parent = dirname_2(current); current !== parent; parent = dirname_2(current))
    try {
      let realCurrent = await realpath(current);
      return tail.length === 0 ? realCurrent : join_2(realCurrent, ...tail.reverse());
    } catch (e) {
      let code = getErrnoCode(e);
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
      tail.push(current.slice(parent.length + sep_2.length));
      current = parent;
    }
  return absolutePath;
}
//@ chunk-a2q0x549.js:129651-129834 layout (2.1.88 match: isRealPathWithinTeamDir, 1)
async function isRealPathWithinTeamDir(realCandidate) {
  let realTeamDir;
  try {
    realTeamDir = await realpath(getMemoryDirNfc().replace(/[/\\]+$/, ""));
  } catch (e) {
    let code = getErrnoCode(e);
    if (code === "ENOENT" || code === "ENOTDIR") return true;
    return false;
  }
  if (realCandidate === realTeamDir) return true;
  return realCandidate.startsWith(realTeamDir + sep_2);
}
//@ chunk-a2q0x549.js:129834-129933 file-local
/**
 * 路径是否位于团队记忆目录内（词法判断）。
 */
function isTeamMemPath(filePath) {
  if (getAutoMemPathOrNull() === null) return false;
  let resolvedPath = nfcLower(resolve(filePath));
  let teamDir = nfcLower(getMemoryDirNfc());
  return resolvedPath + sep_2 === teamDir || resolvedPath.startsWith(teamDir);
}
//@ chunk-a2q0x549.js:129933-130183 fingerprint (2.1.88 match: validateTeamMemKey, 1)
/**
 * 把团队记忆键解析为绝对路径并确认（含 realpath）未逃出团队目录。
 */
async function validateTeamMemKey(relativeKey) {
  sanitizePathKey(relativeKey);
  let teamDir = getMemoryDirNfc();
  let fullPath = join_2(teamDir, relativeKey);
  let resolvedPath = resolve(fullPath);
  if (!resolvedPath.startsWith(teamDir))
    throw new PathTraversalError(`Key escapes team memory directory: "${relativeKey}"`);
  let realPath = await realpathDeepestExisting(resolvedPath);
  if (!(await isRealPathWithinTeamDir(realPath)))
    throw new PathTraversalError(`Key escapes team memory directory via symlink: "${relativeKey}"`);
  return resolvedPath;
}
export {
  getMemoryDirNfc,
  canUseTeamMemory,
  isTeamMemPath,
  getTeamMemPath,
  PathTraversalError,
  validateTeamMemKey,
  checkPathInTeamMemDir,
  getTeamMemFilePath,
  resolveRealAutoMemPath,
  hasTeamStore,
  sanitizePathKey,
  realpathDeepestExisting,
};
