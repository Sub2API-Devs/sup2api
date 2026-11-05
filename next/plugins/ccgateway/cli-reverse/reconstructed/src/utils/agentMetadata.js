/**
 * utils/agentMetadata.ts
 *
 * 2.1.316 新增：代理元数据校验
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (5)
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

//@ chunk-5xgkngpb.js:214597-214712 placement
/**
 * agent 元数据清洗：Hdo 是截断长度上限 1024（YR(e, n = Hdo) 的默认值）；P2e 是元数据名正则 /^[A-Za-z0-9_][A-Za-z0-9_-]{0,127}$/；Bdo 匹配控制字符与换行的成串正则（替换为空格）。
 */
var MAX_METADATA_CHARS = 1024;
var AGENT_METADATA_ID_RE = /^[A-Za-z0-9_][A-Za-z0-9_-]{0,127}$/;
var CONTROL_RUN_RE = /(?:(?![\u200c\u200d])[\p{Cc}\p{Cf}]|[\u2028\u2029])+/gu;
//@ chunk-5xgkngpb.js:214712-214881 placement
/**
 * 清洗代理元数据文本：转为良构字符串、去 ANSI、控制/格式字符换成空格并压缩空白，空串返回 undefined，超长截断加省略号。
 */
function sanitizeMetadataText(text, maxChars = MAX_METADATA_CHARS) {
  if (typeof text !== "string") return;
  let trimmed = stripAnsiSequences(toWellFormedString(text))
    .replace(CONTROL_RUN_RE, " ")
    .replace(/ {2,}/g, " ")
    .trim();
  if (trimmed === "") return;
  return trimmed.length > maxChars ? `${truncateToLength(trimmed, maxChars)}\u2026` : trimmed;
}
//@ chunk-5xgkngpb.js:214881-216521 placement
/**
 * 校验代理元数据字段类型（权限模式、前台/后台等）。
 */
function validateAgentMetadata(metadata) {
  let {
    agentType,
    isBuiltIn,
    name,
    parentAgentId,
    spawnDepth,
    model,
    pickedEffortModel,
    spawnMode,
    requestShape,
    requestNonInteractive,
    launchedWithDefaults,
    pluginSteered,
    stoppedByUser,
    finished,
    restartResumes,
    restartResumesSetBackBy,
  } = metadata;
  if (
    typeof agentType !== "string" ||
    agentType.length === 0 ||
    agentType.length > MAX_AGENT_NAME_CHARS ||
    agentType === FORK ||
    sanitizeMetadataText(agentType, MAX_AGENT_NAME_CHARS) !== agentType ||
    metadata.isFork !== undefined ||
    metadata.isObserver !== undefined ||
    metadata.taskKind !== undefined
  )
    return;
  let description = sanitizeMetadataText(metadata.description);
  let workflowPhase = sanitizeMetadataText(metadata.workflowPhase);
  let toolUseId = safeIdentifierOrUndefined(metadata.toolUseId);
  let found = EFFORT_LEVELS.find((level) => level === metadata.effort);
  return {
    agentType,
    ...(typeof isBuiltIn === "boolean" && {
      isBuiltIn,
    }),
    ...(description !== undefined && {
      description,
    }),
    ...(workflowPhase !== undefined && {
      workflowPhase,
    }),
    ...(typeof name === "string" &&
      AGENT_METADATA_ID_RE.test(name) && {
        name,
      }),
    ...(toolUseId !== undefined && {
      toolUseId,
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
    ...(typeof pickedEffortModel === "string" &&
      SAFE_MODEL_NAME_RE.test(pickedEffortModel) && {
        pickedEffortModel,
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
      metadata.cwd === undefined &&
      metadata.worktreePath === undefined && {
        launchedWithDefaults,
      }),
    ...(pluginSteered === true && {
      pluginSteered,
    }),
    ...((metadata.spawnedWithWorktree === true ||
      metadata.worktreePath !== undefined ||
      metadata.inheritedWorktreePath !== undefined) && {
      spawnedWithWorktree: true,
    }),
    ...(metadata.worktreeCleanlyRemoved === true &&
      metadata.worktreePath === undefined &&
      metadata.inheritedWorktreePath === undefined && {
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
    ...(typeof restartResumesSetBackBy === "string" && {
      restartResumesSetBackBy,
    }),
  };
}
//@ chunk-5xgkngpb.js:216619-216686 placement
/**
 * 把错误消息与存储相关 errno 码拼在一起，用于日志。
 */
function describeStorageError(error) {
  let errnoCode = storageCauseErrnoCode(error);
  return errnoCode === undefined ? errorMessage(error) : `${errorMessage(error)} (${errnoCode})`;
}
//@ chunk-5xgkngpb.js:216686-216795 placement
/**
 * 生成读取 agent 元数据旁文件失败时的回退函数：记日志并视为不存在。
 */
function makeSidecarReadFallback(label) {
  return (error) => {
    logForDebugging(
      `${label}: agent metadata sidecar unreadable, treating as absent: ${describeStorageError(error)}`,
    );
    return null;
  };
}
export {
  sanitizeMetadataText,
  validateAgentMetadata,
  describeStorageError,
  makeSidecarReadFallback,
  AGENT_METADATA_ID_RE,
};
