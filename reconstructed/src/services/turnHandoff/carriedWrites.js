/**
 * services/turnHandoff/carriedWrites.ts
 *
 * 跨轮次携带的写入（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1bmxdqa0.js (6)
 * attribution: placement 6
 */
import { realpath, lstat, rmdir, open, readlink } from "fs/promises";
import { posix } from "path";
import { constants } from "fs";
import { lit, fromEnumOpt } from "../analytics/safeMetadata.js";
import { identityMap } from "../../remote/tools/protocolConstants.js";
import { logEvent } from "../analytics/index.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { getHomeFilesRoot, STAGE_TMP_PREFIX } from "../../utils/stageFileRoots.js";
import { getCwd } from "../../utils/cwd.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { expandPath } from "../../utils/path.js";
import {
  storedToolPermissionContext,
  getToolPermissionContext,
} from "../../utils/permissions/toolPermissionContext.js";
import { W1n, $Pr } from "../../cli/remoteIO/turnHandoff.js";
import {
  hasModuleHookingSite,
  getLoadedModulesForSite,
} from "../../plugins/hooksModules/loadedModuleFilters.js";
import { KW } from "../../utils/hooks/matcherGrammar.js";
import { dispatchClassicEvent } from "../../plugins/functionHooks/modAdmission.js";
import { hasSettingsHookForEvent, hasToolHookMatching } from "../../utils/hooks.js";
import { registerAgent } from "../../utils/telemetry/perfettoTracing.js";
import { getCheckRunner } from "../../utils/permissions/checkRegistry.js";
import { checkHomeTarget, removeIfUnchanged } from "../../utils/filePersistence/homeFilePublish.js";
import { getErrnoCode, sanitizeErrnoForTelemetry, isAbortError } from "../../utils/errors.js";
import { hasPermissionsToUseTool } from "../../utils/permissions/permissions.js";
import { BMe } from "../../bootstrap/sessionSlices.js";
import { hasReadDenyRuleForPath, readWouldBeAutoAllowedForPath } from "../../utils/permissions/filesystem.js";
import { cloneFileStateCache } from "../../utils/fileStateCache.js";
import { listSessionsImpl } from "../../utils/listSessionsImpl.js";
import { sweepStaleStageTmps } from "../../utils/stageFile.js";
import { placeBytesAsHomeFile } from "../../utils/filePersistence/placeFilesByName.js";
import { count } from "../../utils/collections.js";
import { ws } from "../../utils/fsFlags.js";
import { READ_LIMITS } from "../../utils/fsBoundRead.js";
import { getPlatform } from "../../utils/platform.js";

//@ chunk-1bmxdqa0.js:12569-13460 placement
async function carryTurnWrites(o, l, t) {
  let d = o.carriedWrites ?? [],
    startTime = performance.now(),
    y = 1,
    s = await applyCarriedWrite(d, l, t).catch(describeCarryError);
  if (s.refusal === "permissions_changed" && !s.counts.taken_back && !s.counts.left_behind)
    ((y = 2), (s = await applyCarriedWrite(d, l, t).catch(describeCarryError)));
  let { refusal: refusal, counts: counts, placedBytes: placedBytes, lastErrorCode: lastErrorCode } = s,
    T = {
      at: lit("turn_start"),
      outcome: lit(refusal === void 0 ? "in_place" : "refused"),
      refusal: fromEnumOpt(refusal),
      duration_ms: Math.round(performance.now() - startTime),
      files: d.length,
      approx_placed_bytes: Number(placedBytes.toPrecision(2)),
      ...identityMap(counts, (D, H) => `files_${H}`),
      ...(lastErrorCode !== void 0 && { last_error_code: lastErrorCode }),
      ...(y > 1 && { attempts: y }),
    };
  if (
    (logEvent("tengu_turn_handoff_carried_writes", T),
    logForDiagnosticsNoPII(
      refusal === "unexpected_error" || refusal === "write_failed" ? "warn" : "info",
      "turn_handoff_carried_writes",
      T,
    ),
    refusal === void 0)
  )
    logFeatureOk("ccr_turn_handoff_carried_writes");
  else if (refusal === "unexpected_error" || refusal === "write_failed")
    logFeatureBad("ccr_turn_handoff_carried_writes", refusal);
  else if (refusal !== "aborted") logFeatureSad("ccr_turn_handoff_carried_writes", refusal);
  return refusal === void 0;
}
/**
 * 把上一轮未完成的写入带到新一轮执行，处理路径移动、home 外、无写工具等情况
 */
