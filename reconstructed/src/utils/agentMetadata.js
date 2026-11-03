/**
 * utils/agentMetadata.ts
 *
 * 2.1.316 新增：代理元数据校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { stripAnsiSequences } from "./printableName.js";
import { toWellFormedString, truncateToLength } from "./stringUtils.js";
import { MAX_AGENT_NAME_CHARS, FORK } from "../tools/AgentTool/constants.js";
import { safeIdentifierOrUndefined } from "./safeIdentifier.js";
import { EFFORT_LEVELS } from "./effort.js";
import { isSafeIdSegment } from "./agentId.js";
import { SAFE_MODEL_NAME_RE } from "./model/telemetryModelName.js";
import { WEB_FETCH_AGENT } from "../tools/WebFetchTool/harnessNotes.js";
import { storageCauseErrnoCode, errorMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";

//@ chunk-e6aww6q8.js:215536-215651 placement
var MAX_METADATA_TEXT = 1024;
var AGENT_METADATA_ID_RE = /^[A-Za-z0-9_][A-Za-z0-9_-]{0,127}$/;
var CONTROL_RUN_RE = /(?:(?![\u200c\u200d])[\p{Cc}\p{Cf}]|[\u2028\u2029])+/gu;
//@ chunk-e6aww6q8.js:215651-215821 placement
/**
 * 清洗代理元数据文本：转为良构字符串、去 ANSI、控制/格式字符换成空格并压缩空白，空串返回 undefined，超长截断加省略号。
 */
function sanitizeMetadataText(e, n = MAX_METADATA_TEXT) {
  if (typeof e !== "string") return;
  let trimmed = stripAnsiSequences(toWellFormedString(e))
    .replace(CONTROL_RUN_RE, " ")
    .replace(/ {2,}/g, " ")
    .trim();
  if (trimmed === "") return;
  return trimmed.length > n ? `${truncateToLength(trimmed, n)}\u2026` : trimmed;
}
//@ chunk-e6aww6q8.js:215821-217295 placement
/**
 * 校验代理元数据字段类型（权限模式、前台/后台等）。
 */
function validateAgentMetadata(e) {
  let {
    agentType,
    isBuiltIn,
    name: s,
    parentAgentId,
    spawnDepth,
    model,
    spawnMode,
    requestShape,
    requestNonInteractive,
    launchedWithDefaults,
    pluginSteered,
    stoppedByUser,
    finished,
    restartResumes,
  } = e;
  if (
    typeof agentType !== "string" ||
    agentType.length === 0 ||
    agentType.length > MAX_AGENT_NAME_CHARS ||
    agentType === FORK ||
    sanitizeMetadataText(agentType, MAX_AGENT_NAME_CHARS) !== agentType ||
    e.isFork !== undefined ||
    e.isObserver !== undefined ||
    e.taskKind !== undefined
  )
    return;
  let Ee = sanitizeMetadataText(e.description);
  let Ae = sanitizeMetadataText(e.workflowPhase);
  let Ie = safeIdentifierOrUndefined(e.toolUseId);
  let found = EFFORT_LEVELS.find((We) => We === e.effort);
  return {
    agentType,
    ...(typeof isBuiltIn === "boolean" && {
      isBuiltIn,
    }),
    ...(Ee !== undefined && {
      description: Ee,
    }),
    ...(Ae !== undefined && {
      workflowPhase: Ae,
    }),
    ...(typeof s === "string" &&
      AGENT_METADATA_ID_RE.test(s) && {
        name: s,
      }),
    ...(Ie !== undefined && {
      toolUseId: Ie,
    }),
    ...(typeof parentAgentId === "string" &&
      isSafeIdSegment(parentAgentId) && {
        parentAgentId,
      }),
    ...(typeof spawnDepth === "number" &&
      Number.isInteger(spawnDepth) && {
        spawnDepth: Math.max(1, spawnDepth),
      }),
    ...(typeof model === "string" &&
      SAFE_MODEL_NAME_RE.test(model) && {
        model,
      }),
    ...(found !== undefined && {
      effort: found,
    }),
    ...(spawnMode === "dontAsk" &&
      agentType === WEB_FETCH_AGENT &&
      isBuiltIn === true && {
        spawnMode,
      }),
    ...((requestShape === "foreground" || requestShape === "background") && {
      requestShape,
    }),
    ...(typeof requestNonInteractive === "boolean" && {
      requestNonInteractive,
    }),
    ...(launchedWithDefaults === true &&
      e.cwd === undefined &&
      e.worktreePath === undefined && {
        launchedWithDefaults,
      }),
    ...(pluginSteered === true && {
      pluginSteered,
    }),
    ...((e.spawnedWithWorktree === true ||
      e.worktreePath !== undefined ||
      e.inheritedWorktreePath !== undefined) && {
      spawnedWithWorktree: true,
    }),
    ...(e.worktreeCleanlyRemoved === true &&
      e.worktreePath === undefined &&
      e.inheritedWorktreePath === undefined && {
        worktreeCleanlyRemoved: true,
      }),
    ...(stoppedByUser === true && {
      stoppedByUser,
    }),
    ...(finished === true && {
      finished,
    }),
    ...(typeof restartResumes === "number" && {
      restartResumes,
    }),
  };
}
//@ chunk-e6aww6q8.js:217393-217460 placement
/**
 * 把错误消息与存储相关 errno 码拼在一起，用于日志。
 */
function describeStorageError(error) {
  let n = storageCauseErrnoCode(error);
  return n === undefined ? errorMessage(error) : `${errorMessage(error)} (${n})`;
}
//@ chunk-e6aww6q8.js:217460-217569 placement
/**
 * 生成读取 agent 元数据旁文件失败时的回退函数：记日志并视为不存在。
 */
function makeSidecarReadFallback(e) {
  return (n) => {
    logForDebugging(
      `${e}: agent metadata sidecar unreadable, treating as absent: ${describeStorageError(n)}`,
    );
    return null;
  };
}
export {
  describeStorageError,
  makeSidecarReadFallback,
  validateAgentMetadata,
  sanitizeMetadataText,
  AGENT_METADATA_ID_RE,
};
