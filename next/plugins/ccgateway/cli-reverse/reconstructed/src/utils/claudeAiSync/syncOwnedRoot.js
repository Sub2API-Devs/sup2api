/**
 * utils/claudeAiSync/syncOwnedRoot.ts
 *
 * 2.1.316 新增：同步所属根目录的安全检查
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (34)
 * attribution: placement 31, layout 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { sep, relative, isAbsolute, join, dirname, basename } from "path";
import { lstat, stat, mkdir, mkdtemp, rename, rmdir, writeFile } from "fs/promises";
import {
  isENOENT,
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { syncBucketShape, TRASH_SUBDIR, bucketDirPath } from "../plugins/syncedItems.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { isValidKeySegment } from "../storage/storageSpaces.js";
import { storageErrorCode, formatStorageError, REMOTELINK } from "../storage/storageErrors.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { syncTrashTempPrefix, queueSyncTrashTrim } from "../plugins/syncTrash.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:639925-639989 placement
/**
 * 记录一次同步错误（ENOENT 忽略），保存 errno 码。
 */
function recordSyncError(stats, error) {
  if (!isENOENT(error)) {
    stats.errors++;
    stats.failure = getErrnoCode(error) ?? "unknown";
  }
}
//@ chunk-5xgkngpb.js:640225-640333 placement
/**
 * 把路径转成 POSIX 形式的显示标签（统一斜杠，逐段替换为可读名称）。
 */
function toPosixLabelPath(parts) {
  return parts
    .split(sep)
    .join("/")
    .replaceAll("\\", "/")
    .split("/")
    .map((part) => syncBucketShape(part) ?? part)
    .join("/");
}
//@ chunk-5xgkngpb.js:640333-640506 placement
class SyncOwnedRootRefusedError extends Error {
  reason;
  code;
  constructor(reason, options) {
    super("sync-owned root refused", {
      cause: options?.cause,
    });
    this.name = "SyncOwnedRootRefusedError";
    this.reason = reason;
    this.code = options?.code;
  }
}
//@ chunk-5xgkngpb.js:640506-640545 placement
/**
 * 同步目录名到存储命名空间的映射。
 */
var SYNC_DIR_NAMESPACES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:640506", () => {
  SYNC_DIR_NAMESPACES = new Map([["skills", "skills"]]);
});
//@ chunk-5xgkngpb.js:640545-640950 placement
/**
 * 存储 v5 启用时把配置目录下的路径映射为 userConfigDir 命名空间的作用域链（逐级），并给出管线目录；不在已知子目录下返回 undefined。
 */
function getStorageChainForPath(path, configHome, storageV5) {
  if (!(isStorageV5Enabled() && storageV5 !== undefined)) return;
  let relPath = relative(configHome, path);
  if (relPath === "" || relPath.startsWith("..") || isAbsolute(relPath)) return;
  let [dirName, ...restSegments] = relPath.split(sep).filter(Boolean);
  if (dirName === undefined) return;
  let namespace = SYNC_DIR_NAMESPACES.get(dirName);
  if (namespace === undefined || !restSegments.every(isValidKeySegment)) return;
  let chain = [
    {
      namespace: "userConfigDir",
      dir: namespace,
    },
  ];
  for (let idx = 1; idx <= restSegments.length; idx++)
    chain.push({
      namespace: "userConfigDir",
      dir: namespace,
      relPath: restSegments.slice(0, idx),
    });
  return {
    storageV5,
    chain,
    pipelineFolder: join(configHome, dirName),
  };
}
//@ chunk-5xgkngpb.js:640950-641048 placement
/**
 * 取作用域链的最后一环（最具体的作用域）。
 */
