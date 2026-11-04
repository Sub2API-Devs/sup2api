/**
 * utils/commitAttribution.ts
 *
 * 按文件追踪 Claude 的字符级贡献（fileStates、内容 hash），在提交时结合 git diff 计算 Claude/人工贡献比例；另混入 3wek6r2k 的启动/模型目录代码
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/commitAttribution.ts
 * pieces: chunk-0sfjpx19.js (1), chunk-18hwfzwa.js (1), chunk-2a8yx6fc.js (1), chunk-38t4c9qz.js (2), chunk-82kqcve8.js (1), chunk-89f54s6c.js (1), chunk-gjx0rh1b.js (1), chunk-s61vbvea.js (23)
 * attribution: placement 2, fingerprint 14, callgraph-fingerprint 2, layout 11, file-local 1, sole-consumer 1
 */
import { createHash } from "crypto";
import { dirname, join, basename, isAbsolute, sep, relative } from "path";
import { promisify } from "util";
import { realpath as realpath_2 } from "fs";
import { stat, lstat } from "fs/promises";
import { getFsImplementation } from "./fsOperations.js";
import { isENOENT } from "./errors.js";
import { serializeCalls } from "./promiseQueue.js";
import { getRemoteUrlForGitDir, getRemoteUrlForDir } from "./git/gitFilesystem.js";
import {
  isAllowedGitRemote,
  canonicalRootOrSelf,
  cwdOrGitRoot,
  isNotInGitRepo,
  buildGitEnv,
  GIT_READ_CONFIG_ARGS,
  GIT_LIST_ENV,
} from "./git/builderGit/gitEnv.js";
import { getGitRepoCache } from "./git/gitRepoCache.js";
import { env } from "./env.js";
import { nativeRealpathLong, toUncLongPath } from "./windowsUncPaths.js";
import { logError } from "./log.js";
import { logForDebugging } from "./debug.js";
import {
  MAX_PATTERN_CHARS,
  checkLinguistGenerated,
  GitListingError,
  GIT_COMMAND_TIMEOUT_MS,
  MAX_GIT_OUTPUT_BYTES,
  gitListingError,
} from "./attributionFileClasses.js";
import { getSessionId, getOriginalCwd } from "../bootstrap/state.js";
import { findGitRootRecheckingNegative, findGitRoot, gitExe } from "./git.js";
import { getEnvCaseInsensitive } from "./plugins/securityDefaultPlugin.js";
import { getRemoteHostSessionCount } from "../commands/insights.js";
import { buildGitConfigEnv } from "./git/gitConfigEnv.js";
import { IGNORE_SUBMODULES_DIRTY_FLAG } from "./git/gitSafeEnv.js";
import { execFileNoThrowWithCwd } from "./execFileNoThrow.js";
import { listGitRefs } from "./git/builderGit/gitConfigAudit.js";
import {
  GIT_PROBE_MAX_BUFFER,
  summarizeStatusEntries,
  parseNameStatusZ,
  classifyPathIdentity,
} from "./teleport/gitBundleLayout.js";
import { findExistingRefs, SEQUENCER_STATE_FILES } from "./git/gitConfigFilters.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-38t4c9qz.js:227-251 placement
/**
 * 匹配 64 位十六进制 sha256 摘要的正则。
 */
var SHA256_HEX_RE = /^[0-9a-f]{64}$/;
//@ chunk-38t4c9qz.js:251-466 callgraph-fingerprint (2.1.88 match: computeContentHash, 0.567)
/**
 * sha256 十六进制摘要（文本或字节），全局 140 余处用于内容比较。
 */
