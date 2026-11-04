/**
 * cli/handlers/purgeProject.ts
 *
 * 2.1.316 新增：claude project purge 入口：解析路径/--all/-i/--dry-run，确认后删除项目数据；收集清理某项目需要删除的条目（项目目录、任务、调试日志、文件历史、配置键、history 行）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5f8vf2zr.js (48)
 * attribution: placement 48
 */
import { stat, readdir, lstat, rm } from "fs/promises";
import { resolve, sep, join, dirname, basename } from "path";
import { createReadStream } from "fs";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { render } from "../../ink/hooks/useTerminalHooks.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { AppRoot } from "../../components/AppRoot.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { getGlobalConfig, deleteProjectConfig } from "../../utils/config.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { jsonParse } from "../../utils/slowOperations.js";
import {
  splitHistoryStream,
  splitHistoryLines,
  filterHistoryFile,
  HISTORY_FILE_RETRY_OPTIONS,
} from "../../utils/historyFile.js";
import { getTranscriptStorageKey, getRealPathOptions } from "../../utils/sessionStorage.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isENOENT,
  getErrnoCode,
  sanitizedErrnoLowerForTelemetry,
  toError,
  sanitizedErrCodeForTelemetry,
} from "../../utils/errors.js";
import { STORAGE_SPACES, isValidKeySegment } from "../../utils/storage/storageSpaces.js";
import { isNonRegularError } from "../../services/memorySync/pathScrub.js";
import { lock, releaseLockQuietly } from "../../utils/lockfile.js";
import {
  getProjectsDir,
  canonicalizePath,
  findProjectDirs,
  sanitizePath,
} from "../../utils/sessionStoragePortable.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { storageRootsFor } from "../../utils/settings/settingsStorage.js";
import { getTaskOutputDir } from "../../utils/tasks.js";
import { normalizePathForConfigKey } from "../../utils/path.js";
import { dirHasHistoryFile } from "../../history.js";
import { logError } from "../../utils/log.js";
import {
  printCliError,
  cliErrorAfterAnalyticsFlush,
  cliOkAfterAnalyticsFlush,
  cliWarn,
  cliError,
} from "../exit.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import {
  logFeatureBadAsync,
  logFeatureOkAsync,
  logFeatureSadAsync,
} from "../../services/analytics/featureTelemetry.js";
import { isOwnTempName } from "../../utils/atomicPublishWrite.js";
import { isHashTempFile } from "../../services/memorySync/syncFiles.js";
import { confirmYesNo } from "./util.js";

