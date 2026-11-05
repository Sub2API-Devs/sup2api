/**
 * utils/hooks/servedHooks/hookSandbox.ts
 *
 * 2.1.316 新增：项目钩子沙箱（bwrap/sandbox-exec）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (52)
 * attribution: placement 52
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { lstat, readFile, realpath, open, mkdtemp, writeFile, unlink, rm, rmdir } from "fs/promises";
import { isAbsolute, dirname, basename, join } from "path";
import { constants } from "fs";
import { userInfo, tmpdir as tmpdir_2 } from "os";
import { execFileNoThrow } from "../../execFileNoThrow.js";
import {
  getDefaultWritePaths,
  removeTrailingGlobSuffix,
} from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { getPlatform } from "../../platform.js";
import { getLatchedPreSettingsEnvSnapshot } from "../../managedEnvApply.js";
import { checkScriptFile, isSameCommandPath } from "../hookCommandAnalysis.js";
import { getErrnoCode, errorMessage } from "../../errors.js";
import { logForDebugging } from "../../debug.js";
import { shellQuoteArgs } from "../../bash/bashPipeCommand.js";
import { tmpdir, claudeTempDir } from "../../tempDir.js";
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../../../services/analytics/growthbook.js";
import { logError } from "../../log.js";
import { isViolinWoodEnabledCached } from "../../../services/analytics/violinGates.js";
import { createRealpathCache as createRealpathCache_2 } from "../../permissions/claudeStatePaths.js";
import {
  SandboxManager,
  getEffectiveFilesystemPolicy,
  isFilesystemIsolationDisabledBySetting,
} from "../../sandbox/sandbox-adapter.js";
import { secondRootMounts } from "../../wslMounts.js";
import { getFsImplementation, getPathsForPermissionCheck } from "../../fsOperations.js";
import { isPathWithinCaseAware, isSameOrUnderPath, isPathUnder as isPathUnder_2 } from "../../pathPrefix.js";
import { normalizeCaseForComparison, normalizeCaseForComparison_2 } from "../../permissions/filesystem.js";
import { APPLY_SECCOMP_FD, seccompExecPlan } from "../../sandbox/linuxSandboxExec.js";
import {
  capabilityArgs,
  processHasBoundingCapability,
  CAP_SETFCAP,
} from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/linux-sandbox-utils.js";
import { identity as identity_2 } from "../../identity.js";
import { resolveProgramOnPathInReach } from "../hookCommandResolution.js";
import { getApplySeccompBinaryPath_2 } from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/generate-seccomp-filter.js";
import { anyPairMatches } from "../../settings/stickyRoots.js";
import { weakensSandboxIsolation } from "../../../remote/tools/servedCallLog.js";
import { parseRuleString } from "../../permissions/permissionRuleParser.js";
import { READ } from "../../../tools/FileReadTool/constants.js";
import { SETTING_SOURCES } from "../../settings/constants.js";
import { getSettingsForSourceTightenOnly } from "../../settings/settings.js";
import { wrapCommandWithSandboxMacOS } from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/macos-sandbox-utils.js";
import { quote } from "../../../../vendor/@anthropic-ai/sandbox-runtime/dist/utils/shell-quote.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:897971-898000 placement
var GROUP_WRITE_BIT = 18;
var STICKY_BIT = 512;
var NOBODY_UID = 65534;
//@ chunk-5xgkngpb.js:898000-898139 placement
function privateDirFingerprint(dirPath, deps) {
  return deps.statNoFollow(dirPath).then(
    (stats) =>
      stats.isDirectory() && stats.uid === deps.uid && (stats.mode & 511) === 448
        ? `${stats.dev}:${stats.ino}`
        : null,
    () => null,
  );
}
//@ chunk-5xgkngpb.js:898139-898358 placement
function createTmpBaseCheck(deps) {
  return {
    held: async (dirPath) => {
      try {
        let stats = await deps.statNoFollow(dirPath);
        return (
          ((stats.mode & GROUP_WRITE_BIT) === 0 || (stats.mode & STICKY_BIT) !== 0) &&
          (stats.uid === 0 || stats.uid === deps.uid || stats.uid === (await deps.overflowUid()))
        );
      } catch {
        return true;
      }
    },
    fingerprint: (dirPath) => privateDirFingerprint(dirPath, deps),
  };
}
//@ chunk-5xgkngpb.js:898358-898536 placement
function defaultTmpBaseCheck() {
  return createTmpBaseCheck({
    uid: process.getuid?.() ?? -1,
    statNoFollow: lstat,
    overflowUid: () =>
      readFile("/proc/sys/kernel/overflowuid", "utf8").then(
        (file) => Number.parseInt(file, 10) || NOBODY_UID,
        () => NOBODY_UID,
      ),
  });
}
//@ chunk-5xgkngpb.js:898536-898800 placement
function fallbackTmpBaseCandidates(hook, uid, latchedPreSettingsEnvSnapshot) {
  let replaced = latchedPreSettingsEnvSnapshot?.TMPDIR?.replace(/\/+$/, "");
  let extraCandidates =
    hook !== "macos"
      ? [
          {
            label: "runtime",
            path: `/run/user/${uid}`,
            walkAncestors: false,
          },
        ]
      : replaced !== undefined && isAbsolute(replaced)
        ? [
            {
              label: "start_tmpdir",
              path: replaced,
              walkAncestors: true,
            },
          ]
        : [];
  return [
    {
      label: "var_tmp",
      path: "/var/tmp",
      walkAncestors: false,
    },
    ...extraCandidates,
  ];
}
//@ chunk-5xgkngpb.js:898800-899418 placement
/**
 * 检查备用临时目录各级父目录的属主与链接情况，确认可安全作为沙箱临时根。
 */