function computeContentHash(content) {
  if (typeof content !== "string" && !ArrayBuffer.isView(content))
    throw Object.assign(TypeError("sha256Hex: the data is neither text nor bytes"), {
      code: "ERR_INVALID_ARG_TYPE",
    });
  return createHash("sha256").update(content).digest("hex");
}
//@ chunk-82kqcve8.js:235773-235885 fingerprint (2.1.88 match: normalizeFilePath, 1)
function normalizeFilePath(filePath) {
  try {
    return getFsImplementation().realpathSync(filePath);
  } catch (error) {
    if (!isENOENT(error) || dirname(filePath) === filePath) throw error;
    return join(normalizeFilePath(dirname(filePath)), basename(filePath));
  }
}
//@ chunk-s61vbvea.js:206706-207384 fingerprint (2.1.88 match: sanitizeModelName, 0.64)
var sanitizeModelName = [
  ["fable-5-1", "claude-fable-5-1"],
  ["fable-5", "claude-fable-5"],
  ["mythos-5-1", "claude-mythos-5-1"],
  ["mythos-5", "claude-mythos-5"],
  ["opus-5-5", "claude-opus-5-5"],
  ["opus-5", "claude-opus-5"],
  ["opus-4-8", "claude-opus-4-8"],
  ["opus-4-7", "claude-opus-4-7"],
  ["opus-4-6", "claude-opus-4-6"],
  ["opus-4-5", "claude-opus-4-5"],
  ["opus-4-1", "claude-opus-4-1"],
  ["opus-4", "claude-opus-4"],
  ["sonnet-5-5", "claude-sonnet-5-5"],
  ["sonnet-5", "claude-sonnet-5"],
  ["sonnet-4-6", "claude-sonnet-4-6"],
  ["sonnet-4-5", "claude-sonnet-4-5"],
  ["sonnet-4", "claude-sonnet-4"],
  ["sonnet-3-7", "claude-sonnet-3-7"],
  ["haiku-5-5", "claude-haiku-5-5"],
  ["haiku-4-5", "claude-haiku-4-5"],
  ["haiku-3-5", "claude-haiku-3-5"],
];
//@ chunk-s61vbvea.js:290187-290489 fingerprint (2.1.88 match: isInternalModelRepo, 0.696)
/**
 * 判断仓库是否为 Anthropic 内部模型仓库（决定署名中能否写具体模型名），结果缓存。
 */
var isInternalModelRepo; // deferred: uses getRemoteUrlForGitDir (./git/gitFilesystem.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:290187", () => {
  isInternalModelRepo = serializeCalls(async (root, remoteUrl, signal) => {
    if (signal !== undefined) {
      let remoteUrlForGitDir = await getRemoteUrlForGitDir(signal.gitDir, signal.commonDir);
      return remoteUrlForGitDir !== null && isAllowedGitRemote(remoteUrlForGitDir);
    }
    let canonicalRoot = canonicalRootOrSelf(root);
    let repoClassByCanonicalRoot = getGitRepoCache().repoClassByCanonicalRoot;
    let cached = repoClassByCanonicalRoot.get(canonicalRoot);
    if (cached !== undefined) return cached === "internal";
    let remoteUrl_2 = await getRemoteUrlForDir(root);
    if (!remoteUrl_2) {
      repoClassByCanonicalRoot.set(canonicalRoot, "none");
      return false;
    }
    let isInternal = isAllowedGitRemote(remoteUrl_2);
    repoClassByCanonicalRoot.set(canonicalRoot, isInternal ? "internal" : "external");
    return isInternal;
  });
});
//@ chunk-s61vbvea.js:290489-290564 layout
function getModelFamilyForAttribution(rawModelName) {
  let found = sanitizeModelName.find(([prefix]) => rawModelName.includes(prefix));
  return found ? found[1] : "claude";
}
//@ chunk-s61vbvea.js:290564-290617 fingerprint (2.1.88 match: getClientSurface, 1)
function getClientSurface() {
  return env.CLAUDE_CODE_ENTRYPOINT ?? "cli";
}
//@ chunk-s61vbvea.js:290617-290661 layout
function getAttributionFileKey(filePath, options) {
  return isAbsolute(filePath) ? resolveAttributionKey(filePath, options).key : filePath;
}
//@ chunk-s61vbvea.js:290661-290762 layout
function getAttributionRoots(cwd = cwdOrGitRoot()) {
  let keyRoot = cwd;
  try {
    keyRoot = getFsImplementation().realpathSync(cwd);
  } catch {}
  return {
    cwd,
    keyRoot,
    root: nativeRealpathLong(cwd) ?? cwd,
  };
}
//@ chunk-s61vbvea.js:290762-291144 layout
function resolveAttributionKey(filePath, options) {
  let fsImplementation = getFsImplementation();
  let cwd = options?.cwd ?? cwdOrGitRoot();
  if (isAbsolute(filePath) && isNotInGitRepo(cwd))
    return {
      key: nativeRealpathLong(filePath) ?? filePath,
      root: undefined,
    };
  if (!isAbsolute(filePath))
    return {
      key: filePath,
      root: options?.root ?? nativeRealpathLong(cwd) ?? cwd,
    };
  let { keyRoot: resolvedCwd, root } = options ?? getAttributionRoots(cwd);
  let resolvedPath = filePath;
  try {
    resolvedPath = fsImplementation.realpathSync(filePath);
  } catch {}
  if (resolvedPath.startsWith(resolvedCwd + sep) || resolvedPath === resolvedCwd)
    return {
      key: relative(resolvedCwd, resolvedPath).replaceAll(sep, "/"),
      root,
    };
  if (filePath.startsWith(cwd + sep) || filePath === cwd)
    return {
      key: relative(cwd, filePath).replaceAll(sep, "/"),
      root,
    };
  return {
    key: filePath,
    root: undefined,
  };
}
//@ chunk-s61vbvea.js:291144-291416 fingerprint (2.1.88 match: createEmptyAttributionState, 0.893)
/**
 * 新建署名状态：fileStates（文件 → Claude 贡献字符数与内容 hash）、客户端 surface、起始 HEAD、各类计数（提示、权限提示、Esc）。
 */
