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
import { carriedWritePermissionRefusal, findFileWriteTool } from "../../cli/remoteIO/turnHandoff.js";
import {
  hasModuleHookingSite,
  getLoadedModulesForSite,
} from "../../plugins/hooksModules/loadedModuleFilters.js";
import { matcherTestTarget } from "../../utils/hooks/matcherGrammar.js";
import { dispatchClassicEvent } from "../../plugins/functionHooks/modAdmission.js";
import { hasSettingsHookForEvent, hasToolHookMatching } from "../../utils/hooks.js";
import { registerAgent } from "../../utils/telemetry/perfettoTracing.js";
import { getCheckRunner } from "../../utils/permissions/checkRegistry.js";
import { checkHomeTarget, removeIfUnchanged } from "../../utils/filePersistence/homeFilePublish.js";
import { getErrnoCode, sanitizeErrnoForTelemetry, isAbortError } from "../../utils/errors.js";
import { hasPermissionsToUseTool } from "../../utils/permissions/permissions.js";
import { PERMISSION_STASH_EVICTED_SYMBOL } from "../../bootstrap/sessionSlices.js";
import { hasReadDenyRuleForPath, readWouldBeAutoAllowedForPath } from "../../utils/permissions/filesystem.js";
import { cloneFileStateCache } from "../../utils/fileStateCache.js";
import { listSessionsImpl } from "../../utils/listSessionsImpl.js";
import { sweepStaleStageTmps } from "../../utils/stageFile.js";
import { placeBytesAsHomeFile } from "../../utils/filePersistence/placeFilesByName.js";
import { count } from "../../utils/collections.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";
import { READ_LIMITS } from "../../utils/fsBoundRead.js";
import { getPlatform } from "../../utils/platform.js";

//@ chunk-1bmxdqa0.js:12569-13460 placement
async function carryTurnWrites(o, l, t) {
  let carriedWrites = o.carriedWrites ?? [];
  let startTime = performance.now();
  let y = 1;
  let s = await applyCarriedWrite(carriedWrites, l, t).catch(describeCarryError);
  if (s.refusal === "permissions_changed" && !s.counts.taken_back && !s.counts.left_behind) {
    y = 2;
    s = await applyCarriedWrite(carriedWrites, l, t).catch(describeCarryError);
  }
  let { refusal, counts, placedBytes, lastErrorCode } = s;
  let T = {
    at: lit("turn_start"),
    outcome: lit(refusal === undefined ? "in_place" : "refused"),
    refusal: fromEnumOpt(refusal),
    duration_ms: Math.round(performance.now() - startTime),
    files: carriedWrites.length,
    approx_placed_bytes: Number(placedBytes.toPrecision(2)),
    ...identityMap(counts, (D, H) => `files_${H}`),
    ...(lastErrorCode !== undefined && {
      last_error_code: lastErrorCode,
    }),
    ...(y > 1 && {
      attempts: y,
    }),
  };
  logEvent("tengu_turn_handoff_carried_writes", T);
  logForDiagnosticsNoPII(
    refusal === "unexpected_error" || refusal === "write_failed" ? "warn" : "info",
    "turn_handoff_carried_writes",
    T,
  );
  if (refusal === undefined) logFeatureOk("ccr_turn_handoff_carried_writes");
  else if (refusal === "unexpected_error" || refusal === "write_failed")
    logFeatureBad("ccr_turn_handoff_carried_writes", refusal);
  else if (refusal !== "aborted") logFeatureSad("ccr_turn_handoff_carried_writes", refusal);
  return refusal === undefined;
}
//@ chunk-1bmxdqa0.js:13460-16776 placement
/**
 * 把上一轮未完成的写入带到新一轮执行，处理路径移动、home 外、无写工具等情况
 */
