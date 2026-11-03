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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { AppRoot } from "../../components/AppRoot.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { getGlobalConfig, deleteProjectConfig } from "../../utils/config.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { SVo, splitHistoryLines, filterHistoryFile, xnt } from "../../utils/historyFile.js";
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
import { FX } from "../../services/memorySync/pathScrub.js";
import { lock, releaseLockQuietly } from "../../utils/lockfile.js";
import {
  getProjectsDir,
  canonicalizePath,
  findProjectDirs,
  sanitizePath,
} from "../../utils/sessionStoragePortable.js";
import { Vt } from "../../utils/agentId.js";
import { getClaudeConfigDir } from "../../utils/envUtils.js";
import { xRi } from "../../utils/settings/settingsStorage.js";
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
import { eie } from "../../services/memorySync/syncFiles.js";
import { confirmYesNo } from "./util.js";

//@ chunk-5f8vf2zr.js:15947-15994 placement
function j(i = "") {
  process.stdout.write(`${i}
`);
}
//@ chunk-5f8vf2zr.js:15994-16119 placement
async function pathOrScopeExists(path, storageKey, checkStorage) {
  if (isStorageV5Enabled() && storageKey !== void 0) {
    let c = await checkStorage(storageKey);
    if (c !== void 0) return c;
  }
  try {
    return (await stat(path), !0);
  } catch {
    return !1;
  }
}
//@ chunk-5f8vf2zr.js:16119-16344 placement
async function scopeExistsInStorage(storage, scope) {
  try {
    let scopeKind = await storage.scopeKind(scope, { resolveLink: !0 });
    if (!scopeKind.ok) return;
    switch (scopeKind.value.kind) {
      case "absent":
        return !1;
      case "link":
        return scopeKind.value.linkResolves === !0;
      case "directory":
      case "other":
        return !0;
    }
  } catch {
    return;
  }
}
//@ chunk-5f8vf2zr.js:16344-16471 placement
async function keyExistsInStorage(storage, key) {
  try {
    let statMeta = await storage.statMeta(key);
    if (statMeta.ok) return !0;
    return statMeta.error.code === "NotFound" ? !1 : void 0;
  } catch {
    return;
  }
}
//@ chunk-5f8vf2zr.js:16471-16532 placement
async function F(i) {
  try {
    return (await stat(i), !0);
  } catch {
    return !1;
  }
}
/**
 * 在 Ink 中渲染一次性的选择列表并等待用户选择。
 */
//@ chunk-5f8vf2zr.js:16532-16878 placement
async function promptSelect(i, a, o) {
  let c = () => {},
    promise = new Promise((p) => {
      c = p;
    }),
    { unmount: unmount, waitUntilExit: waitUntilExit } = await render(
      e(AppRoot, {
        children: r(Box, {
          flexDirection: "column",
          gap: 1,
          paddingY: 1,
          children: [
            e(Text, { bold: !0, children: i }),
            e(ModelSelector, {
              options: a,
              defaultValue: o,
              visibleOptionCount: 10,
              onChange: (p) => {
                (c(p), unmount());
              },
              onCancel: () => {
                (c(null), unmount());
              },
            }),
          ],
        }),
      }),
      { exitOnCtrlC: !1 },
    );
  return (await waitUntilExit(), promise);
}
//@ chunk-5f8vf2zr.js:16878-16930 placement
function le() {
  return Object.keys(getGlobalConfig().projects ?? {});
}
//@ chunk-5f8vf2zr.js:16930-17156 placement
async function promptPurgeProject() {
  let i = resolve(getOriginalCwd()),
    a = le(),
    o = new Set([i]),
    c = [{ label: i, value: i, description: "current directory" }];
  for (let u of a) {
    if (o.has(u)) continue;
    (o.add(u), c.push({ label: u, value: u }));
  }
  return promptSelect("Select a project to purge:", c, i);
}
//@ chunk-5f8vf2zr.js:17156-17235 placement
function isPathUnderAny(i, a) {
  for (let o of a) if (i === o || i.startsWith(o + sep)) return !0;
  return !1;
}
//@ chunk-5f8vf2zr.js:17235-17350 placement
function historyLineMatchesProjects(i, a) {
  if (!i) return !1;
  try {
    let o = jsonParse(i);
    return typeof o.project === "string" && isPathUnderAny(o.project, a);
  } catch {
    return !1;
  }
}
//@ chunk-5f8vf2zr.js:17350-17570 placement = getErrorsPath (1)
async function anyTranscriptInProjects(i, a, o) {
  let c = await listTranscriptFileNames(o, i),
    u;
  if (c !== null) u = c;
  else
    try {
      u = (await readdir(i)).filter((f) => f.endsWith(".jsonl")).sort();
    } catch {
      return !1;
    }
  for (let f of u) {
    let g = await readTranscriptCwdFallback(join(i, f), o);
    if (g !== null) return isPathUnderAny(g, a);
  }
  return !1;
}
//@ chunk-5f8vf2zr.js:17570-17659 placement
function readCwdFromJsonLine(i) {
  try {
    let a = jsonParse(i);
    return typeof a.cwd === "string" ? a.cwd : void 0;
  } catch {
    return;
  }
}
//@ chunk-5f8vf2zr.js:17659-17669 placement
var pe = 50;
//@ chunk-5f8vf2zr.js:17669-17889 placement
async function readTranscriptCwdFallback(transcriptPath, storage) {
  let o = await readTranscriptCwd(transcriptPath, storage);
  if (o !== void 0) return o;
  let c = createReadStream(transcriptPath, { encoding: "utf8" }),
    u = 0;
  try {
    for await (let f of SVo(c)) {
      if (++u > pe) break;
      let g = readCwdFromJsonLine(f);
      if (g !== void 0) return g;
    }
  } catch {
  } finally {
    c.close();
  }
  return null;
}
//@ chunk-5f8vf2zr.js:17889-17912 placement
var Be = 16384,
  Fe = 262144;