//@ chunk-5f8vf2zr.js:15947-15994 placement
function printOut(text = "") {
  process.stdout.write(`${text}
`);
}
//@ chunk-5f8vf2zr.js:15994-16119 placement
async function pathOrScopeExists(path, storageKey, checkStorage) {
  if (isStorageV5Enabled() && storageKey !== undefined) {
    let inStorage = await checkStorage(storageKey);
    if (inStorage !== undefined) return inStorage;
  }
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-5f8vf2zr.js:16119-16344 placement
async function scopeExistsInStorage(storage, scope) {
  try {
    let result = await storage.scopeKind(scope, {
      resolveLink: true,
    });
    if (!result.ok) return;
    switch (result.value.kind) {
      case "absent":
        return false;
      case "link":
        return result.value.linkResolves === true;
      case "directory":
      case "other":
        return true;
    }
  } catch {
    return;
  }
}
//@ chunk-5f8vf2zr.js:16344-16471 placement
async function keyExistsInStorage(storage, key) {
  try {
    let meta = await storage.statMeta(key);
    if (meta.ok) return true;
    return meta.error.code === "NotFound" ? false : undefined;
  } catch {
    return;
  }
}
//@ chunk-5f8vf2zr.js:16471-16532 placement
async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
//@ chunk-5f8vf2zr.js:16532-16878 placement
/**
 * 在 Ink 中渲染一次性的选择列表并等待用户选择。
 */
async function promptSelect(children, options, defaultValue) {
  let resolveValue = () => {};
  let promise = new Promise((resolve) => {
    resolveValue = resolve;
  });
  let { unmount, waitUntilExit } = await render(
    jsxProd_default(AppRoot, {
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        paddingY: 1,
        children: [
          jsxProd_default(Text, {
            bold: true,
            children,
          }),
          jsxProd_default(ModelSelector, {
            options,
            defaultValue,
            visibleOptionCount: 10,
            onChange: (chosen) => {
              resolveValue(chosen);
              unmount();
            },
            onCancel: () => {
              resolveValue(null);
              unmount();
            },
          }),
        ],
      }),
    }),
    {
      exitOnCtrlC: false,
    },
  );
  await waitUntilExit();
  return promise;
}
//@ chunk-5f8vf2zr.js:16878-16930 placement
function knownProjectDirs() {
  return Object.keys(getGlobalConfig().projects ?? {});
}
//@ chunk-5f8vf2zr.js:16930-17156 placement
async function promptPurgeProject() {
  let defaultValue = resolve(getOriginalCwd());
  let knownDirs = knownProjectDirs();
  let seen = new Set([defaultValue]);
  let options = [
    {
      label: defaultValue,
      value: defaultValue,
      description: "current directory",
    },
  ];
  for (let dir of knownDirs) {
    if (seen.has(dir)) continue;
    seen.add(dir);
    options.push({
      label: dir,
      value: dir,
    });
  }
  return promptSelect("Select a project to purge:", options, defaultValue);
}
//@ chunk-5f8vf2zr.js:17156-17235 placement
function isPathUnderAny(path, roots) {
  for (let root of roots) if (path === root || path.startsWith(root + sep)) return true;
  return false;
}
//@ chunk-5f8vf2zr.js:17235-17350 placement
function historyLineMatchesProjects(line, projects) {
  if (!line) return false;
  try {
    let entry = jsonParse(line);
    return typeof entry.project === "string" && isPathUnderAny(entry.project, projects);
  } catch {
    return false;
  }
}
//@ chunk-5f8vf2zr.js:17350-17570 placement = getErrorsPath (1)
async function anyTranscriptInProjects(projectDir, projects, storage) {
  let storageNames = await listTranscriptFileNames(storage, projectDir);
  let fileNames;
  if (storageNames !== null) fileNames = storageNames;
  else
    try {
      fileNames = (await readdir(projectDir)).filter((name) => name.endsWith(".jsonl")).sort();
    } catch {
      return false;
    }
  for (let fileName of fileNames) {
    let path = await readTranscriptCwdFallback(join(projectDir, fileName), storage);
    if (path !== null) return isPathUnderAny(path, projects);
  }
  return false;
}
//@ chunk-5f8vf2zr.js:17570-17659 placement
function readCwdFromJsonLine(line) {
  try {
    let entry = jsonParse(line);
    return typeof entry.cwd === "string" ? entry.cwd : undefined;
  } catch {
    return;
  }
}
//@ chunk-5f8vf2zr.js:17659-17669 placement
var MAX_HISTORY_SCAN_LINES = 50;
//@ chunk-5f8vf2zr.js:17669-17889 placement
async function readTranscriptCwdFallback(transcriptPath, storage) {
  let transcriptCwd = await readTranscriptCwd(transcriptPath, storage);
  if (transcriptCwd !== undefined) return transcriptCwd;
  let readStream = createReadStream(transcriptPath, {
    encoding: "utf8",
  });
  let scanned = 0;
  try {
    for await (let line of splitHistoryStream(readStream)) {
      if (++scanned > MAX_HISTORY_SCAN_LINES) break;
      let cwdFromJsonLine = readCwdFromJsonLine(line);
      if (cwdFromJsonLine !== undefined) return cwdFromJsonLine;
    }
  } catch {
  } finally {
    readStream.close();
  }
  return null;
}
//@ chunk-5f8vf2zr.js:17889-17912 placement
var FIRST_PAGE_BYTES = 16384;
var NEXT_PAGE_BYTES = 262144;
//@ chunk-5f8vf2zr.js:17912-18193 placement
async function readTranscriptCwd(transcriptPath, storage) {
  let transcriptStorageKey = getTranscriptStorageKey(transcriptPath, storage);
  if (transcriptStorageKey === undefined) return;
  let scan = await scanRecordsPaged(transcriptStorageKey.backend, transcriptStorageKey.key, {
    pageBytes: (pageIndex) => (pageIndex === 0 ? FIRST_PAGE_BYTES : NEXT_PAGE_BYTES),
    lineCap: MAX_HISTORY_SCAN_LINES,
    judge: readCwdFromJsonLine,
  });
  switch (scan.kind) {
    case "found":
      return scan.value;
    case "end":
      return null;
    case "refused":
      return scan.code === "Failed" ? null : undefined;
    case "cannotAnswer":
      return;
  }
}
//@ chunk-5f8vf2zr.js:18193-19013 placement
/**
 * 分页正向读取存储记录流并逐条交给 judge，超过页数上限返回 cannotAnswer。
 */