function createEmptyAttributionState() {
  return {
    fileStates: new Map(),
    surface: getClientSurface(),
    startingHeadSha: null,
    promptCount: 0,
    promptCountAtLastCommit: 0,
    permissionPromptCount: 0,
    permissionPromptCountAtLastCommit: 0,
    escapeCount: 0,
    escapeCountAtLastCommit: 0,
    verificationMethods: [],
    verificationMethodsByCheckout: {},
  };
}
//@ chunk-s61vbvea.js:291416-291847 fingerprint (2.1.88 match: computeFileModificationState, 0.902)
/**
 * 计算单个文件修改后的署名状态（累计 Claude 贡献、内容 hash、mtime）。
 */
function computeFileModificationState(existingFileStates, filePath, oldContent, newContent, mtime, options) {
  let { key, root } = resolveAttributionKey(filePath, options);
  try {
    let claudeContribution;
    if (oldContent === "" || newContent === "")
      claudeContribution = oldContent === "" ? newContent.length : oldContent.length;
    else {
      let minLen = Math.min(oldContent.length, newContent.length);
      let prefixEnd = 0;
      while (prefixEnd < minLen && oldContent[prefixEnd] === newContent[prefixEnd]) prefixEnd++;
      let suffixLen = 0;
      while (
        suffixLen < minLen - prefixEnd &&
        oldContent[oldContent.length - 1 - suffixLen] === newContent[newContent.length - 1 - suffixLen]
      )
        suffixLen++;
      let oldChangedLen = oldContent.length - prefixEnd - suffixLen;
      let newChangedLen = newContent.length - prefixEnd - suffixLen;
      claudeContribution = Math.max(oldChangedLen, newChangedLen);
    }
    let existingContribution = existingFileStates.get(key)?.claudeContribution ?? 0;
    return {
      contentHash: computeContentHash(newContent),
      claudeContribution: existingContribution + claudeContribution,
      mtime,
      ...(root !== undefined && {
        root,
      }),
    };
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-s61vbvea.js:291847-292079 fingerprint (2.1.88 match: trackFileModification, 1)
/**
 * 记录 Claude 对一个文件的修改：按旧/新内容计算 Claude 贡献字符数并更新 fileStates（键为相对仓库根的路径）。
 */
function trackFileModification(state, filePath, oldContent, newContent, _userModified, mtime = Date.now()) {
  let attributionRoots = getAttributionRoots();
  let attributionFileKey = getAttributionFileKey(filePath, attributionRoots);
  let newFileState = computeFileModificationState(
    state.fileStates,
    filePath,
    oldContent,
    newContent,
    mtime,
    attributionRoots,
  );
  if (!newFileState) return state;
  let newFileStates = new Map(state.fileStates);
  newFileStates.set(attributionFileKey, newFileState);
  logForDebugging(`Attribution: Tracked ${newFileState.claudeContribution} chars for ${attributionFileKey}`);
  return {
    ...state,
    fileStates: newFileStates,
  };
}
//@ chunk-s61vbvea.js:292079-292120 layout
function isDeletedFileState(fileState) {
  return fileState.contentHash === "";
}
//@ chunk-s61vbvea.js:292120-292680 fingerprint (2.1.88 match: trackBulkFileChanges, 0.982)
/**
 * 批量记录文件变更（含删除）到署名状态。
 */
function trackBulkFileChanges(state, changes) {
  let newFileStates = new Map(state.fileStates);
  let options = getAttributionRoots();
  for (let change of changes) {
    let mtime = change.mtime ?? Date.now();
    if (change.type === "deleted") {
      let { key: normalizedPath, root } = resolveAttributionKey(change.path, options);
      let claudeContribution = newFileStates.get(normalizedPath)?.claudeContribution ?? 0;
      let deletedChars = change.oldContent.length;
      newFileStates.set(normalizedPath, {
        contentHash: "",
        claudeContribution: claudeContribution + deletedChars,
        mtime,
        ...(root !== undefined && {
          root,
        }),
      });
      logForDebugging(
        `Attribution: Tracked deletion of ${normalizedPath} (${deletedChars} chars removed, total contribution: ${claudeContribution + deletedChars})`,
      );
    } else {
      let newFileState = computeFileModificationState(
        newFileStates,
        change.path,
        change.oldContent,
        change.newContent,
        mtime,
        options,
      );
      if (newFileState) {
        let normalizedPath = getAttributionFileKey(change.path, options);
        newFileStates.set(normalizedPath, newFileState);
        logForDebugging(
          `Attribution: Tracked ${newFileState.claudeContribution} chars for ${normalizedPath}`,
        );
      }
    }
  }
  return {
    ...state,
    fileStates: newFileStates,
  };
}
//@ chunk-s61vbvea.js:292680-292817 layout
function relativePosixPathInside(rootDir, targetPath) {
  if (!isAbsolute(rootDir)) return null;
  let relPath = relative(targetPath, rootDir);
  return relPath !== "" && !isAbsolute(relPath) && relPath !== ".." && !relPath.startsWith(`..${sep}`)
    ? relPath.replaceAll(sep, "/")
    : null;
}
//@ chunk-s61vbvea.js:292817-293128 file-local
function trackFileDeletion(attribution, cwd) {
  let changed = false;
  for (let key of attribution.fileStates.keys())
    if (relativePosixPathInside(key, cwd) !== null) {
      changed = true;
      break;
    }
  if (!changed) return attribution;
  let nextStates = new Map();
  for (let [filePath, fileState] of attribution.fileStates) {
    let relPath = relativePosixPathInside(filePath, cwd) ?? filePath;
    let existingState = nextStates.get(relPath);
    nextStates.set(
      relPath,
      existingState === undefined
        ? fileState
        : {
            ...(fileState.mtime >= existingState.mtime ? fileState : existingState),
            claudeContribution: existingState.claudeContribution + fileState.claudeContribution,
          },
    );
  }
  return {
    ...attribution,
    fileStates: nextStates,
  };
}
//@ chunk-s61vbvea.js:293128-294149 fingerprint (2.1.88 match: restoreAttributionStateFromSnapshots, 0.305)
/**
 * resume 时从转录中的 attribution-snapshot 记录重建署名状态。
 */
function restoreAttributionStateFromSnapshots(attribution, snapshots) {
  switch (snapshots.kind) {
    case "trackEdit":
      return trackFileModification(
        {
          ...attribution,
          surface: snapshots.surface,
        },
        snapshots.filePath,
        snapshots.oldContent,
        snapshots.newContent,
        snapshots.userModified,
        snapshots.mtime,
      );
    case "trackBulk":
      return trackBulkFileChanges(
        {
          ...attribution,
          surface: snapshots.surface,
        },
        snapshots.changes,
      );
    case "commitBoundary":
      return {
        ...attribution,
        promptCountAtLastCommit: snapshots.promptCountAtLastCommit,
        permissionPromptCountAtLastCommit: snapshots.permissionPromptCountAtLastCommit,
        escapeCountAtLastCommit: snapshots.escapeCountAtLastCommit,
      };
    case "incrementPermissionPrompt":
      return {
        ...attribution,
        permissionPromptCount: attribution.permissionPromptCount + 1,
      };
    case "recordVerification": {
      let included = attribution.verificationMethods.includes(snapshots.method);
      let verificationMethodsByCheckout = attribution.verificationMethodsByCheckout;
      let state =
        snapshots.checkout === undefined
          ? undefined
          : (verificationMethodsByCheckout[snapshots.checkout] ?? []);
      if (included && (state === undefined || state.includes(snapshots.method))) return attribution;
      let entry =
        state?.length === 0 && Object.keys(verificationMethodsByCheckout).length >= MAX_PATTERN_CHARS
          ? Object.fromEntries(Object.entries(verificationMethodsByCheckout).slice(1))
          : verificationMethodsByCheckout;
      return {
        ...attribution,
        verificationMethods: included
          ? attribution.verificationMethods
          : [...attribution.verificationMethods, snapshots.method],
        verificationMethodsByCheckout:
          snapshots.checkout === undefined || state === undefined || state.includes(snapshots.method)
            ? verificationMethodsByCheckout
            : {
                ...entry,
                [snapshots.checkout]: [...state, snapshots.method],
              },
      };
    }
  }
}
//@ chunk-s61vbvea.js:294149-294225 layout
function gitDirWorkTreeArgs(repoRoot, gitDir) {
  return gitDir === undefined ? [] : [`--git-dir=${gitDir}`, `--work-tree=${repoRoot}`];
}
//@ chunk-s61vbvea.js:294225-294246 layout
var realpathNativeAsync; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:294225", () => {
  realpathNativeAsync = promisify(realpath_2.native);
});
//@ chunk-s61vbvea.js:294246-294310 layout
async function realpathOrSelf_2(path) {
  try {
    return toUncLongPath(await realpathNativeAsync(path));
  } catch {
    return path;
  }
}
//@ chunk-s61vbvea.js:294310-296290 fingerprint (2.1.88 match: calculateCommitAttribution, 0.831)
/**
 * 计算一次提交的署名：合并各 surface 的 fileStates，对暂存（或指定）文件比对内容 hash 与 git diff 大小，得出 Claude 与人工贡献比例；排除生成文件。
 */