//@ chunk-1bmxdqa0.js:13460-16776 placement
async function applyCarriedWrite(o, l, t) {
  if (t.abortController.signal.aborted) return n("aborted");
  let d = getHomeFilesRoot(),
    [O, y, s] = await Promise.all(
      [getCwd(), getOriginalCwd(), d].map((e) =>
        realpath(e).catch(() => {
          return;
        }),
      ),
    );
  if (s === void 0 || O !== s || y !== s) return n("not_home");
  if (o.some((e) => expandPath(e.filePath) !== posix.join(d, e.relativePath))) return n("path_moved");
  let r = storedToolPermissionContext(t),
    P = W1n(getToolPermissionContext(t).mode);
  if (P !== void 0) return n(P);
  let c = $Pr(l, t.options.toolAliases);
  if (c === void 0) return n("no_write_tool");
  let v = () =>
      hasModuleHookingSite("tool.call", { tool: c.name }) ||
      hasModuleHookingSite("tool.check", KW(c), getLoadedModulesForSite("tool.check")) ||
      ["PermissionRequest", "PostToolBatch"].some(
        (e) =>
          dispatchClassicEvent(e) ||
          hasSettingsHookForEvent(e, t.sessionHooksRegistry, registerAgent(t, e, t.session.id)),
      ) ||
      o.some((e) =>
        ["PreToolUse", "PostToolUse"].some((i) =>
          hasToolHookMatching({
            hookEvent: i,
            toolName: c.name,
            toolInput: { file_path: e.filePath, content: e.content },
            tools: t.options.tools,
            toolAliases: t.options.toolAliases,
            sessionHooks: t.sessionHooksRegistry,
            sessionId: registerAgent(t, i, t.session.id),
            exceptInternal: i === "PostToolUse",
          }),
        ),
      ),
    T = () => {
      try {
        if (storedToolPermissionContext(t) !== r) return "permissions_changed";
        let e = W1n(getToolPermissionContext(t).mode);
        if (e !== void 0) return e;
        if (getCheckRunner(t.session, c.name) !== void 0) return "runs_elsewhere";
        return v() ? "hook_would_fire" : void 0;
      } catch {
        return "unexpected_error";
      }
    },
    D = T();
  if (D !== void 0) return n(D);
  let H = [],
    N = new Map();
  for (let e of o) {
    let i = { file_path: e.filePath, content: e.content },
      buffer = Buffer.from(e.content),
      h = await checkHomeTarget(d, e.relativePath).catch((E) => {
        if (getErrnoCode(E) === "ELOOP") return { outcome: "path_occupied" };
        throw E;
      });
    if (h?.outcome === "refused_name") return n("refused_name");
    let u = T();
    if (u !== void 0) return n(u);
    let _ = await hasPermissionsToUseTool(c, i, t, e.assistantMessage, e.toolUseID),
      consume = t.session.writePermissionStash.consume(e.toolUseID, expandPath(e.filePath)),
      R = classifyCarriedWriteDecision(_, i);
    if (R !== void 0) return n(R);
    if (consume === void 0 || consume === BMe) return n("unexpected_error");
    if (hasReadDenyRuleForPath(expandPath(e.filePath), getToolPermissionContext(t), consume))
      return n("denied");
    let all = consume.every((E) => readWouldBeAutoAllowedForPath(E, getToolPermissionContext(t)));
    if (h === void 0) H.push({ write: e, data: buffer, judgedPaths: consume, mayRead: all });
    else {
      if (!all) return n("would_ask");
      let E = await getMatchingFileMtime(d, e, buffer, h.outcome, consume);
      if (E === void 0) return n("occupied");
      N.set(e, E);
    }
    let W = cloneFileStateCache(t.readFileState);
    W.set(expandPath(e.filePath), listSessionsImpl(e, Number.POSITIVE_INFINITY));
    let L = await c.validateInput?.(i, { ...t, readFileState: W });
    if (L?.result === !1) return n(L.deniedByPermissionRule ? "denied" : "tool_refuses");
  }
  if (t.abortController.signal.aborted) return n("aborted");
  await sweepStaleStageTmps(d, STAGE_TMP_PREFIX);
  let j = T();
  if (j !== void 0) return n(j);
  let S = [],
    M = 0,
    B,
    U = [];
  for (let { write: write, data: i, judgedPaths: judgedPaths, mayRead: mayRead } of H) {
    let u = T();
    if (u !== void 0) {
      B = { refusal: u };
      break;
    }
    try {
      let _ = await placeBytesAsHomeFile(d, write.relativePath, i, judgedPaths),
        { outcome: outcome } = _,
        joined = posix.join(d, write.relativePath),
        C;
      if (outcome === "placed") {
        if (((M += i.length), _.madeDirectory !== void 0))
          U.push({ top: _.madeDirectory, deepest: posix.dirname(joined) });
        let W = await lstat(joined);
        (S.push({ path: joined, file: W }), (C = Math.floor(W.mtimeMs)));
      } else C = mayRead ? await getMatchingFileMtime(d, write, i, outcome, judgedPaths) : void 0;
      if (C === void 0) {
        B = {
          refusal:
            _.outcome === "refused_name"
              ? _.refusal === "not_as_judged"
                ? "path_moved"
                : "refused_name"
              : "occupied",
        };
        break;
      }
      N.set(write, C);
    } catch (error) {
      B = { refusal: "write_failed", lastErrorCode: sanitizeErrnoForTelemetry(error) ?? lit("unknown") };
      break;
    }
  }
  if (B !== void 0) {
    let results = await Promise.all(S.map(({ path: path, file: file }) => removeIfUnchanged(path, file)));
    for (let { top: top, deepest: deepest } of U.reverse())
      for (let u = deepest; u.length >= top.length; u = posix.dirname(u))
        if (
          !(await rmdir(u).then(
            () => !0,
            () => !1,
          ))
        )
          break;
    let i = count(results, Boolean);
    return { ...B, counts: { taken_back: i, left_behind: S.length - i }, placedBytes: 0 };
  }
  for (let [e, i] of N) t.readFileState.set(expandPath(e.filePath), listSessionsImpl(e, i));
  return { counts: { placed: S.length, already_present: o.length - S.length }, placedBytes: M };
}
//@ chunk-1bmxdqa0.js:16861-16917 placement
function n(o) {
  return { refusal: o, counts: {}, placedBytes: 0 };
}
//@ chunk-1bmxdqa0.js:16917-17018 placement
function describeCarryError(o) {
  return isAbortError(o)
    ? n("aborted")
    : { ...n("unexpected_error"), lastErrorCode: sanitizeErrnoForTelemetry(o) ?? lit("unknown") };
}
/**
 * 对交接回合中携带的写入的权限决定分类：拒绝、需询问、自动模式、其他原因允许，或输入被修改。
 */