async function scanRecordsPaged(backend, stream, options) {
  let lineCount = 0;
  let fromSeq;
  try {
    for (let idx = 0; ; idx++) {
      if (idx >= MAX_STORAGE_LIST_PAGES)
        return {
          kind: "cannotAnswer",
        };
      let records = await backend.readRecords(stream, {
        order: "forward",
        maxBytes: options.pageBytes(idx),
        ...(options.lineCap !== undefined && {
          limit: options.lineCap - lineCount,
        }),
        ...(fromSeq !== undefined && {
          fromSeq,
        }),
      });
      if (!records.ok) {
        let { error } = records;
        return {
          kind: "refused",
          code: error.code,
          ...("telemetryCode" in error &&
            error.telemetryCode !== undefined && {
              telemetryCode: error.telemetryCode,
            }),
        };
      }
      for (let item of records.value.items)
        for (let line of parseRecordBytes(item.data)) {
          let verdict = options.judge(line);
          if (verdict !== undefined)
            return {
              kind: "found",
              value: verdict,
            };
          if (options.lineCap !== undefined && ++lineCount >= options.lineCap)
            return {
              kind: "end",
            };
        }
      let nextSeq = records.value.nextSeq;
      if (nextSeq === undefined)
        return {
          kind: "end",
        };
      if (fromSeq !== undefined && nextSeq <= fromSeq)
        return {
          kind: "cannotAnswer",
        };
      fromSeq = nextSeq;
    }
  } catch (error) {
    logForDebugging(
      `purge: the storage interface threw on readRecords of the ${stream.namespace} stream; the caller's legacy path serves (${errorMessage(error)})`,
    );
    return {
      kind: "cannotAnswer",
    };
  }
}
//@ chunk-5f8vf2zr.js:19013-19187 placement
function parseRecordBytes(item) {
  let { buffer, byteOffset, byteLength } = item;
  let str = Buffer.from(buffer, byteOffset, byteLength).toString("utf8");
  let chomped = str.endsWith(`
`)
    ? str.slice(0, -1)
    : str;
  return splitHistoryLines(chomped.endsWith("\r") ? chomped.slice(0, -1) : chomped);
}
//@ chunk-5f8vf2zr.js:19187-19202 placement
var HISTORY_SCAN_PAGE_BYTES = 1048576;
//@ chunk-5f8vf2zr.js:19202-19581 placement
/**
 * 扫描 history 记录，统计属于指定项目的提示词条数（可收集保留项）。
 */
async function countHistoryMatches(storage, projects, kept) {
  let matched = 0;
  let scan = await scanRecordsPaged(storage, STORAGE_SPACES.history(), {
    pageBytes: () => HISTORY_SCAN_PAGE_BYTES,
    judge: (line) => {
      if (historyLineMatchesProjects(line, projects)) matched++;
      else kept?.push(line);
      return;
    },
  });
  switch (scan.kind) {
    case "found":
    case "end":
      return (await historyHasTornTail(storage)) === false
        ? {
            kind: "scanned",
            matched,
          }
        : {
            kind: "defer",
          };
    case "refused":
      if (scan.code === "NotFound")
        return {
          kind: "absent",
        };
      return scan.code === "Unavailable"
        ? {
            kind: "defer",
          }
        : scan;
    case "cannotAnswer":
      return {
        kind: "defer",
      };
  }
}
//@ chunk-5f8vf2zr.js:19581-19726 placement
async function historyMatchCount(storage, projects) {
  let result = await countHistoryMatches(storage, projects);
  switch (result.kind) {
    case "scanned":
      return result.matched;
    case "absent":
      return 0;
    case "defer":
    case "refused":
      return;
  }
}
//@ chunk-5f8vf2zr.js:19726-19745 placement
class HistoryRewriteRefusedError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
//@ chunk-5f8vf2zr.js:19745-20984 placement
/**
 * purge 历史：从 history.jsonl 中删除属于给定项目目录的行（storage 后端或文件，带锁），拒绝时抛 history.jsonl was not rewritten。
 */
async function purgeProjectHistory(storage, historyPath, projects) {
  let kept = [];
  let result = await countHistoryMatches(storage, projects, kept);
  switch (result.kind) {
    case "absent":
      return 0;
    case "defer":
      return;
    case "refused":
      if (isNonRegularError(result.telemetryCode))
        throw historyRewriteRefusedError(
          `history.jsonl is a symlink or not a regular file, which the storage interface never reads or writes through (${issueWithTelemetryCode(result)})`,
        );
      if (result.code === "InvalidArgument")
        throw historyRewriteRefusedError(
          `the storage interface declined the read (${issueWithTelemetryCode(result)})`,
        );
      logForDebugging(
        `purge history: the storage interface could not read history.jsonl (${issueWithTelemetryCode(result)}); today's rewrite serves`,
      );
      return;
    case "scanned":
      break;
  }
  let matched = result.matched;
  if (matched === 0) return 0;
  let mode;
  try {
    let stats = await lstat(historyPath);
    mode = stats.isFile() ? stats.mode & 511 : undefined;
  } catch {
    mode = undefined;
  }
  let replaceResult;
  try {
    replaceResult = await storage.replaceRecords(
      STORAGE_SPACES.history(),
      kept.map((line) => ({
        data: `${line}
`,
      })),
      mode === undefined
        ? undefined
        : {
            mode,
          },
    );
  } catch (error) {
    logForDebugging(
      `purge history: the storage interface threw on replaceRecords; history.jsonl is rewritten directly instead (${errorMessage(error)})`,
    );
    return;
  }
  if (replaceResult.ok) return matched;
  let { error } = replaceResult;
  switch (error.code) {
    case "Unavailable":
    case "Failed":
      logForDebugging(
        `purge history: the storage interface could not rewrite history.jsonl (${issueWithTelemetryCode(error)}); today's rewrite serves`,
      );
      return;
    case "InvalidArgument":
      throw historyRewriteRefusedError(`the storage interface declined the rewrite (${error.argument})`);
    case "NotFound":
    case "PreconditionFailed":
      throw historyRewriteRefusedError(`the storage interface declined the rewrite (${error.code})`);
  }
}
//@ chunk-5f8vf2zr.js:20984-21252 placement
async function historyHasTornTail(storage) {
  try {
    let stats = await storage.stat(STORAGE_SPACES.history());
    if (!stats.ok) return stats.error.code === "NotFound" ? false : undefined;
    return (stats.value.tornTailBytes ?? 0) > 0;
  } catch (error) {
    logForDebugging(
      `purge history: the storage interface threw on stat; history.jsonl is read directly instead (${errorMessage(error)})`,
    );
    return;
  }
}
//@ chunk-5f8vf2zr.js:21252-21336 placement
function issueWithTelemetryCode(error) {
  return error.telemetryCode === undefined ? error.code : `${error.code} ${error.telemetryCode}`;
}
//@ chunk-5f8vf2zr.js:21336-21442 placement
function historyRewriteRefusedError(reason) {
  return new HistoryRewriteRefusedError(
    `history.jsonl was not rewritten \u2014 ${reason}`,
    "purge history rewrite refused",
  );
}
//@ chunk-5f8vf2zr.js:21442-21492 placement
async function countHistoryForProjects(historyPath, projects, storage) {
  return rewriteHistoryFile(historyPath, projects, "count", storage);
}
//@ chunk-5f8vf2zr.js:21492-22073 placement
/**
 * 在 history 锁保护下重写 history 文件（filter 模式按项目过滤）。
 */