function lastScopeChainEntry(chain) {
  let last = chain.at(-1);
  if (last === undefined) throw Error("empty sync-owned scope chain");
  return last;
}
//@ chunk-5xgkngpb.js:641048-641183 placement
function unexpectedProbeAnswer(answer) {
  return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
    `sync-owned path probe: unexpected answer ${String(answer?.kind)}`,
    "sync-owned path probe: unexpected answer",
  );
}
//@ chunk-5xgkngpb.js:641183-641335 placement
function probeFailedError(error) {
  let code = storageErrorCode(error);
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `sync-owned path probe failed: ${formatStorageError(error)}`,
      "sync-owned path probe failed",
    ),
    code !== undefined
      ? {
          code,
        }
      : {},
  );
}
//@ chunk-5xgkngpb.js:641335-642205 placement
/**
 * 逐级检查同步根路径：存储 v5 下按作用域链检查（第一层允许解析到目录的链接），否则逐段 lstat；返回 real、absent、redirected 或 not_a_directory。
 */
async function probeSyncRootPath(path, configHome, storageV5) {
  let relPath = relative(configHome, path);
  if (relPath.startsWith("..") || isAbsolute(relPath)) return "redirected";
  let storageChain = getStorageChainForPath(path, configHome, storageV5);
  if (storageChain !== undefined) {
    for (let [chainIndex, scope] of storageChain.chain.entries()) {
      let scopeResult = await storageChain.storageV5.scopeKind(
        scope,
        chainIndex === 0
          ? {
              resolveLink: true,
            }
          : undefined,
      );
      if (!scopeResult.ok) {
        if (chainIndex === 0 && storageErrorCode(scopeResult.error) === REMOTELINK) {
          let folderKind = await statDirectoryKind(storageChain.pipelineFolder);
          if (folderKind !== "directory") return folderKind;
          continue;
        }
        throw probeFailedError(scopeResult.error);
      }
      let scopeInfo = scopeResult.value;
      switch (scopeInfo.kind) {
        case "directory":
          continue;
        case "absent":
          return "absent";
        case "other":
          return "not_a_directory";
        case "link":
          if (chainIndex > 0 || scopeInfo.linkResolves !== true) return "redirected";
          continue;
        default:
          throw unexpectedProbeAnswer(scopeInfo);
      }
    }
    return "real";
  }
  let current = configHome;
  for (let [segmentIndex, segment] of relPath.split(sep).filter(Boolean).entries()) {
    current = join(current, segment);
    let stats;
    try {
      stats = await lstat(current);
    } catch (error) {
      if (isENOENT(error)) return "absent";
      throw error;
    }
    if (stats.isSymbolicLink()) {
      if (segmentIndex > 0) return "redirected";
      let targetKind = await statDirectoryKind(current);
      if (targetKind !== "directory") return targetKind;
      continue;
    }
    if (!stats.isDirectory()) return "not_a_directory";
  }
  return "real";
}
//@ chunk-5xgkngpb.js:642205-642349 placement
async function statDirectoryKind(path) {
  let stats;
  try {
    stats = await stat(path);
  } catch (error) {
    if (isENOENT(error)) return "redirected";
    throw error;
  }
  return stats.isDirectory() ? "directory" : "not_a_directory";
}
//@ chunk-5xgkngpb.js:642349-642445 placement
/**
 * 同步落位使用的 staging 目录与按 pid 区分的子目录。
 */
function syncStagingPaths(root) {
  let trashDir = join(root, TRASH_SUBDIR);
  return [
    [trashDir, "staging"],
    [join(trashDir, String(process.pid)), "staging_pid"],
  ];
}
//@ chunk-5xgkngpb.js:642445-642901 placement
/**
 * 探测路径叶子的类型（absent、directory、redirected 或 not_a_directory），可走存储 v5 的作用域查询，否则用 lstat。
 */
async function probeLeafKind(path, configHome, storageV5) {
  let storageChainForPath = getStorageChainForPath(path, configHome, storageV5);
  if (storageChainForPath !== undefined) {
    let scopeResult = await storageChainForPath.storageV5.scopeKind(
      lastScopeChainEntry(storageChainForPath.chain),
    );
    if (!scopeResult.ok) throw probeFailedError(scopeResult.error);
    switch (scopeResult.value.kind) {
      case "absent":
      case "directory":
        return scopeResult.value.kind;
      case "link":
        return "redirected";
      case "other":
        return "not_a_directory";
      default:
        throw unexpectedProbeAnswer(scopeResult.value);
    }
  }
  let stats;
  try {
    stats = await lstat(path);
  } catch (error) {
    if (isENOENT(error)) return "absent";
    throw error;
  }
  if (stats.isSymbolicLink()) return "redirected";
  return stats.isDirectory() ? "directory" : "not_a_directory";
}
//@ chunk-5xgkngpb.js:642901-643498 placement
/**
 * 校验同步根：探测根路径（可选再检查暂存叶子各级），被拒或无法验证时记诊断并返回 {refused}；正常返回 real 或 absent。
 */