//@ chunk-1bmxdqa0.js:17018-17398 placement
function classifyCarriedWriteDecision(o, l) {
  if (o.behavior !== "allow") return o.behavior === "deny" ? "denied" : "would_ask";
  if (o.decisionReason?.type !== "mode" && o.decisionReason?.type !== "rule") return "allowed_otherwise";
  if (o.decisionReason?.type === "mode" && o.decisionReason.mode === "auto") return "auto_mode";
  let updatedInput = o.updatedInput;
  return updatedInput === void 0 ||
    (updatedInput.file_path === l.file_path && updatedInput.content === l.content)
    ? void 0
    : "input_changed";
}
/**
 * 文件已存在时，确认它位于允许的根目录下（经 /proc/self/fd 或 realpath）且内容与待写入字节完全相同，返回其 mtime 毫秒。
 */
//@ chunk-1bmxdqa0.js:17398-17898 placement
async function getMatchingFileMtime(o, l, t, d, O) {
  if (d !== "already_present") return;
  let joined = posix.join(o, l.relativePath),
    s = await open(joined, constants.O_RDONLY | ws | READ_LIMITS).catch((r) => {
      if (["ENOENT", "ELOOP", "ENOTDIR", "EACCES"].includes(getErrnoCode(r) ?? "")) return;
      throw r;
    });
  if (s === void 0) return;
  try {
    let r =
      getPlatform() === "linux"
        ? await readlink(`/proc/self/fd/${s.fd}`)
        : await realpath(joined).catch(() => {
            return;
          });
    if (r === void 0 || !O.includes(r)) return;
    let stats = await s.stat();
    return stats.isFile() && stats.size === t.length && (await s.readFile()).equals(t)
      ? Math.floor(stats.mtimeMs)
      : void 0;
  } finally {
    await s.close();
  }
}
