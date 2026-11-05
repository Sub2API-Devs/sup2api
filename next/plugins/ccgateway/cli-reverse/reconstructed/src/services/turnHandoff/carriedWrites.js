/**
 * services/turnHandoff/carriedWrites.ts
 *
 * 跨轮次携带的写入（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xmpe3wef.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { countWhere } from "../../utils/collections.js";
import { NOFOLLOW_NONBLOCK_FLAGS } from "../../utils/fsFlags.js";
import { READ_LIMITS } from "../../utils/fsBoundRead.js";
import { getPlatform } from "../../utils/platform.js";

//@ chunk-xmpe3wef.js:13755-14646 placement
async function carryTurnWrites(request, tools, toolUseContext) {
  let carriedWrites = request.carriedWrites ?? [];
  let startTime = performance.now();
  let attempts = 1;
  let carryResult = await applyCarriedWrite(carriedWrites, tools, toolUseContext).catch(describeCarryError);
  if (
    carryResult.refusal === "permissions_changed" &&
    !carryResult.counts.taken_back &&
    !carryResult.counts.left_behind
  ) {
    attempts = 2;
    carryResult = await applyCarriedWrite(carriedWrites, tools, toolUseContext).catch(describeCarryError);
  }
  let { refusal, counts, placedBytes, lastErrorCode } = carryResult;
  let fields = {
    at: lit("turn_start"),
    outcome: lit(refusal === undefined ? "in_place" : "refused"),
    refusal: fromEnumOpt(refusal),
    duration_ms: Math.round(performance.now() - startTime),
    files: carriedWrites.length,
    approx_placed_bytes: Number(placedBytes.toPrecision(2)),
    ...identityMap(counts, (value, key) => `files_${key}`),
    ...(lastErrorCode !== undefined && {
      last_error_code: lastErrorCode,
    }),
    ...(attempts > 1 && {
      attempts,
    }),
  };
  logEvent("tengu_turn_handoff_carried_writes", fields);
  logForDiagnosticsNoPII(
    refusal === "unexpected_error" || refusal === "write_failed" ? "warn" : "info",
    "turn_handoff_carried_writes",
    fields,
  );
  if (refusal === undefined) logFeatureOk("ccr_turn_handoff_carried_writes");
  else if (refusal === "unexpected_error" || refusal === "write_failed")
    logFeatureBad("ccr_turn_handoff_carried_writes", refusal);
  else if (refusal !== "aborted") logFeatureSad("ccr_turn_handoff_carried_writes", refusal);
  return refusal === undefined;
}
//@ chunk-xmpe3wef.js:14646-17962 placement
/**
 * 把上一轮未完成的写入带到新一轮执行，处理路径移动、home 外、无写工具等情况
 */
