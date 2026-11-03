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
import { UZo, FORK } from "../tools/AgentTool/constants.js";
import { kN } from "./safeIdentifier.js";
import { EFFORT_LEVELS } from "./effort.js";
import { G$ } from "./agentId.js";
import { tss } from "./model/telemetryModelName.js";
import { WEB_FETCH_AGENT } from "../tools/WebFetchTool/harnessNotes.js";
import { storageCauseErrnoCode, errorMessage } from "./errors.js";
import { logForDebugging } from "./debug.js";

//@ chunk-e6aww6q8.js:215536-215651 placement
var MAX_METADATA_TEXT = 1024,
  AGENT_METADATA_ID_RE = /^[A-Za-z0-9_][A-Za-z0-9_-]{0,127}$/,
  CONTROL_RUN_RE = /(?:(?![\u200c\u200d])[\p{Cc}\p{Cf}]|[\u2028\u2029])+/gu;
/**
 * 清洗代理元数据文本：转为良构字符串、去 ANSI、控制/格式字符换成空格并压缩空白，空串返回 undefined，超长截断加省略号。
 */
//@ chunk-e6aww6q8.js:215651-215821 placement
function sanitizeMetadataText(e, n = MAX_METADATA_TEXT) {
  if (typeof e !== "string") return;
  let trimmed = stripAnsiSequences(toWellFormedString(e))
    .replace(CONTROL_RUN_RE, " ")
    .replace(/ {2,}/g, " ")
    .trim();
  if (trimmed === "") return;
  return trimmed.length > n ? `${truncateToLength(trimmed, n)}\u2026` : trimmed;
}
/**
 * 校验代理元数据字段类型（权限模式、前台/后台等）。
 */
//@ chunk-e6aww6q8.js:215821-217295 placement
function validateAgentMetadata(e) {
  let {
    agentType: agentType,
    isBuiltIn: isBuiltIn,
    name: s,
    parentAgentId: parentAgentId,
    spawnDepth: spawnDepth,
    model: model,
    spawnMode: spawnMode,
    requestShape: requestShape,
    requestNonInteractive: requestNonInteractive,
    launchedWithDefaults: launchedWithDefaults,
    pluginSteered: pluginSteered,
    stoppedByUser: stoppedByUser,
    finished: finished,
    restartResumes: restartResumes,
  } = e;
  if (
    typeof agentType !== "string" ||
    agentType.length === 0 ||
    agentType.length > UZo ||
    agentType === FORK ||
    sanitizeMetadataText(agentType, UZo) !== agentType ||
    e.isFork !== void 0 ||
    e.isObserver !== void 0 ||
    e.taskKind !== void 0
  )
    return;
  let Ee = sanitizeMetadataText(e.description),
    Ae = sanitizeMetadataText(e.workflowPhase),
    Ie = kN(e.toolUseId),
    found = EFFORT_LEVELS.find((We) => We === e.effort);
  return {
    agentType: agentType,
    ...(typeof isBuiltIn === "boolean" && { isBuiltIn: isBuiltIn }),
    ...(Ee !== void 0 && { description: Ee }),
    ...(Ae !== void 0 && { workflowPhase: Ae }),
    ...(typeof s === "string" && AGENT_METADATA_ID_RE.test(s) && { name: s }),
    ...(Ie !== void 0 && { toolUseId: Ie }),
    ...(typeof parentAgentId === "string" && G$(parentAgentId) && { parentAgentId: parentAgentId }),
    ...(typeof spawnDepth === "number" &&
      Number.isInteger(spawnDepth) && { spawnDepth: Math.max(1, spawnDepth) }),
    ...(typeof model === "string" && tss.test(model) && { model: model }),
    ...(found !== void 0 && { effort: found }),
    ...(spawnMode === "dontAsk" &&
      agentType === WEB_FETCH_AGENT &&
      isBuiltIn === !0 && { spawnMode: spawnMode }),
    ...((requestShape === "foreground" || requestShape === "background") && { requestShape: requestShape }),
    ...(typeof requestNonInteractive === "boolean" && { requestNonInteractive: requestNonInteractive }),
    ...(launchedWithDefaults === !0 &&
      e.cwd === void 0 &&
      e.worktreePath === void 0 && { launchedWithDefaults: launchedWithDefaults }),
    ...(pluginSteered === !0 && { pluginSteered: pluginSteered }),
    ...((e.spawnedWithWorktree === !0 || e.worktreePath !== void 0 || e.inheritedWorktreePath !== void 0) && {
      spawnedWithWorktree: !0,
    }),
    ...(e.worktreeCleanlyRemoved === !0 &&
      e.worktreePath === void 0 &&
      e.inheritedWorktreePath === void 0 && { worktreeCleanlyRemoved: !0 }),
    ...(stoppedByUser === !0 && { stoppedByUser: stoppedByUser }),
    ...(finished === !0 && { finished: finished }),
    ...(typeof restartResumes === "number" && { restartResumes: restartResumes }),
  };
}
//@ chunk-e6aww6q8.js:217393-217460 placement
function UC(e) {
  let n = storageCauseErrnoCode(e);
  return n === void 0 ? errorMessage(e) : `${errorMessage(e)} (${n})`;
}
/**
 * 生成读取 agent 元数据旁文件失败时的回退函数：记日志并视为不存在。
 */
//@ chunk-e6aww6q8.js:217460-217569 placement
function makeSidecarReadFallback(e) {
  return (n) => (
    logForDebugging(`${e}: agent metadata sidecar unreadable, treating as absent: ${UC(n)}`),
    null
  );
}

export { UC, makeSidecarReadFallback, validateAgentMetadata, sanitizeMetadataText, AGENT_METADATA_ID_RE };