async function vetFallbackTmpBases(candidates, fs) {
  let isClosedAbove = async (startPath, allowSticky) => {
    for (
      let dirPath = startPath, previousPath = "";
      dirPath !== previousPath;
      previousPath = dirPath, dirPath = dirname(dirPath)
    ) {
      let stats = await fs.statNoFollow(dirPath);
      if (
        (stats.uid !== 0 && stats.uid !== fs.uid) ||
        (stats.isSymbolicLink()
          ? !allowSticky
          : !stats.isDirectory() ||
            ((stats.mode & GROUP_WRITE_BIT) !== 0 && !(allowSticky && (stats.mode & STICKY_BIT) !== 0)))
      )
        return false;
    }
    return true;
  };
  let fingerprint = (dirPath) => privateDirFingerprint(dirPath, fs);
  let verified = [];
  for (let { label, path, walkAncestors } of candidates)
    try {
      if (walkAncestors && !(await isClosedAbove(path, true))) continue;
      let realPath = await fs.realpath(path);
      let stats = await fs.statNoFollow(realPath);
      if (
        stats.isDirectory() &&
        ((stats.uid === fs.uid && (stats.mode & GROUP_WRITE_BIT) === 0) ||
          (stats.uid === 0 && (stats.mode & STICKY_BIT) !== 0)) &&
        (!walkAncestors || (await isClosedAbove(dirname(realPath), true)))
      )
        verified.push({
          label,
          real: realPath,
          canExecute: fs.canExecute,
          fingerprint,
          closedAbove: () => isClosedAbove(realPath, false).catch(() => false),
        });
    } catch {}
  return verified;
}
//@ chunk-5xgkngpb.js:899418-899659 placement
function sandboxProbeDepsForUid(uid) {
  return {
    uid,
    realpath,
    statNoFollow: lstat,
    canExecute: async (executable) =>
      (
        await execFileNoThrow(executable, [], {
          env: {
            USER_TYPE: "external",
            NODE_ENV: "production",
          },
          extendEnv: false,
          timeout: 5000,
          useCwd: false,
          stdin: "ignore",
          stdout: "ignore",
          stderr: "ignore",
        })
      ).code === 0,
  };
}
//@ chunk-5xgkngpb.js:899659-899709 placement
function canApplyBackend() {
  try {
    getDefaultWritePaths();
    return true;
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:899709-899824 placement
async function getFallbackTmpBases(canApply = canApplyBackend) {
  let uid = process.getuid?.();
  if (uid === undefined || !canApply()) return [];
  return vetFallbackTmpBases(
    fallbackTmpBaseCandidates(getPlatform(), uid, getLatchedPreSettingsEnvSnapshot()),
    sandboxProbeDepsForUid(uid),
  );
}
//@ chunk-5xgkngpb.js:899824-900214 placement
/**
 * 校验固定的脚本：真实路径未变、内容摘要一致，否则返回原因。
 */
async function verifyPinnedScript(pinned, deps) {
  let realPath;
  try {
    realPath = await deps.realpath(pinned.path);
  } catch {
    return {
      ok: false,
      reason: "unreadable",
    };
  }
  if (realPath !== pinned.realPath)
    return {
      ok: false,
      reason: "relocated",
      realPath,
    };
  let checked = await checkScriptFile(realPath, {
    open: deps.openNoFollow,
  });
  if (!checked.ok)
    return {
      ok: false,
      reason: checked.reason,
      realPath,
    };
  return checked.sha256 === pinned.sha256
    ? {
        ok: true,
        bytes: checked.bytes,
        realPath,
      }
    : {
        ok: false,
        reason: "changed",
        realPath,
        current: {
          sha256: checked.sha256,
          bytes: checked.bytes,
        },
      };
}
//@ chunk-5xgkngpb.js:900214-900355 placement
var CLAUDE_DEVICE_HOOKS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEVICE_HOOK_STAGING_PREFIX;
var EXECUTE_PROBE_DIRNAME;
var buffer_3;
var RESOURCE_EXHAUSTION_ERRNOS;
deferInit("chunk-5xgkngpb.js:900214", () => {
  CLAUDE_DEVICE_HOOKS = "claude-device-hooks-";
  DEVICE_HOOK_STAGING_PREFIX = "run+";
  EXECUTE_PROBE_DIRNAME = "execute+probe";
  buffer_3 = Buffer.from(`#!/bin/sh
exit 0
`);
  RESOURCE_EXHAUSTION_ERRNOS = new Set(["EMFILE", "ENFILE", "ENOMEM"]);
});
//@ chunk-5xgkngpb.js:900355-900396 placement
function isResourceExhaustionErrno(error) {
  return RESOURCE_EXHAUSTION_ERRNOS.has(getErrnoCode(error) ?? "");
}
//@ chunk-5xgkngpb.js:900396-900499 placement
function safeScriptFileName(scriptPath) {
  let replaced = basename(scriptPath).replace(/[^A-Za-z0-9._-]/g, "_");
  return replaced === "" || replaced === "." || replaced === ".." ? "hook" : replaced;
}
//@ chunk-5xgkngpb.js:900499-904881 placement
/**
 * 暂存设备钩子：把校验过的钩子副本放到只有本人可写的目录。
 */
function stageDeviceHooks(deps, sessionDirs) {
  let stagingPromise = null;
  let placeholderPromises = new Map();
  let fallbackRealDirs = [];
  let skippedDirs = new Set();
  let fallbackDirs = new Set();
  let fallbackFailed = false;
  let stageCounter = 0;
  let disposed = false;
  let isInSessionDirs = (dirs) =>
    sessionDirs().some((sessionDir) => dirs.some((dir) => isSameCommandPath(dir, sessionDir)));
  let removeDirQuietly = (dirPath, realPath = dirPath) =>
    (isInSessionDirs([dirPath, realPath]) ? deps.rmdir(dirPath) : deps.rm(dirPath)).catch(() => {});
  let giveUpDir = (dirPath) => {
    if (disposed) removeDirQuietly(dirPath);
    else skippedDirs.add(dirPath);
  };
  let abandonFallbackDir = (realPath, why) => {
    if (skippedDirs.has(realPath)) return;
    logForDebugging(
      `[deviceHooks] a fallback folder closed to other users is given up (${why}): verified hook copies are kept in the order used before`,
    );
    fallbackFailed = true;
    giveUpDir(realPath);
    let previousStaging = stagingPromise;
    stagingPromise = null;
    placeholderPromises.clear();
    previousStaging?.then(
      ({ real }) => giveUpDir(real),
      () => {},
    );
  };
  let ensureStaging = () => {
    if (disposed) return Promise.reject(Error("device hook staging is disposed"));
    return (stagingPromise ??= (async () => {
      let tryBase = async (base) => {
        if (isInSessionDirs([base.real])) return null;
        let createdDir = await deps.mkdtemp(join(base.real, CLAUDE_DEVICE_HOOKS)).catch(() => null);
        if (createdDir === null) return null;
        let realDir = await deps.realpath(createdDir).catch(() => null);
        let fingerprint = null;
        if (realDir !== null && dirname(realDir) === base.real && !isInSessionDirs([realDir, createdDir])) {
          let probePath = join(realDir, EXECUTE_PROBE_DIRNAME);
          let canExecute = await deps
            .writeFileExclusive(probePath, buffer_3, 448)
            .then(() => base.canExecute(probePath))
            .catch(() => false);
          await deps.unlink(probePath).catch(() => {});
          fingerprint = canExecute ? await base.fingerprint(realDir) : null;
          if (!canExecute)
            logForDebugging(
              `[deviceHooks] a file under the ${base.label} fallback folder did not run (mounted noexec?): verified hook copies are not kept there`,
            );
        }
        if (realDir === null || fingerprint === null) {
          await removeDirQuietly(createdDir, realDir ?? createdDir);
          return null;
        }
        logForDebugging(
          `[deviceHooks] verified hook copies are kept under the ${base.label} fallback folder`,
        );
        return {
          real: realDir,
          created: createdDir,
          stillOurs: async () => (await base.fingerprint(realDir)) === fingerprint,
        };
      };
      let fallbackBases = await deps.fallbackBases().catch(() => []);
      let closedBases = [];
      for (let base of fallbackBases) if (await base.closedAbove()) closedBases.push(base);
      fallbackRealDirs = closedBases.map((base) => base.real);
      let triedBases = new Set();
      for (let base of closedBases) {
        if (fallbackFailed) break;
        triedBases.add(base);
        let staged = await tryBase(base);
        if (staged !== null && fallbackFailed) await removeDirQuietly(staged.real, staged.created);
        else if (staged !== null) {
          fallbackDirs.add(staged.real);
          return staged;
        }
      }
      let fallbackError = Error("no private directory for verified hook copies on this machine");
      let tmpDir = await deps.mkdtemp(join(deps.tmpBase(), CLAUDE_DEVICE_HOOKS)).catch((error) => {
        if (isResourceExhaustionErrno(error)) throw error;
        fallbackError = error;
        return null;
      });
      let tmpStaging = null;
      if (tmpDir !== null) {
        let tmpReal = await deps.realpath(tmpDir);
        if (isInSessionDirs([tmpReal, tmpDir])) await removeDirQuietly(tmpReal, tmpDir);
        else
          tmpStaging = {
            real: tmpReal,
            created: tmpDir,
          };
      }
      let markTmpStaging = async (staging) => ({
        ...staging,
        stillOurs:
          (await deps.tmpBaseCheck.fingerprint(staging.real)) === null
            ? null
            : async () => (await deps.tmpBaseCheck.fingerprint(staging.real)) !== null,
      });
      if (tmpStaging !== null && (await deps.tmpBaseCheck.held(dirname(tmpStaging.real))))
        return markTmpStaging(tmpStaging);
      for (let base of fallbackBases) {
        let staged = triedBases.has(base) ? null : await tryBase(base);
        if (staged !== null) {
          if (tmpStaging !== null) await removeDirQuietly(tmpStaging.real, tmpStaging.created);
          return staged;
        }
      }
      if (tmpStaging !== null) {
        logForDebugging(
          "[deviceHooks] verified hook copies are kept under a temp folder that other users can write: no fallback folder qualified",
          {
            level: "warn",
          },
        );
        return markTmpStaging(tmpStaging);
      }
      throw fallbackError;
    })().catch((error) => {
      stagingPromise = null;
      throw error;
    }));
  };
  let ensureStagingDirWithRetry = async () => {
    for (let retried = false, attempt = 0; ; attempt += 1) {
      let promise = ensureStaging();
      let { real, created, stillOurs } = await promise;
      let wasFallback = fallbackDirs.has(real);
      if (isInSessionDirs([real, created]))
        throw Error("the directory for verified hook copies is now where the cloud session can write");
      if (stillOurs === null || (await stillOurs())) return real;
      if (stagingPromise === promise) {
        stagingPromise = null;
        placeholderPromises.clear();
      }
      if (wasFallback && retried && attempt < 8) {
        abandonFallbackDir(real, "its directories do not read as the ones just made");
        continue;
      }
      if (wasFallback) giveUpDir(real);
      else fallbackFailed = false;
      if (retried)
        throw Error("the directory for verified hook copies is no longer the one this process made");
      retried = true;
    }
  };
  let withStaging = async (handler) => {
    let dir = await ensureStagingDirWithRetry();
    try {
      return await handler(dir);
    } catch (error) {
      if (!fallbackDirs.has(dir) || isResourceExhaustionErrno(error) || isInSessionDirs([dir])) throw error;
      abandonFallbackDir(dir, "it could not be written");
      return handler(await ensureStagingDirWithRetry());
    }
  };
  return {
    async stage(scriptKey, contents, scriptName) {
      let filePath = await withStaging(async (dir) => {
        stageCounter += 1;
        let filePath = join(
          dir,
          `${scriptKey.slice(0, 16)}-${stageCounter}-${safeScriptFileName(scriptName)}`,
        );
        await deps.writeFileExclusive(filePath, contents, 448);
        return filePath;
      });
      let released = false;
      return {
        path: filePath,
        async release() {
          if (released) return;
          released = true;
          await deps.unlink(filePath).catch(() => {});
        },
      };
    },
    async runDirectory() {
      let rethrowUnlessExhaustion = (error) => {
        if (isResourceExhaustionErrno(error)) throw error;
        return null;
      };
      let makeDir = async (parentDir, name, requireWithinParent) => {
        let createdDir = await deps.mkdtemp(join(parentDir, name)).catch(rethrowUnlessExhaustion);
        if (createdDir === null) return null;
        let realDir = await deps.realpath(createdDir).catch(rethrowUnlessExhaustion);
        if (
          realDir === null ||
          isInSessionDirs([realDir, createdDir]) ||
          (requireWithinParent && dirname(realDir) !== parentDir)
        ) {
          await removeDirQuietly(createdDir, realDir ?? createdDir);
          return null;
        }
        if (requireWithinParent) skippedDirs.add(realDir);
        return {
          path: realDir,
          release: async () => {
            skippedDirs.delete(realDir);
            await removeDirQuietly(realDir, createdDir);
          },
        };
      };
      return withStaging(async (stagingDir) => {
        for (let base of fallbackRealDirs) {
          let madeDir = isInSessionDirs([base])
            ? null
            : await makeDir(base, CLAUDE_DEVICE_HOOKS + DEVICE_HOOK_STAGING_PREFIX, true);
          if (madeDir !== null) return madeDir;
        }
        let madeDir = await makeDir(stagingDir, DEVICE_HOOK_STAGING_PREFIX, false);
        if (madeDir === null)
          throw Error("no private directory for a forwarded hook to start in on this machine");
        return madeDir;
      });
    },
    async placeholder(scriptName) {
      return withStaging((dir) => {
        let filePath = join(dir, safeScriptFileName(scriptName));
        let promise = placeholderPromises.get(filePath);
        if (promise === undefined) {
          promise = deps
            .writeFileExclusive(filePath, Buffer.alloc(0), 384)
            .then(() => filePath)
            .catch((error) => {
              placeholderPromises.delete(filePath);
              throw error;
            });
          placeholderPromises.set(filePath, promise);
        }
        return promise;
      });
    },
    async dispose() {
      disposed = true;
      let previousStaging = stagingPromise;
      stagingPromise = null;
      placeholderPromises.clear();
      let pendingRemovals = [...skippedDirs];
      skippedDirs.clear();
      await Promise.all(pendingRemovals.map((dirPath) => removeDirQuietly(dirPath)));
      if (previousStaging === null) return;
      let staging = await previousStaging.catch(() => null);
      if (staging !== null) await removeDirQuietly(staging.real, staging.created);
    },
  };
}
//@ chunk-5xgkngpb.js:904881-905103 placement
function replaceCommandProgram(invocation, site, program) {
  switch (site.form) {
    case "shell":
      return {
        ...invocation,
        command:
          invocation.command.slice(0, site.start) +
          shellQuoteArgs([program]) +
          invocation.command.slice(site.end),
      };
    case "exec":
      return site.slot === "command"
        ? {
            ...invocation,
            command: program,
          }
        : {
            ...invocation,
            args: [program, ...(invocation.args ?? []).slice(1)],
          };
  }
}
//@ chunk-5xgkngpb.js:905103-905217 placement
function scriptFileReaderDeps() {
  return {
    realpath,
    openNoFollow: (filePath) =>
      open(filePath, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK),
    lstat,
  };
}
//@ chunk-5xgkngpb.js:905217-905429 placement
function stagingFsDeps() {
  return {
    tmpBase: tmpdir,
    tmpBaseCheck: defaultTmpBaseCheck(),
    fallbackBases: getFallbackTmpBases,
    mkdtemp,
    realpath,
    writeFileExclusive: (filePath, data, mode) =>
      writeFile(filePath, data, {
        mode,
        flag: "wx",
      }),
    unlink,
    rm: (targetPath) =>
      rm(targetPath, {
        recursive: true,
        force: true,
      }),
    rmdir,
  };
}
//@ chunk-5xgkngpb.js:905429-905615 placement
/**
 * 判断 tengu_violin_overstand 开关是否显式开启（非 override 来源）。
 */
function isViolinOverstandOn() {
  try {
    let { value: featureValue, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      "tengu_violin_overstand",
      false,
    );
    return featureValue === true && source !== "override";
  } catch (error) {
    logError(
      Error("tengu_violin_overstand could not be read", {
        cause: error,
      }),
    );
    return false;
  }
}
//@ chunk-5xgkngpb.js:905615-905642 placement
var TENGU_VIOLIN_PEG = "tengu_violin_peg";
//@ chunk-5xgkngpb.js:905642-905699 placement
/**
 * 判断 tengu_violin_peg 开关是否开启（依赖 violin 总开关）。
 */
function isViolinPegOn() {
  try {
    return isViolinWoodEnabledCached() && getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VIOLIN_PEG, false);
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:905740-905768 placement
var TENGU_VIOLIN_HEEL = "tengu_violin_heel";
//@ chunk-5xgkngpb.js:905768-905872 placement
function isLinuxHookSandboxEnabled() {
  try {
    let { value: featureValue, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      TENGU_VIOLIN_HEEL,
      false,
    );
    return featureValue === true && source !== "override" && isViolinPegOn();
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:905872-905902 placement
var TENGU_VIOLIN_SADDLE = "tengu_violin_saddle";
//@ chunk-5xgkngpb.js:905902-906006 placement
function isPersonSandboxHookEnabled() {
  try {
    let { value: featureValue, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      TENGU_VIOLIN_SADDLE,
      false,
    );
    return featureValue === true && source !== "override" && isViolinPegOn();
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:906036-906075 placement
/**
 * 严格模式的 realpath 缓存（出错不记录）。
 */
function strictRealpathCache() {
  return createRealpathCache_2(cautiousPathDeps(() => {}));
}
//@ chunk-5xgkngpb.js:906075-906144 placement
function cautiousPathCache() {
  let vouched = true;
  return {
    paths: createRealpathCache_2(
      cautiousPathDeps(() => {
        vouched = false;
      }),
    ),
    vouched,
  };
}
//@ chunk-5xgkngpb.js:906144-906286 placement
/**
 * 判断严格沙箱是否已完整配置（文件系统策略为 strict 且无放行目录）。
 */
function isStrictSandboxFullyConfigured() {
  let filesystem = SandboxManager.getConfig()?.filesystem;
  if (
    filesystem === undefined ||
    filesystem.disabled === true ||
    getEffectiveFilesystemPolicy() !== "strict" ||
    secondRootMounts().length > 0
  )
    return false;
  return cautiousPathCache().vouched;
}
//@ chunk-5xgkngpb.js:906286-906780 placement
/**
 * 构造只在文件存在时返回真实路径的辅助对象，遇到团队目录内错误时忽略。
 */
function cautiousPathDeps(onUnexpectedError) {
  return {
    realpathIfExists(filePath) {
      try {
        getFsImplementation().statSync(filePath);
      } catch (error) {
        if (isRealPathWithinTeamDir(error)) return;
        onUnexpectedError();
        return filePath;
      }
      return getPathsForPermissionCheck(filePath).at(-1) ?? filePath;
    },
    namesIn(dirPath) {
      let entries;
      try {
        entries = getFsImplementation().readdirSync(dirPath);
      } catch (error) {
        if (!isRealPathWithinTeamDir(error)) onUnexpectedError();
        return;
      }
      return entries.flatMap((entry) => {
        if (entry.isFile() || entry.isDirectory()) return [entry.name];
        if (
          entry.isSymbolicLink() ||
          entry.isFIFO() ||
          entry.isSocket() ||
          entry.isBlockDevice() ||
          entry.isCharacterDevice()
        )
          return [];
        try {
          let stats = getFsImplementation().lstatSync(join(dirPath, entry.name));
          return stats.isFile() || stats.isDirectory() ? [entry.name] : [];
        } catch (error) {
          if (!isRealPathWithinTeamDir(error)) onUnexpectedError();
          return [];
        }
      });
    },
  };
}
//@ chunk-5xgkngpb.js:906780-906842 placement (2.1.88 match: isRealPathWithinTeamDir, 1)
function isRealPathWithinTeamDir(realCandidate) {
  let code = getErrnoCode(realCandidate);
  return code === "ENOENT" || code === "ENOTDIR";
}
//@ chunk-5xgkngpb.js:907001-907417 placement
/**
 * 沙箱使用的 shell 及默认可读的系统目录列表。
 */
var SANDBOX_SHELL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SYSTEM_READONLY_PATHS;
var SYSTEM_REAL_PREFIXES;
var MIN_BWRAP_VERSION;
deferInit("chunk-5xgkngpb.js:907001", () => {
  SANDBOX_SHELL = "/bin/sh";
  SYSTEM_READONLY_PATHS = [
    ...["/usr", "/usr/local"].flatMap((prefix) =>
      ["bin", "sbin", "lib", "lib32", "lib64", "libx32", "libexec", "share"].map(
        (subdir) => `${prefix}/${subdir}`,
      ),
    ),
    "/bin",
    "/sbin",
    "/lib",
    "/lib32",
    "/lib64",
    "/libx32",
    "/etc/alternatives",
    "/etc/ld.so.cache",
    "/etc/ld.so.conf",
    "/etc/ld.so.conf.d",
    "/etc/passwd",
    "/etc/group",
    "/etc/nsswitch.conf",
    "/etc/localtime",
  ];
  SYSTEM_REAL_PREFIXES = ["/usr", "/bin", "/sbin", "/lib", "/lib32", "/lib64", "/libx32"];
  MIN_BWRAP_VERSION = "0.10.0";
});
//@ chunk-5xgkngpb.js:907417-907536 placement
function parseVersionNumber(versionText) {
  let match = /(\d+)\.(\d+)\.(\d+)/.exec(versionText);
  return match === null ? -1 : Number(match[1]) * 1e6 + Number(match[2]) * 1000 + Number(match[3]);
}
//@ chunk-5xgkngpb.js:907536-907615 placement
/**
 * 归一化大小写与 NFKC 后判断两路径是否相同或包含。
 */
function isPathWithinNormalizedCase(pathA, pathB) {
  return isPathWithinCaseAware(
    normalizeCaseForComparison(pathA.normalize("NFKC")),
    normalizeCaseForComparison(pathB.normalize("NFKC")),
    false,
  );
}
//@ chunk-5xgkngpb.js:907615-907839 placement
var SECCOMP_HELPER_PATH; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FIRST_ROOT_FD;
var MAX_INHERITED_FD;
var MAX_SANDBOX_ROOTS;
var OOM_SCORE_ADJ_PREFIX;
var CLOSE_INHERITED_FDS_COMMAND;
deferInit("chunk-5xgkngpb.js:907615", () => {
  SECCOMP_HELPER_PATH = "/run/claude-hook/apply-seccomp";
  FIRST_ROOT_FD = APPLY_SECCOMP_FD + 1;
  MAX_INHERITED_FD = 9;
  MAX_SANDBOX_ROOTS = MAX_INHERITED_FD - FIRST_ROOT_FD;
  OOM_SCORE_ADJ_PREFIX = "echo 1000 > /proc/self/oom_score_adj || exit 126; ";
  CLOSE_INHERITED_FDS_COMMAND = `command exec ${Array.from(
    {
      length: MAX_INHERITED_FD - APPLY_SECCOMP_FD + 1,
    },
    (ignored, index) => `${APPLY_SECCOMP_FD + index}<&-`,
  ).join(" ")} || exit 126; `;
});
//@ chunk-5xgkngpb.js:907839-907987 placement
function sandboxRootFdBindings(options) {
  return [
    ...options.roots.map((root) => ({
      real: root.real,
      flag: "--ro-bind-fd",
    })),
    {
      real: options.privateTmp,
      flag: "--bind-fd",
    },
  ].map((binding, index) => ({
    ...binding,
    fd: FIRST_ROOT_FD + index,
  }));
}
//@ chunk-5xgkngpb.js:907987-908632 placement
/**
 * 为沙箱化的钩子构造 bwrap 参数（新会话、独立命名空间等）。
 */
function buildBwrapArgs(options, capabilityArgs) {
  return [
    "--new-session",
    "--die-with-parent",
    "--unshare-user",
    "--unshare-pid",
    "--unshare-net",
    "--unshare-ipc",
    "--unshare-uts",
    "--unshare-cgroup-try",
    "--hostname",
    "localhost",
    ...capabilityArgs,
    ...options.system.flatMap((viewPath) => ["--ro-bind-try", viewPath.real, viewPath.at]),
    ...options.homes.flatMap((home) => ["--tmpfs", home]),
    ...sandboxRootFdBindings(options).flatMap((binding) => [binding.flag, String(binding.fd), binding.real]),
    ...options.roots.flatMap((root) => root.alsoAt.flatMap((alsoAt) => ["--symlink", root.real, alsoAt])),
    ...(options.seccomp.kind === "file"
      ? ["--ro-bind", options.seccomp.path, SECCOMP_HELPER_PATH]
      : ["--setenv", "ARGV0", options.seccomp.argv0]),
    "--proc",
    "/proc",
    "--dev",
    "/dev",
    "--remount-ro",
    "/dev",
    ...options.homes.flatMap((home) => ["--remount-ro", home]),
    "--remount-ro",
    "/",
    "--chdir",
    options.cwd,
  ];
}
//@ chunk-5xgkngpb.js:908632-909141 placement
/**
 * 生成在 bubblewrap 中运行项目钩子的 shell 命令：调整 oom_score_adj，用文件描述符只读绑定各根目录（校验 fd 指向的真实路径）并可写绑定私有 tmp，关闭继承的 fd，经 seccomp 辅助程序执行 /bin/sh -c。
 */
function buildBwrapHookCommand(hookCommand, options) {
  let euid = process.geteuid?.();
  let bwrapArgs = buildBwrapArgs(
    options,
    capabilityArgs({
      euid,
      hasSetfcap: euid === 0 && processHasBoundingCapability(CAP_SETFCAP),
      usesSeccompHelper: true,
    }),
  );
  let fdCommand = (fd, targetPath) => `command exec ${fd}<${shellQuoteArgs([targetPath])} || exit 126; `;
  let joined = sandboxRootFdBindings(options)
    .map(
      (binding) =>
        `${fdCommand(binding.fd, binding.real)}[ "$(cd /proc/self/fd/${binding.fd} && pwd -P)" = ${shellQuoteArgs([binding.real])} ] || exit 126; `,
    )
    .join("");
  let shellArgs = [SANDBOX_SHELL, "-c", `${CLOSE_INHERITED_FDS_COMMAND}${hookCommand}`];
  return options.seccomp.kind === "file"
    ? `${OOM_SCORE_ADJ_PREFIX}${joined}exec ${shellQuoteArgs([options.bwrap, ...bwrapArgs, "--", SECCOMP_HELPER_PATH, ...shellArgs])}`
    : `${OOM_SCORE_ADJ_PREFIX}${fdCommand(APPLY_SECCOMP_FD, `/proc/${process.pid}/exe`)}${joined}exec ${shellQuoteArgs([options.bwrap, ...bwrapArgs, "--", `/proc/self/fd/${APPLY_SECCOMP_FD}`, ...shellArgs])}`;
}
//@ chunk-5xgkngpb.js:909141-909641 placement
/**
 * 解析沙箱可达目录与可读目录的真实路径，检查可读目录是否在可达范围内。
 */
async function resolveSandboxRoots(plan) {
  let realpathIfExists = (readableDir) =>
    realpath(readableDir).catch(() => {
      return;
    });
  let reachPaths = normalizeCaseForComparison_2([
    ...plan.reach,
    ...(await Promise.all(plan.reach.map(realpathIfExists))).flatMap((realPath) =>
      realPath === undefined ? [] : [realPath],
    ),
  ]);
  let spellingsByReal = new Map();
  for (let readableDir of plan.readableDirs) {
    let realPath = await realpathIfExists(readableDir);
    if (realPath === undefined) continue;
    if (!reachPaths.some((reachPath) => isSameOrUnderPath(realPath, reachPath)))
      return {
        unavailable: "root_outside_reach",
      };
    spellingsByReal.set(
      realPath,
      normalizeCaseForComparison_2([...(spellingsByReal.get(realPath) ?? []), readableDir]),
    );
  }
  let realRoots = [...spellingsByReal.keys()];
  let mapped = realRoots
    .filter((candidate) => !realRoots.some((other) => isPathUnder_2(candidate, other)))
    .map((realPath) => ({
      real: realPath,
      alsoAt: (spellingsByReal.get(realPath) ?? []).filter((spelling) => spelling !== realPath),
    }));
  return mapped.length > MAX_SANDBOX_ROOTS
    ? {
        unavailable: "too_many_roots",
      }
    : mapped;
}
//@ chunk-5xgkngpb.js:909641-909975 placement
/**
 * 检查沙箱视图是否会泄露：家目录在只读视图内（或视图包含家目录）返回 home_in_view，凭据路径在视图内返回 credentials_in_view。
 */
function sandboxViewLeak(plan) {
  let flattened = plan.roots.flatMap((root) => [root.real, ...root.alsoAt]);
  let visiblePaths = normalizeCaseForComparison_2([
    ...SYSTEM_READONLY_PATHS,
    ...plan.system.flatMap((viewPath) => [viewPath.real, viewPath.at]),
  ]);
  if (
    plan.homes.some(
      (home) =>
        !isAbsolute(home) ||
        flattened.some((visiblePath) => isPathWithinNormalizedCase(home, visiblePath)) ||
        visiblePaths.some((systemPath) => isPathWithinNormalizedCase(systemPath, home)),
    )
  )
    return "home_in_view";
  if (
    plan.credentialPaths.some(
      (credentialPath) =>
        [...visiblePaths, ...flattened].some((visiblePath) =>
          isPathWithinNormalizedCase(credentialPath, visiblePath),
        ) || flattened.some((visiblePath) => isPathWithinNormalizedCase(visiblePath, credentialPath)),
    )
  )
    return "credentials_in_view";
  return;
}
//@ chunk-5xgkngpb.js:909975-910527 placement
/**
 * 解析系统视图候选路径的真实路径。
 */
async function resolveSystemViewPaths(options) {
  let realpathIfExists = (candidate) =>
    realpath(candidate).catch(() => {
      return;
    });
  let results = await Promise.all(
    options.candidates.map(async (candidate) => ({
      at: candidate,
      real: await realpathIfExists(candidate),
    })),
  );
  let reachPaths = normalizeCaseForComparison_2([
    ...options.reach,
    ...(await Promise.all(options.reach.map(realpathIfExists))).flatMap((realPath) =>
      realPath === undefined ? [] : [realPath],
    ),
  ]);
  let visiblePaths = normalizeCaseForComparison_2([
    ...options.realPrefixes,
    ...results.flatMap(({ at, real }) => (real === undefined ? [at] : [at, real])),
  ]);
  if (
    reachPaths.some((reachPath) =>
      visiblePaths.some(
        (visiblePath) =>
          isPathWithinNormalizedCase(reachPath, visiblePath) ||
          isPathWithinNormalizedCase(visiblePath, reachPath),
      ),
    )
  )
    return {
      unavailable: "reach_in_system_view",
    };
  return results.flatMap(({ at, real }) =>
    real !== undefined &&
    (real === at || options.realPrefixes.some((realPrefix) => isSameOrUnderPath(real, realPrefix))) &&
    ![...options.homes, ...options.credentialPaths].some((privatePath) =>
      isPathWithinNormalizedCase(real, privatePath),
    )
      ? [
          {
            real,
            at,
          },
        ]
      : [],
  );
}
//@ chunk-5xgkngpb.js:910527-910592 placement
var PROBE_TIMEOUT_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var FAILED_PROBE_TTL_MS;
var PASSED_PROBE_TTL_MS;
var sandboxProbeCache;
deferInit("chunk-5xgkngpb.js:910527", () => {
  PROBE_TIMEOUT_MS = 5000;
  FAILED_PROBE_TTL_MS = 60000;
  PASSED_PROBE_TTL_MS = 600000;
  sandboxProbeCache = identity_2(new Map(), (cache) => cache.clear());
});
//@ chunk-5xgkngpb.js:910592-911730 placement
/**
 * 检查当前环境能否为钩子提供沙箱（bwrap、seccomp 等）。
 */
async function checkHookSandboxAvailable(plan) {
  let homedir = "";
  try {
    homedir = userInfo().homedir;
  } catch {}
  let homeSpellings = normalizeCaseForComparison_2([plan.home, homedir].filter((home) => home !== ""));
  let homes = normalizeCaseForComparison_2([
    ...homeSpellings,
    ...(await Promise.all(homeSpellings.map((home) => realpath(home).catch(() => home)))),
  ]);
  let sandboxRoots = await resolveSandboxRoots(plan);
  if ("unavailable" in sandboxRoots) return sandboxRoots;
  let credentialPaths = strictRealpathCache();
  let systemViewPaths = await resolveSystemViewPaths({
    candidates: SYSTEM_READONLY_PATHS,
    realPrefixes: SYSTEM_REAL_PREFIXES,
    homes,
    credentialPaths,
    reach: plan.reach,
  });
  if ("unavailable" in systemViewPaths) return systemViewPaths;
  let leak = sandboxViewLeak({
    roots: sandboxRoots,
    system: systemViewPaths,
    homes,
    credentialPaths,
  });
  if (leak !== undefined)
    return {
      unavailable: leak,
    };
  let programOnPathInReach = await resolveProgramOnPathInReach("bwrap", plan.pathValue, plan.reach);
  if (programOnPathInReach === undefined || programOnPathInReach === "in_reach")
    return {
      unavailable: "no_bubblewrap",
    };
  let embeddedSeccomp = seccompExecPlan();
  let seccomp;
  if (embeddedSeccomp !== undefined)
    seccomp = {
      kind: "embedded",
      argv0: embeddedSeccomp.argv0,
    };
  else {
    let seccompHelperPath = await getApplySeccompBinaryPath_2();
    if (
      seccompHelperPath === null ||
      anyPairMatches(
        [seccompHelperPath, await realpath(seccompHelperPath).catch(() => seccompHelperPath)],
        plan.reach,
      )
    )
      return {
        unavailable: "no_seccomp_stage",
      };
    seccomp = {
      kind: "file",
      path: seccompHelperPath,
    };
  }
  let cacheKey = `${programOnPathInReach}\x00${seccomp.kind === "file" ? seccomp.path : seccomp.argv0}`;
  let cachedProbe = sandboxProbeCache.get(cacheKey);
  let probeEntry = cachedProbe;
  if (
    cachedProbe === undefined ||
    (cachedProbe.passed !== undefined &&
      Date.now() - cachedProbe.at >= (cachedProbe.passed ? PASSED_PROBE_TTL_MS : FAILED_PROBE_TTL_MS))
  ) {
    let newProbeEntry = {
      at: Date.now(),
      outcome: probeBubblewrapVersion({
        bwrap: programOnPathInReach,
        seccomp,
        system: systemViewPaths,
        homes,
      }).then((failureReason) => {
        newProbeEntry.passed = failureReason === undefined;
        return failureReason;
      }),
    };
    sandboxProbeCache.set(cacheKey, newProbeEntry);
    probeEntry = newProbeEntry;
  }
  let outcome = await probeEntry?.outcome;
  return outcome === undefined
    ? {
        bwrap: programOnPathInReach,
        seccomp,
        roots: sandboxRoots,
        system: systemViewPaths,
        homes,
      }
    : {
        unavailable: outcome,
      };
}
//@ chunk-5xgkngpb.js:911730-912763 placement
/**
 * 探测 bubblewrap 版本，过旧时不在沙箱中运行项目钩子。
 */
async function probeBubblewrapVersion(options) {
  let versionResult = await execFileNoThrow(options.bwrap, ["--version"], {
    timeout: PROBE_TIMEOUT_MS,
    cwd: "/",
    stdin: "ignore",
  });
  if (
    versionResult.code !== 0 ||
    parseVersionNumber(versionResult.stdout) < parseVersionNumber(MIN_BWRAP_VERSION)
  ) {
    logForDebugging(
      `[remote-tools] a project hook cannot be run in a sandbox on this machine (bubblewrap_too_old): bubblewrap --version does not say ${MIN_BWRAP_VERSION} or later`,
    );
    return "bubblewrap_too_old";
  }
  let runsOk = async (command) =>
    (
      await execFileNoThrow(SANDBOX_SHELL, ["-c", command], {
        timeout: PROBE_TIMEOUT_MS,
        cwd: "/",
        stdin: "ignore",
        stdout: "ignore",
        stderr: "ignore",
      })
    ).code === 0;
  let probeDir;
  try {
    probeDir = await realpath(await mkdtemp(join(tmpdir_2(), "hook-probe-")));
    let options_2 = {
      ...options,
      roots: [],
      privateTmp: probeDir,
      cwd: "/",
    };
    let command = buildBwrapHookCommand(":", options_2);
    if (await runsOk(command)) return;
    let seccompStagePath =
      options.seccomp.kind === "file" ? SECCOMP_HELPER_PATH : `/proc/self/fd/${APPLY_SECCOMP_FD}`;
    let failureReason = (await runsOk(
      command.replace(` -- ${seccompStagePath} ${SANDBOX_SHELL} -c `, ` -- ${SANDBOX_SHELL} -c `),
    ))
      ? "no_seccomp_stage"
      : "bubblewrap_failed";
    logForDebugging(
      `[remote-tools] a project hook cannot be run in a sandbox on this machine (${failureReason}): the trial run failed`,
    );
    return failureReason;
  } catch (error) {
    logForDebugging(
      `[remote-tools] the trial run of a project hook's sandbox could not be made (${errorMessage(error)})`,
    );
    return "bubblewrap_failed";
  } finally {
    if (probeDir !== undefined)
      await rm(probeDir, {
        recursive: true,
        force: true,
      }).catch(() => {});
  }
}
//@ chunk-5xgkngpb.js:912763-912867 placement
var SANDBOX_EXEC_PROFILE_PREFIX = `(version 1)
(deny default (with message "`;
var SHELL_TOKEN_RE = /[A-Za-z0-9_./:=@+,-]+|'[^']*'(?:"'"'[^']*')*/g;
//@ chunk-5xgkngpb.js:912867-913541 placement
/**
 * 判断项目钩子能否在沙箱中运行及使用哪种模式：平台不支持、个人沙箱开启但开关未开、存在 unix socket 授权或弱化配置、个人读规则等情况返回 unavailable 原因，否则返回 linux/person/locked 模式。
 */
function resolveHookSandboxMode(readRules) {
  let platform = getPlatform();
  if (platform !== "macos" && !(platform === "linux" && isLinuxHookSandboxEnabled()))
    return {
      unavailable: "platform",
    };
  let sandboxActive =
    SandboxManager.isSandboxingEnabled() ||
    SandboxManager.getProxyPort() !== undefined ||
    SandboxManager.getSocksProxyPort() !== undefined;
  if (sandboxActive && !isPersonSandboxHookEnabled())
    return {
      unavailable: "person_sandbox",
    };
  let mode = platform === "linux" ? "linux" : sandboxActive ? "person" : "locked";
  let sandbox = SandboxManager.getConfig();
  if (
    mode === "locked" &&
    ((sandbox?.network?.allowUnixSockets?.length ?? 0) > 0 ||
      sandbox?.network?.allowAllUnixSockets === true ||
      (sandbox !== undefined && weakensSandboxIsolation(sandbox, platform)) ||
      Object.keys(sandbox?.ignoreViolations ?? {}).length > 0)
  )
    return {
      unavailable: "socket_grants",
    };
  if (
    (mode === "linux" && isFilesystemIsolationDisabledBySetting()) ||
    (mode === "locked" && sandbox?.filesystem?.disabled === true)
  )
    return {
      unavailable: "filesystem_off",
    };
  if (hasPersonalReadRestrictions(readRules))
    return {
      unavailable: "person_read_rules",
    };
  return {
    mode,
  };
}
//@ chunk-5xgkngpb.js:913541-913566 placement
var HOSTCREDENTIAL = "hostCredential";
//@ chunk-5xgkngpb.js:913566-913948 placement
/**
 * 判断个人权限设置是否限制了读取（阻止工作目录外读取或有 Read 的拒绝/询问规则）。
 */
function hasPersonalReadRestrictions(readRules) {
  let isFileReadRule = (ruleString) => parseRuleString(ruleString).toolName === READ;
  return (
    readRules.blockReadsOutsideWorkingDirectories === true ||
    [readRules.alwaysDenyRules, readRules.alwaysAskRules].some((rules) =>
      Object.entries(rules).some(([key, value]) => key !== HOSTCREDENTIAL && value.some(isFileReadRule)),
    ) ||
    SETTING_SOURCES.some((settingSource) => {
      let settingsForSourceTightenOnly = getSettingsForSourceTightenOnly(settingSource);
      let sandbox = settingsForSourceTightenOnly?.sandbox;
      return (
        settingsForSourceTightenOnly?.permissions?.blockReadsOutsideWorkingDirectories === true ||
        (sandbox?.filesystem?.denyRead?.length ?? 0) > 0 ||
        (sandbox?.credentials?.files?.length ?? 0) > 0
      );
    })
  );
}
//@ chunk-5xgkngpb.js:913948-914571 placement
/**
 * 钩子沙箱中只读保护的宿主系统路径（/etc、/Library/*、/usr/local/etc 等）与允许读的设备节点。
 */
var HOOK_SANDBOX_PROTECTED_PATHS = [
  "/etc",
  "/var/root",
  "/var/db",
  "/var/log",
  "/opt/homebrew/etc",
  "/opt/homebrew/var",
  "/opt/local/etc",
  "/opt/local/var",
  "/usr/local/etc",
  "/usr/local/var",
  "/Library/Preferences",
  "/Library/Application Support",
  "/Library/Keychains",
  "/Library/LaunchDaemons",
  "/Library/LaunchAgents",
  "/Users",
  "/Volumes",
];
var SANDBOX_READONLY_SYSTEM_PATHS = [
  "/etc/passwd",
  "/etc/group",
  "/etc/hosts",
  "/etc/localtime",
  "/etc/paths",
  "/etc/paths.d",
  "/etc/ssl/cert.pem",
  "/etc/ssl/certs",
  "/etc/ssl/openssl.cnf",
  "/var/db/timezone",
];
var SANDBOX_DEVICE_PATHS = [
  "/dev/null",
  "/dev/zero",
  "/dev/random",
  "/dev/urandom",
  "/dev/stdin",
  "/dev/stdout",
  "/dev/stderr",
  "/dev/fd",
  "/dev/dtracehelper",
  "/dev/autofs_nowait",
];
//@ chunk-5xgkngpb.js:914571-915192 placement
async function buildHookSandboxDevices(options) {
  let withRealpaths = async (paths) =>
    normalizeCaseForComparison_2(
      (await Promise.all(paths.map(async (path) => [path, await realpath(path).catch(() => path)]))).flat(),
    );
  return {
    filesystem: {
      disabled: false,
      allowWrite: [options.privateTmp],
      denyWrite: await withRealpaths([
        ...options.projectRoots,
        options.home,
        ...getDefaultWritePaths().filter(
          (writePath) => !writePath.startsWith("/dev/") || !SANDBOX_DEVICE_PATHS.includes(writePath),
        ),
        "/dev/tty*",
        "/dev/pty*",
        "/dev/console",
        claudeTempDir(),
        ...(options.mode === "person" ? (SandboxManager.getConfig()?.filesystem?.denyWrite ?? []) : []),
      ]),
      denyRead: await withRealpaths([
        options.home,
        ...options.tempRoots,
        claudeTempDir(),
        "/dev",
        ...HOOK_SANDBOX_PROTECTED_PATHS,
        ...(SandboxManager.getConfig()?.filesystem?.denyRead ?? []),
        ...strictRealpathCache(),
      ]),
      allowRead: normalizeCaseForComparison_2([
        ...(await withRealpaths(SANDBOX_READONLY_SYSTEM_PATHS)),
        ...SANDBOX_DEVICE_PATHS,
        ...options.projectRoots,
        options.privateTmp,
      ]),
    },
    network: {
      allowedDomains: [],
      deniedDomains: [],
    },
  };
}
//@ chunk-5xgkngpb.js:915192-915424 placement
function buildSandboxedHookEnv(options) {
  let env = {
    PATH: options.pathValue,
    HOME: options.home,
    TMPDIR: options.privateTmp,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
  };
  for (let [key, value] of Object.entries(options.judged))
    if (value !== undefined && (key === "LANG" || key.startsWith("LC_"))) env[key] = value;
  return env;
}
//@ chunk-5xgkngpb.js:915424-916572 placement
/**
 * 把项目钩子包进沙箱运行，并在结束后清理。
 */
async function wrapProjectHookInSandbox(command, config, signal, readRules, options) {
  let wrappedCommand;
  try {
    if (options.mode === "locked")
      wrappedCommand = await SandboxManager.wrapWithSandbox(command, SANDBOX_SHELL, config, signal);
    else {
      let filesystem = config.filesystem;
      if (filesystem === undefined) throw Error("the hook has no filesystem lists");
      wrappedCommand = wrapCommandWithSandboxMacOS({
        command,
        commandId: options.commandId,
        needsNetworkRestriction: true,
        readConfig: {
          denyOnly: filesystem.denyRead.map(removeTrailingGlobSuffix),
          allowWithinDeny: (filesystem.allowRead ?? []).map(removeTrailingGlobSuffix),
        },
        writeConfig: {
          allowOnly: [...getDefaultWritePaths(), ...filesystem.allowWrite.map(removeTrailingGlobSuffix)],
          denyWithinAllow: filesystem.denyWrite.map(removeTrailingGlobSuffix),
        },
        allowPty: false,
        binShell: SANDBOX_SHELL,
      });
    }
  } catch (error) {
    logForDebugging(
      `[remote-tools] a project hook could not be wrapped for the sandbox: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return;
  }
  let wrapped = {
    command: wrappedCommand,
    [Symbol.dispose]() {
      if (options.mode === "person") return;
      try {
        SandboxManager.cleanupAfterCommand();
      } catch (error) {
        logForDebugging(
          `[remote-tools] sandbox cleanup after a project hook failed: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
    },
  };
  if (!isExpectedSandboxExecCommand(wrappedCommand, command)) {
    logForDebugging(
      "[remote-tools] what came back for a project hook is not a deny-by-default sandbox launch of it: not run",
      {
        level: "error",
      },
    );
    wrapped[Symbol.dispose]();
    return;
  }
  let modeMatches = false;
  try {
    let hookSandboxMode = resolveHookSandboxMode(readRules);
    modeMatches = "mode" in hookSandboxMode && hookSandboxMode.mode === options.mode;
  } catch (error) {
    logForDebugging(
      `[remote-tools] a wrapped project hook could not be checked against the sandbox plan: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  }
  if (!modeMatches) {
    wrapped[Symbol.dispose]();
    return;
  }
  return wrapped;
}
//@ chunk-5xgkngpb.js:916572-916795 placement
function wrapLinuxHookCommand(command, options, readRules) {
  try {
    let hookSandboxMode = resolveHookSandboxMode(readRules);
    if (!("mode" in hookSandboxMode) || hookSandboxMode.mode !== "linux") return;
    return {
      command: buildBwrapHookCommand(command, options),
      [Symbol.dispose]() {},
    };
  } catch (error) {
    logForDebugging(
      `[remote-tools] a project hook could not be wrapped for the sandbox: ${errorMessage(error)}`,
    );
    return;
  }
}
//@ chunk-5xgkngpb.js:916795-917101 placement
/**
 * 判断命令是否为预期形式的沙箱执行命令（跳过 -u 与环境变量赋值）。
 */
function isExpectedSandboxExecCommand(wrappedCommand, hookCommand) {
  let mapped = (wrappedCommand.match(SHELL_TOKEN_RE) ?? []).map((token) =>
    token.startsWith("'") ? token.slice(1, -1).replaceAll(`'"'"'`, "'") : token,
  );
  let index = 1;
  while (mapped[index] === "-u") index += 2;
  while (/^[A-Za-z_]\w*=/.test(mapped[index] ?? "")) index += 1;
  let profileText = mapped[index + 2] ?? "";
  return (
    mapped[0] === "env" &&
    profileText.startsWith(SANDBOX_EXEC_PROFILE_PREFIX) &&
    wrappedCommand ===
      quote([
        ...mapped.slice(0, index),
        "/usr/bin/sandbox-exec",
        "-p",
        profileText,
        SANDBOX_SHELL,
        "-c",
        hookCommand,
      ])
  );
}
export {
  scriptFileReaderDeps,
  replaceCommandProgram,
  verifyPinnedScript,
  stageDeviceHooks,
  stagingFsDeps,
  isViolinPegOn,
  isViolinOverstandOn,
  resolveHookSandboxMode,
  checkHookSandboxAvailable,
  isPathWithinNormalizedCase,
  buildHookSandboxDevices,
  buildSandboxedHookEnv,
  wrapLinuxHookCommand,
  wrapProjectHookInSandbox,
  isStrictSandboxFullyConfigured,
  strictRealpathCache,
};