async function calculateCommitAttribution(
  states,
  stagedFiles,
  options = {
    staged: true,
  },
) {
  let repoRoot = options.repoRoot ?? cwdOrGitRoot();
  let cwd = getSessionId();
  let sessionId = cwdOrGitRoot();
  let sessionReal = await realpathOrSelf_2(sessionId);
  let repoReal = repoRoot === sessionId ? sessionReal : await realpathOrSelf_2(repoRoot);
  let sameRoot = repoReal === sessionReal;
  let files = new Map();
  let excludedGenerated = [];
  let surfaces = new Set();
  let surfaceCounts = new Map();
  let totalClaudeChars = 0;
  let totalHumanChars = 0;
  let mergedFileStates = new Map();
  for (let state of states) {
    surfaces.add(state.surface);
    let attribution =
      state.fileStates instanceof Map ? state.fileStates : new Map(Object.entries(state.fileStates ?? {}));
    for (let [path, fileState] of attribution) {
      let existing = mergedFileStates.get(path);
      if (existing)
        mergedFileStates.set(path, {
          ...fileState,
          claudeContribution: existing.claudeContribution + fileState.claudeContribution,
        });
      else mergedFileStates.set(path, fileState);
    }
  }
  let inGitRepo = options.gitDir !== undefined || findGitRootRecheckingNegative(repoRoot) !== null;
  let [stagedStates, committedStates] = await Promise.all([
    checkLinguistGenerated(stagedFiles, repoRoot, {
      env: getGitEnvForRepoRoot(repoRoot),
      inRepo: inGitRepo,
      repoArgs: gitDirWorkTreeArgs(repoRoot, options.gitDir),
    }),
    inGitRepo
      ? getDeletedFiles({
          ...options,
          repoRoot,
        })
      : new Set(),
  ]);
  let mergedFileStates_2;
  let resolveFile = async (file) =>
    inGitRepo
      ? ((
          await (mergedFileStates_2 ??= getGitDiffSize({
            ...options,
            repoRoot,
          }))
        ).get(file) ?? 0)
      : 0;
  let fileResults = await Promise.all(
    stagedFiles.map(async (file) => {
      if (stagedStates.has(file))
        return {
          type: "generated",
          file,
        };
      let absPath = join(repoRoot, file);
      let resolvedFile = sameRoot ? file : relativePosixPathInside(join(repoReal, file), sessionReal);
      let mergedState = sameRoot ? undefined : mergedFileStates.get(file);
      let result =
        mergedFileStates.get(absPath) ??
        (resolvedFile === null ? undefined : mergedFileStates.get(resolvedFile)) ??
        (mergedState?.root === repoReal ? mergedState : undefined);
      let fileSurface = states[0].surface;
      let claudeChars = 0;
      let humanChars = 0;
      if (committedStates.has(file)) {
        if (result && isDeletedFileState(result)) {
          claudeChars = result.claudeContribution;
          humanChars = 0;
        } else if (result) return null;
        else {
          let diffSize = await resolveFile(file);
          humanChars = diffSize > 0 ? diffSize : 100;
        }
      } else
        try {
          let stats = await stat(absPath);
          if (result) {
            claudeChars = result.claudeContribution;
            humanChars = 0;
          } else {
            let diffSize = await resolveFile(file);
            humanChars = diffSize > 0 ? diffSize : stats.size;
          }
        } catch (error) {
          if (error instanceof GitListingError) throw error;
          return null;
        }
      claudeChars = Math.max(0, claudeChars);
      humanChars = Math.max(0, humanChars);
      let total = claudeChars + humanChars;
      let percent = total > 0 ? Math.round((claudeChars / total) * 100) : 0;
      return {
        type: "file",
        file,
        claudeChars,
        humanChars,
        percent,
        surface: fileSurface,
      };
    }),
  );
  for (let result of fileResults) {
    if (!result) continue;
    if (result.type === "generated") {
      excludedGenerated.push(result.file);
      continue;
    }
    files.set(result.file, {
      claudeChars: result.claudeChars,
      humanChars: result.humanChars,
      percent: result.percent,
      surface: result.surface,
    });
    totalClaudeChars += result.claudeChars;
    totalHumanChars += result.humanChars;
    surfaceCounts.set(result.surface, (surfaceCounts.get(result.surface) ?? 0) + result.claudeChars);
  }
  let totalChars = totalClaudeChars + totalHumanChars;
  let claudePercent = totalChars > 0 ? Math.round((totalClaudeChars / totalChars) * 100) : 0;
  let surfaceBreakdown = new Map();
  for (let [surface, chars] of surfaceCounts) {
    let percent = totalChars > 0 ? Math.round((chars / totalChars) * 100) : 0;
    surfaceBreakdown.set(surface, {
      claudeChars: chars,
      percent,
    });
  }
  return {
    version: 1,
    summary: {
      claudePercent,
      claudeChars: totalClaudeChars,
      humanChars: totalHumanChars,
      surfaces: Array.from(surfaces),
    },
    files: Object.fromEntries(files),
    surfaceBreakdown: Object.fromEntries(surfaceBreakdown),
    excludedGenerated,
    sessions: [cwd],
  };
}
//@ chunk-s61vbvea.js:296290-296524 layout
function buildAttributionGitEnv(result = {}, { envGrants = true, base, userLocale } = {}) {
  let baseEnv = base ?? process.env;
  let env = {};
  for (let varName of ["GIT_CONFIG_GLOBAL", "GIT_CONFIG_SYSTEM"]) {
    let envCaseInsensitive = getEnvCaseInsensitive(baseEnv, varName);
    if (envCaseInsensitive !== undefined) env[varName] = envCaseInsensitive;
  }
  return getRemoteHostSessionCount(
    {
      ...env,
      ...(envGrants ? buildGitConfigEnv(baseEnv) : {}),
      ...result,
    },
    {
      base,
      userLocale,
    },
  );
}
//@ chunk-s61vbvea.js:296524-296667 layout
function getGitEnvForRepoRoot(repoRoot, { userLocale } = {}) {
  let base = buildGitEnv(undefined);
  let originalCwd = getOriginalCwd();
  return repoRoot === originalCwd || repoRoot === findGitRoot(originalCwd)
    ? buildAttributionGitEnv(
        {},
        {
          base,
          userLocale,
        },
      )
    : getRemoteHostSessionCount(undefined, {
        base,
        userLocale,
      });
}
//@ chunk-s61vbvea.js:296667-297170 callgraph-fingerprint (2.1.88 match: getGitDiffSize, 0.26)
/**
 * git diff --numstat（默认 --cached）取各文件改动大小。
 */