async function rewriteHistoryFile(historyPath, projects, mode, storage) {
  if (mode !== "filter") {
    if (isStorageV5Enabled() && storage !== undefined) {
      let count = await historyMatchCount(storage, projects);
      if (count !== undefined) return count;
    }
    return filterHistoryFile(historyPath, (line) => historyLineMatchesProjects(line, projects), mode);
  }
  let isCompromised = false;
  let lockHandle;
  try {
    lockHandle = await lock(historyPath, {
      ...HISTORY_FILE_RETRY_OPTIONS,
      onCompromised: (reason) => {
        isCompromised = true;
        logForDebugging(`History purge lock compromised: ${reason}`, {
          level: "error",
        });
      },
    });
  } catch (error) {
    if (isENOENT(error)) return 0;
    throw historyRewriteRefusedError("the history lock could not be acquired");
  }
  try {
    if (isStorageV5Enabled() && storage !== undefined) {
      let purged = await purgeProjectHistory(storage, historyPath, projects);
      if (purged !== undefined) return purged;
    }
    return await filterHistoryFile(historyPath, (line) => historyLineMatchesProjects(line, projects), mode, {
      fileMode: "preserve",
      beforeWrite: () => {
        if (isCompromised)
          throw historyRewriteRefusedError("the history lock was compromised before the rewrite");
      },
    });
  } finally {
    await releaseLockQuietly(lockHandle, "history purge");
  }
}
//@ chunk-5f8vf2zr.js:22073-22084 placement
var MAX_STORAGE_LIST_PAGES = 1e4;
//@ chunk-5f8vf2zr.js:22084-22344 placement
/**
 * 分页列出存储空间的全部条目并回调；任一页失败或页数超过上限（ye）时返回 false，否则 true。
 */