async function verifySyncRoot(root, claudeConfigDir, labels, { checkStagingLeaf = false, storageV5 } = {}) {
  let rootKind;
  try {
    rootKind = await probeSyncRootPath(root, claudeConfigDir, storageV5);
    if (rootKind === "real" && checkStagingLeaf)
      for (let [stagingPath, component] of syncStagingPaths(root)) {
        let leafKind = await probeLeafKind(stagingPath, claudeConfigDir, storageV5);
        if (leafKind === "absent") break;
        if (leafKind !== "directory") {
          logForDiagnosticsNoPII("warn", labels.event, {
            phase: labels.phase,
            root: toPosixLabelPath(labels.rootLabel),
            component,
            reason: leafKind,
          });
          return {
            refused: leafKind,
          };
        }
      }
  } catch (error) {
    logForDiagnosticsNoPII("warn", labels.event, {
      phase: labels.phase,
      root: toPosixLabelPath(labels.rootLabel),
      reason: "unverified",
      code: getErrnoCode(error) ?? "unknown",
    });
    return {
      refused: "unverified",
    };
  }
  switch (rootKind) {
    case "real":
    case "absent":
      return rootKind;
    case "redirected":
    case "not_a_directory":
      logForDiagnosticsNoPII("warn", labels.event, {
        phase: labels.phase,
        root: toPosixLabelPath(labels.rootLabel),
        reason: rootKind,
      });
      return {
        refused: rootKind,
      };
  }
}
//@ chunk-5xgkngpb.js:643498-643550 placement
/**
 * 来源无法校验时使用的固定原因码。
 */
function unverifiableSourceKind(sourceKind) {
  return "source_unverifiable_unknown";
}
//@ chunk-5xgkngpb.js:643550-643710 placement
async function describeVanishedSource(path) {
  try {
    return (await statDirectoryKind(path)) === "not_a_directory" ? "source_unverifiable_ENOTDIR" : "gone";
  } catch (error) {
    return `source_unverifiable_${getErrnoCode(error) ?? "unknown"}`;
  }
}
//@ chunk-5xgkngpb.js:643710-644410 placement
/**
 * 批处理目录消失后在存储中逐级向上判断原因：仍存在为 batch_dir_vanished，父级存在为 gone，遇到非目录、链接或错误则给出 source_unverifiable_*。
 */