async function getGitDiffSize(
  filePath = {
    staged: true,
  },
) {
  let repoRoot = filePath.repoRoot ?? cwdOrGitRoot();
  let dirtyFiles = new Map();
  let args = [...gitDirWorkTreeArgs(repoRoot, filePath.gitDir), "diff", IGNORE_SUBMODULES_DIRTY_FLAG];
  if (filePath.staged) args.push("--cached");
  args.push("--numstat", "--no-renames", "--relative", "-z");
  let result = await execFileNoThrowWithCwd(gitExe(), args, {
    cwd: repoRoot,
    timeout: GIT_COMMAND_TIMEOUT_MS,
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    env: getGitEnvForRepoRoot(repoRoot, {
      userLocale: !filePath.staged,
    }),
    extendEnv: false,
  });
  if (result.code !== 0 || result.maxBufferExceeded) throw gitListingError("git diff --numstat", result);
  for (let record of result.stdout.split("\x00")) {
    let insertMatch = record.match(/^(\d+)\t(\d+)\t(.+)$/s);
    if (insertMatch) {
      let lineCount = parseInt(insertMatch[1], 10) + parseInt(insertMatch[2], 10);
      dirtyFiles.set(insertMatch[3], lineCount * 40);
    }
  }
  return dirtyFiles;
}
//@ chunk-s61vbvea.js:297170-297593 sole-consumer
/**
 * git diff --name-only --diff-filter=D 列出删除的文件（默认暂存区）。
 */