async function listAllStorageEntries(storage, scope, onItem, options = {}) {
  let listOptions = {
    skipScopeStats: true,
    skipKeyStats: true,
    ...options,
  };
  let cursor;
  let pages = 0;
  try {
    do {
      let page = await storage.listEntries(scope, {
        ...listOptions,
        ...(cursor !== undefined && {
          cursor,
        }),
      });
      if (!page.ok) return false;
      for (let item of page.value.items) onItem(item);
      cursor = page.value.cursor;
    } while (cursor && ++pages < MAX_STORAGE_LIST_PAGES);
  } catch {
    return false;
  }
  return !cursor;
}
//@ chunk-5f8vf2zr.js:22344-22634 placement
async function listTranscriptProjectKeys(storage) {
  if (!storage) return null;
  let keys = [];
  return (await listAllStorageEntries(
    storage,
    {
      namespace: "transcript",
    },
    (item) => {
      if (
        item.kind === "scope" &&
        item.scope.namespace === "transcript" &&
        item.scope.projectKey !== undefined &&
        item.scope.sessionId === undefined &&
        isValidKeySegment(item.scope.projectKey)
      )
        keys.push(item.scope.projectKey);
    },
    {
      links: "skip",
    },
  ))
    ? keys.sort()
    : null;
}
//@ chunk-5f8vf2zr.js:22634-22924 placement
async function listTranscriptKeysForProjectDir(storage, projectDir) {
  if (!storage || dirname(projectDir) !== getProjectsDir()) return null;
  let projectKey = basename(projectDir);
  let sessionIds = [];
  return (await listAllStorageEntries(
    storage,
    {
      namespace: "transcript",
      projectKey,
    },
    (item) => {
      if (
        item.kind === "key" &&
        item.key.namespace === "transcript" &&
        item.key.projectKey === projectKey &&
        item.key.agentId === undefined &&
        isValidKeySegment(item.key.sessionId)
      )
        sessionIds.push(item.key.sessionId);
    },
  ))
    ? sessionIds.sort()
    : null;
}
//@ chunk-5f8vf2zr.js:22924-23016 placement
async function transcriptKeysForProject(storage, projectDir) {
  let keys = await listTranscriptKeysForProjectDir(storage, projectDir);
  return keys === null ? null : keys.filter((key) => normalizeUuidOrNull(key) !== null);
}
//@ chunk-5f8vf2zr.js:23016-23112 placement = getErrorsPath (1)
async function listTranscriptFileNames(storage, projectDir) {
  let keys = await listTranscriptKeysForProjectDir(storage, projectDir);
  return keys === null ? null : keys.map((key) => `${key}.jsonl`).sort();
}
//@ chunk-5f8vf2zr.js:23112-23307 placement = getErrorsPath (1)
async function listSessionTranscriptFiles(dir, storage) {
  let keys = await transcriptKeysForProject(storage, dir);
  if (keys !== null) return keys;
  let entries;
  try {
    entries = await readdir(dir);
  } catch {
    return [];
  }
  return entries
    .filter((name) => name.endsWith(".jsonl"))
    .map((name) => name.slice(0, -6))
    .filter((sessionId) => normalizeUuidOrNull(sessionId) !== null);
}
//@ chunk-5f8vf2zr.js:23307-25113 placement
/**
 * 收集清理某项目需要删除的条目（项目目录、任务、调试日志、文件历史、配置键、history 行）。
 */
async function collectProjectPurgeItems(projectPath, storage) {
  let claudeConfigDir = getClaudeConfigDir();
  let resolvedPath = resolve(projectPath);
  let realPath = await canonicalizePath(resolvedPath, getRealPathOptions(storage));
  let pathCandidates = new Set([resolvedPath, realPath]);
  let storageRoots = [];
  try {
    await stat(resolvedPath);
    for (let path of pathCandidates) storageRoots.push(...storageRootsFor(path));
  } catch {}
  let items = [];
  let warnings = [];
  let projectDirs = new Set();
  for (let path of pathCandidates) for (let dir of await findProjectDirs(path)) projectDirs.add(dir);
  let projectsDir = getProjectsDir();
  let mapped = [...pathCandidates].map((path) => sanitizePath(path) + "-");
  let projectKeys = await listTranscriptProjectKeys(storage);
  try {
    for (let entry of projectKeys !== null
      ? projectKeys.map((name) => ({
          name,
          isDirectory: () => true,
        }))
      : await readdir(projectsDir, {
          withFileTypes: true,
        })) {
      let dir = join(projectsDir, entry.name);
      if (
        entry.isDirectory() &&
        !projectDirs.has(dir) &&
        mapped.some((prefix) => entry.name.startsWith(prefix)) &&
        (await anyTranscriptInProjects(dir, pathCandidates, storage))
      )
        projectDirs.add(dir);
    }
  } catch {}
  let dirs = [...projectDirs];
  let sessionIds = new Set();
  for (let dir of dirs)
    for (let sessionId of await listSessionTranscriptFiles(dir, storage)) sessionIds.add(sessionId);
  for (let sessionId of sessionIds) {
    let taskOutputDir = getTaskOutputDir(sessionId);
    if (
      await pathOrScopeExists(taskOutputDir, storage, (storage) =>
        scopeExistsInStorage(storage, {
          namespace: "task",
          listId: sessionId,
        }),
      )
    )
      items.push({
        path: taskOutputDir,
        kind: "dir",
        reason: `tasks for session ${sessionId}`,
      });
    let debugLogPath = join(claudeConfigDir, "debug", `${sessionId}.txt`);
    if (
      await pathOrScopeExists(debugLogPath, storage, (storage) =>
        keyExistsInStorage(storage, STORAGE_SPACES.log(sessionId, "debug")),
      )
    )
      items.push({
        path: debugLogPath,
        kind: "file",
        reason: `debug log for session ${sessionId}`,
      });
    let fileHistoryDir = join(claudeConfigDir, "file-history", sessionId);
    if (
      await pathOrScopeExists(fileHistoryDir, storage, (storage) =>
        scopeExistsInStorage(storage, {
          namespace: "fileHistory",
          sessionId,
        }),
      )
    )
      items.push({
        path: fileHistoryDir,
        kind: "dir",
        reason: `file edit history for session ${sessionId}`,
      });
  }
  for (let path of dirs)
    items.push({
      path,
      kind: "dir",
      reason: "project transcripts (.jsonl) and memory/",
    });
  let normalizeKey = (key) => normalizePathForConfigKey(key).replace(/\/+$/, "") || "/";
  let globalConfig = getGlobalConfig();
  let candidateKeys = new Set([...pathCandidates, ...storageRoots].map(normalizeKey));
  for (let key of Object.keys(globalConfig.projects ?? {}))
    if (candidateKeys.has(normalizeKey(key)))
      items.push({
        path: key,
        kind: "config-key",
        reason: "project entry in ~/.claude.json (trust, history, MCP servers)",
      });
  let historyPath = join(claudeConfigDir, "history.jsonl");
  let historyCount = await countHistoryForProjects(historyPath, pathCandidates, storage);
  if (historyCount > 0)
    items.push({
      path: historyPath,
      kind: "history-lines",
      reason: `${historyCount} prompt(s) typed in this project`,
      matchPaths: pathCandidates,
    });
  if (await pathExists(join(claudeConfigDir, "shell-snapshots")))
    warnings.push("shell-snapshots/ are not project-scoped and will not be touched");
  let backupsDir = join(claudeConfigDir, "backups");
  if (await pathExists(backupsDir))
    warnings.push(
      `backups/ may still contain this project entry in old .claude.json snapshots (${backupsDir}); at most 5 are kept and they rotate out automatically`,
    );
  return {
    items,
    warnings,
  };
}
//@ chunk-5f8vf2zr.js:25113-26120 placement
/**
 * --all 时收集所有项目数据目录的清理条目。
 */