async function diagnoseVanishedBatchDir(batch) {
  let lastScopeResult = await batch.storageV5.scopeKind(lastScopeChainEntry(batch.chain));
  if (!lastScopeResult.ok)
    return `source_unverifiable_${storageErrorCode(lastScopeResult.error) ?? "unknown"}`;
  if (lastScopeResult.value.kind !== "absent") return "batch_dir_vanished";
  for (let depth = batch.chain.length - 2; depth >= 0; depth--) {
    let parentScope = batch.chain[depth];
    if (parentScope === undefined) break;
    let parentResult = await batch.storageV5.scopeKind(
      parentScope,
      depth === 0
        ? {
            resolveLink: true,
          }
        : undefined,
    );
    if (!parentResult.ok) {
      if (depth === 0 && storageErrorCode(parentResult.error) === REMOTELINK)
        return describeVanishedSource(batch.pipelineFolder);
      return `source_unverifiable_${storageErrorCode(parentResult.error) ?? "unknown"}`;
    }
    switch (parentResult.value.kind) {
      case "absent":
        continue;
      case "directory":
        return "gone";
      case "other":
        return "source_unverifiable_ENOTDIR";
      case "link":
        if (depth === 0) return describeVanishedSource(batch.pipelineFolder);
        return "source_unverifiable_parent_link";
      default:
        return unverifiableSourceKind(parentResult.value);
    }
  }
  return "gone";
}
//@ chunk-5xgkngpb.js:644410-645477 layout
async function moveRootToTrash({ dir, trashRoot, configHome, failureEvent, storageV5 }) {
  let batchDir;
  try {
    let sourceProbe = await probeSyncRootPath(dirname(dir), configHome, storageV5);
    if (sourceProbe === "redirected" || sourceProbe === "not_a_directory") {
      let code = `source_root_${sourceProbe}`;
      logForDiagnosticsNoPII("warn", failureEvent, {
        code,
      });
      return {
        moved: false,
        code,
      };
    }
    let trashProbe = await probeSyncRootPath(trashRoot, configHome, storageV5);
    switch (trashProbe) {
      case "redirected":
      case "not_a_directory": {
        let code = `trash_root_${trashProbe}`;
        logForDiagnosticsNoPII("warn", failureEvent, {
          code,
        });
        return {
          moved: false,
          code,
        };
      }
      case "absent": {
        let storageChainForPath = getStorageChainForPath(trashRoot, configHome, storageV5);
        if (storageChainForPath !== undefined) {
          let ensureResult = await storageChainForPath.storageV5.ensureScope(
            lastScopeChainEntry(storageChainForPath.chain),
          );
          if (!ensureResult.ok) throw probeFailedError(ensureResult.error);
        } else
          await mkdir(trashRoot, {
            recursive: true,
          });
        break;
      }
      case "real":
        break;
    }
    batchDir = await mkdtemp(join(trashRoot, syncTrashTempPrefix(relative(configHome, dir))));
    let movedTo = join(batchDir, basename(dir));
    await rename(dir, movedTo);
    queueSyncTrashTrim(trashRoot, basename(batchDir));
    return {
      moved: true,
      to: movedTo,
    };
  } catch (error) {
    if (batchDir !== undefined) await rmdir(batchDir).catch(() => {});
    if (batchDir !== undefined && isENOENT(error)) {
      let failureCode = "batch_dir_vanished";
      let batch = getStorageChainForPath(dir, configHome, storageV5);
      if (batch !== undefined) {
        let diagnosis = await diagnoseVanishedBatchDir(batch);
        if (diagnosis === "gone")
          return {
            moved: true,
            to: null,
          };
        failureCode = diagnosis;
      } else
        try {
          await lstat(dir);
        } catch (error) {
          if (isENOENT(error))
            return {
              moved: true,
              to: null,
            };
          failureCode = `source_unverifiable_${getErrnoCode(error) ?? "unknown"}`;
        }
      logForDiagnosticsNoPII("warn", failureEvent, {
        code: failureCode,
      });
      return {
        moved: false,
        code: failureCode,
      };
    }
    let code = getErrnoCode(error) ?? "unknown";
    logForDiagnosticsNoPII("warn", failureEvent, {
      code,
    });
    return {
      moved: false,
      code,
    };
  }
}
//@ chunk-5xgkngpb.js:645477-645526 layout
async function moveRootToTrashOk(params) {
  return (await moveRootToTrash(params)).moved;
}
//@ chunk-5xgkngpb.js:645526-646662 placement
/**
 * 检查同步根目录未被重定向、不是符号链接、父目录正常。
 */