async function applyCarriedWrite(carriedWrites, l, t) {
  if (t.abortController.signal.aborted) return refusalCarryResult("aborted");
  let homeFilesRoot = getHomeFilesRoot();
  let [O, y, s] = await Promise.all(
    [getCwd(), getOriginalCwd(), homeFilesRoot].map((e) =>
      realpath(e).catch(() => {
        return;
      }),
    ),
  );
  if (s === undefined || O !== s || y !== s) return refusalCarryResult("not_home");
  if (carriedWrites.some((e) => expandPath(e.filePath) !== posix.join(homeFilesRoot, e.relativePath)))
    return refusalCarryResult("path_moved");
  let r = storedToolPermissionContext(t);
  let P = carriedWritePermissionRefusal(getToolPermissionContext(t).mode);
  if (P !== undefined) return refusalCarryResult(P);
  let fileWriteTool = findFileWriteTool(l, t.options.toolAliases);
  if (fileWriteTool === undefined) return refusalCarryResult("no_write_tool");
  let v = () =>
    hasModuleHookingSite("tool.call", {
      tool: fileWriteTool.name,
    }) ||
    hasModuleHookingSite(
      "tool.check",
      matcherTestTarget(fileWriteTool),
      getLoadedModulesForSite("tool.check"),
    ) ||
    ["PermissionRequest", "PostToolBatch"].some(
      (e) =>
        dispatchClassicEvent(e) ||
        hasSettingsHookForEvent(e, t.sessionHooksRegistry, registerAgent(t, e, t.session.id)),
    ) ||
    carriedWrites.some((e) =>
      ["PreToolUse", "PostToolUse"].some((i) =>
        hasToolHookMatching({
          hookEvent: i,
          toolName: fileWriteTool.name,
          toolInput: {
            file_path: e.filePath,
            content: e.content,
          },
          tools: t.options.tools,
          toolAliases: t.options.toolAliases,
          sessionHooks: t.sessionHooksRegistry,
          sessionId: registerAgent(t, i, t.session.id),
          exceptInternal: i === "PostToolUse",
        }),
      ),
    );
  let T = () => {
    try {
      if (storedToolPermissionContext(t) !== r) return "permissions_changed";
      let e = carriedWritePermissionRefusal(getToolPermissionContext(t).mode);
      if (e !== undefined) return e;
      if (getCheckRunner(t.session, fileWriteTool.name) !== undefined) return "runs_elsewhere";
      return v() ? "hook_would_fire" : undefined;
    } catch {
      return "unexpected_error";
    }
  };
  let D = T();
  if (D !== undefined) return refusalCarryResult(D);
  let H = [];
  let N = new Map();
  for (let e of carriedWrites) {
    let i = {
      file_path: e.filePath,
      content: e.content,
    };
    let buffer = Buffer.from(e.content);
    let h = await checkHomeTarget(homeFilesRoot, e.relativePath).catch((error) => {
      if (getErrnoCode(error) === "ELOOP")
        return {
          outcome: "path_occupied",
        };
      throw error;
    });
    if (h?.outcome === "refused_name") return refusalCarryResult("refused_name");
    let u = T();
    if (u !== undefined) return refusalCarryResult(u);
    let _ = await hasPermissionsToUseTool(fileWriteTool, i, t, e.assistantMessage, e.toolUseID);
    let w = t.session.writePermissionStash.consume(e.toolUseID, expandPath(e.filePath));
    let R = classifyCarriedWriteDecision(_, i);
    if (R !== undefined) return refusalCarryResult(R);
    if (w === undefined || w === PERMISSION_STASH_EVICTED_SYMBOL)
      return refusalCarryResult("unexpected_error");
    if (hasReadDenyRuleForPath(expandPath(e.filePath), getToolPermissionContext(t), w))
      return refusalCarryResult("denied");
    let all = w.every((E) => readWouldBeAutoAllowedForPath(E, getToolPermissionContext(t)));
    if (h === undefined)
      H.push({
        write: e,
        data: buffer,
        judgedPaths: w,
        mayRead: all,
      });
    else {
      if (!all) return refusalCarryResult("would_ask");
      let matchingFileMtime = await getMatchingFileMtime(homeFilesRoot, e, buffer, h.outcome, w);
      if (matchingFileMtime === undefined) return refusalCarryResult("occupied");
      N.set(e, matchingFileMtime);
    }
    let W = cloneFileStateCache(t.readFileState);
    W.set(expandPath(e.filePath), listSessionsImpl(e, Number.POSITIVE_INFINITY));
    let L = await fileWriteTool.validateInput?.(i, {
      ...t,
      readFileState: W,
    });
    if (L?.result === false) return refusalCarryResult(L.deniedByPermissionRule ? "denied" : "tool_refuses");
  }
  if (t.abortController.signal.aborted) return refusalCarryResult("aborted");
  await sweepStaleStageTmps(homeFilesRoot, STAGE_TMP_PREFIX);
  let j = T();
  if (j !== undefined) return refusalCarryResult(j);
  let S = [];
  let placedBytes = 0;
  let B;
  let U = [];
  for (let { write, data: i, judgedPaths, mayRead } of H) {
    let u = T();
    if (u !== undefined) {
      B = {
        refusal: u,
      };
      break;
    }
    try {
      let _ = await placeBytesAsHomeFile(homeFilesRoot, write.relativePath, i, judgedPaths);
      let { outcome } = _;
      let joined = posix.join(homeFilesRoot, write.relativePath);
      let C;
      if (outcome === "placed") {
        placedBytes += i.length;
        if (_.madeDirectory !== undefined)
          U.push({
            top: _.madeDirectory,
            deepest: posix.dirname(joined),
          });
        let W = await lstat(joined);
        S.push({
          path: joined,
          file: W,
        });
        C = Math.floor(W.mtimeMs);
      } else
        C = mayRead ? await getMatchingFileMtime(homeFilesRoot, write, i, outcome, judgedPaths) : undefined;
      if (C === undefined) {
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
      B = {
        refusal: "write_failed",
        lastErrorCode: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
      };
      break;
    }
  }
  if (B !== undefined) {
    let results = await Promise.all(S.map(({ path, file }) => removeIfUnchanged(path, file)));
    for (let { top, deepest } of U.reverse())
      for (let u = deepest; u.length >= top.length; u = posix.dirname(u))
        if (
          !(await rmdir(u).then(
            () => true,
            () => false,
          ))
        )
          break;
    let i = count(results, Boolean);
    return {
      ...B,
      counts: {
        taken_back: i,
        left_behind: S.length - i,
      },
      placedBytes: 0,
    };
  }
  for (let [e, timestamp] of N) t.readFileState.set(expandPath(e.filePath), listSessionsImpl(e, timestamp));
  return {
    counts: {
      placed: S.length,
      already_present: carriedWrites.length - S.length,
    },
    placedBytes,
  };
}
//@ chunk-1bmxdqa0.js:16861-16917 placement
/**
 * 构造携带失败的结果对象：给定拒绝原因、零计数与零字节。
 */
function refusalCarryResult(refusal) {
  return {
    refusal,
    counts: {},
    placedBytes: 0,
  };
}
//@ chunk-1bmxdqa0.js:16917-17018 placement
function describeCarryError(o) {
  return isAbortError(o)
    ? refusalCarryResult("aborted")
    : {
        ...refusalCarryResult("unexpected_error"),
        lastErrorCode: sanitizeErrnoForTelemetry(o) ?? lit("unknown"),
      };
}
//@ chunk-1bmxdqa0.js:17018-17398 placement
/**
 * 对交接回合中携带的写入的权限决定分类：拒绝、需询问、自动模式、其他原因允许，或输入被修改。
 */
function classifyCarriedWriteDecision(o, l) {
  if (o.behavior !== "allow") return o.behavior === "deny" ? "denied" : "would_ask";
  if (o.decisionReason?.type !== "mode" && o.decisionReason?.type !== "rule") return "allowed_otherwise";
  if (o.decisionReason?.type === "mode" && o.decisionReason.mode === "auto") return "auto_mode";
  let updatedInput = o.updatedInput;
  return updatedInput === undefined ||
    (updatedInput.file_path === l.file_path && updatedInput.content === l.content)
    ? undefined
    : "input_changed";
}
//@ chunk-1bmxdqa0.js:17398-17898 placement
/**
 * 文件已存在时，确认它位于允许的根目录下（经 /proc/self/fd 或 realpath）且内容与待写入字节完全相同，返回其 mtime 毫秒。
 */
async function getMatchingFileMtime(homeFilesRoot, l, t, outcome, O) {
  if (outcome !== "already_present") return;
  let joined = posix.join(homeFilesRoot, l.relativePath);
  let s = await open(joined, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS | READ_LIMITS).catch((error) => {
    if (["ENOENT", "ELOOP", "ENOTDIR", "EACCES"].includes(getErrnoCode(error) ?? "")) return;
    throw error;
  });
  if (s === undefined) return;
  try {
    let r =
      getPlatform() === "linux"
        ? await readlink(`/proc/self/fd/${s.fd}`)
        : await realpath(joined).catch(() => {
            return;
          });
    if (r === undefined || !O.includes(r)) return;
    let stats = await s.stat();
    return stats.isFile() && stats.size === t.length && (await s.readFile()).equals(t)
      ? Math.floor(stats.mtimeMs)
      : undefined;
  } finally {
    await s.close();
  }
}