async function collectAllPurgeItems(storage) {
  let claudeConfigDir = getClaudeConfigDir();
  let items = [];
  let warnings = [];
  let dirs = [
    ["projects", "all project transcripts (.jsonl) and memory/"],
    ["tasks", "all session task lists"],
    ["debug", "all session debug logs"],
    ["file-history", "all session file edit history"],
  ];
  for (let [name, reason] of dirs) {
    let dir = join(claudeConfigDir, name);
    if (await pathExists(dir))
      items.push({
        path: dir,
        kind: "dir",
        reason,
      });
  }
  let historyPath = join(claudeConfigDir, "history.jsonl");
  if (
    await pathOrScopeExists(historyPath, storage, (storage) =>
      keyExistsInStorage(storage, STORAGE_SPACES.history()),
    )
  )
    items.push({
      path: historyPath,
      kind: "file",
      reason: "prompt history across all projects",
    });
  if (await dirHasHistoryFile(claudeConfigDir))
    items.push({
      path: historyPath,
      kind: "history-siblings",
      reason: "staging copies a crashed history rewrite left beside it",
    });
  for (let path of knownProjectDirs())
    items.push({
      path,
      kind: "config-key",
      reason: "project entry in ~/.claude.json (trust, history, MCP servers)",
    });
  if (await pathExists(join(claudeConfigDir, "shell-snapshots")))
    warnings.push("shell-snapshots/ are not project-scoped and will not be touched");
  let backupsDir = join(claudeConfigDir, "backups");
  if (await pathExists(backupsDir))
    warnings.push(
      `backups/ may still contain project entries in old .claude.json snapshots (${backupsDir}); at most 5 are kept and they rotate out automatically`,
    );
  return {
    items,
    warnings,
  };
}
//@ chunk-5f8vf2zr.js:26120-26373 placement
async function deletePathForPurge(path, recursive) {
  try {
    await rm(path, {
      recursive,
      force: true,
    });
    return null;
  } catch (error) {
    if (getErrnoCode(error) === undefined) throw error;
    logForDebugging(`purge: could not delete ${path}: ${errorMessage(error)}`, {
      level: "error",
    });
    return {
      message: `Could not delete ${path} \u2014 ${errorMessage(error)}`,
      code: `delete_failed_${sanitizedErrnoLowerForTelemetry(error)}`,
    };
  }
}
//@ chunk-5f8vf2zr.js:26373-27276 placement
/**
 * 删除单个清理条目（配置键、history 行、目录等），返回失败信息。
 */
async function deletePurgeItem(item, storage) {
  switch (item.kind) {
    case "config-key":
      if (!(await deleteProjectConfig(item.path, storage)))
        return {
          message: `Failed to remove projects["${item.path}"] from .claude.json \u2014 is your config directory writable?`,
          code: "config_write_failed",
        };
      return null;
    case "history-lines":
      try {
        await rewriteHistoryFile(item.path, item.matchPaths ?? new Set(), "filter", storage);
      } catch (error) {
        if (error instanceof HistoryRewriteRefusedError)
          return {
            message: error.message,
            code: "history_rewrite_refused",
          };
        throw error;
      }
      return null;
    case "file":
      if (basename(item.path) === "history.jsonl") {
        let lockHandle;
        try {
          lockHandle = await lock(item.path, {
            ...HISTORY_FILE_RETRY_OPTIONS,
            onCompromised: (reason) =>
              logForDebugging(`History purge (--all) lock compromised: ${reason}`, {
                level: "error",
              }),
          });
        } catch (error) {
          if (isENOENT(error)) return null;
          return {
            message: "history.jsonl was not removed \u2014 the history lock could not be acquired",
            code: "history_rewrite_refused",
          };
        }
        try {
          return await deletePathForPurge(item.path, false);
        } finally {
          await releaseLockQuietly(lockHandle, "history purge (--all)");
        }
      }
      return deletePathForPurge(item.path, false);
    case "history-siblings":
      return removeHistoryStagingSiblings(dirname(item.path));
    case "dir":
      return deletePathForPurge(item.path, true);
  }
}
//@ chunk-5f8vf2zr.js:27276-27519 placement
/**
 * 项目清理中途失败时：记日志、打印错误与重试提示、记遥测后以错误退出。
 */