async function checkSyncOwnedRoot({ root, trashRoot, configHome, events, storageV5 }) {
  try {
    for (let parentDir of new Set([dirname(trashRoot), dirname(root)])) {
      let parentKind = await probeSyncRootPath(parentDir, configHome, storageV5);
      if (parentKind === "redirected" || parentKind === "not_a_directory") {
        let reason = parentKind === "redirected" ? "parent_symlink" : "parent_not_a_directory";
        logForDiagnosticsNoPII("warn", events.refused, {
          phase: "round_head",
          root: toPosixLabelPath(relative(configHome, root)),
          component: "parent",
          reason: parentKind,
        });
        throw new SyncOwnedRootRefusedError(reason);
      }
    }
    let rootKind = await probeLeafKind(root, configHome, storageV5);
    let checks = [
      [root, "root", rootKind],
      [trashRoot, "trash_root", await probeLeafKind(trashRoot, configHome, storageV5)],
    ];
    if (rootKind === "directory")
      for (let [stagingPath, component] of syncStagingPaths(root)) {
        let leafKind = await probeLeafKind(stagingPath, configHome, storageV5);
        checks.push([stagingPath, component, leafKind]);
        if (leafKind !== "directory") break;
      }
    for (let [, component, kind] of checks) {
      if (kind === "absent") continue;
      if (kind !== "directory") {
        let label = component === "staging_pid" ? "staging" : component;
        logForDiagnosticsNoPII("warn", events.refused, {
          phase: "round_head",
          root: toPosixLabelPath(relative(configHome, root)),
          component,
          reason: kind,
        });
        throw new SyncOwnedRootRefusedError(
          kind === "redirected" ? `${label}_symlink` : `${label}_not_a_directory`,
        );
      }
    }
    if (rootKind !== "directory") {
      let storageChainForPath = getStorageChainForPath(root, configHome, storageV5);
      if (storageChainForPath !== undefined) {
        let ensureResult = await storageChainForPath.storageV5.ensureScope(
          lastScopeChainEntry(storageChainForPath.chain),
        );
        if (!ensureResult.ok) throw probeFailedError(ensureResult.error);
      } else
        await mkdir(root, {
          recursive: true,
        });
    }
  } catch (error) {
    if (error instanceof SyncOwnedRootRefusedError) throw error;
    let code = getErrnoCode(error) ?? "unknown";
    logForDiagnosticsNoPII("warn", events.refused, {
      phase: "round_head",
      root: toPosixLabelPath(relative(configHome, root)),
      reason: "unverified",
      code,
    });
    throw new SyncOwnedRootRefusedError("unverified", {
      cause: error,
      code,
    });
  }
}
//@ chunk-5xgkngpb.js:646662-647069 placement
/**
 * 创建同步根守卫：verify 在落地前校验根（只要被拒过就一直拒绝），记录拒绝原因。
 */
function createSyncRootGuard({ root, rootLabel, configHome, event, storageV5 }) {
  let cachedResult = null;
  return {
    refused() {
      return cachedResult !== null;
    },
    refusedReason() {
      return cachedResult;
    },
    async verify() {
      if (cachedResult !== null) return false;
      let verifyResult = await verifySyncRoot(
        root(),
        configHome(),
        {
          event,
          phase: "landing",
          rootLabel,
        },
        {
          checkStagingLeaf: true,
          storageV5,
        },
      );
      if (verifyResult === "real") return true;
      if (verifyResult === "absent") {
        logForDiagnosticsNoPII("warn", event, {
          phase: "landing",
          root: toPosixLabelPath(rootLabel),
          reason: "absent",
        });
        cachedResult = "absent";
      } else cachedResult = verifyResult.refused;
      return false;
    },
  };
}
//@ chunk-5xgkngpb.js:647069-647115 placement
/**
 * 同步根未通过校验时抛出的错误。
 */
function rootRefusedError(reason) {
  return new SyncOwnedRootRefusedError(`landing_${reason}`);
}
//@ chunk-5xgkngpb.js:647115-647182 placement
/**
 * 同步根的初始校验状态（未读清单、新建守卫）。
 */
function freshRootState(state) {
  return {
    manifestRead: false,
    guard: createSyncRootGuard(state),
    root: state.root(),
  };
}
//@ chunk-5xgkngpb.js:647182-647289 placement
/**
 * 同步落位成功结果，以及同步根在本轮中不再通过校验时的失败结果。
 */
var SYNC_OK = {
  ok: true,
};
var ROOT_REFUSED_RESULT = {
  ok: false,
  cause: "root_refused",
  reason: "sync root no longer verifies (changed mid-round)",
};
//@ chunk-5xgkngpb.js:647289-647353 placement
/**
 * 构造解压失败的结果。
 */
function extractFailure(reason, step) {
  return {
    ok: false,
    cause: "extract",
    reason,
    step,
  };
}
//@ chunk-5xgkngpb.js:647353-647409 placement
/**
 * 构造下载失败的结果。
 */
function downloadFailure(reason) {
  return {
    ok: false,
    cause: "download",
    reason,
  };
}
//@ chunk-5xgkngpb.js:647409-647488 placement
/**
 * 另一进程正在落位同一项时的延迟结果。
 */