async function applyCarriedWrite(carriedWrites, tools, toolUseContext) {
  if (toolUseContext.abortController.signal.aborted) return refusalCarryResult("aborted");
  let homeFilesRoot = getHomeFilesRoot();
  let [cwdReal, originalCwdReal, homeReal] = await Promise.all(
    [getCwd(), getOriginalCwd(), homeFilesRoot].map((dir) =>
      realpath(dir).catch(() => {
        return;
      }),
    ),
  );
  if (homeReal === undefined || cwdReal !== homeReal || originalCwdReal !== homeReal)
    return refusalCarryResult("not_home");
  if (
    carriedWrites.some(
      (write) => expandPath(write.filePath) !== posix.join(homeFilesRoot, write.relativePath),
    )
  )
    return refusalCarryResult("path_moved");
  let permissionSnapshot = storedToolPermissionContext(toolUseContext);
  let modeRefusal = carriedWritePermissionRefusal(getToolPermissionContext(toolUseContext).mode);
  if (modeRefusal !== undefined) return refusalCarryResult(modeRefusal);
  let fileWriteTool = findFileWriteTool(tools, toolUseContext.options.toolAliases);
  if (fileWriteTool === undefined) return refusalCarryResult("no_write_tool");
  let hookWouldFire = () =>
    hasModuleHookingSite("tool.call", {
      tool: fileWriteTool.name,
    }) ||
    hasModuleHookingSite(
      "tool.check",
      matcherTestTarget(fileWriteTool),
      getLoadedModulesForSite("tool.check"),
    ) ||
    ["PermissionRequest", "PostToolBatch"].some(
      (hookEvent) =>
        dispatchClassicEvent(hookEvent) ||
        hasSettingsHookForEvent(
          hookEvent,
          toolUseContext.sessionHooksRegistry,
          registerAgent(toolUseContext, hookEvent, toolUseContext.session.id),
        ),
    ) ||
    carriedWrites.some((write) =>
      ["PreToolUse", "PostToolUse"].some((hookEvent) =>
        hasToolHookMatching({
          hookEvent,
          toolName: fileWriteTool.name,
          toolInput: {
            file_path: write.filePath,
            content: write.content,
          },
          tools: toolUseContext.options.tools,
          toolAliases: toolUseContext.options.toolAliases,
          sessionHooks: toolUseContext.sessionHooksRegistry,
          sessionId: registerAgent(toolUseContext, hookEvent, toolUseContext.session.id),
          exceptInternal: hookEvent === "PostToolUse",
        }),
      ),
    );
  let currentRefusal = () => {
    try {
      if (storedToolPermissionContext(toolUseContext) !== permissionSnapshot) return "permissions_changed";
      let modeRefusal = carriedWritePermissionRefusal(getToolPermissionContext(toolUseContext).mode);
      if (modeRefusal !== undefined) return modeRefusal;
      if (getCheckRunner(toolUseContext.session, fileWriteTool.name) !== undefined) return "runs_elsewhere";
      return hookWouldFire() ? "hook_would_fire" : undefined;
    } catch {
      return "unexpected_error";
    }
  };
  let refusal = currentRefusal();
  if (refusal !== undefined) return refusalCarryResult(refusal);
  let toPlace = [];
  let mtimes = new Map();
  for (let write of carriedWrites) {
    let input = {
      file_path: write.filePath,
      content: write.content,
    };
    let buffer = Buffer.from(write.content);
    let targetCheck = await checkHomeTarget(homeFilesRoot, write.relativePath).catch((error) => {
      if (getErrnoCode(error) === "ELOOP")
        return {
          outcome: "path_occupied",
        };
      throw error;
    });
    if (targetCheck?.outcome === "refused_name") return refusalCarryResult("refused_name");
    let refusal = currentRefusal();
    if (refusal !== undefined) return refusalCarryResult(refusal);
    let decision = await hasPermissionsToUseTool(
      fileWriteTool,
      input,
      toolUseContext,
      write.assistantMessage,
      write.toolUseID,
    );
    let judgedPaths = toolUseContext.session.writePermissionStash.consume(
      write.toolUseID,
      expandPath(write.filePath),
    );
    let decisionRefusal = classifyCarriedWriteDecision(decision, input);
    if (decisionRefusal !== undefined) return refusalCarryResult(decisionRefusal);
    if (judgedPaths === undefined || judgedPaths === PERMISSION_STASH_EVICTED_SYMBOL)
      return refusalCarryResult("unexpected_error");
    if (
      hasReadDenyRuleForPath(
        expandPath(write.filePath),
        getToolPermissionContext(toolUseContext),
        judgedPaths,
      )
    )
      return refusalCarryResult("denied");
    let all = judgedPaths.every((judgedPath) =>
      readWouldBeAutoAllowedForPath(judgedPath, getToolPermissionContext(toolUseContext)),
    );
    if (targetCheck === undefined)
      toPlace.push({
        write,
        data: buffer,
        judgedPaths,
        mayRead: all,
      });
    else {
      if (!all) return refusalCarryResult("would_ask");
      let matchingFileMtime = await getMatchingFileMtime(
        homeFilesRoot,
        write,
        buffer,
        targetCheck.outcome,
        judgedPaths,
      );
      if (matchingFileMtime === undefined) return refusalCarryResult("occupied");
      mtimes.set(write, matchingFileMtime);
    }
    let readState = cloneFileStateCache(toolUseContext.readFileState);
    readState.set(expandPath(write.filePath), listSessionsImpl(write, Number.POSITIVE_INFINITY));
    let validation = await fileWriteTool.validateInput?.(input, {
      ...toolUseContext,
      readFileState: readState,
    });
    if (validation?.result === false)
      return refusalCarryResult(validation.deniedByPermissionRule ? "denied" : "tool_refuses");
  }
  if (toolUseContext.abortController.signal.aborted) return refusalCarryResult("aborted");
  await sweepStaleStageTmps(homeFilesRoot, STAGE_TMP_PREFIX);
  let placeRefusal = currentRefusal();
  if (placeRefusal !== undefined) return refusalCarryResult(placeRefusal);
  let placed = [];
  let placedBytes = 0;
  let failure;
  let madeDirs = [];
  for (let { write, data, judgedPaths, mayRead } of toPlace) {
    let refusal = currentRefusal();
    if (refusal !== undefined) {
      failure = {
        refusal,
      };
      break;
    }
    try {
      let placeResult = await placeBytesAsHomeFile(homeFilesRoot, write.relativePath, data, judgedPaths);
      let { outcome } = placeResult;
      let joined = posix.join(homeFilesRoot, write.relativePath);
      let mtime;
      if (outcome === "placed") {
        placedBytes += data.length;
        if (placeResult.madeDirectory !== undefined)
          madeDirs.push({
            top: placeResult.madeDirectory,
            deepest: posix.dirname(joined),
          });
        let fileStats = await lstat(joined);
        placed.push({
          path: joined,
          file: fileStats,
        });
        mtime = Math.floor(fileStats.mtimeMs);
      } else
        mtime = mayRead
          ? await getMatchingFileMtime(homeFilesRoot, write, data, outcome, judgedPaths)
          : undefined;
      if (mtime === undefined) {
        failure = {
          refusal:
            placeResult.outcome === "refused_name"
              ? placeResult.refusal === "not_as_judged"
                ? "path_moved"
                : "refused_name"
              : "occupied",
        };
        break;
      }
      mtimes.set(write, mtime);
    } catch (error) {
      failure = {
        refusal: "write_failed",
        lastErrorCode: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
      };
      break;
    }
  }
  if (failure !== undefined) {
    let results = await Promise.all(placed.map(({ path, file }) => removeIfUnchanged(path, file)));
    for (let { top, deepest } of madeDirs.reverse())
      for (let dirPath = deepest; dirPath.length >= top.length; dirPath = posix.dirname(dirPath))
        if (
          !(await rmdir(dirPath).then(
            () => true,
            () => false,
          ))
        )
          break;
    let takenBackCount = countWhere(results, Boolean);
    return {
      ...failure,
      counts: {
        taken_back: takenBackCount,
        left_behind: placed.length - takenBackCount,
      },
      placedBytes: 0,
    };
  }
  for (let [write, timestamp] of mtimes)
    toolUseContext.readFileState.set(expandPath(write.filePath), listSessionsImpl(write, timestamp));
  return {
    counts: {
      placed: placed.length,
      already_present: carriedWrites.length - placed.length,
    },
    placedBytes,
  };
}
//@ chunk-xmpe3wef.js:18047-18103 placement
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
//@ chunk-xmpe3wef.js:18103-18204 placement
function describeCarryError(error) {
  return isAbortError(error)
    ? refusalCarryResult("aborted")
    : {
        ...refusalCarryResult("unexpected_error"),
        lastErrorCode: sanitizeErrnoForTelemetry(error) ?? lit("unknown"),
      };
}
//@ chunk-xmpe3wef.js:18204-18584 placement
/**
 * 对交接回合中携带的写入的权限决定分类：拒绝、需询问、自动模式、其他原因允许，或输入被修改。
 */