async function reportPurgeStopped(error) {
  logError(toError(error));
  printCliError(
    stripControlChars(`Purge stopped before it finished: ${errorMessage(error)}
Some items may still be on disk. Run the command again; \`--dry-run\` lists what is left.`),
  );
  await logFeatureBadAsync(
    "cli_purge_project",
    `stopped_${sanitizedErrCodeForTelemetry(error) ?? "unknown"}`,
  );
  return cliErrorAfterAnalyticsFlush();
}
//@ chunk-5f8vf2zr.js:27519-27978 placement
/**
 * 汇总并输出清理失败项与提示。
 */
async function reportPurgeFailures(failures, successText) {
  if (failures.length > 0) {
    let any = failures.some((failure) => failure.code.startsWith("delete_failed_"));
    printCliError(
      stripControlChars(
        `${failures.length} item(s) failed:
  ${failures.map((failure) => failure.message).join(`
  `)}` +
          (any
            ? `
What could not be deleted is still on disk: fix the cause and run the command again, or delete those paths by hand.`
            : ""),
      ),
    );
    let codes = new Set(failures.map((failure) => failure.code));
    await logFeatureBadAsync("cli_purge_project", codes.size === 1 ? failures[0].code : "multiple_failures");
    return cliErrorAfterAnalyticsFlush();
  }
  printOut(successText);
  await logFeatureOkAsync("cli_purge_project");
  return cliOkAfterAnalyticsFlush();
}
//@ chunk-5f8vf2zr.js:27978-28094 placement
async function reportDryRun(count) {
  printOut(`Dry run: ${count} item(s) would be deleted.`);
  await logFeatureOkAsync("cli_purge_project_dry_run");
  return cliOkAfterAnalyticsFlush();
}
//@ chunk-5f8vf2zr.js:28094-28166 placement
async function abortPurgeProject(message, reason) {
  printCliError(message);
  await logFeatureSadAsync("cli_purge_project", reason);
  return cliErrorAfterAnalyticsFlush();
}
//@ chunk-5f8vf2zr.js:28267-28280 placement
var STALE_HISTORY_TMP_AGE_MS = 60000;
//@ chunk-5f8vf2zr.js:28280-29557 placement
/**
 * 删除 history.jsonl 的临时副本（.tmp 等），受 history 锁保护。
 */
async function removeHistoryStagingSiblings(configDir) {
  let historyPath = join(configDir, "history.jsonl");
  let lockHandle;
  try {
    lockHandle = await lock(historyPath, {
      ...HISTORY_FILE_RETRY_OPTIONS,
      onCompromised: (reason) =>
        logForDebugging(`History purge (--all siblings) lock compromised: ${reason}`, {
          level: "error",
        }),
    });
  } catch (error) {
    if (!isENOENT(error))
      return {
        message:
          "history.jsonl staging copies were not removed \u2014 the history lock could not be acquired",
        code: "history_siblings_remain",
      };
  }
  let failedNames = [];
  let recentNames = [];
  try {
    let entries;
    try {
      entries = await readdir(configDir);
    } catch (error) {
      if (isENOENT(error)) return null;
      return {
        message: `history.jsonl staging copies could not be listed: ${errorMessage(error)}`,
        code: "history_siblings_remain",
      };
    }
    let staleBefore = Date.now() - STALE_HISTORY_TMP_AGE_MS;
    for (let name of entries) {
      let isOwnTemp = isOwnTempName(name, "history.jsonl");
      if (!isOwnTemp && !isHashTempFile(name)) continue;
      let path = join(configDir, name);
      try {
        let stats = await lstat(path);
        if (!stats.isFile()) continue;
        if (!isOwnTemp && stats.mtimeMs > staleBefore) {
          recentNames.push(name);
          continue;
        }
        await rm(path, {
          force: true,
        });
      } catch (error) {
        if (!isENOENT(error)) failedNames.push(name);
      }
    }
  } finally {
    await releaseLockQuietly(lockHandle, "history purge (--all siblings)");
  }
  if (failedNames.length > 0)
    return {
      message: `history.jsonl staging copies were not removed (${failedNames.join(", ")}) \u2014 a complete copy of the kept prompt history remains; delete them by hand`,
      code: "history_siblings_remain",
    };
  if (recentNames.length > 0)
    return {
      message: `staging files written in the last minute were left in place (${recentNames.join(", ")}) \u2014 a live write elsewhere may own them; if one is a crashed purge's copy of the prompt history, re-run in a minute`,
      code: "history_siblings_remain",
    };
  return null;
}
//@ chunk-5f8vf2zr.js:29557-29882 placement
/**
 * 把清理条目格式化为一行描述。
 */