async function getDeletedFiles(
  options = {
    staged: true,
  },
) {
  let repoRoot = options.repoRoot ?? cwdOrGitRoot();
  let args = [...gitDirWorkTreeArgs(repoRoot, options.gitDir), "diff", IGNORE_SUBMODULES_DIRTY_FLAG];
  if (options.staged) args.push("--cached");
  args.push("--name-only", "--diff-filter=D", "--no-renames", "--relative", "-z");
  let result = await execFileNoThrowWithCwd(gitExe(), args, {
    cwd: repoRoot,
    timeout: GIT_COMMAND_TIMEOUT_MS,
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    env: getGitEnvForRepoRoot(repoRoot, {
      userLocale: !options.staged,
    }),
    extendEnv: false,
  });
  if (result.code !== 0 || result.maxBufferExceeded)
    throw gitListingError("git diff --diff-filter=D", result);
  return new Set(result.stdout.split("\x00").filter(Boolean));
}
//@ chunk-2a8yx6fc.js:14314-14432 fingerprint (2.1.88 match: isInternalModelRepoCached, 0.543)
function isInternalModelRepoCached(visibility) {
  let normalized = typeof visibility === "string" ? visibility.toLowerCase() : "";
  return normalized === "public" || normalized === "private" || normalized === "internal" ? normalized : null;
}
//@ chunk-gjx0rh1b.js:113077-113464 fingerprint (2.1.88 match: isFileDeleted, 0.485)
async function isFileDeleted(gitRoot, commit, signal, options) {
  let isDeletedPath = (path) =>
    listGitRefs(gitRoot, [...GIT_READ_CONFIG_ARGS, ...path], {
      hardened: false,
      signal,
      env: GIT_LIST_ENV,
      maxBuffer: GIT_PROBE_MAX_BUFFER,
    });
  let [diffOutput, statusOutput] = await Promise.all([
    isDeletedPath([
      "diff",
      "--name-status",
      "-z",
      "--no-renames",
      IGNORE_SUBMODULES_DIRTY_FLAG,
      `${commit}^1`,
      commit,
      "--",
    ]),
    isDeletedPath([
      "diff",
      "--name-status",
      "-z",
      "--no-renames",
      IGNORE_SUBMODULES_DIRTY_FLAG,
      `${commit}^1`,
      `${commit}^2`,
      "--",
    ]),
  ]);
  if (diffOutput.code !== 0 || statusOutput.code !== 0) return null;
  let summary = summarizeStatusEntries(
    parseNameStatusZ(diffOutput.stdout),
    parseNameStatusZ(statusOutput.stdout),
    gitRoot,
  );
  return classifyPathIdentity(gitRoot, summary.paths, summary.added, options, summary.deleted);
}
//@ chunk-0sfjpx19.js:132835-133572 placement
function createCommitAttributionState() {
  return {
    fileContentCache: new Map(),
    turnBaselines: new Map(),
    dirtyAttributions: new Map(),
    gitStatusInFlight: new Map(),
    verificationStarts: new Map(),
    pendingCommits: new Map(),
    sessionRepoRoot: null,
    sessionCanonicalRoot: null,
    launchGitDir: null,
    launchCommonDir: null,
    launchModuleDirs: new Map(),
    launchInodeIdentity: true,
    launchPinHandles: [],
    launchHeldDirs: new Set(),
    vouchedRepos: new Map(),
    everVouchedRepos: new Set(),
    launchStateTaken: false,
    startFolderReposDue: [],
    launchRepoRoot: null,
    nonGitLaunch: false,
    commitGateLatched: false,
    launchHookRepo: null,
    pendingVouches: [],
    attachedDirs: new Set(),
    registration: Promise.resolve(),
    statusCapHits: 0,
    statusBackedOff: false,
    statusBackoffSkips: 0,
    lastStatus: null,
    hooksRegistered: false,
    commitVerifyGateBlockCounts: new Map(),
    armedTrailerFiles: new Map(),
  };
}
//@ chunk-89f54s6c.js:13743-13998 fingerprint (2.1.88 match: isGitTransientState, 0.913)
async function isGitTransientState(cwd, fsApi) {
  if (
    (
      await Promise.all(
        ["MERGE_HEAD", "CHERRY_PICK_HEAD", "REVERT_HEAD", "BISECT_LOG", "rebase-merge", "rebase-apply"].map(
          (indicator) =>
            lstat(join(cwd, indicator)).then(
              () => true,
              () => false,
            ),
        ),
      )
    ).includes(true)
  )
    return true;
  let existingRefs = await findExistingRefs(cwd, SEQUENCER_STATE_FILES, fsApi);
  return existingRefs === null ? null : existingRefs.size > 0;
}
//@ chunk-18hwfzwa.js:119585-119627 fingerprint (2.1.88 match: getStagedFiles, 0.456)
function getStagedFiles(attribution) {
  return attribution?.source === "diff";
}
export {
  computeContentHash,
  SHA256_HEX_RE,
  createCommitAttributionState,
  createEmptyAttributionState,
  normalizeFilePath,
  getStagedFiles,
  restoreAttributionStateFromSnapshots,
  isInternalModelRepoCached,
  isGitTransientState,
  isInternalModelRepo,
  trackFileDeletion,
  calculateCommitAttribution,
  getModelFamilyForAttribution,
  isFileDeleted,
};