//@ chunk-5f8vf2zr.js:17912-18193 placement
async function readTranscriptCwd(i, a) {
  let o = getTranscriptStorageKey(i, a);
  if (o === void 0) return;
  let c = await scanRecordsPaged(o.backend, o.key, {
    pageBytes: (u) => (u === 0 ? Be : Fe),
    lineCap: pe,
    judge: readCwdFromJsonLine,
  });
  switch (c.kind) {
    case "found":
      return c.value;
    case "end":
      return null;
    case "refused":
      return c.code === "Failed" ? null : void 0;
    case "cannotAnswer":
      return;
  }
}
/**
 * 分页正向读取存储记录流并逐条交给 judge，超过页数上限返回 cannotAnswer。
 */
//@ chunk-5f8vf2zr.js:18193-19013 placement
async function scanRecordsPaged(i, a, o) {
  let c = 0,
    u;
  try {
    for (let f = 0; ; f++) {
      if (f >= ye) return { kind: "cannotAnswer" };
      let records = await i.readRecords(a, {
        order: "forward",
        maxBytes: o.pageBytes(f),
        ...(o.lineCap !== void 0 && { limit: o.lineCap - c }),
        ...(u !== void 0 && { fromSeq: u }),
      });
      if (!records.ok) {
        let { error: error } = records;
        return {
          kind: "refused",
          code: error.code,
          ...("telemetryCode" in error &&
            error.telemetryCode !== void 0 && { telemetryCode: error.telemetryCode }),
        };
      }
      for (let item of records.value.items)
        for (let y of parseRecordBytes(item.data)) {
          let judge = o.judge(y);
          if (judge !== void 0) return { kind: "found", value: judge };
          if (o.lineCap !== void 0 && ++c >= o.lineCap) return { kind: "end" };
        }
      let nextSeq = records.value.nextSeq;
      if (nextSeq === void 0) return { kind: "end" };
      if (u !== void 0 && nextSeq <= u) return { kind: "cannotAnswer" };
      u = nextSeq;
    }
  } catch (error) {
    return (
      logForDebugging(
        `purge: the storage interface threw on readRecords of the ${a.namespace} stream; the caller's legacy path serves (${errorMessage(error)})`,
      ),
      { kind: "cannotAnswer" }
    );
  }
}
//@ chunk-5f8vf2zr.js:19013-19187 placement
function parseRecordBytes(i) {
  let { buffer: buffer, byteOffset: byteOffset, byteLength: byteLength } = i,
    str = Buffer.from(buffer, byteOffset, byteLength).toString("utf8"),
    f = str.endsWith(`
`)
      ? str.slice(0, -1)
      : str;
  return splitHistoryLines(f.endsWith("\r") ? f.slice(0, -1) : f);
}
//@ chunk-5f8vf2zr.js:19187-19202 placement
var Ee = 1048576;
/**
 * 扫描 history 记录，统计属于指定项目的提示词条数（可收集保留项）。
 */