function describePurgeItem(item) {
  let line;
  switch (item.kind) {
    case "config-key":
      line = `config: projects["${item.path}"]`;
      break;
    case "history-lines":
      line = `filter: ${item.path}`;
      break;
    case "history-siblings":
      line = `siblings: ${item.path}.tmp.* and ${dirname(item.path)}${sep}.<16hex>.tmp`;
      break;
    case "file":
    case "dir":
      line = `${item.kind}:    ${item.path}`;
      break;
  }
  return `${line}
           ${item.reason}`;
}
//@ chunk-5f8vf2zr.js:29882-30082 placement
function printPurgePlan(target, items, warnings) {
  printOut(`
Purge plan for ${target}:
`);
  for (let item of items) printOut(`  ${describePurgeItem(item)}`);
  if (warnings.length) {
    printOut();
    for (let warning of warnings) cliWarn(warning);
  }
  printOut(`
Purging deletes data only on this computer, not anything stored by Anthropic.`);
}
//@ chunk-5f8vf2zr.js:30082-31900 placement
/**
 * claude project purge 入口：解析路径/--all/-i/--dry-run，确认后删除项目数据。
 */
async function purgeProjectHandler(pathArg, options, storage) {
  if (options.all) {
    if (pathArg) cliError("Cannot specify both a path and --all.");
    if (options.interactive) cliError("Cannot use -i/--interactive with --all.");
    let { items, warnings } = await collectAllPurgeItems(storage);
    if (items.length === 0) {
      printCliError(`No Claude Code project state found under ${getClaudeConfigDir()}.`);
      await logFeatureBadAsync("cli_purge_project", "cli_purge_project_nothing_found");
      return cliErrorAfterAnalyticsFlush();
    }
    printPurgePlan("all projects", items, warnings);
    if (options.dryRun) return reportDryRun(items.length);
    if (!options.yes) {
      if (
        !(await confirmYesNo(
          `Delete ${items.length} item(s) for ALL projects from this computer? This can't be undone.`,
        ))
      )
        return abortPurgeProject("Aborted.", "declined");
    }
    let failures = [];
    for (let item of items) {
      let failure = await deletePurgeItem(item, storage);
      if (failure) failures.push(failure);
    }
    return reportPurgeFailures(failures, `Purged ${items.length} item(s) across all projects.`);
  }
  let target;
  if (pathArg) target = resolve(pathArg);
  else {
    let chosen = await promptPurgeProject();
    if (chosen === null) return abortPurgeProject("Aborted.", "cancelled");
    target = chosen;
  }
  let { items, warnings } = await collectProjectPurgeItems(target, storage);
  if (items.length === 0) {
    printCliError(
      stripControlChars(`No Claude Code project state found for ${target} under ${getClaudeConfigDir()}.`),
    );
    await logFeatureBadAsync("cli_purge_project", "cli_purge_project_nothing_found");
    return cliErrorAfterAnalyticsFlush();
  }
  printPurgePlan(target, items, warnings);
  if (options.dryRun) return reportDryRun(items.length);
  if (options.interactive) {
    let deletedCount = 0;
    let deleteRemaining = false;
    let failures = [];
    for (let [index, item] of items.entries()) {
      let choice = "delete";
      if (!deleteRemaining)
        choice =
          (await promptSelect(`[${index + 1}/${items.length}] ${describePurgeItem(item)}`, [
            {
              label: "Delete",
              value: "delete",
            },
            {
              label: "Skip",
              value: "skip",
            },
            {
              label: "Delete this and all remaining",
              value: "all",
            },
            {
              label: "Abort",
              value: "abort",
            },
          ])) ?? "abort";
      if (choice === "abort")
        return abortPurgeProject(`Aborted. ${deletedCount} item(s) deleted.`, "aborted");
      if (choice === "skip") continue;
      if (choice === "all") deleteRemaining = true;
      let failure = await deletePurgeItem(item, storage);
      if (failure) {
        failures.push(failure);
        continue;
      }
      deletedCount++;
    }
    let summary = `Purged ${deletedCount}/${items.length} item(s) for ${target}.`;
    if (deletedCount === 0 && failures.length === 0) {
      printOut(summary);
      await logFeatureSadAsync("cli_purge_project", "all_skipped");
      return cliOkAfterAnalyticsFlush();
    }
    return reportPurgeFailures(failures, summary);
  }
  if (!options.yes) {
    if (
      !(await confirmYesNo(
        `Delete ${items.length} item(s) for ${target} from this computer? This can't be undone.`,
      ))
    )
      return abortPurgeProject("Aborted.", "declined");
  }
  let failures = [];
  for (let item of items) {
    let failure = await deletePurgeItem(item, storage);
    if (failure) failures.push(failure);
  }
  return reportPurgeFailures(failures, `Purged ${items.length} item(s) for ${target}.`);
}
export { purgeProjectHandler, reportPurgeStopped };
