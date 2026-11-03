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
function printOut(i = "") {
  process.stdout.write(`${i}
`);
}
//@ chunk-5f8vf2zr.js:15994-16119 placement
async function pathOrScopeExists(path, storageKey, checkStorage) {
  if (isStorageV5Enabled() && storageKey !== undefined) {
    let c = await checkStorage(storageKey);
    if (c !== undefined) return c;
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
    let o = await storage.scopeKind(scope, {
      resolveLink: true,
    });
    if (!o.ok) return;
    switch (o.value.kind) {
      case "absent":
        return false;
      case "link":
        return o.value.linkResolves === true;
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
    let o = await storage.statMeta(key);
    if (o.ok) return true;
    return o.error.code === "NotFound" ? false : undefined;
  } catch {
    return;
  }
}
//@ chunk-5f8vf2zr.js:16471-16532 placement
async function pathExists(i) {
  try {
    await stat(i);
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
  let c = () => {};
  let promise = new Promise((resolve) => {
    c = resolve;
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
            onChange: (p) => {
              c(p);
              unmount();
            },
            onCancel: () => {
              c(null);
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
  let a = knownProjectDirs();
  let o = new Set([defaultValue]);
  let options = [
    {
      label: defaultValue,
      value: defaultValue,
      description: "current directory",
    },
  ];
  for (let u of a) {
    if (o.has(u)) continue;
    o.add(u);
    options.push({
      label: u,
      value: u,
    });
  }
  return promptSelect("Select a project to purge:", options, defaultValue);
}
//@ chunk-5f8vf2zr.js:17156-17235 placement
function isPathUnderAny(i, a) {
  for (let o of a) if (i === o || i.startsWith(o + sep)) return true;
  return false;
}
//@ chunk-5f8vf2zr.js:17235-17350 placement
function historyLineMatchesProjects(i, a) {
  if (!i) return false;
  try {
    let o = jsonParse(i);
    return typeof o.project === "string" && isPathUnderAny(o.project, a);
  } catch {
    return false;
  }
}
//@ chunk-5f8vf2zr.js:17350-17570 placement = getErrorsPath (1)
async function anyTranscriptInProjects(i, a, storage) {
  let c = await listTranscriptFileNames(storage, i);
  let u;
  if (c !== null) u = c;
  else
    try {
      u = (await readdir(i)).filter((f) => f.endsWith(".jsonl")).sort();
    } catch {
      return false;
    }
  for (let f of u) {
    let transcriptCwdFallback = await readTranscriptCwdFallback(join(i, f), storage);
    if (transcriptCwdFallback !== null) return isPathUnderAny(transcriptCwdFallback, a);
  }
  return false;
}
//@ chunk-5f8vf2zr.js:17570-17659 placement
function readCwdFromJsonLine(i) {
  try {
    let a = jsonParse(i);
    return typeof a.cwd === "string" ? a.cwd : undefined;
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
  let u = 0;
  try {
    for await (let f of splitHistoryStream(readStream)) {
      if (++u > MAX_HISTORY_SCAN_LINES) break;
      let cwdFromJsonLine = readCwdFromJsonLine(f);
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
  let c = await scanRecordsPaged(transcriptStorageKey.backend, transcriptStorageKey.key, {
    pageBytes: (u) => (u === 0 ? FIRST_PAGE_BYTES : NEXT_PAGE_BYTES),
    lineCap: MAX_HISTORY_SCAN_LINES,
    judge: readCwdFromJsonLine,
  });
  switch (c.kind) {
    case "found":
      return c.value;
    case "end":
      return null;
    case "refused":
      return c.code === "Failed" ? null : undefined;
    case "cannotAnswer":
      return;
  }
}
//@ chunk-5f8vf2zr.js:18193-19013 placement
/**
 * 分页正向读取存储记录流并逐条交给 judge，超过页数上限返回 cannotAnswer。
 */
async function scanRecordsPaged(i, a, o) {
  let c = 0;
  let u;
  try {
    for (let idx = 0; ; idx++) {
      if (idx >= MAX_STORAGE_LIST_PAGES)
        return {
          kind: "cannotAnswer",
        };
      let records = await i.readRecords(a, {
        order: "forward",
        maxBytes: o.pageBytes(idx),
        ...(o.lineCap !== undefined && {
          limit: o.lineCap - c,
        }),
        ...(u !== undefined && {
          fromSeq: u,
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
        for (let y of parseRecordBytes(item.data)) {
          let w = o.judge(y);
          if (w !== undefined)
            return {
              kind: "found",
              value: w,
            };
          if (o.lineCap !== undefined && ++c >= o.lineCap)
            return {
              kind: "end",
            };
        }
      let nextSeq = records.value.nextSeq;
      if (nextSeq === undefined)
        return {
          kind: "end",
        };
      if (u !== undefined && nextSeq <= u)
        return {
          kind: "cannotAnswer",
        };
      u = nextSeq;
    }
  } catch (error) {
    logForDebugging(
      `purge: the storage interface threw on readRecords of the ${a.namespace} stream; the caller's legacy path serves (${errorMessage(error)})`,
    );
    return {
      kind: "cannotAnswer",
    };
  }
}
//@ chunk-5f8vf2zr.js:19013-19187 placement
function parseRecordBytes(i) {
  let { buffer, byteOffset, byteLength } = i;
  let str = Buffer.from(buffer, byteOffset, byteLength).toString("utf8");
  let f = str.endsWith(`
`)
    ? str.slice(0, -1)
    : str;
  return splitHistoryLines(f.endsWith("\r") ? f.slice(0, -1) : f);
}
//@ chunk-5f8vf2zr.js:19187-19202 placement
var HISTORY_SCAN_PAGE_BYTES = 1048576;
//@ chunk-5f8vf2zr.js:19202-19581 placement
/**
 * 扫描 history 记录，统计属于指定项目的提示词条数（可收集保留项）。
 */
async function countHistoryMatches(storage, a, o) {
  let c = 0;
  let u = await scanRecordsPaged(storage, STORAGE_SPACES.history(), {
    pageBytes: () => HISTORY_SCAN_PAGE_BYTES,
    judge: (f) => {
      if (historyLineMatchesProjects(f, a)) c++;
      else o?.push(f);
      return;
    },
  });
  switch (u.kind) {
    case "found":
    case "end":
      return (await historyHasTornTail(storage)) === false
        ? {
            kind: "scanned",
            matched: c,
          }
        : {
            kind: "defer",
          };
    case "refused":
      if (u.code === "NotFound")
        return {
          kind: "absent",
        };
      return u.code === "Unavailable"
        ? {
            kind: "defer",
          }
        : u;
    case "cannotAnswer":
      return {
        kind: "defer",
      };
  }
}
//@ chunk-5f8vf2zr.js:19581-19726 placement
async function historyMatchCount(i, a) {
  let o = await countHistoryMatches(i, a);
  switch (o.kind) {
    case "scanned":
      return o.matched;
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
async function purgeProjectHistory(i, a, o) {
  let c = [];
  let u = await countHistoryMatches(i, o, c);
  switch (u.kind) {
    case "absent":
      return 0;
    case "defer":
      return;
    case "refused":
      if (isNonRegularError(u.telemetryCode))
        throw historyRewriteRefusedError(
          `history.jsonl is a symlink or not a regular file, which the storage interface never reads or writes through (${issueWithTelemetryCode(u)})`,
        );
      if (u.code === "InvalidArgument")
        throw historyRewriteRefusedError(
          `the storage interface declined the read (${issueWithTelemetryCode(u)})`,
        );
      logForDebugging(
        `purge history: the storage interface could not read history.jsonl (${issueWithTelemetryCode(u)}); today's rewrite serves`,
      );
      return;
    case "scanned":
      break;
  }
  let matched = u.matched;
  if (matched === 0) return 0;
  let g;
  try {
    let y = await lstat(a);
    g = y.isFile() ? y.mode & 511 : undefined;
  } catch {
    g = undefined;
  }
  let p;
  try {
    p = await i.replaceRecords(
      STORAGE_SPACES.history(),
      c.map((y) => ({
        data: `${y}
`,
      })),
      g === undefined
        ? undefined
        : {
            mode: g,
          },
    );
  } catch (error) {
    logForDebugging(
      `purge history: the storage interface threw on replaceRecords; history.jsonl is rewritten directly instead (${errorMessage(error)})`,
    );
    return;
  }
  if (p.ok) return matched;
  let { error } = p;
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
function issueWithTelemetryCode(i) {
  return i.telemetryCode === undefined ? i.code : `${i.code} ${i.telemetryCode}`;
}
//@ chunk-5f8vf2zr.js:21336-21442 placement
function historyRewriteRefusedError(i) {
  return new HistoryRewriteRefusedError(
    `history.jsonl was not rewritten \u2014 ${i}`,
    "purge history rewrite refused",
  );
}
//@ chunk-5f8vf2zr.js:21442-21492 placement
async function countHistoryForProjects(i, a, o) {
  return rewriteHistoryFile(i, a, "count", o);
}
//@ chunk-5f8vf2zr.js:21492-22073 placement
/**
 * 在 history 锁保护下重写 history 文件（filter 模式按项目过滤）。
 */
async function rewriteHistoryFile(i, a, o, c) {
  if (o !== "filter") {
    if (isStorageV5Enabled() && c !== undefined) {
      let g = await historyMatchCount(c, a);
      if (g !== undefined) return g;
    }
    return filterHistoryFile(i, (g) => historyLineMatchesProjects(g, a), o);
  }
  let u = false;
  let f;
  try {
    f = await lock(i, {
      ...HISTORY_FILE_RETRY_OPTIONS,
      onCompromised: (g) => {
        u = true;
        logForDebugging(`History purge lock compromised: ${g}`, {
          level: "error",
        });
      },
    });
  } catch (error) {
    if (isENOENT(error)) return 0;
    throw historyRewriteRefusedError("the history lock could not be acquired");
  }
  try {
    if (isStorageV5Enabled() && c !== undefined) {
      let g = await purgeProjectHistory(c, i, a);
      if (g !== undefined) return g;
    }
    return await filterHistoryFile(i, (g) => historyLineMatchesProjects(g, a), o, {
      fileMode: "preserve",
      beforeWrite: () => {
        if (u) throw historyRewriteRefusedError("the history lock was compromised before the rewrite");
      },
    });
  } finally {
    await releaseLockQuietly(f, "history purge");
  }
}
//@ chunk-5f8vf2zr.js:22073-22084 placement
var MAX_STORAGE_LIST_PAGES = 1e4;
//@ chunk-5f8vf2zr.js:22084-22344 placement
/**
 * 分页列出存储空间的全部条目并回调；任一页失败或页数超过上限（ye）时返回 false，否则 true。
 */
async function listAllStorageEntries(storage, scope, onItem, options = {}) {
  let u = {
    skipScopeStats: true,
    skipKeyStats: true,
    ...options,
  };
  let f;
  let g = 0;
  try {
    do {
      let p = await storage.listEntries(scope, {
        ...u,
        ...(f !== undefined && {
          cursor: f,
        }),
      });
      if (!p.ok) return false;
      for (let item of p.value.items) onItem(item);
      f = p.value.cursor;
    } while (f && ++g < MAX_STORAGE_LIST_PAGES);
  } catch {
    return false;
  }
  return !f;
}
//@ chunk-5f8vf2zr.js:22344-22634 placement
async function listTranscriptProjectKeys(storage) {
  if (!storage) return null;
  let a = [];
  return (await listAllStorageEntries(
    storage,
    {
      namespace: "transcript",
    },
    (c) => {
      if (
        c.kind === "scope" &&
        c.scope.namespace === "transcript" &&
        c.scope.projectKey !== undefined &&
        c.scope.sessionId === undefined &&
        isValidKeySegment(c.scope.projectKey)
      )
        a.push(c.scope.projectKey);
    },
    {
      links: "skip",
    },
  ))
    ? a.sort()
    : null;
}
//@ chunk-5f8vf2zr.js:22634-22924 placement
async function listTranscriptKeysForProjectDir(storage, a) {
  if (!storage || dirname(a) !== getProjectsDir()) return null;
  let o = basename(a);
  let c = [];
  return (await listAllStorageEntries(
    storage,
    {
      namespace: "transcript",
      projectKey: o,
    },
    (f) => {
      if (
        f.kind === "key" &&
        f.key.namespace === "transcript" &&
        f.key.projectKey === o &&
        f.key.agentId === undefined &&
        isValidKeySegment(f.key.sessionId)
      )
        c.push(f.key.sessionId);
    },
  ))
    ? c.sort()
    : null;
}
//@ chunk-5f8vf2zr.js:22924-23016 placement
async function transcriptKeysForProject(i, a) {
  let o = await listTranscriptKeysForProjectDir(i, a);
  return o === null ? null : o.filter((c) => normalizeUuidOrNull(c) !== null);
}
//@ chunk-5f8vf2zr.js:23016-23112 placement = getErrorsPath (1)
async function listTranscriptFileNames(i, a) {
  let o = await listTranscriptKeysForProjectDir(i, a);
  return o === null ? null : o.map((c) => `${c}.jsonl`).sort();
}
//@ chunk-5f8vf2zr.js:23112-23307 placement = getErrorsPath (1)
async function listSessionTranscriptFiles(i, a) {
  let o = await transcriptKeysForProject(a, i);
  if (o !== null) return o;
  let c;
  try {
    c = await readdir(i);
  } catch {
    return [];
  }
  return c
    .filter((u) => u.endsWith(".jsonl"))
    .map((u) => u.slice(0, -6))
    .filter((u) => normalizeUuidOrNull(u) !== null);
}
//@ chunk-5f8vf2zr.js:23307-25113 placement
/**
 * 收集清理某项目需要删除的条目（项目目录、任务、调试日志、文件历史、配置键、history 行）。
 */
async function collectProjectPurgeItems(i, a) {
  let claudeConfigDir = getClaudeConfigDir();
  let c = resolve(i);
  let u = await canonicalizePath(c, getRealPathOptions(a));
  let f = new Set([c, u]);
  let g = [];
  try {
    await stat(c);
    for (let h of f) g.push(...storageRootsFor(h));
  } catch {}
  let p = [];
  let m = [];
  let y = new Set();
  for (let h of f) for (let S of await findProjectDirs(h)) y.add(S);
  let projectsDir = getProjectsDir();
  let mapped = [...f].map((h) => sanitizePath(h) + "-");
  let T = await listTranscriptProjectKeys(a);
  try {
    for (let h of T !== null
      ? T.map((name) => ({
          name,
          isDirectory: () => true,
        }))
      : await readdir(projectsDir, {
          withFileTypes: true,
        })) {
      let S = join(projectsDir, h.name);
      if (
        h.isDirectory() &&
        !y.has(S) &&
        mapped.some((R) => h.name.startsWith(R)) &&
        (await anyTranscriptInProjects(S, f, a))
      )
        y.add(S);
    }
  } catch {}
  let P = [...y];
  let I = new Set();
  for (let h of P) for (let S of await listSessionTranscriptFiles(h, a)) I.add(S);
  for (let h of I) {
    let taskOutputDir = getTaskOutputDir(h);
    if (
      await pathOrScopeExists(taskOutputDir, a, (storage) =>
        scopeExistsInStorage(storage, {
          namespace: "task",
          listId: h,
        }),
      )
    )
      p.push({
        path: taskOutputDir,
        kind: "dir",
        reason: `tasks for session ${h}`,
      });
    let R = join(claudeConfigDir, "debug", `${h}.txt`);
    if (
      await pathOrScopeExists(R, a, (storage) => keyExistsInStorage(storage, STORAGE_SPACES.log(h, "debug")))
    )
      p.push({
        path: R,
        kind: "file",
        reason: `debug log for session ${h}`,
      });
    let Z = join(claudeConfigDir, "file-history", h);
    if (
      await pathOrScopeExists(Z, a, (storage) =>
        scopeExistsInStorage(storage, {
          namespace: "fileHistory",
          sessionId: h,
        }),
      )
    )
      p.push({
        path: Z,
        kind: "dir",
        reason: `file edit history for session ${h}`,
      });
  }
  for (let path of P)
    p.push({
      path,
      kind: "dir",
      reason: "project transcripts (.jsonl) and memory/",
    });
  let D = (h) => normalizePathForConfigKey(h).replace(/\/+$/, "") || "/";
  let globalConfig = getGlobalConfig();
  let Pe = new Set([...f, ...g].map(D));
  for (let key of Object.keys(globalConfig.projects ?? {}))
    if (Pe.has(D(key)))
      p.push({
        path: key,
        kind: "config-key",
        reason: "project entry in ~/.claude.json (trust, history, MCP servers)",
      });
  let J = join(claudeConfigDir, "history.jsonl");
  let Q = await countHistoryForProjects(J, f, a);
  if (Q > 0)
    p.push({
      path: J,
      kind: "history-lines",
      reason: `${Q} prompt(s) typed in this project`,
      matchPaths: f,
    });
  if (await pathExists(join(claudeConfigDir, "shell-snapshots")))
    m.push("shell-snapshots/ are not project-scoped and will not be touched");
  let X = join(claudeConfigDir, "backups");
  if (await pathExists(X))
    m.push(
      `backups/ may still contain this project entry in old .claude.json snapshots (${X}); at most 5 are kept and they rotate out automatically`,
    );
  return {
    items: p,
    warnings: m,
  };
}
//@ chunk-5f8vf2zr.js:25113-26120 placement
/**
 * --all 时收集所有项目数据目录的清理条目。
 */
async function collectAllPurgeItems(i) {
  let claudeConfigDir = getClaudeConfigDir();
  let o = [];
  let c = [];
  let u = [
    ["projects", "all project transcripts (.jsonl) and memory/"],
    ["tasks", "all session task lists"],
    ["debug", "all session debug logs"],
    ["file-history", "all session file edit history"],
  ];
  for (let [p, m] of u) {
    let y = join(claudeConfigDir, p);
    if (await pathExists(y))
      o.push({
        path: y,
        kind: "dir",
        reason: m,
      });
  }
  let f = join(claudeConfigDir, "history.jsonl");
  if (await pathOrScopeExists(f, i, (storage) => keyExistsInStorage(storage, STORAGE_SPACES.history())))
    o.push({
      path: f,
      kind: "file",
      reason: "prompt history across all projects",
    });
  if (await dirHasHistoryFile(claudeConfigDir))
    o.push({
      path: f,
      kind: "history-siblings",
      reason: "staging copies a crashed history rewrite left beside it",
    });
  for (let path of knownProjectDirs())
    o.push({
      path,
      kind: "config-key",
      reason: "project entry in ~/.claude.json (trust, history, MCP servers)",
    });
  if (await pathExists(join(claudeConfigDir, "shell-snapshots")))
    c.push("shell-snapshots/ are not project-scoped and will not be touched");
  let g = join(claudeConfigDir, "backups");
  if (await pathExists(g))
    c.push(
      `backups/ may still contain project entries in old .claude.json snapshots (${g}); at most 5 are kept and they rotate out automatically`,
    );
  return {
    items: o,
    warnings: c,
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
async function deletePurgeItem(i, a) {
  switch (i.kind) {
    case "config-key":
      if (!(await deleteProjectConfig(i.path, a)))
        return {
          message: `Failed to remove projects["${i.path}"] from .claude.json \u2014 is your config directory writable?`,
          code: "config_write_failed",
        };
      return null;
    case "history-lines":
      try {
        await rewriteHistoryFile(i.path, i.matchPaths ?? new Set(), "filter", a);
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
      if (basename(i.path) === "history.jsonl") {
        let o;
        try {
          o = await lock(i.path, {
            ...HISTORY_FILE_RETRY_OPTIONS,
            onCompromised: (c) =>
              logForDebugging(`History purge (--all) lock compromised: ${c}`, {
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
          return await deletePathForPurge(i.path, false);
        } finally {
          await releaseLockQuietly(o, "history purge (--all)");
        }
      }
      return deletePathForPurge(i.path, false);
    case "history-siblings":
      return removeHistoryStagingSiblings(dirname(i.path));
    case "dir":
      return deletePathForPurge(i.path, true);
  }
}
//@ chunk-5f8vf2zr.js:27276-27519 placement
/**
 * 项目清理中途失败时：记日志、打印错误与重试提示、记遥测后以错误退出。
 */
async function reportPurgeStopped(i) {
  logError(toError(i));
  printCliError(
    stripControlChars(`Purge stopped before it finished: ${errorMessage(i)}
Some items may still be on disk. Run the command again; \`--dry-run\` lists what is left.`),
  );
  await logFeatureBadAsync("cli_purge_project", `stopped_${sanitizedErrCodeForTelemetry(i) ?? "unknown"}`);
  return cliErrorAfterAnalyticsFlush();
}
//@ chunk-5f8vf2zr.js:27519-27978 placement
/**
 * 汇总并输出清理失败项与提示。
 */
async function reportPurgeFailures(i, a) {
  if (i.length > 0) {
    let any = i.some((u) => u.code.startsWith("delete_failed_"));
    printCliError(
      stripControlChars(
        `${i.length} item(s) failed:
  ${i.map((u) => u.message).join(`
  `)}` +
          (any
            ? `
What could not be deleted is still on disk: fix the cause and run the command again, or delete those paths by hand.`
            : ""),
      ),
    );
    let c = new Set(i.map((u) => u.code));
    await logFeatureBadAsync("cli_purge_project", c.size === 1 ? i[0].code : "multiple_failures");
    return cliErrorAfterAnalyticsFlush();
  }
  printOut(a);
  await logFeatureOkAsync("cli_purge_project");
  return cliOkAfterAnalyticsFlush();
}
//@ chunk-5f8vf2zr.js:27978-28094 placement
async function reportDryRun(i) {
  printOut(`Dry run: ${i} item(s) would be deleted.`);
  await logFeatureOkAsync("cli_purge_project_dry_run");
  return cliOkAfterAnalyticsFlush();
}
//@ chunk-5f8vf2zr.js:28094-28166 placement
async function abortPurgeProject(i, a) {
  printCliError(i);
  await logFeatureSadAsync("cli_purge_project", a);
  return cliErrorAfterAnalyticsFlush();
}
//@ chunk-5f8vf2zr.js:28267-28280 placement
var STALE_HISTORY_TMP_AGE_MS = 60000;
//@ chunk-5f8vf2zr.js:28280-29557 placement
/**
 * 删除 history.jsonl 的临时副本（.tmp 等），受 history 锁保护。
 */
async function removeHistoryStagingSiblings(i) {
  let a = join(i, "history.jsonl");
  let o;
  try {
    o = await lock(a, {
      ...HISTORY_FILE_RETRY_OPTIONS,
      onCompromised: (f) =>
        logForDebugging(`History purge (--all siblings) lock compromised: ${f}`, {
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
  let c = [];
  let u = [];
  try {
    let f;
    try {
      f = await readdir(i);
    } catch (error) {
      if (isENOENT(error)) return null;
      return {
        message: `history.jsonl staging copies could not be listed: ${errorMessage(error)}`,
        code: "history_siblings_remain",
      };
    }
    let g = Date.now() - STALE_HISTORY_TMP_AGE_MS;
    for (let p of f) {
      let m = isOwnTempName(p, "history.jsonl");
      if (!m && !isHashTempFile(p)) continue;
      let y = join(i, p);
      try {
        let w = await lstat(y);
        if (!w.isFile()) continue;
        if (!m && w.mtimeMs > g) {
          u.push(p);
          continue;
        }
        await rm(y, {
          force: true,
        });
      } catch (error) {
        if (!isENOENT(error)) c.push(p);
      }
    }
  } finally {
    await releaseLockQuietly(o, "history purge (--all siblings)");
  }
  if (c.length > 0)
    return {
      message: `history.jsonl staging copies were not removed (${c.join(", ")}) \u2014 a complete copy of the kept prompt history remains; delete them by hand`,
      code: "history_siblings_remain",
    };
  if (u.length > 0)
    return {
      message: `staging files written in the last minute were left in place (${u.join(", ")}) \u2014 a live write elsewhere may own them; if one is a crashed purge's copy of the prompt history, re-run in a minute`,
      code: "history_siblings_remain",
    };
  return null;
}
//@ chunk-5f8vf2zr.js:29557-29882 placement
/**
 * 把清理条目格式化为一行描述。
 */
function describePurgeItem(i) {
  let a;
  switch (i.kind) {
    case "config-key":
      a = `config: projects["${i.path}"]`;
      break;
    case "history-lines":
      a = `filter: ${i.path}`;
      break;
    case "history-siblings":
      a = `siblings: ${i.path}.tmp.* and ${dirname(i.path)}${sep}.<16hex>.tmp`;
      break;
    case "file":
    case "dir":
      a = `${i.kind}:    ${i.path}`;
      break;
  }
  return `${a}
           ${i.reason}`;
}
//@ chunk-5f8vf2zr.js:29882-30082 placement
function printPurgePlan(i, a, warnings) {
  printOut(`
Purge plan for ${i}:
`);
  for (let c of a) printOut(`  ${describePurgeItem(c)}`);
  if (warnings.length) {
    printOut();
    for (let c of warnings) cliWarn(c);
  }
  printOut(`
Purging deletes data only on this computer, not anything stored by Anthropic.`);
}
//@ chunk-5f8vf2zr.js:30082-31900 placement
/**
 * claude project purge 入口：解析路径/--all/-i/--dry-run，确认后删除项目数据。
 */
async function purgeProjectHandler(i, a, o) {
  if (a.all) {
    if (i) cliError("Cannot specify both a path and --all.");
    if (a.interactive) cliError("Cannot use -i/--interactive with --all.");
    let { items, warnings } = await collectAllPurgeItems(o);
    if (items.length === 0) {
      printCliError(`No Claude Code project state found under ${getClaudeConfigDir()}.`);
      await logFeatureBadAsync("cli_purge_project", "cli_purge_project_nothing_found");
      return cliErrorAfterAnalyticsFlush();
    }
    printPurgePlan("all projects", items, warnings);
    if (a.dryRun) return reportDryRun(items.length);
    if (!a.yes) {
      if (
        !(await confirmYesNo(
          `Delete ${items.length} item(s) for ALL projects from this computer? This can't be undone.`,
        ))
      )
        return abortPurgeProject("Aborted.", "declined");
    }
    let y = [];
    for (let item of items) {
      let _ = await deletePurgeItem(item, o);
      if (_) y.push(_);
    }
    return reportPurgeFailures(y, `Purged ${items.length} item(s) across all projects.`);
  }
  let c;
  if (i) c = resolve(i);
  else {
    let p = await promptPurgeProject();
    if (p === null) return abortPurgeProject("Aborted.", "cancelled");
    c = p;
  }
  let { items, warnings } = await collectProjectPurgeItems(c, o);
  if (items.length === 0) {
    printCliError(
      stripControlChars(`No Claude Code project state found for ${c} under ${getClaudeConfigDir()}.`),
    );
    await logFeatureBadAsync("cli_purge_project", "cli_purge_project_nothing_found");
    return cliErrorAfterAnalyticsFlush();
  }
  printPurgePlan(c, items, warnings);
  if (a.dryRun) return reportDryRun(items.length);
  if (a.interactive) {
    let p = 0;
    let m = false;
    let y = [];
    for (let [_, T] of items.entries()) {
      let P = "delete";
      if (!m)
        P =
          (await promptSelect(`[${_ + 1}/${items.length}] ${describePurgeItem(T)}`, [
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
      if (P === "abort") return abortPurgeProject(`Aborted. ${p} item(s) deleted.`, "aborted");
      if (P === "skip") continue;
      if (P === "all") m = true;
      let I = await deletePurgeItem(T, o);
      if (I) {
        y.push(I);
        continue;
      }
      p++;
    }
    let w = `Purged ${p}/${items.length} item(s) for ${c}.`;
    if (p === 0 && y.length === 0) {
      printOut(w);
      await logFeatureSadAsync("cli_purge_project", "all_skipped");
      return cliOkAfterAnalyticsFlush();
    }
    return reportPurgeFailures(y, w);
  }
  if (!a.yes) {
    if (
      !(await confirmYesNo(
        `Delete ${items.length} item(s) for ${c} from this computer? This can't be undone.`,
      ))
    )
      return abortPurgeProject("Aborted.", "declined");
  }
  let g = [];
  for (let item of items) {
    let m = await deletePurgeItem(item, o);
    if (m) g.push(m);
  }
  return reportPurgeFailures(g, `Purged ${items.length} item(s) for ${c}.`);
}