var DEFERRED_PLACEMENT = {
  ok: false,
  cause: "deferred",
  reason: "another process is landing this item",
};
//@ chunk-5xgkngpb.js:647488-647583 placement
/**
 * 判断 errno 是否属于目录冲突类（ENOTEMPTY/EEXIST 等）。
 */
function isDirConflictErrno(errnoCode) {
  return (
    errnoCode === "ENOTEMPTY" ||
    errnoCode === "EEXIST" ||
    errnoCode === "ENOTDIR" ||
    errnoCode === "EPERM" ||
    errnoCode === "EACCES"
  );
}
//@ chunk-5xgkngpb.js:647583-647699 placement
/**
 * 目标目录无法腾挪时的本地失败结果。
 */
var LOCAL_PLACEMENT_FAILURE = {
  ok: false,
  cause: "local",
  reason: "an existing directory at the target could not be displaced",
  step: "move_aside",
};
//@ chunk-5xgkngpb.js:647699-647848 layout
function moveInFailure(errorCode) {
  return {
    ok: false,
    cause: "local",
    reason: `the downloaded copy could not be moved into place (${errorCode ?? "unknown error"})`,
    step: "move_in",
    code: errorCode,
  };
}
//@ chunk-5xgkngpb.js:647848-648051 placement
/**
 * 把同步失败原因映射为遥测事件名（下载、根被拒、解压、本地），deferred 不上报。
 */
function getSyncFailureEvent(cause) {
  switch (cause) {
    case "download":
      return "download_failed";
    case "root_refused":
      return "root_refused";
    case "extract":
      return "extract_failed";
    case "local":
      return "local_failed";
    case "deferred":
      return null;
  }
}
//@ chunk-5xgkngpb.js:648051-648425 placement
/**
 * 把同步失败原因映射为给用户看的说明文字。
 */
function describeSyncFailure(cause) {
  switch (cause) {
    case "download":
      return "download failed";
    case "root_refused":
      return "sync root refused (a symlink or stray file is in the way, or it was removed mid-round)";
    case "extract":
      return "archive unusable";
    case "deferred":
      return "another process is landing this skill; retry shortly";
    case "local":
      return "a local filesystem error kept it from being placed on disk";
  }
}
//@ chunk-5xgkngpb.js:648425-648482 placement
/**
 * 判断同步标记文件是否存在（存在返回真）。
 */
async function hasSyncMarker(configHome, bucket) {
  return (await readSyncMarker(configHome, bucket)) === "marked";
}
//@ chunk-5xgkngpb.js:648482-648629 placement
/**
 * 读取同步标记文件是否存在：存在为 marked，不存在为 unmarked，其他错误返回不可读代码。
 */
async function readSyncMarker(root, bucketName) {
  try {
    return (await lstat(bucketDirPath(root, bucketName))).isFile() ? "marked" : "unmarked";
  } catch (error) {
    return isENOENT(error)
      ? "unmarked"
      : {
          unreadable: getErrnoCode(error) ?? "unknown",
        };
  }
}
//@ chunk-5xgkngpb.js:648629-648729 placement (2.1.88 match: tryCreateExclusive, 1)
/**
 * （误归 computerUse）以 wx 模式创建空文件，已存在则忽略。
 */
async function touchExclusive(path, content) {
  try {
    await writeFile(bucketDirPath(path, content), "", {
      flag: "wx",
    });
  } catch (e) {
    if (getErrnoCode(e) !== "EEXIST") throw e;
  }
}
export {
  verifySyncRoot,
  readSyncMarker,
  moveRootToTrashOk,
  recordSyncError,
  checkSyncOwnedRoot,
  toPosixLabelPath,
  SyncOwnedRootRefusedError,
  touchExclusive,
  freshRootState,
  ROOT_REFUSED_RESULT,
  rootRefusedError,
  downloadFailure,
  extractFailure,
  isDirConflictErrno,
  moveInFailure,
  LOCAL_PLACEMENT_FAILURE,
  hasSyncMarker,
  DEFERRED_PLACEMENT,
  moveRootToTrash,
  SYNC_OK,
  getSyncFailureEvent,
  describeSyncFailure,
};
