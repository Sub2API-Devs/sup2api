/**
 * cli/remoteIO/turnHandoff.ts
 *
 * 2.1.316 新增。turn_handoff：worker 之间交接一个回合（消息、在途写入、rewind）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z4g2ta8k.js (44)
 * attribution: placement 44
 */
import { posix } from "path";
import { randomUUID } from "crypto";
import { isDiskless } from "../../bootstrap/state.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  initializeGrowthBook,
  hasFreshGrowthBookFeatures,
  refreshGrowthBookFeatures,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  isServedFeatureSource,
} from "../../services/analytics/growthbook.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { identity } from "../../utils/identity.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { withDeadline } from "../../utils/sleep.js";
import { DoctorLazy } from "../handlers/util.js";
import { zodStrictObject, string, record, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { findToolByName } from "../../Tool.js";
import { homePathProblem, MAX_HOME_FILE_NAME_LENGTH } from "../../utils/filePersistence/homeFilePublish.js";
import { isWellFormedString } from "../../utils/stringUtils.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { expandPathOrNull } from "../../utils/path.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { WEBSEARCH } from "../../tools/WebSearchTool/prompt.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";
import { SEARCH_MCP_REGISTRY_TOOL_NAME } from "../../tools/SearchMcpRegistryTool/prompt.js";
import { SUGGEST_CONNECTORS_TOOL_NAME } from "../../tools/SuggestConnectorsTool/prompt.js";
import { LIST_CONNECTORS_TOOL_NAME } from "../../tools/ListConnectorsTool/prompt.js";
import { SKILL } from "../../tools/SkillTool/skillToolNames.js";
import { ARTIFACT_TOOL_NAME } from "../../tools/ArtifactTool/constants.js";
import { TRIGGER_TOOL_NAMES, REPO_TOOL_NAMES, CLAUDE_CODE_REMOTE } from "../../services/mcp/ccrMetaMcp.js";
import {
  lastConversationMessage,
  findLastToolUseAssistantMessage,
} from "../../utils/messages/messagePredicates.js";
import {
  isDefinedHumanClientPlatform,
  hasTeammateMessageEnvelope,
} from "../../bridge/inboundMessageOrigin.js";
import { SDKTurnHandoffTurnHandoffMessageSchema } from "../../entrypoints/sdk/controlSchemas.js";
import { toInternalMessages } from "../../utils/messages/mappers.js";
import { countImageParts } from "../../utils/attachments/bridgeAttachments.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { isClaudeCodeRemoteServer } from "../../services/mcp/agentRequestMeta.js";
import { isPendingMcpToolName } from "../../services/tools/toolExecution.js";
import { mcpInfoFromString, buildMcpToolName } from "../../services/mcp/mcpStringUtils.js";
import { count } from "../../utils/collections.js";
import { isToolResultMessage, isNotEmptyMessage } from "../../utils/messages.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { toToolUseIdSet } from "../../utils/permissions/permissions.js";
import { isToolResultOnlyUserMessage } from "../../services/api/claude.js";
import { normalizeAttestationStatus, meetsAttestationLevel } from "../../bridge/deviceAttestation.js";
import { isUiSurfaceName } from "../sdkMcpManifests.js";
import { CLOUD_PLUGINS_FORWARDED_KEY } from "../../utils/plugins/cloudPluginForwarding.js";

//@ chunk-z4g2ta8k.js:11186-11240 placement
/**
 * 是否允许回合交接恢复：非无盘且特性 tengu_steady_puppy 开启。
 */
function isTurnHandoffResumeEnabled() {
  return !isDiskless() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_steady_puppy", false);
}
//@ chunk-z4g2ta8k.js:11361-11426 placement
function withEnvelopeFlag(featureValue_CACHED_MAY_BE_STALE, n) {
  if (!n) return featureValue_CACHED_MAY_BE_STALE;
  return {
    ...(isPlainObject(featureValue_CACHED_MAY_BE_STALE) ? featureValue_CACHED_MAY_BE_STALE : {}),
    envelope: true,
  };
}
//@ chunk-z4g2ta8k.js:11456-11510 placement
var GROWTHBOOK_REFRESH_INFLIGHT = identity(
  {
    inFlight: undefined,
  },
  (e) => {
    e.inFlight = undefined;
  },
);
//@ chunk-z4g2ta8k.js:11510-11658 placement
/**
 * 确保 GrowthBook 特性是新鲜的：初始化后若不新鲜则发起（合并并发的）刷新并等待。
 */
async function ensureFreshGrowthBook() {
  await initializeGrowthBook().catch(() => null);
  if (hasFreshGrowthBookFeatures()) return;
  GROWTHBOOK_REFRESH_INFLIGHT.inFlight ??= refreshGrowthBookFeatures()
    .catch(() => {})
    .finally(() => {
      GROWTHBOOK_REFRESH_INFLIGHT.inFlight = undefined;
    });
  await GROWTHBOOK_REFRESH_INFLIGHT.inFlight;
}
//@ chunk-z4g2ta8k.js:11658-11693 placement
var CARRIED_WRITES_FLAG_WAIT_MS = 3000;
var TENGU_FIZZY_PETAL = "tengu_fizzy_petal";
//@ chunk-z4g2ta8k.js:11693-11772 placement
function carriedWritesFlagState() {
  let { source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_FIZZY_PETAL, false);
  return {
    on: readFlagWithOverride(TENGU_FIZZY_PETAL, {
      safe: false,
    }),
    served: isServedFeatureSource(source),
  };
}
//@ chunk-z4g2ta8k.js:11772-11802 placement
/**
 * 是否开启携带写（carried writes）：读 tengu_fizzy_petal 并应用开关覆盖。
 */
function isCarriedWritesEnabled() {
  return carriedWritesFlagState().on;
}
//@ chunk-z4g2ta8k.js:11802-11953 placement
function logHandoffFlagAdvert() {
  logEvent("tengu_turn_handoff_flag_wait", {
    capability: lit("carried_writes"),
    at: lit("advert"),
    waited_ms: 0,
    ended: lit(carriedWritesFlagState().served ? "served" : "not_served"),
  });
}
//@ chunk-z4g2ta8k.js:11953-12221 placement
/**
 * 回合开始时在时限内等待 carried_writes 特性开关就绪，记录等待耗时事件，返回该能力是否开启。
 */
async function awaitCarriedWritesFlag(e = CARRIED_WRITES_FLAG_WAIT_MS) {
  if (!carriedWritesFlagState().served) {
    let startTime = performance.now();
    await withDeadline(ensureFreshGrowthBook(), e);
    logEvent("tengu_turn_handoff_flag_wait", {
      capability: lit("carried_writes"),
      at: lit("turn_start"),
      waited_ms: Math.round(performance.now() - startTime),
      ended: lit(carriedWritesFlagState().served ? "served" : "not_served"),
    });
  }
  return isCarriedWritesEnabled();
}
//@ chunk-z4g2ta8k.js:12221-12285 placement
var SAID_CARRIED_WRITES_STATE = identity(
  {
    saidCarriedWrites: false,
  },
  (e) => {
    e.saidCarriedWrites = false;
  },
);
//@ chunk-z4g2ta8k.js:12285-12323 placement
function markSaidCarriedWrites() {
  SAID_CARRIED_WRITES_STATE.saidCarriedWrites = true;
}
//@ chunk-z4g2ta8k.js:12323-12366 placement
/**
 * 本轮是否已提示过"携带写"（避免重复提示）。
 */
function hasSaidCarriedWrites() {
  return SAID_CARRIED_WRITES_STATE.saidCarriedWrites;
}
//@ chunk-z4g2ta8k.js:12366-13422 placement
/**
 * 携带写（carried writes）相关常量与 schema：单文件 8MiB、路径 1024 字节上限、权限拒绝文案表、handoff 与 tool_use 校验 schema、可携带写的工具名集合。
 */
var CARRIED_WRITE_REFUSALS = 16;
var MAX_CARRIED_WRITE_BYTES = 8388608;
var MAX_CARRIED_WRITE_PATH_BYTES = 1024;
var CARRIED_WRITE_PERMISSION_REFUSALS = {
  would_ask: "this session's permission mode would ask before a Write",
  auto_mode: "carried Writes are not placed in auto mode",
};
var CARRIED_WRITE_REFUSAL_TEXT = {
  switched_off: "carried Writes are not switched on just now, though this worker announced them",
  no_write_tool: "this session's Write tool is missing or is not the built-in one",
  odd_input: "an answered Write's input is not a path and content alone",
  result_text: "an answered Write's result is not the Write tool's success text",
  edited: "an Edit or NotebookEdit in the turn may have changed a file a Write made",
  refused_name: "an answered Write names a file that may not be written under the home directory",
  nested: "one answered Write's file is a directory on another's path",
  too_many: `the answered Writes name more than ${CARRIED_WRITE_REFUSALS} files`,
  too_large: `the answered Writes hold more than ${MAX_CARRIED_WRITE_BYTES} bytes`,
  not_home: "this session's working directory is not its home directory",
  ...CARRIED_WRITE_PERMISSION_REFUSALS,
};
var handoffMessageSchema = DoctorLazy(() =>
  zodStrictObject({
    file_path: string(),
    content: string(),
  }),
);
var toolUseInputSchema = DoctorLazy(() => record(string(), unknown()));
var CARRIED_WRITE_TOOL_NAMES = new Map([
  [FILE_WRITE_TOOL_NAME, "file_path"],
  [FILE_EDIT_TOOL_NAME, "file_path"],
  [NOTEBOOK_EDIT_TOOL_NAME, "notebook_path"],
]);
//@ chunk-z4g2ta8k.js:13422-13500 placement
/**
 * 在工具表里找非 MCP 的 Write 工具（携带写的落盘目标）。
 */
function findFileWriteTool(e, toolAliases) {
  let toolByName = findToolByName(e, FILE_WRITE_TOOL_NAME, toolAliases);
  return toolByName?.name === FILE_WRITE_TOOL_NAME && toolByName.isMcp !== true ? toolByName : undefined;
}
//@ chunk-z4g2ta8k.js:13500-15125 placement
function collectCarriedWrites(e, carriedWrites, fileWriteTool) {
  let s = new Map();
  let h = new Set();
  for (let O of e) {
    if (O.type !== "user" || !Array.isArray(O.message.content)) continue;
    for (let A of O.message.content) {
      if (A.type !== "tool_result") continue;
      let x = s.has(A.tool_use_id);
      s.set(A.tool_use_id, x ? undefined : getSoleTextContent(A.content));
      if (x) h.delete(A.tool_use_id);
      else if (A.is_error === true) h.add(A.tool_use_id);
    }
  }
  let y = new Map();
  let S = new Set();
  let k = false;
  for (let O of e) {
    if (O.type !== "assistant" || !Array.isArray(O.message.content)) continue;
    for (let A of O.message.content) {
      let x = A.type === "tool_use" ? CARRIED_WRITE_TOOL_NAMES.get(A.name) : undefined;
      if (A.type !== "tool_use" || x === undefined || !s.has(A.id) || h.has(A.id)) continue;
      let U = toolUseInputSchema().safeParse(A.input).data?.[x];
      if (typeof U !== "string") {
        if (A.name === FILE_WRITE_TOOL_NAME) return "odd_input";
        k = true;
        continue;
      }
      let M = homeRelativePath(U, carriedWrites);
      if (M === undefined) continue;
      if (A.name !== FILE_WRITE_TOOL_NAME) {
        S.add(M);
        continue;
      }
      let T = handoffMessageSchema().safeParse(A.input);
      if (!T.success) return "odd_input";
      if (fileWriteTool === undefined) return "no_write_tool";
      let { file_path: filePath, content } = T.data;
      let G = s.get(A.id);
      if (
        G === undefined ||
        !["create", "update"].some(
          (type) =>
            fileWriteTool.mapToolResultToToolResultBlockParam(
              {
                type,
                filePath,
              },
              A.id,
            ).content === G,
        )
      )
        return "result_text";
      y.set(M, {
        relativePath: M,
        filePath,
        content,
        toolUseID: A.id,
        assistantMessage: O,
      });
    }
  }
  if (y.size === 0) return;
  if (k) return "edited";
  if (y.size > CARRIED_WRITE_REFUSALS) return "too_many";
  let P = 0;
  for (let { relativePath, filePath, content } of y.values()) {
    if (S.has(relativePath)) return "edited";
    if (
      homePathProblem(relativePath) !== undefined ||
      !isWellFormedString(filePath) ||
      Buffer.byteLength(relativePath) > MAX_CARRIED_WRITE_PATH_BYTES ||
      relativePath.split(posix.sep).some((U) => U === "" || Buffer.byteLength(U) > MAX_HOME_FILE_NAME_LENGTH)
    )
      return "refused_name";
    for (let dir = posix.dirname(relativePath); dir !== "."; dir = posix.dirname(dir))
      if (y.has(dir)) return "nested";
    P += Buffer.byteLength(content);
  }
  if (P > MAX_CARRIED_WRITE_BYTES) return "too_large";
  return carriedWrites.cwd === carriedWrites.home ? [...y.values()] : "not_home";
}
//@ chunk-z4g2ta8k.js:15125-15200 placement
/**
 * 根据权限模式判断携带写被拒的原因：auto 模式为 auto_mode，会询问时为 would_ask。
 */
function carriedWritePermissionRefusal(e) {
  if (!isAutoClassifierActive(e)) return;
  return e === "auto" ? "auto_mode" : "would_ask";
}
//@ chunk-z4g2ta8k.js:15200-15302 placement
function homeRelativePath(e, { cwd, home }) {
  let s = expandPathOrNull(e, cwd);
  return s?.startsWith(home + posix.sep) ? s.slice(home.length + 1) : undefined;
}
//@ chunk-z4g2ta8k.js:15302-15499 placement = extractErrorTypeFromData (1)
function getSoleTextContent(data) {
  if (typeof data === "string") return data;
  let n = data?.length === 1 ? data[0] : undefined;
  return typeof n === "object" &&
    n !== null &&
    "type" in n &&
    n.type === "text" &&
    "text" in n &&
    typeof n.text === "string"
    ? n.text
    : undefined;
}
//@ chunk-z4g2ta8k.js:15499-15540 placement
function callSafely(onBegan) {
  try {
    onBegan();
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-z4g2ta8k.js:15540-16947 placement
function waitForTurnPromptUploads({ listTurnPromptsWaitedOn, write, now = () => performance.now() }) {
  let s = null;
  let h = {
    kind: "none",
  };
  let y = new Set();
  function S(P, isRunnerTold) {
    h = {
      kind: "uploading",
      isFor: "this_wait",
      isRunnerTold,
    };
    y = new Set(listTurnPromptsWaitedOn());
    let A = now();
    callSafely(P.onBegan);
    (async () => P.upload())()
      .catch((error) => {
        logError(toError(error));
        return "rejected";
      })
      .then((outcome) => k(P, outcome, now() - A));
  }
  function k(P, outcome, ms) {
    let { isFor, isRunnerTold } =
      h.kind === "uploading"
        ? h
        : {
            isFor: "nobody",
            isRunnerTold: false,
          };
    if (isFor === "a_later_wait") {
      callSafely(() =>
        P.onAnswered({
          outcome,
          ms,
          ledTo: "uploads_again",
        }),
      );
      S(P, isRunnerTold);
      return;
    }
    h = {
      kind: isFor === "this_wait" ? "told" : "none",
    };
    callSafely(() =>
      P.onAnswered({
        outcome,
        ms,
        ledTo:
          isFor === "nobody"
            ? "user_answered_first"
            : isRunnerTold
              ? "runner_told_ahead_of_result"
              : "runner_told",
      }),
    );
    if (isFor === "this_wait" && !isRunnerTold) write();
  }
  return {
    stateChanged() {
      let P = s === null ? [] : listTurnPromptsWaitedOn();
      let O = h.kind === "none" || (h.kind === "uploading" && h.isFor === "nobody");
      let A = P.some((x) => !y.has(x)) || (P.length > 0 && O && P.length < y.size);
      if (h.kind === "uploading") {
        if (P.length === 0) {
          if (h.isFor === "a_later_wait") y = new Set();
          h = {
            kind: "uploading",
            isFor: "nobody",
            isRunnerTold: false,
          };
          write();
          return;
        }
        if (A)
          h = {
            ...h,
            isFor: "a_later_wait",
          };
        else if (h.isFor === "nobody")
          h = {
            ...h,
            isFor: "this_wait",
          };
        if (h.isRunnerTold) write();
        return;
      }
      if (s === null || !A) {
        h = {
          kind: P.length > 0 ? "told" : "none",
        };
        write();
        return;
      }
      S(s, false);
    },
    resultGoesNext() {
      if (h.kind === "uploading" && h.isFor !== "nobody" && !h.isRunnerTold) {
        h = {
          ...h,
          isRunnerTold: true,
        };
        write();
      }
    },
    setUploadAhead(P) {
      s = P;
      if (P === null && h.kind === "uploading")
        h = {
          kind: "uploading",
          isFor: "nobody",
          isRunnerTold: false,
        };
    },
  };
}
//@ chunk-z4g2ta8k.js:16984-17071 placement
var CARRIED_TOOL_NAMES = [
  BASH_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
  FILE_READ_TOOL_NAME,
  GLOB_TOOL_NAME,
  GREP_TOOL_NAME,
  AGENT,
  NOTEBOOK_EDIT_TOOL_NAME,
  WEBFETCH,
  WEBSEARCH,
  TASKSTOP,
  SEARCH_MCP_REGISTRY_TOOL_NAME,
  SUGGEST_CONNECTORS_TOOL_NAME,
  LIST_CONNECTORS_TOOL_NAME,
  SKILL,
  ARTIFACT_TOOL_NAME,
  ...[...TRIGGER_TOOL_NAMES, ...REPO_TOOL_NAMES].map(remoteMcpToolName),
];
//@ chunk-z4g2ta8k.js:17071-17307 placement
/**
 * 判断回合交接是否可用：仅限托管云 worker（有 SDK 地址与远程会话 id、非自定义环境）且未被禁用。
 */
function turnHandoffAdmission(e) {
  if (!e.sdkUrl || !e.remoteSessionId || e.environmentKind !== undefined)
    return {
      admitted: false,
      reason: "not_managed_cloud_worker",
    };
  if (e.disabled)
    return {
      admitted: false,
      reason: "disabled",
    };
  return {
    admitted: true,
    tools: CARRIED_TOOL_NAMES,
    hydratesCarriedLines: false,
  };
}
//@ chunk-z4g2ta8k.js:17307-17410 placement
/**
 * 判断是否携带在途写入：交接已准入、配置了中继、持久化转录且不是共享后端。
 */
function shouldCarryWrites(e) {
  return e.admission.admitted && e.relayConfigured && e.persistsTranscript && !e.sharedBackend;
}
//@ chunk-z4g2ta8k.js:17410-17785 placement
/**
 * 生成 worker 注册时声明的 turn_handoff 能力（工具、epoch、暂存文件、relay 标记、home 文件与携带写入等）；未准入且原因是 disabled 时显式发 null。
 */
function turnHandoffRegistration(e, workerEpoch, r, s, h) {
  if (e.admitted)
    return {
      turn_handoff: {
        v: 1,
        tools: e.tools,
        worker_epoch: workerEpoch,
        staged_files: true,
        no_query_first: true,
        shared_message_id: true,
        requires_rewind_request_id: true,
        ...(r && {
          relay_marker: true,
        }),
        ...(s && {
          home_files: true,
          file_names: true,
          ...(h && {
            carried_writes: true,
          }),
        }),
        ...(e.hydratesCarriedLines && {
          hydrates_carried_lines: true,
        }),
      },
    };
  return e.reason === "disabled"
    ? {
        turn_handoff: null,
      }
    : undefined;
}
//@ chunk-z4g2ta8k.js:17785-18332 placement
/**
 * 把外部元数据里的 turn_handoff 能力转成 system/turn_handoff_available 消息（带 uuid 与 session_id），只复制已声明为真的可选能力。
 */
function turnHandoffAvailableMessage(metadata, sessionId) {
  let handoff = metadata?.turn_handoff;
  if (!handoff) return;
  return {
    type: "system",
    subtype: "turn_handoff_available",
    v: handoff.v,
    tools: [...handoff.tools],
    worker_epoch: handoff.worker_epoch,
    staged_files: handoff.staged_files,
    no_query_first: handoff.no_query_first,
    shared_message_id: handoff.shared_message_id,
    uuid: randomUUID(),
    session_id: sessionId,
    ...(handoff.requires_rewind_request_id && {
      requires_rewind_request_id: true,
    }),
    ...(handoff.relay_marker && {
      relay_marker: true,
    }),
    ...(handoff.home_files && {
      home_files: true,
    }),
    ...(handoff.file_names && {
      file_names: true,
    }),
    ...(handoff.carried_writes && {
      carried_writes: true,
    }),
    ...(handoff.hydrates_carried_lines && {
      hydrates_carried_lines: true,
    }),
  };
}
//@ chunk-z4g2ta8k.js:18332-18463 placement
var RECOVERED_BY_RESTART_NOTE =
  "recovered_by_restart: this worker restarted after the turn was appended and its recovery set the turn's unrun calls aside";
//@ chunk-z4g2ta8k.js:18463-18528 placement
/**
 * 构造回合交接应答 {requestId, tipUuid}。
 */
function buildTurnHandoffReply(requestId, n) {
  return {
    requestId,
    tipUuid: lastConversationMessage(n)?.uuid ?? null,
  };
}
//@ chunk-z4g2ta8k.js:18528-18571 placement
/**
 * 回合交接/rewind 的限制常量：rewind 请求最大年龄 30 分钟、内容 4096 字节、消息 200 条、工具调用与结果各 16 个。
 */
var REWIND_REQUEST_MAX_AGE_MS = 1800000;
var MAX_CONTENT_BYTES = 4096;
var MAX_HANDOFF_MESSAGES = 200;
var MAX_HANDOFF_TOOL_USE_IDS = 16;
var MAX_HANDOFF_TOOL_RESULT_IDS = 16;
//@ chunk-z4g2ta8k.js:18571-18691 placement
/**
 * 计算 rewind 请求的年龄：以服务端时间（或本机与最新帧时间的较大者）减去存储时间。
 */
function rewindRequestAge({ storedAt, serviceNow, newestFrameAt, machineNow }) {
  if (storedAt === undefined) return;
  return (serviceNow ?? Math.max(machineNow, newestFrameAt ?? machineNow)) - storedAt;
}
//@ chunk-z4g2ta8k.js:18691-18792 placement
/**
 * 把服务端时钟下的存储时间换算到本机时钟。
 */
function serviceClockStoredAt({ storedAt, serviceNow, machineNow }) {
  if (storedAt === undefined || serviceNow === undefined) return;
  return machineNow - (serviceNow - storedAt);
}
//@ chunk-z4g2ta8k.js:18792-31502 placement
/**
 * 云 worker 接手回合（turn_handoff）：校验交接载荷（消息、tool_use_ids、记忆上下文、required rewind），把消息追加到本地转录并恢复在途写入，非法时返回 invalid_handoff。
 */
function applyTurnHandoff(e, n) {
  let {
    relay_marker: relayMarker,
    memory_context: memoryContext,
    message_client_platform: messageClientPlatform,
    file_names: fileNames,
    ...S
  } = e;
  for (let [w, I] of [
    ["messages", MAX_HANDOFF_MESSAGES],
    ["tool_use_ids", MAX_HANDOFF_TOOL_USE_IDS],
  ]) {
    let H = arrayTooBigMessage(e[w], I);
    if (H !== undefined)
      return {
        kind: "error",
        error: `invalid_handoff: ${w} ${H}`,
      };
  }
  let messages = e.messages;
  let P = Array.isArray(messages) ? messages : [];
  for (let [w, I] of P.entries()) {
    let message = typeof I === "object" && I !== null && "message" in I ? I.message : undefined;
    let se = arrayTooBigMessage(
      typeof message === "object" && message !== null && "content" in message ? message.content : undefined,
      MAX_CONTENT_BYTES,
    );
    if (se !== undefined)
      return {
        kind: "error",
        error: `invalid_handoff: messages.${w}.message.content ${se}`,
      };
  }
  let O =
    typeof messageClientPlatform === "string" && isDefinedHumanClientPlatform(messageClientPlatform)
      ? messageClientPlatform
      : undefined;
  let element = SDKTurnHandoffTurnHandoffMessageSchema().shape.messages.element;
  for (let [w, I] of P.entries()) {
    let H = typeof I === "object" && I !== null && "type" in I ? I.type : undefined;
    if (element.options.find((option) => option.shape.type.value === H)?.safeParse(I).success !== true)
      return {
        kind: "error",
        error: `invalid_handoff: messages.${w} Invalid input`,
      };
  }
  let x = (
    P.length > 0 ? handoffWithoutMessagesSchema() : SDKTurnHandoffTurnHandoffMessageSchema()
  ).safeParse(S);
  if (!x.success)
    return {
      kind: "error",
      error: `invalid_handoff: ${issuePathString(x.error.issues[0]?.path)} ${x.error.issues[0]?.message ?? "unparseable"}`,
    };
  let { messages: messages_2, tool_use_ids: toolUseIds } = e;
  if (new Set(toolUseIds).size !== toolUseIds.length)
    return {
      kind: "error",
      error: "invalid_handoff: tool_use_ids repeat",
    };
  if (new Set(messages_2.map((message) => message.uuid)).size !== messages_2.length)
    return {
      kind: "error",
      error: "invalid_handoff: message uuids repeat",
    };
  for (let [w, I] of messages_2.entries()) {
    if (typeof I.uuid !== "string")
      return {
        kind: "error",
        error: "invalid_handoff: every message needs a uuid",
      };
    if (
      (I.type === "user" && (I.isSynthetic === true || I.is_virtual)) ||
      (I.type === "assistant" && (I.is_meta === true || I.is_virtual))
    )
      return {
        kind: "error",
        error: `invalid_handoff: messages.${w} is not a plain conversation line`,
      };
  }
  let message = toInternalMessages(
    messages_2.map((message) =>
      message.type === "user"
        ? {
            type: "user",
            uuid: message.uuid,
            session_id: message.session_id,
            parent_tool_use_id: null,
            message: message.message,
            timestamp: message.timestamp,
            tool_result_meta: message.tool_result_meta,
          }
        : {
            type: "assistant",
            uuid: message.uuid,
            session_id: message.session_id,
            parent_tool_use_id: null,
            message: message.message,
          },
    ),
  ).map((w, I) => {
    if (w.type !== "assistant" && w.type !== "user") return w;
    let H = messages_2[I];
    let imageFileUuids = "image_file_uuids" in H ? H.image_file_uuids : undefined;
    return {
      ...w,
      handedOff: true,
      ...(w.type === "user" &&
        Array.isArray(imageFileUuids) &&
        imageFileUuids.length > 0 &&
        imageFileUuids.length <= countImageParts(w.message.content) &&
        imageFileUuids.every((imageFileUuid) => typeof imageFileUuid === "string") && {
          imageFileUuids,
        }),
      ...(I === 0 &&
        w.type === "user" &&
        O !== undefined &&
        !hasTeammateMessageEnvelope(w.message.content) && {
          origin: {
            kind: "human",
          },
        }),
    };
  });
  let last = message.at(-1);
  let z = message[0];
  let G =
    O !== undefined && z?.type === "user" && !hasTeammateMessageEnvelope(z.message.content) ? O : undefined;
  if (message.length !== messages_2.length || last?.type !== "assistant")
    return {
      kind: "error",
      error: "invalid_handoff: the last message is not an assistant message",
    };
  for (let w of message)
    if (
      w.type === "user" &&
      Array.isArray(w.message.content) &&
      w.message.content.some((I) => I.type === "tool_use")
    )
      return {
        kind: "error",
        error: `invalid_handoff: user message ${sanitizeTelemetryString(w.uuid)} holds a tool_use block`,
      };
  let L = new Map();
  if (Array.isArray(last.message.content))
    for (let w of last.message.content) {
      if (w.type !== "tool_use") continue;
      if (L.has(w.id))
        return {
          kind: "error",
          error: `invalid_handoff: tool_use ${sanitizeTelemetryString(w.id)} repeats`,
        };
      L.set(w.id, w);
    }
  let j;
  if (toolUseIds.length > 0) {
    if (e.stopped)
      return {
        kind: "error",
        error: "invalid_handoff: a stopped turn names no calls to run",
      };
    j = "run";
  } else if (e.stopped) {
    if (L.size === 0)
      return {
        kind: "error",
        error: "invalid_handoff: a stopped turn ends with calls that have not run",
      };
    j = "stopped";
  } else j = "history";
  let ae = new Set();
  let de = new Set();
  for (let message of n.messages) {
    if ((message.type !== "user" && message.type !== "assistant") || !Array.isArray(message.message.content))
      continue;
    for (let I of message.message.content)
      if (message.type === "assistant" && I.type === "tool_use") ae.add(I.id);
      else if (message.type === "user" && I.type === "tool_result") de.add(I.tool_use_id);
  }
  let ne = (toolUseId) => n.handledToolUseIds.has(toolUseId) || de.has(toolUseId);
  let filtered = (n.mcpClients ?? []).filter(isClaudeCodeRemoteServer);
  for (let toolUseId of toolUseIds) {
    let I = L.get(toolUseId);
    if (I === undefined)
      return {
        kind: "error",
        error: `invalid_handoff: tool_use ${sanitizeTelemetryString(toolUseId)} is not in the last message`,
      };
    if (!n.acceptedTools.includes(I.name))
      return {
        kind: "error",
        error: `unsupported_tool: ${sanitizeTelemetryString(I.name)}`,
      };
    if (ne(toolUseId)) continue;
    let H = findToolByName(n.tools, I.name, n.toolAliases) !== undefined;
    let se = isPendingMcpToolName(I.name, filtered);
    if (mcpInfoFromString(I.name) === null ? !H : filtered.length === 0 || (!H && !se))
      return {
        kind: "error",
        error: `unknown_tool: ${sanitizeTelemetryString(I.name)}`,
      };
  }
  let ue = new Set(n.messages.map((message) => message.uuid));
  let Z = 0;
  let be = false;
  if (j === "run") {
    if (
      toolUseIds.every((toolUseId) => n.recoveredToolUseIds.has(toolUseId)) &&
      !toolUseIds.every((toolUseId) => de.has(toolUseId))
    )
      return {
        kind: "error",
        error: RECOVERED_BY_RESTART_NOTE,
      };
    let w = count(toolUseIds, ne);
    if (w === toolUseIds.length)
      return {
        kind: "duplicate",
      };
    if (w > 0)
      return {
        kind: "error",
        error: "invalid_handoff: some of the named calls are already taken or answered",
      };
    let I = message[0];
    if (I?.type !== "user" || isToolResultMessage(I) || !isNotEmptyMessage(I))
      return {
        kind: "error",
        error:
          "invalid_handoff: a request that names calls to run must start with the user's message, not empty and not a tool result",
      };
    if (n.requestAgeMs !== undefined && n.requestAgeMs > REWIND_REQUEST_MAX_AGE_MS)
      return {
        kind: "error",
        error: `expired: the session service has held this request for over ${REWIND_REQUEST_MAX_AGE_MS / 60000} minutes; its calls were not run`,
        expiredAtAgeMs: n.requestAgeMs,
      };
    if (n.pendingHandoff)
      return {
        kind: "error",
        error: "invalid_handoff: another handed-off turn is still queued",
      };
    if (n.runningHandoff)
      return {
        kind: "error",
        error: "invalid_handoff: another handed-off turn is still running",
      };
    if (message.some((H) => ue.has(H.uuid)))
      return {
        kind: "error",
        error: "invalid_handoff: the turn carries messages the conversation already holds",
      };
  } else {
    let lastToolUseAssistantMessage = findLastToolUseAssistantMessage(message);
    let I = (ee) => findLastToolUseAssistantMessage(ee.messages)?.uuid === lastToolUseAssistantMessage.uuid;
    if (n.runningHandoff && I(n.runningHandoff))
      return {
        kind: "duplicate",
        ...(j === "stopped" &&
          n.runningHandoff.kind === "run" && {
            stopRunning: true,
          }),
      };
    if (n.pendingHandoff && I(n.pendingHandoff)) {
      if (n.pendingHandoff.kind === j || n.pendingHandoff.kind === "stopped")
        return {
          kind: "duplicate",
        };
      let messages = n.pendingHandoff.messages;
      let ie =
        messages.findIndex((message) => message.uuid === lastToolUseAssistantMessage.uuid) + 1 ||
        messages.length;
      if (
        message.length < ie ||
        messages
          .slice(0, ie)
          .some(
            (message_2, nt) =>
              message[nt].uuid !== message_2.uuid ||
              message[nt].type !== message_2.type ||
              !arraysEqual(getToolUseAndResultIds(message[nt]), getToolUseAndResultIds(message_2)),
          )
      )
        return {
          kind: "error",
          error: "invalid_handoff: the turn does not carry the lines of its pending delivery",
        };
      be = true;
    }
    let H = new Map(n.messages.map((message) => [message.uuid, message]));
    while (Z < message.length && H.has(message[Z].uuid)) {
      let ee = message[Z];
      let ie = H.get(ee.uuid);
      if (ie.type !== ee.type || !arraysEqual(getToolUseAndResultIds(ie), getToolUseAndResultIds(ee)))
        return {
          kind: "error",
          error: "invalid_handoff: the turn carries messages the conversation already holds",
        };
      Z++;
    }
    if (message.some((ee, ie) => ie > Z && ue.has(ee.uuid)))
      return {
        kind: "error",
        error: "invalid_handoff: the turn carries messages the conversation already holds out of order",
      };
    let se = new Set();
    for (let message_2 of n.messages)
      if (
        message_2.type === "user" &&
        Array.isArray(message_2.message.content) &&
        !message.some((ie, Pe) => Pe < Z && ie.uuid === message_2.uuid)
      ) {
        for (let ie of message_2.message.content) if (ie.type === "tool_result") se.add(ie.tool_use_id);
      }
    let toolUseAndResultIds = getToolUseAndResultIds(lastToolUseAssistantMessage);
    let Tt = count(toolUseAndResultIds, (ee) => se.has(ee));
    if (toolUseAndResultIds.length > 0 && Tt === toolUseAndResultIds.length)
      return {
        kind: "duplicate",
      };
    if (Tt > 0)
      return {
        kind: "error",
        error: "invalid_handoff: some of the calls are already answered",
      };
    if (
      Z < message.length &&
      toolUseAndResultIds.length > 0 &&
      toolUseAndResultIds.every((toolUseAndResultId) => n.recoveredToolUseIds.has(toolUseAndResultId))
    )
      return {
        kind: "error",
        error: RECOVERED_BY_RESTART_NOTE,
      };
    for (let ee of message.slice(0, Z)) {
      let ie = H.get(ee.uuid);
      if ((ie.type !== "assistant" && ie.type !== "user") || ie.handedOff !== true)
        return {
          kind: "error",
          error: "invalid_handoff: the turn carries messages the conversation already holds",
        };
    }
    if (
      Z > 0 &&
      !(j === "history" && Z === message.length) &&
      lastConversationMessage(n.messages)?.uuid !== message[Z - 1].uuid
    )
      return {
        kind: "error",
        error: "invalid_handoff: the conversation has moved on past the part of the turn it holds",
      };
    if (n.pendingHandoff && !be)
      return {
        kind: "error",
        error: "invalid_handoff: another handed-off turn is still queued",
      };
    if (n.runningHandoff)
      return {
        kind: "error",
        error: "invalid_handoff: another handed-off turn is still running",
      };
  }
  let requiresRewindRequestId = e.requires_rewind_request_id;
  if (requiresRewindRequestId !== undefined && Z === 0 && !be) {
    let w = sanitizeTelemetryString(requiresRewindRequestId);
    let appliedRewind = n.appliedRewind;
    if (appliedRewind === undefined)
      return requiredRewindError(
        "unknown",
        `this worker has carried out no rewind_conversation: request ${w} was answered by an earlier worker, refused, or not read yet`,
      );
    if (appliedRewind.requestId !== requiresRewindRequestId)
      return requiredRewindError(
        "other",
        `the last rewind this worker carried out is not rewind_conversation request ${w}: that one was refused, not read yet, or followed by another rewind`,
      );
    if ((lastConversationMessage(n.messages)?.uuid ?? null) !== appliedRewind.tipUuid)
      return requiredRewindError(
        "moved_on",
        `the conversation has moved on since rewind_conversation request ${w} cut it`,
      );
    if (n.linesWaitingAhead === true)
      return requiredRewindError(
        "lines_waiting",
        `other messages or a turn in progress wait to be added before this turn since rewind_conversation request ${w} cut it`,
      );
  }
  if (j === "stopped" && L.size > MAX_HANDOFF_TOOL_USE_IDS)
    return {
      kind: "error",
      error: `invalid_handoff: a stopped turn ends with more than ${MAX_HANDOFF_TOOL_USE_IDS} calls`,
    };
  let sliced = message.slice(Z);
  let Ae = n.refusalOfAppended?.(sliced);
  if (Ae !== undefined)
    return {
      kind: "error",
      error: `invalid_handoff: ${Ae}`,
    };
  let Be = new Set(be ? n.pendingHandoff.messages.flatMap(getToolUseAndResultIds) : []);
  let _e = new Set();
  for (let message of n.messages)
    if (message.type === "assistant" && typeof message.message.id === "string") _e.add(message.message.id);
  let Me = new Set();
  let Te;
  let Se = [];
  let he = false;
  for (let w of Z > 0 ? n.messages : [])
    if (w.type === "assistant") {
      Te = w.handedOff === true ? w.message.id : undefined;
      Se = getToolUseAndResultIds(w);
      he = false;
    } else if (w.type === "user") {
      he = isToolResultsOnlyForIds(w, Se);
      if (!he) {
        Te = undefined;
        Se = [];
      }
    }
  for (let w of sliced) {
    if (w.type !== "assistant") {
      he = isToolResultsOnlyForIds(w, Se);
      if (!he) {
        Te = undefined;
        Se = [];
      }
      continue;
    }
    let I =
      he &&
      w.message.id === Te &&
      Array.isArray(w.message.content) &&
      w.message.content.length > 0 &&
      w.message.content.every((H) => H.type === "tool_use");
    Te = w.message.id;
    Se = getToolUseAndResultIds(w);
    he = false;
    if (I) {
      Me.add(w.message.id);
      continue;
    }
    if (Me.has(w.message.id))
      return {
        kind: "error",
        error: `invalid_handoff: message_id_repeats: assistant message id ${sanitizeTelemetryString(w.message.id)} repeats (allowed only in the next assistant message, of tool calls alone, with only results of the previous assistant message's calls between)`,
      };
    if (_e.has(w.message.id))
      return {
        kind: "error",
        error: `invalid_handoff: assistant message id ${sanitizeTelemetryString(w.message.id)} is already in the conversation`,
      };
    Me.add(w.message.id);
  }
  let R = new Set();
  let W = new Set();
  for (let [w, I] of message.entries()) {
    if ((I.type !== "user" && I.type !== "assistant") || !Array.isArray(I.message.content)) continue;
    for (let H of I.message.content)
      if (I.type === "assistant" && H.type === "tool_use") {
        if (w >= Z && (ae.has(H.id) || (n.handledToolUseIds.has(H.id) && !Be.has(H.id))))
          return {
            kind: "error",
            error: `invalid_handoff: tool_use ${sanitizeTelemetryString(H.id)} is already in the conversation or taken`,
          };
        if (R.has(H.id))
          return {
            kind: "error",
            error: `invalid_handoff: tool_use ${sanitizeTelemetryString(H.id)} repeats`,
          };
        R.add(H.id);
        if (!(I === last && (j === "stopped" || toolUseIds.includes(H.id)))) W.add(H.id);
      } else if (I.type === "user" && H.type === "tool_result") {
        if (!R.has(H.tool_use_id))
          return {
            kind: "error",
            error: `invalid_handoff: tool_result ${sanitizeTelemetryString(H.tool_use_id)} answers no earlier tool_use in the turn`,
          };
        if (w >= Z && de.has(H.tool_use_id))
          return {
            kind: "error",
            error: `invalid_handoff: tool_result ${sanitizeTelemetryString(H.tool_use_id)} answers a call the conversation already answers`,
          };
        W.delete(H.tool_use_id);
      }
  }
  for (let w of W)
    return {
      kind: "error",
      error: L.has(w)
        ? `invalid_handoff: tool_use ${sanitizeTelemetryString(w)} in the last message is not named`
        : `invalid_handoff: tool_use ${sanitizeTelemetryString(w)} has no result`,
    };
  let Y;
  if ((j === "run" || j === "history") && relayMarker !== undefined && relayMarker !== null) {
    let w = SDKTurnHandoffTurnHandoffMessageSchema().shape.relay_marker.unwrap().safeParse(relayMarker);
    Y = w.success
      ? {
          uuid: w.data.uuid,
          content: w.data.content,
        }
      : "malformed";
  }
  let we;
  if (
    (j === "run" || (j === "history" && !message.some((w) => ue.has(w.uuid)))) &&
    memoryContext !== undefined &&
    memoryContext !== null
  ) {
    let w = SDKTurnHandoffTurnHandoffMessageSchema().shape.memory_context.unwrap().safeParse(memoryContext);
    if (!w.success)
      logForDebugging(
        `turn_handoff: ${["memory_context", ...(w.error.issues[0]?.path ?? [])].map(String).join(".")}: ${w.error.issues[0]?.message ?? "unparseable"}; the turn goes on without it`,
        {
          level: "warn",
        },
      );
    else if ((w.data.version === null) !== (w.data.content === null))
      logForDebugging(
        `turn_handoff: memory_context has ${w.data.version === null ? "content but no version" : "a version but no content"}; the turn goes on without it`,
        {
          level: "warn",
        },
      );
    else if (
      ue.has(w.data.uuid) ||
      message.some((I) => I.uuid === w.data.uuid) ||
      w.data.uuid === relayMarker?.uuid
    )
      logForDebugging(
        "turn_handoff: memory_context.uuid is already used in the request or the conversation; the turn goes on without it",
        {
          level: "warn",
        },
      );
    else {
      let { uuid, version, content } = w.data;
      we = createAttachmentMessage(
        {
          type: "cowork_memory_context",
          version,
          content,
        },
        {
          now: () => new Date().toISOString(),
          uuid: () => uuid,
        },
      );
    }
  }
  let ce;
  if (j === "run" && fileNames !== undefined && fileNames !== null) {
    let w = SDKTurnHandoffTurnHandoffMessageSchema().shape.file_names.unwrap();
    let I =
      arrayTooBigMessage(fileNames, MAX_HANDOFF_TOOL_RESULT_IDS) === undefined
        ? w.safeParse(fileNames)
        : undefined;
    if (I?.success !== true) ce = "malformed";
    else if (I.data.length > 0)
      ce = I.data.map((H) => ({
        fileUuid: H.file_uuid,
        name: H.name,
      }));
  }
  let fe;
  if (j === "run" && n.carriedWrites) {
    let carriedWrites = collectCarriedWrites(
      message,
      n.carriedWrites,
      findFileWriteTool(n.tools, n.toolAliases),
    );
    let I =
      typeof carriedWrites === "string"
        ? carriedWrites
        : carriedWrites &&
          (n.carriedWrites.switchedOn
            ? carriedWritePermissionRefusal(n.carriedWrites.permissionMode)
            : "switched_off");
    if (I !== undefined)
      return {
        kind: "error",
        error: `invalid_handoff: carried_writes_${I}: ${CARRIED_WRITE_REFUSAL_TEXT[I]}`,
        carriedWrites: I,
      };
    fe = typeof carriedWrites === "string" ? undefined : carriedWrites;
  }
  let taken = [...R].filter((w) => !ae.has(w) && (!n.handledToolUseIds.has(w) || Be.has(w)));
  for (let w of R) n.handledToolUseIds.add(w);
  let handedOffTurn = {
    kind: j,
    messages:
      j === "run"
        ? message.map((w, I) =>
            w.type === "assistant" && I === message.length - 1
              ? {
                  ...w,
                  handedOffLive: toToolUseIdSet(toolUseIds),
                }
              : w,
          )
        : message,
    toolUseIDs: toolUseIds,
    ...(Y !== undefined && {
      relayMarker: Y,
    }),
    ...(we && {
      memoryLine: we,
    }),
    ...(ce !== undefined && {
      fileNames: ce,
    }),
    ...(fe !== undefined && {
      carriedWrites: fe,
    }),
    ...(Z > 0 && {
      continues: true,
    }),
  };
  if (be)
    return {
      kind: "converted",
      handedOffTurn,
      taken,
    };
  return {
    kind: "accepted",
    handedOffTurn,
    taken,
    ...(G !== undefined && {
      clientPlatform: G,
    }),
  };
}
//@ chunk-z4g2ta8k.js:31502-31631 placement
function requiredRewindError(e, n) {
  return {
    kind: "error",
    error: `invalid_handoff: required_rewind_${e}: ${n}; nothing was appended`,
    requiredRewind: e,
  };
}
//@ chunk-z4g2ta8k.js:31631-31662 placement
function remoteMcpToolName(e) {
  return buildMcpToolName(CLAUDE_CODE_REMOTE, e);
}
//@ chunk-z4g2ta8k.js:31662-31861 placement = countToolCallsSince (1)
function getToolUseAndResultIds(e) {
  return (e.type === "user" || e.type === "assistant") && Array.isArray(e.message.content)
    ? e.message.content.flatMap((block) =>
        block.type === "tool_use" ? [block.id] : block.type === "tool_result" ? [block.tool_use_id] : [],
      )
    : [];
}
//@ chunk-z4g2ta8k.js:31861-31949 placement
function isToolResultsOnlyForIds(e, n) {
  return isToolResultOnlyUserMessage(e) && e.message.content.every((r) => n.includes(r.tool_use_id));
}
//@ chunk-z4g2ta8k.js:31949-32019 placement
function arraysEqual(toolUseAndResultIds, toolUseAndResultIds_2) {
  return (
    toolUseAndResultIds.length === toolUseAndResultIds_2.length &&
    toolUseAndResultIds.every((r, s) => r === toolUseAndResultIds_2[s])
  );
}
//@ chunk-z4g2ta8k.js:32019-32059 placement
var handoffWithoutMessagesSchema = DoctorLazy(() =>
  SDKTurnHandoffTurnHandoffMessageSchema().omit({
    messages: true,
  }),
);
//@ chunk-z4g2ta8k.js:32059-32166 placement
function arrayTooBigMessage(e, n) {
  return Array.isArray(e) && e.length > n ? `Too big: expected array to have <=${n} items` : undefined;
}
//@ chunk-z4g2ta8k.js:32166-32245 placement
function issuePathString(path) {
  return path !== undefined && path.length > 0 ? path.map(String).join(".") : "request";
}
//@ chunk-z4g2ta8k.js:32245-32283 placement
var VERIFIED_BY_GATE = "VERIFIED_BY_GATE";
var REFUSE = "refuse";
//@ chunk-z4g2ta8k.js:32283-32509 placement
/**
 * 按设备证明状态与等级下限判 pass/drop；状态缺省（UNSPECIFIED）时由 unstamped 选项决定是否放行。
 */
function judgeDeviceAttestationLevel(e, { floor: n = VERIFIED_BY_GATE, unstamped: r = REFUSE } = {}) {
  let s = normalizeAttestationStatus(e.device_attestation_status);
  if (meetsAttestationLevel(s, n))
    return {
      verdict: "pass",
      status: s,
    };
  if (s === "UNSPECIFIED" && r === "pass")
    return {
      verdict: "pass",
      status: s,
    };
  return {
    verdict: "drop",
    status: s,
  };
}
//@ chunk-z4g2ta8k.js:32509-32596 placement
function dropServiceVouchedAttestation(e) {
  let n = judgeDeviceAttestationLevel(e);
  return n.status === "SERVICE_VOUCHED"
    ? {
        ...n,
        verdict: "drop",
      }
    : n;
}
//@ chunk-z4g2ta8k.js:32596-32714 placement
var ATTESTED_REQUEST_SUBTYPES = new Set([
  "remote_tools_announce",
  "register_device_hooks",
  "upload_device_hook_template",
  "apply_flag_settings",
]);
//@ chunk-z4g2ta8k.js:32714-33069 placement
/**
 * 识别需要设备证明的 control_request 子类型：界面类返回 ui_surface，apply_flag_settings 只在带云插件转发键时算，其他非白名单子类型返回 undefined。
 */
function attestedRequestSubtype(payload) {
  let request = payload.type === "control_request" ? payload.request : undefined;
  if (typeof request !== "object" || request === null) return;
  let subtype = request.subtype;
  if (isUiSurfaceName(subtype)) return "ui_surface";
  if (typeof subtype !== "string" || !ATTESTED_REQUEST_SUBTYPES.has(subtype)) return;
  if (subtype === "apply_flag_settings") {
    let settings = request.settings;
    return typeof settings === "object" &&
      settings !== null &&
      !Array.isArray(settings) &&
      Object.hasOwn(settings, CLOUD_PLUGINS_FORWARDED_KEY)
      ? "apply_flag_settings"
      : undefined;
  }
  return subtype;
}
export {
  turnHandoffAdmission,
  shouldCarryWrites,
  isTurnHandoffResumeEnabled,
  isCarriedWritesEnabled,
  hasSaidCarriedWrites,
  buildTurnHandoffReply,
  rewindRequestAge,
  serviceClockStoredAt,
  carriedWritePermissionRefusal,
  findFileWriteTool,
  ensureFreshGrowthBook,
  awaitCarriedWritesFlag,
  applyTurnHandoff,
  REWIND_REQUEST_MAX_AGE_MS,
  attestedRequestSubtype,
  dropServiceVouchedAttestation,
  judgeDeviceAttestationLevel,
  turnHandoffAvailableMessage,
  waitForTurnPromptUploads,
  turnHandoffRegistration,
  logHandoffFlagAdvert,
  markSaidCarriedWrites,
  withEnvelopeFlag,
};