//@ chunk-5f8vf2zr.js:19202-19581 placement
async function countHistoryMatches(i, a, o) {
  let c = 0,
    u = await scanRecordsPaged(i, STORAGE_SPACES.history(), {
      pageBytes: () => Ee,
      judge: (f) => {
        if (historyLineMatchesProjects(f, a)) c++;
        else o?.push(f);
        return;
      },
    });
  switch (u.kind) {
    case "found":
    case "end":
      return (await historyHasTornTail(i)) === !1 ? { kind: "scanned", matched: c } : { kind: "defer" };
    case "refused":
      if (u.code === "NotFound") return { kind: "absent" };
      return u.code === "Unavailable" ? { kind: "defer" } : u;
    case "cannotAnswer":
      return { kind: "defer" };
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
class q extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {}
/**
 * purge 历史：从 history.jsonl 中删除属于给定项目目录的行（storage 后端或文件，带锁），拒绝时抛 history.jsonl was not rewritten。
 */
//@ chunk-5f8vf2zr.js:19745-20984 placement
async function purgeProjectHistory(i, a, o) {
  let c = [],
    u = await countHistoryMatches(i, o, c);
  switch (u.kind) {
    case "absent":
      return 0;
    case "defer":
      return;
    case "refused":
      if (FX(u.telemetryCode))
        throw historyRewriteRefusedError(
          `history.jsonl is a symlink or not a regular file, which the storage interface never reads or writes through (${E(u)})`,
        );
      if (u.code === "InvalidArgument")
        throw historyRewriteRefusedError(`the storage interface declined the read (${E(u)})`);
      logForDebugging(
        `purge history: the storage interface could not read history.jsonl (${E(u)}); today's rewrite serves`,
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
    g = y.isFile() ? y.mode & 511 : void 0;
  } catch {
    g = void 0;
  }
  let p;
  try {
    p = await i.replaceRecords(
      STORAGE_SPACES.history(),
      c.map((y) => ({
        data: `${y}
`,
      })),
      g === void 0 ? void 0 : { mode: g },
    );
  } catch (error) {
    logForDebugging(
      `purge history: the storage interface threw on replaceRecords; history.jsonl is rewritten directly instead (${errorMessage(error)})`,
    );
    return;
  }
  if (p.ok) return matched;
  let { error: error } = p;
  switch (error.code) {
    case "Unavailable":
    case "Failed":
      logForDebugging(
        `purge history: the storage interface could not rewrite history.jsonl (${E(error)}); today's rewrite serves`,
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
    if (!stats.ok) return stats.error.code === "NotFound" ? !1 : void 0;
    return (stats.value.tornTailBytes ?? 0) > 0;
  } catch (error) {
    logForDebugging(
      `purge history: the storage interface threw on stat; history.jsonl is read directly instead (${errorMessage(error)})`,
    );
    return;
  }
}
//@ chunk-5f8vf2zr.js:21252-21336 placement
function E(i) {
  return i.telemetryCode === void 0 ? i.code : `${i.code} ${i.telemetryCode}`;
}
//@ chunk-5f8vf2zr.js:21336-21442 placement
function historyRewriteRefusedError(i) {
  return new q(`history.jsonl was not rewritten \u2014 ${i}`, "purge history rewrite refused");
}
//@ chunk-5f8vf2zr.js:21442-21492 placement
async function countHistoryForProjects(i, a, o) {
  return rewriteHistoryFile(i, a, "count", o);
}
/**
 * 在 history 锁保护下重写 history 文件（filter 模式按项目过滤）。
 */
//@ chunk-5f8vf2zr.js:21492-22073 placement
async function rewriteHistoryFile(i, a, o, c) {
  if (o !== "filter") {
    if (isStorageV5Enabled() && c !== void 0) {
      let g = await historyMatchCount(c, a);
      if (g !== void 0) return g;
    }
    return filterHistoryFile(i, (g) => historyLineMatchesProjects(g, a), o);
  }
  let u = !1,
    f;
  try {
    f = await lock(i, {
      ...xnt,
      onCompromised: (g) => {
        ((u = !0), logForDebugging(`History purge lock compromised: ${g}`, { level: "error" }));
      },
    });
  } catch (error) {
    if (isENOENT(error)) return 0;
    throw historyRewriteRefusedError("the history lock could not be acquired");
  }
  try {
    if (isStorageV5Enabled() && c !== void 0) {
      let g = await purgeProjectHistory(c, i, a);
      if (g !== void 0) return g;
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
var ye = 1e4;
/**
 * 分页列出存储空间的全部条目并回调；任一页失败或页数超过上限（ye）时返回 false，否则 true。
 */
//@ chunk-5f8vf2zr.js:22084-22344 placement
async function listAllStorageEntries(storage, scope, onItem, options = {}) {
  let u = { skipScopeStats: !0, skipKeyStats: !0, ...options },
    f,
    g = 0;
  try {
    do {
      let listEntries = await storage.listEntries(scope, { ...u, ...(f !== void 0 && { cursor: f }) });
      if (!listEntries.ok) return !1;
      for (let item of listEntries.value.items) onItem(item);
      f = listEntries.value.cursor;
    } while (f && ++g < ye);
  } catch {
    return !1;
  }
  return !f;
}
//@ chunk-5f8vf2zr.js:22344-22634 placement
async function listTranscriptProjectKeys(i) {
  if (!i) return null;
  let a = [];
  return (await listAllStorageEntries(
    i,
    { namespace: "transcript" },
    (c) => {
      if (
        c.kind === "scope" &&
        c.scope.namespace === "transcript" &&
        c.scope.projectKey !== void 0 &&
        c.scope.sessionId === void 0 &&
        isValidKeySegment(c.scope.projectKey)
      )
        a.push(c.scope.projectKey);
    },
    { links: "skip" },
  ))
    ? a.sort()
    : null;
}
//@ chunk-5f8vf2zr.js:22634-22924 placement
async function listTranscriptKeysForProjectDir(i, a) {
  if (!i || dirname(a) !== getProjectsDir()) return null;
  let o = basename(a),
    c = [];
  return (await listAllStorageEntries(i, { namespace: "transcript", projectKey: o }, (f) => {
    if (
      f.kind === "key" &&
      f.key.namespace === "transcript" &&
      f.key.projectKey === o &&
      f.key.agentId === void 0 &&
      isValidKeySegment(f.key.sessionId)
    )
      c.push(f.key.sessionId);
  }))
    ? c.sort()
    : null;
}
//@ chunk-5f8vf2zr.js:22924-23016 placement
async function Ne(i, a) {
  let o = await listTranscriptKeysForProjectDir(i, a);
  return o === null ? null : o.filter((c) => Vt(c) !== null);
}
//@ chunk-5f8vf2zr.js:23016-23112 placement = getErrorsPath (1)
async function listTranscriptFileNames(i, a) {
  let o = await listTranscriptKeysForProjectDir(i, a);
  return o === null ? null : o.map((c) => `${c}.jsonl`).sort();
}
//@ chunk-5f8vf2zr.js:23112-23307 placement = getErrorsPath (1)
async function listSessionTranscriptFiles(i, a) {
  let o = await Ne(a, i);
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
    .filter((u) => Vt(u) !== null);
}
/**
 * 收集清理某项目需要删除的条目（项目目录、任务、调试日志、文件历史、配置键、history 行）。
 */
//@ chunk-5f8vf2zr.js:23307-25113 placement
async function collectProjectPurgeItems(i, a) {
  let o = getClaudeConfigDir(),
    c = resolve(i),
    u = await canonicalizePath(c, getRealPathOptions(a)),
    f = new Set([c, u]),
    g = [];
  try {
    await stat(c);
    for (let h of f) g.push(...xRi(h));
  } catch {}
  let p = [],
    m = [],
    y = new Set();
  for (let h of f) for (let S of await findProjectDirs(h)) y.add(S);
  let w = getProjectsDir(),
    mapped = [...f].map((h) => sanitizePath(h) + "-"),
    T = await listTranscriptProjectKeys(a);
  try {
    for (let h of T !== null
      ? T.map((S) => ({ name: S, isDirectory: () => !0 }))
      : await readdir(w, { withFileTypes: !0 })) {
      let S = join(w, h.name);
      if (
        h.isDirectory() &&
        !y.has(S) &&
        mapped.some((R) => h.name.startsWith(R)) &&
        (await anyTranscriptInProjects(S, f, a))
      )
        y.add(S);
    }
  } catch {}
  let P = [...y],
    I = new Set();
  for (let h of P) for (let S of await listSessionTranscriptFiles(h, a)) I.add(S);
  for (let h of I) {
    let S = getTaskOutputDir(h);
    if (await pathOrScopeExists(S, a, (B) => scopeExistsInStorage(B, { namespace: "task", listId: h })))
      p.push({ path: S, kind: "dir", reason: `tasks for session ${h}` });
    let R = join(o, "debug", `${h}.txt`);
    if (await pathOrScopeExists(R, a, (B) => keyExistsInStorage(B, STORAGE_SPACES.log(h, "debug"))))
      p.push({ path: R, kind: "file", reason: `debug log for session ${h}` });
    let Z = join(o, "file-history", h);
    if (
      await pathOrScopeExists(Z, a, (B) =>
        scopeExistsInStorage(B, { namespace: "fileHistory", sessionId: h }),
      )
    )
      p.push({ path: Z, kind: "dir", reason: `file edit history for session ${h}` });
  }
  for (let h of P) p.push({ path: h, kind: "dir", reason: "project transcripts (.jsonl) and memory/" });
  let D = (h) => normalizePathForConfigKey(h).replace(/\/+$/, "") || "/",
    Se = getGlobalConfig(),
    Pe = new Set([...f, ...g].map(D));
  for (let h of Object.keys(Se.projects ?? {}))
    if (Pe.has(D(h)))
      p.push({
        path: h,
        kind: "config-key",
        reason: "project entry in ~/.claude.json (trust, history, MCP servers)",
      });
  let J = join(o, "history.jsonl"),
    Q = await countHistoryForProjects(J, f, a);
  if (Q > 0)
    p.push({ path: J, kind: "history-lines", reason: `${Q} prompt(s) typed in this project`, matchPaths: f });
  if (await F(join(o, "shell-snapshots")))
    m.push("shell-snapshots/ are not project-scoped and will not be touched");
  let X = join(o, "backups");
  if (await F(X))
    m.push(
      `backups/ may still contain this project entry in old .claude.json snapshots (${X}); at most 5 are kept and they rotate out automatically`,
    );
  return { items: p, warnings: m };
}
/**
 * --all 时收集所有项目数据目录的清理条目。
 */
//@ chunk-5f8vf2zr.js:25113-26120 placement
async function collectAllPurgeItems(i) {
  let a = getClaudeConfigDir(),
    o = [],
    c = [],
    u = [
      ["projects", "all project transcripts (.jsonl) and memory/"],
      ["tasks", "all session task lists"],
      ["debug", "all session debug logs"],
      ["file-history", "all session file edit history"],
    ];
  for (let [p, m] of u) {
    let y = join(a, p);
    if (await F(y)) o.push({ path: y, kind: "dir", reason: m });
  }
  let f = join(a, "history.jsonl");
  if (await pathOrScopeExists(f, i, (p) => keyExistsInStorage(p, STORAGE_SPACES.history())))
    o.push({ path: f, kind: "file", reason: "prompt history across all projects" });
  if (await dirHasHistoryFile(a))
    o.push({
      path: f,
      kind: "history-siblings",
      reason: "staging copies a crashed history rewrite left beside it",
    });
  for (let p of le())
    o.push({
      path: p,
      kind: "config-key",
      reason: "project entry in ~/.claude.json (trust, history, MCP servers)",
    });
  if (await F(join(a, "shell-snapshots")))
    c.push("shell-snapshots/ are not project-scoped and will not be touched");
  let g = join(a, "backups");
  if (await F(g))
    c.push(
      `backups/ may still contain project entries in old .claude.json snapshots (${g}); at most 5 are kept and they rotate out automatically`,
    );
  return { items: o, warnings: c };
}
//@ chunk-5f8vf2zr.js:26120-26373 placement
async function deletePathForPurge(path, recursive) {
  try {
    return (await rm(path, { recursive: recursive, force: !0 }), null);
  } catch (error) {
    if (getErrnoCode(error) === void 0) throw error;
    return (
      logForDebugging(`purge: could not delete ${path}: ${errorMessage(error)}`, { level: "error" }),
      {
        message: `Could not delete ${path} \u2014 ${errorMessage(error)}`,
        code: `delete_failed_${sanitizedErrnoLowerForTelemetry(error)}`,
      }
    );
  }
}
/**
 * 删除单个清理条目（配置键、history 行、目录等），返回失败信息。
 */
//@ chunk-5f8vf2zr.js:26373-27276 placement
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
        if (error instanceof q) return { message: error.message, code: "history_rewrite_refused" };
        throw error;
      }
      return null;
    case "file":
      if (basename(i.path) === "history.jsonl") {
        let o;
        try {
          o = await lock(i.path, {
            ...xnt,
            onCompromised: (c) =>
              logForDebugging(`History purge (--all) lock compromised: ${c}`, { level: "error" }),
          });
        } catch (error) {
          if (isENOENT(error)) return null;
          return {
            message: "history.jsonl was not removed \u2014 the history lock could not be acquired",
            code: "history_rewrite_refused",
          };
        }
        try {
          return await deletePathForPurge(i.path, !1);
        } finally {
          await releaseLockQuietly(o, "history purge (--all)");
        }
      }
      return deletePathForPurge(i.path, !1);
    case "history-siblings":
      return removeHistoryStagingSiblings(dirname(i.path));
    case "dir":
      return deletePathForPurge(i.path, !0);
  }
}
/**
 * 项目清理中途失败时：记日志、打印错误与重试提示、记遥测后以错误退出。
 */
//@ chunk-5f8vf2zr.js:27276-27519 placement
async function reportPurgeStopped(i) {
  return (
    logError(toError(i)),
    printCliError(
      stripControlChars(`Purge stopped before it finished: ${errorMessage(i)}
Some items may still be on disk. Run the command again; \`--dry-run\` lists what is left.`),
    ),
    await logFeatureBadAsync("cli_purge_project", `stopped_${sanitizedErrCodeForTelemetry(i) ?? "unknown"}`),
    cliErrorAfterAnalyticsFlush()
  );
}
/**
 * 汇总并输出清理失败项与提示。
 */
//@ chunk-5f8vf2zr.js:27519-27978 placement
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
    return (
      await logFeatureBadAsync("cli_purge_project", c.size === 1 ? i[0].code : "multiple_failures"),
      cliErrorAfterAnalyticsFlush()
    );
  }
  return (j(a), await logFeatureOkAsync("cli_purge_project"), cliOkAfterAnalyticsFlush());
}
//@ chunk-5f8vf2zr.js:27978-28094 placement
async function reportDryRun(i) {
  return (
    j(`Dry run: ${i} item(s) would be deleted.`),
    await logFeatureOkAsync("cli_purge_project_dry_run"),
    cliOkAfterAnalyticsFlush()
  );
}
//@ chunk-5f8vf2zr.js:28094-28166 placement
async function O(i, a) {
  return (printCliError(i), await logFeatureSadAsync("cli_purge_project", a), cliErrorAfterAnalyticsFlush());
}
//@ chunk-5f8vf2zr.js:28267-28280 placement
var Ge = 60000;
/**
 * 删除 history.jsonl 的临时副本（.tmp 等），受 history 锁保护。
 */
//@ chunk-5f8vf2zr.js:28280-29557 placement
async function removeHistoryStagingSiblings(i) {
  let a = join(i, "history.jsonl"),
    o;
  try {
    o = await lock(a, {
      ...xnt,
      onCompromised: (f) =>
        logForDebugging(`History purge (--all siblings) lock compromised: ${f}`, { level: "error" }),
    });
  } catch (error) {
    if (!isENOENT(error))
      return {
        message:
          "history.jsonl staging copies were not removed \u2014 the history lock could not be acquired",
        code: "history_siblings_remain",
      };
  }
  let c = [],
    u = [];
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
    let g = Date.now() - Ge;
    for (let p of f) {
      let m = isOwnTempName(p, "history.jsonl");
      if (!m && !eie(p)) continue;
      let y = join(i, p);
      try {
        let w = await lstat(y);
        if (!w.isFile()) continue;
        if (!m && w.mtimeMs > g) {
          u.push(p);
          continue;
        }
        await rm(y, { force: !0 });
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
/**
 * 把清理条目格式化为一行描述。
 */
//@ chunk-5f8vf2zr.js:29557-29882 placement
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
function printPurgePlan(i, a, o) {
  j(`
Purge plan for ${i}:
`);
  for (let c of a) j(`  ${describePurgeItem(c)}`);
  if (o.length) {
    j();
    for (let c of o) cliWarn(c);
  }
  j(`
Purging deletes data only on this computer, not anything stored by Anthropic.`);
}
/**
 * claude project purge 入口：解析路径/--all/-i/--dry-run，确认后删除项目数据。
 */
//@ chunk-5f8vf2zr.js:30082-31900 placement
async function purgeProjectHandler(i, a, o) {
  if (a.all) {
    if (i) cliError("Cannot specify both a path and --all.");
    if (a.interactive) cliError("Cannot use -i/--interactive with --all.");
    let { items: items, warnings: warnings } = await collectAllPurgeItems(o);
    if (items.length === 0)
      return (
        printCliError(`No Claude Code project state found under ${getClaudeConfigDir()}.`),
        await logFeatureBadAsync("cli_purge_project", "cli_purge_project_nothing_found"),
        cliErrorAfterAnalyticsFlush()
      );
    if ((printPurgePlan("all projects", items, warnings), a.dryRun)) return reportDryRun(items.length);
    if (!a.yes) {
      if (
        !(await confirmYesNo(
          `Delete ${items.length} item(s) for ALL projects from this computer? This can't be undone.`,
        ))
      )
        return O("Aborted.", "declined");
    }
    let y = [];
    for (let w of items) {
      let _ = await deletePurgeItem(w, o);
      if (_) y.push(_);
    }
    return reportPurgeFailures(y, `Purged ${items.length} item(s) across all projects.`);
  }
  let c;
  if (i) c = resolve(i);
  else {
    let p = await promptPurgeProject();
    if (p === null) return O("Aborted.", "cancelled");
    c = p;
  }
  let { items: items, warnings: warnings } = await collectProjectPurgeItems(c, o);
  if (items.length === 0)
    return (
      printCliError(
        stripControlChars(`No Claude Code project state found for ${c} under ${getClaudeConfigDir()}.`),
      ),
      await logFeatureBadAsync("cli_purge_project", "cli_purge_project_nothing_found"),
      cliErrorAfterAnalyticsFlush()
    );
  if ((printPurgePlan(c, items, warnings), a.dryRun)) return reportDryRun(items.length);
  if (a.interactive) {
    let p = 0,
      m = !1,
      y = [];
    for (let [_, T] of items.entries()) {
      let P = "delete";
      if (!m)
        P =
          (await promptSelect(`[${_ + 1}/${items.length}] ${describePurgeItem(T)}`, [
            { label: "Delete", value: "delete" },
            { label: "Skip", value: "skip" },
            { label: "Delete this and all remaining", value: "all" },
            { label: "Abort", value: "abort" },
          ])) ?? "abort";
      if (P === "abort") return O(`Aborted. ${p} item(s) deleted.`, "aborted");
      if (P === "skip") continue;
      if (P === "all") m = !0;
      let I = await deletePurgeItem(T, o);
      if (I) {
        y.push(I);
        continue;
      }
      p++;
    }
    let w = `Purged ${p}/${items.length} item(s) for ${c}.`;
    if (p === 0 && y.length === 0)
      return (j(w), await logFeatureSadAsync("cli_purge_project", "all_skipped"), cliOkAfterAnalyticsFlush());
    return reportPurgeFailures(y, w);
  }
  if (!a.yes) {
    if (
      !(await confirmYesNo(
        `Delete ${items.length} item(s) for ${c} from this computer? This can't be undone.`,
      ))
    )
      return O("Aborted.", "declined");
  }
  let g = [];
  for (let p of items) {
    let m = await deletePurgeItem(p, o);
    if (m) g.push(m);
  }
  return reportPurgeFailures(g, `Purged ${items.length} item(s) for ${c}.`);
}