function classifyCarriedWriteDecision(decision, input) {
  if (decision.behavior !== "allow") return decision.behavior === "deny" ? "denied" : "would_ask";
  if (decision.decisionReason?.type !== "mode" && decision.decisionReason?.type !== "rule")
    return "allowed_otherwise";
  if (decision.decisionReason?.type === "mode" && decision.decisionReason.mode === "auto") return "auto_mode";
  let updatedInput = decision.updatedInput;
  return updatedInput === undefined ||
    (updatedInput.file_path === input.file_path && updatedInput.content === input.content)
    ? undefined
    : "input_changed";
}
//@ chunk-xmpe3wef.js:18584-19084 placement
/**
 * 文件已存在时，确认它位于允许的根目录下（经 /proc/self/fd 或 realpath）且内容与待写入字节完全相同，返回其 mtime 毫秒。
 */
async function getMatchingFileMtime(rootDir, write, data, outcome, judgedPaths) {
  if (outcome !== "already_present") return;
  let joined = posix.join(rootDir, write.relativePath);
  let handle = await open(joined, constants.O_RDONLY | NOFOLLOW_NONBLOCK_FLAGS | READ_LIMITS).catch(
    (error) => {
      if (["ENOENT", "ELOOP", "ENOTDIR", "EACCES"].includes(getErrnoCode(error) ?? "")) return;
      throw error;
    },
  );
  if (handle === undefined) return;
  try {
    let realTarget =
      getPlatform() === "linux"
        ? await readlink(`/proc/self/fd/${handle.fd}`)
        : await realpath(joined).catch(() => {
            return;
          });
    if (realTarget === undefined || !judgedPaths.includes(realTarget)) return;
    let stats = await handle.stat();
    return stats.isFile() && stats.size === data.length && (await handle.readFile()).equals(data)
      ? Math.floor(stats.mtimeMs)
      : undefined;
  } finally {
    await handle.close();
  }
}
export { carryTurnWrites };
