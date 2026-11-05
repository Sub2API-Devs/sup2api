/**
 * cli/remoteIO/turnHandoff.ts
 *
 * 2.1.316 新增。turn_handoff：worker 之间交接一个回合（消息、在途写入、rewind）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1kk50rk6.js (45)
 * attribution: placement 44, layout 1
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
import { zodStrictObject, stringSchema, record, unknown } from "../../../vendor/zod/v4/classic/schemas.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { findToolByName } from "../../Tool.js";
import { homePathProblem, MAX_HOME_FILE_NAME_LENGTH } from "../../utils/filePersistence/homeFilePublish.js";
import { isWellFormedString } from "../../utils/stringUtils.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { expandPathOrNull } from "../../utils/path.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { READ } from "../../tools/FileReadTool/constants.js";
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
import { sdkMessagesToInternal } from "../../utils/messages/mappers.js";
import { countImageParts } from "../../utils/attachments/bridgeAttachments.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { isClaudeCodeRemoteServer } from "../../services/mcp/agentRequestMeta.js";
import { isPendingMcpToolName } from "../../services/tools/toolExecution.js";
import { mcpInfoFromString, buildMcpToolName } from "../../services/mcp/mcpStringUtils.js";
import { countWhere } from "../../utils/collections.js";
import { isToolResultMessage, isNotEmptyMessage } from "../../utils/messages.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { toToolUseIdSet } from "../../utils/permissions/permissions.js";
import { isToolResultOnlyUserMessage } from "../../services/api/claude.js";
import { normalizeAttestationStatus, meetsAttestationLevel } from "../../bridge/deviceAttestation.js";
import { CLOUD_ALLOWED_SETTINGS_KEYS } from "../cloudSession/hostedSessionRestrictions.js";
import { isUiSurfaceName } from "../sdkMcpManifests.js";
import { asPlainObject } from "./servedCalls.js";
import { CLOUD_PLUGINS_FORWARDED_KEY } from "../../utils/plugins/cloudPluginForwarding.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1kk50rk6.js:11989-12043 placement
/**
 * 是否允许回合交接恢复：非无盘且特性 tengu_steady_puppy 开启。
 */
function isTurnHandoffResumeEnabled() {
  return !isDiskless() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_steady_puppy", false);
}
//@ chunk-1kk50rk6.js:12399-12464 placement
function withEnvelopeFlag(featureValue_CACHED_MAY_BE_STALE, hosted) {
  if (!hosted) return featureValue_CACHED_MAY_BE_STALE;
  return {
    ...(isPlainObject(featureValue_CACHED_MAY_BE_STALE) ? featureValue_CACHED_MAY_BE_STALE : {}),
    envelope: true,
  };
}
//@ chunk-1kk50rk6.js:12494-12548 placement
var GROWTHBOOK_REFRESH_INFLIGHT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1kk50rk6.js:12494", () => {
  GROWTHBOOK_REFRESH_INFLIGHT = identity(
    {
      inFlight: undefined,
    },
    (state) => {
      state.inFlight = undefined;
    },
  );
});
//@ chunk-1kk50rk6.js:12548-12696 placement
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
//@ chunk-1kk50rk6.js:12696-12731 placement
var CARRIED_WRITES_FLAG_WAIT_MS = 3000;
var TENGU_FIZZY_PETAL = "tengu_fizzy_petal";
//@ chunk-1kk50rk6.js:12731-12810 placement
function carriedWritesFlagState() {
  let { source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_FIZZY_PETAL, false);
  return {
    on: readFlagWithOverride(TENGU_FIZZY_PETAL, {
      safe: false,
    }),
    served: isServedFeatureSource(source),
  };
}
//@ chunk-1kk50rk6.js:12810-12840 placement
/**
 * 是否开启携带写（carried writes）：读 tengu_fizzy_petal 并应用开关覆盖。
 */
function isCarriedWritesEnabled() {
  return carriedWritesFlagState().on;
}
//@ chunk-1kk50rk6.js:12840-12991 placement
function logHandoffFlagAdvert() {
  logEvent("tengu_turn_handoff_flag_wait", {
    capability: lit("carried_writes"),
    at: lit("advert"),
    waited_ms: 0,
    ended: lit(carriedWritesFlagState().served ? "served" : "not_served"),
  });
}
//@ chunk-1kk50rk6.js:12991-13259 placement
/**
 * 回合开始时在时限内等待 carried_writes 特性开关就绪，记录等待耗时事件，返回该能力是否开启。
 */
async function awaitCarriedWritesFlag(waitMs = CARRIED_WRITES_FLAG_WAIT_MS) {
  if (!carriedWritesFlagState().served) {
    let startTime = performance.now();
    await withDeadline(ensureFreshGrowthBook(), waitMs);
    logEvent("tengu_turn_handoff_flag_wait", {
      capability: lit("carried_writes"),
      at: lit("turn_start"),
      waited_ms: Math.round(performance.now() - startTime),
      ended: lit(carriedWritesFlagState().served ? "served" : "not_served"),
    });
  }
  return isCarriedWritesEnabled();
}
//@ chunk-1kk50rk6.js:13259-13323 placement
var SAID_CARRIED_WRITES_STATE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1kk50rk6.js:13259", () => {
  SAID_CARRIED_WRITES_STATE = identity(
    {
      saidCarriedWrites: false,
    },
    (state) => {
      state.saidCarriedWrites = false;
    },
  );
});
//@ chunk-1kk50rk6.js:13323-13361 placement
function markSaidCarriedWrites() {
  SAID_CARRIED_WRITES_STATE.saidCarriedWrites = true;
}
//@ chunk-1kk50rk6.js:13361-13404 placement
/**
 * 本轮是否已提示过"携带写"（避免重复提示）。
 */
function hasSaidCarriedWrites() {
  return SAID_CARRIED_WRITES_STATE.saidCarriedWrites;
}
//@ chunk-1kk50rk6.js:13404-14460 placement
/**
 * 携带写（carried writes）相关常量与 schema：单文件 8MiB、路径 1024 字节上限、权限拒绝文案表、handoff 与 tool_use 校验 schema、可携带写的工具名集合。
 */
var CARRIED_WRITE_REFUSALS; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var MAX_CARRIED_WRITE_BYTES;
var MAX_CARRIED_WRITE_PATH_BYTES;
var CARRIED_WRITE_PERMISSION_REFUSALS;
var CARRIED_WRITE_REFUSAL_TEXT;
var handoffMessageSchema;
var toolUseInputSchema;
var CARRIED_WRITE_TOOL_NAMES;
deferInit("chunk-1kk50rk6.js:13404", () => {
  CARRIED_WRITE_REFUSALS = 16;
  MAX_CARRIED_WRITE_BYTES = 8388608;
  MAX_CARRIED_WRITE_PATH_BYTES = 1024;
  CARRIED_WRITE_PERMISSION_REFUSALS = {
    would_ask: "this session's permission mode would ask before a Write",
    auto_mode: "carried Writes are not placed in auto mode",
  };
  CARRIED_WRITE_REFUSAL_TEXT = {
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
  handoffMessageSchema = DoctorLazy(() =>
    zodStrictObject({
      file_path: stringSchema(),
      content: stringSchema(),
    }),
  );
  toolUseInputSchema = DoctorLazy(() => record(stringSchema(), unknown()));
  CARRIED_WRITE_TOOL_NAMES = new Map([
    [FILE_WRITE_TOOL_NAME, "file_path"],
    [EDIT, "file_path"],
    [NOTEBOOK_EDIT_TOOL_NAME, "notebook_path"],
  ]);
});
//@ chunk-1kk50rk6.js:14460-14538 placement
/**
 * 在工具表里找非 MCP 的 Write 工具（携带写的落盘目标）。
 */
function findFileWriteTool(tools, toolAliases) {
  let toolByName = findToolByName(tools, FILE_WRITE_TOOL_NAME, toolAliases);
  return toolByName?.name === FILE_WRITE_TOOL_NAME && toolByName.isMcp !== true ? toolByName : undefined;
}
//@ chunk-1kk50rk6.js:14538-16163 placement
function collectCarriedWrites(messages, carriedWrites, fileWriteTool) {
  let results = new Map();
  let errors = new Set();
  for (let row of messages) {
    if (row.type !== "user" || !Array.isArray(row.message.content)) continue;
    for (let block of row.message.content) {
      if (block.type !== "tool_result") continue;
      let duplicate = results.has(block.tool_use_id);
      results.set(block.tool_use_id, duplicate ? undefined : getSoleTextContent(block.content));
      if (duplicate) errors.delete(block.tool_use_id);
      else if (block.is_error === true) errors.add(block.tool_use_id);
    }
  }
  let writes = new Map();
  let edited = new Set();
  let editedOther = false;
  for (let row of messages) {
    if (row.type !== "assistant" || !Array.isArray(row.message.content)) continue;
    for (let block of row.message.content) {
      let field = block.type === "tool_use" ? CARRIED_WRITE_TOOL_NAMES.get(block.name) : undefined;
      if (block.type !== "tool_use" || field === undefined || !results.has(block.id) || errors.has(block.id))
        continue;
      let value = toolUseInputSchema().safeParse(block.input).data?.[field];
      if (typeof value !== "string") {
        if (block.name === FILE_WRITE_TOOL_NAME) return "odd_input";
        editedOther = true;
        continue;
      }
      let relative = homeRelativePath(value, carriedWrites);
      if (relative === undefined) continue;
      if (block.name !== FILE_WRITE_TOOL_NAME) {
        edited.add(relative);
        continue;
      }
      let parsed = handoffMessageSchema().safeParse(block.input);
      if (!parsed.success) return "odd_input";
      if (fileWriteTool === undefined) return "no_write_tool";
      let { file_path: filePath, content } = parsed.data;
      let resultText = results.get(block.id);
      if (
        resultText === undefined ||
        !["create", "update"].some(
          (type) =>
            fileWriteTool.mapToolResultToToolResultBlockParam(
              {
                type,
                filePath,
              },
              block.id,
            ).content === resultText,
        )
      )
        return "result_text";
      writes.set(relative, {
        relativePath: relative,
        filePath,
        content,
        toolUseID: block.id,
        assistantMessage: row,
      });
    }
  }
  if (writes.size === 0) return;
  if (editedOther) return "edited";
  if (writes.size > CARRIED_WRITE_REFUSALS) return "too_many";
  let totalBytes = 0;
  for (let { relativePath, filePath, content } of writes.values()) {
    if (edited.has(relativePath)) return "edited";
    if (
      homePathProblem(relativePath) !== undefined ||
      !isWellFormedString(filePath) ||
      Buffer.byteLength(relativePath) > MAX_CARRIED_WRITE_PATH_BYTES ||
      relativePath
        .split(posix.sep)
        .some((segment) => segment === "" || Buffer.byteLength(segment) > MAX_HOME_FILE_NAME_LENGTH)
    )
      return "refused_name";
    for (let dir = posix.dirname(relativePath); dir !== "."; dir = posix.dirname(dir))
      if (writes.has(dir)) return "nested";
    totalBytes += Buffer.byteLength(content);
  }
  if (totalBytes > MAX_CARRIED_WRITE_BYTES) return "too_large";
  return carriedWrites.cwd === carriedWrites.home ? [...writes.values()] : "not_home";
}
//@ chunk-1kk50rk6.js:16163-16238 placement
/**
 * 根据权限模式判断携带写被拒的原因：auto 模式为 auto_mode，会询问时为 would_ask。
 */
function carriedWritePermissionRefusal(mode) {
  if (!isAutoClassifierActive(mode)) return;
  return mode === "auto" ? "auto_mode" : "would_ask";
}
//@ chunk-1kk50rk6.js:16238-16340 placement
function homeRelativePath(path, { cwd, home }) {
  let expanded = expandPathOrNull(path, cwd);
  return expanded?.startsWith(home + posix.sep) ? expanded.slice(home.length + 1) : undefined;
}
//@ chunk-1kk50rk6.js:16340-16537 placement (2.1.88 match: extractErrorTypeFromData, 1)
function getSoleTextContent(data) {
  if (typeof data === "string") return data;
  let block = data?.length === 1 ? data[0] : undefined;
  return typeof block === "object" &&
    block !== null &&
    "type" in block &&
    block.type === "text" &&
    "text" in block &&
    typeof block.text === "string"
    ? block.text
    : undefined;
}
//@ chunk-1kk50rk6.js:16537-16578 placement
function callSafely(onBegan) {
  try {
    onBegan();
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-1kk50rk6.js:16578-17985 placement
function waitForTurnPromptUploads({ listTurnPromptsWaitedOn, write, now = () => performance.now() }) {
  let ahead = null;
  let state = {
    kind: "none",
  };
  let answered = new Set();
  function seedAnswer(prompt, isRunnerTold) {
    state = {
      kind: "uploading",
      isFor: "this_wait",
      isRunnerTold,
    };
    answered = new Set(listTurnPromptsWaitedOn());
    let startedAt = now();
    callSafely(prompt.onBegan);
    (async () => prompt.upload())()
      .catch((error) => {
        logError(toError(error));
        return "rejected";
      })
      .then((outcome) => finish(prompt, outcome, now() - startedAt));
  }
  function finish(prompt, outcome, ms) {
    let { isFor, isRunnerTold } =
      state.kind === "uploading"
        ? state
        : {
            isFor: "nobody",
            isRunnerTold: false,
          };
    if (isFor === "a_later_wait") {
      callSafely(() =>
        prompt.onAnswered({
          outcome,
          ms,
          ledTo: "uploads_again",
        }),
      );
      seedAnswer(prompt, isRunnerTold);
      return;
    }
    state = {
      kind: isFor === "this_wait" ? "told" : "none",
    };
    callSafely(() =>
      prompt.onAnswered({
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
      let prompts = ahead === null ? [] : listTurnPromptsWaitedOn();
      let idle = state.kind === "none" || (state.kind === "uploading" && state.isFor === "nobody");
      let changed =
        prompts.some((key) => !answered.has(key)) ||
        (prompts.length > 0 && idle && prompts.length < answered.size);
      if (state.kind === "uploading") {
        if (prompts.length === 0) {
          if (state.isFor === "a_later_wait") answered = new Set();
          state = {
            kind: "uploading",
            isFor: "nobody",
            isRunnerTold: false,
          };
          write();
          return;
        }
        if (changed)
          state = {
            ...state,
            isFor: "a_later_wait",
          };
        else if (state.isFor === "nobody")
          state = {
            ...state,
            isFor: "this_wait",
          };
        if (state.isRunnerTold) write();
        return;
      }
      if (ahead === null || !changed) {
        state = {
          kind: prompts.length > 0 ? "told" : "none",
        };
        write();
        return;
      }
      seedAnswer(ahead, false);
    },
    resultGoesNext() {
      if (state.kind === "uploading" && state.isFor !== "nobody" && !state.isRunnerTold) {
        state = {
          ...state,
          isRunnerTold: true,
        };
        write();
      }
    },
    setUploadAhead(nextAhead) {
      ahead = nextAhead;
      if (nextAhead === null && state.kind === "uploading")
        state = {
          kind: "uploading",
          isFor: "nobody",
          isRunnerTold: false,
        };
    },
  };
}
//@ chunk-1kk50rk6.js:18022-18109 placement
var CARRIED_TOOL_NAMES; // deferred: uses GLOB_TOOL_NAME (../../tools/GlobTool/prompt.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1kk50rk6.js:18022", () => {
  CARRIED_TOOL_NAMES = [
    BASH_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    EDIT,
    READ,
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
});
//@ chunk-1kk50rk6.js:18109-18345 placement
/**
 * 判断回合交接是否可用：仅限托管云 worker（有 SDK 地址与远程会话 id、非自定义环境）且未被禁用。
 */
function turnHandoffAdmission(options) {
  if (!options.sdkUrl || !options.remoteSessionId || options.environmentKind !== undefined)
    return {
      admitted: false,
      reason: "not_managed_cloud_worker",
    };
  if (options.disabled)
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
//@ chunk-1kk50rk6.js:18345-18448 placement
/**
 * 判断是否携带在途写入：交接已准入、配置了中继、持久化转录且不是共享后端。
 */
function shouldCarryWrites(options) {
  return (
    options.admission.admitted &&
    options.relayConfigured &&
    options.persistsTranscript &&
    !options.sharedBackend
  );
}
//@ chunk-1kk50rk6.js:18448-18823 placement
/**
 * 生成 worker 注册时声明的 turn_handoff 能力（工具、epoch、暂存文件、relay 标记、home 文件与携带写入等）；未准入且原因是 disabled 时显式发 null。
 */
function turnHandoffRegistration(admission, workerEpoch, relayMarker, carriesFiles, carriesWrites) {
  if (admission.admitted)
    return {
      turn_handoff: {
        v: 1,
        tools: admission.tools,
        worker_epoch: workerEpoch,
        staged_files: true,
        no_query_first: true,
        shared_message_id: true,
        requires_rewind_request_id: true,
        ...(relayMarker && {
          relay_marker: true,
        }),
        ...(carriesFiles && {
          home_files: true,
          file_names: true,
          ...(carriesWrites && {
            carried_writes: true,
          }),
        }),
        ...(admission.hydratesCarriedLines && {
          hydrates_carried_lines: true,
        }),
      },
    };
  return admission.reason === "disabled"
    ? {
        turn_handoff: null,
      }
    : undefined;
}
//@ chunk-1kk50rk6.js:18823-19370 placement
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
//@ chunk-1kk50rk6.js:19370-19501 placement
var RECOVERED_BY_RESTART_NOTE =
  "recovered_by_restart: this worker restarted after the turn was appended and its recovery set the turn's unrun calls aside";
//@ chunk-1kk50rk6.js:19501-19566 placement
/**
 * 构造回合交接应答 {requestId, tipUuid}。
 */
function buildTurnHandoffReply(requestId, messages) {
  return {
    requestId,
    tipUuid: lastConversationMessage(messages)?.uuid ?? null,
  };
}
//@ chunk-1kk50rk6.js:19566-19609 placement
/**
 * 回合交接/rewind 的限制常量：rewind 请求最大年龄 30 分钟、内容 4096 字节、消息 200 条、工具调用与结果各 16 个。
 */
var REWIND_REQUEST_MAX_AGE_MS = 1800000;
var MAX_CONTENT_BYTES = 4096;
var MAX_HANDOFF_MESSAGES = 200;
var MAX_HANDOFF_TOOL_USE_IDS = 16;
var MAX_HANDOFF_TOOL_RESULT_IDS = 16;
//@ chunk-1kk50rk6.js:19609-19729 placement
/**
 * 计算 rewind 请求的年龄：以服务端时间（或本机与最新帧时间的较大者）减去存储时间。
 */
function rewindRequestAge({ storedAt, serviceNow, newestFrameAt, machineNow }) {
  if (storedAt === undefined) return;
  return (serviceNow ?? Math.max(machineNow, newestFrameAt ?? machineNow)) - storedAt;
}
//@ chunk-1kk50rk6.js:19729-19830 placement
/**
 * 把服务端时钟下的存储时间换算到本机时钟。
 */
function serviceClockStoredAt({ storedAt, serviceNow, machineNow }) {
  if (storedAt === undefined || serviceNow === undefined) return;
  return machineNow - (serviceNow - storedAt);
}
//@ chunk-1kk50rk6.js:19830-32538 placement
/**
 * 云 worker 接手回合（turn_handoff）：校验交接载荷（消息、tool_use_ids、记忆上下文、required rewind），把消息追加到本地转录并恢复在途写入，非法时返回 invalid_handoff。
 */
function applyTurnHandoff(request, context) {
  let {
    relay_marker: relayMarker,
    memory_context: memoryContext,
    message_client_platform: messageClientPlatform,
    file_names: fileNames,
    ...rest
  } = request;
  for (let [field, limit] of [
    ["messages", MAX_HANDOFF_MESSAGES],
    ["tool_use_ids", MAX_HANDOFF_TOOL_USE_IDS],
  ]) {
    let error = arrayTooBigMessage(request[field], limit);
    if (error !== undefined)
      return {
        kind: "error",
        error: `invalid_handoff: ${field} ${error}`,
      };
  }
  let messages = request.messages;
  let messagesList = Array.isArray(messages) ? messages : [];
  for (let [index, message] of messagesList.entries()) {
    let message_2 =
      typeof message === "object" && message !== null && "message" in message ? message.message : undefined;
    let error = arrayTooBigMessage(
      typeof message_2 === "object" && message_2 !== null && "content" in message_2
        ? message_2.content
        : undefined,
      MAX_CONTENT_BYTES,
    );
    if (error !== undefined)
      return {
        kind: "error",
        error: `invalid_handoff: messages.${index}.message.content ${error}`,
      };
  }
  let clientPlatform =
    typeof messageClientPlatform === "string" && isDefinedHumanClientPlatform(messageClientPlatform)
      ? messageClientPlatform
      : undefined;
  let element = SDKTurnHandoffTurnHandoffMessageSchema().shape.messages.element;
  for (let [index, message] of messagesList.entries()) {
    let type =
      typeof message === "object" && message !== null && "type" in message ? message.type : undefined;
    if (
      element.options.find((option) => option.shape.type.value === type)?.safeParse(message).success !== true
    )
      return {
        kind: "error",
        error: `invalid_handoff: messages.${index} Invalid input`,
      };
  }
  let parsed = (
    messagesList.length > 0 ? handoffWithoutMessagesSchema() : SDKTurnHandoffTurnHandoffMessageSchema()
  ).safeParse(rest);
  if (!parsed.success)
    return {
      kind: "error",
      error: `invalid_handoff: ${issuePathString(parsed.error.issues[0]?.path)} ${parsed.error.issues[0]?.message ?? "unparseable"}`,
    };
  let { messages: messages_2, tool_use_ids: toolUseIds } = request;
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
  for (let [index, message] of messages_2.entries()) {
    if (typeof message.uuid !== "string")
      return {
        kind: "error",
        error: "invalid_handoff: every message needs a uuid",
      };
    if (
      (message.type === "user" && (message.isSynthetic === true || message.is_virtual)) ||
      (message.type === "assistant" && (message.is_meta === true || message.is_virtual))
    )
      return {
        kind: "error",
        error: `invalid_handoff: messages.${index} is not a plain conversation line`,
      };
  }
  let messages_3 = sdkMessagesToInternal(
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
  ).map((message, index) => {
    if (message.type !== "assistant" && message.type !== "user") return message;
    let source = messages_2[index];
    let imageFileUuids = "image_file_uuids" in source ? source.image_file_uuids : undefined;
    return {
      ...message,
      handedOff: true,
      ...(message.type === "user" &&
        Array.isArray(imageFileUuids) &&
        imageFileUuids.length > 0 &&
        imageFileUuids.length <= countImageParts(message.message.content) &&
        imageFileUuids.every((imageFileUuid) => typeof imageFileUuid === "string") && {
          imageFileUuids,
        }),
      ...(index === 0 &&
        message.type === "user" &&
        clientPlatform !== undefined &&
        !hasTeammateMessageEnvelope(message.message.content) && {
          origin: {
            kind: "human",
          },
        }),
    };
  });
  let last = messages_3.at(-1);
  let firstMessage = messages_3[0];
  let firstPlatform =
    clientPlatform !== undefined &&
    firstMessage?.type === "user" &&
    !hasTeammateMessageEnvelope(firstMessage.message.content)
      ? clientPlatform
      : undefined;
  if (messages_3.length !== messages_2.length || last?.type !== "assistant")
    return {
      kind: "error",
      error: "invalid_handoff: the last message is not an assistant message",
    };
  for (let handedMessage of messages_3)
    if (
      handedMessage.type === "user" &&
      Array.isArray(handedMessage.message.content) &&
      handedMessage.message.content.some((block) => block.type === "tool_use")
    )
      return {
        kind: "error",
        error: `invalid_handoff: user message ${sanitizeTelemetryString(handedMessage.uuid)} holds a tool_use block`,
      };
  let lastCalls = new Map();
  if (Array.isArray(last.message.content))
    for (let block of last.message.content) {
      if (block.type !== "tool_use") continue;
      if (lastCalls.has(block.id))
        return {
          kind: "error",
          error: `invalid_handoff: tool_use ${sanitizeTelemetryString(block.id)} repeats`,
        };
      lastCalls.set(block.id, block);
    }
  let kind;
  if (toolUseIds.length > 0) {
    if (request.stopped)
      return {
        kind: "error",
        error: "invalid_handoff: a stopped turn names no calls to run",
      };
    kind = "run";
  } else if (request.stopped) {
    if (lastCalls.size === 0)
      return {
        kind: "error",
        error: "invalid_handoff: a stopped turn ends with calls that have not run",
      };
    kind = "stopped";
  } else kind = "history";
  let conversationCallIds = new Set();
  let answeredIds = new Set();
  for (let message of context.messages) {
    if ((message.type !== "user" && message.type !== "assistant") || !Array.isArray(message.message.content))
      continue;
    for (let block of message.message.content)
      if (message.type === "assistant" && block.type === "tool_use") conversationCallIds.add(block.id);
      else if (message.type === "user" && block.type === "tool_result") answeredIds.add(block.tool_use_id);
  }
  let isTaken = (toolUseId) => context.handledToolUseIds.has(toolUseId) || answeredIds.has(toolUseId);
  let clients = (context.mcpClients ?? []).filter(isClaudeCodeRemoteServer);
  for (let toolUseId of toolUseIds) {
    let call = lastCalls.get(toolUseId);
    if (call === undefined)
      return {
        kind: "error",
        error: `invalid_handoff: tool_use ${sanitizeTelemetryString(toolUseId)} is not in the last message`,
      };
    if (!context.acceptedTools.includes(call.name))
      return {
        kind: "error",
        error: `unsupported_tool: ${sanitizeTelemetryString(call.name)}`,
      };
    if (isTaken(toolUseId)) continue;
    let hasTool = findToolByName(context.tools, call.name, context.toolAliases) !== undefined;
    let isPendingMcp = isPendingMcpToolName(call.name, clients);
    if (
      mcpInfoFromString(call.name) === null ? !hasTool : clients.length === 0 || (!hasTool && !isPendingMcp)
    )
      return {
        kind: "error",
        error: `unknown_tool: ${sanitizeTelemetryString(call.name)}`,
      };
  }
  let conversationUuids = new Set(context.messages.map((message) => message.uuid));
  let firstNewIndex = 0;
  let continues = false;
  if (kind === "run") {
    if (
      toolUseIds.every((toolUseId) => context.recoveredToolUseIds.has(toolUseId)) &&
      !toolUseIds.every((toolUseId) => answeredIds.has(toolUseId))
    )
      return {
        kind: "error",
        error: RECOVERED_BY_RESTART_NOTE,
      };
    let takenCount = countWhere(toolUseIds, isTaken);
    if (takenCount === toolUseIds.length)
      return {
        kind: "duplicate",
      };
    if (takenCount > 0)
      return {
        kind: "error",
        error: "invalid_handoff: some of the named calls are already taken or answered",
      };
    let firstMessage = messages_3[0];
    if (
      firstMessage?.type !== "user" ||
      isToolResultMessage(firstMessage) ||
      !isNotEmptyMessage(firstMessage)
    )
      return {
        kind: "error",
        error:
          "invalid_handoff: a request that names calls to run must start with the user's message, not empty and not a tool result",
      };
    if (context.requestAgeMs !== undefined && context.requestAgeMs > REWIND_REQUEST_MAX_AGE_MS)
      return {
        kind: "error",
        error: `expired: the session service has held this request for over ${REWIND_REQUEST_MAX_AGE_MS / 60000} minutes; its calls were not run`,
        expiredAtAgeMs: context.requestAgeMs,
      };
    if (context.pendingHandoff)
      return {
        kind: "error",
        error: "invalid_handoff: another handed-off turn is still queued",
      };
    if (context.runningHandoff)
      return {
        kind: "error",
        error: "invalid_handoff: another handed-off turn is still running",
      };
    if (messages_3.some((message) => conversationUuids.has(message.uuid)))
      return {
        kind: "error",
        error: "invalid_handoff: the turn carries messages the conversation already holds",
      };
  } else {
    let lastToolUseAssistantMessage = findLastToolUseAssistantMessage(messages_3);
    let isOlder = (message) =>
      findLastToolUseAssistantMessage(message.messages)?.uuid === lastToolUseAssistantMessage.uuid;
    if (context.runningHandoff && isOlder(context.runningHandoff))
      return {
        kind: "duplicate",
        ...(kind === "stopped" &&
          context.runningHandoff.kind === "run" && {
            stopRunning: true,
          }),
      };
    if (context.pendingHandoff && isOlder(context.pendingHandoff)) {
      if (context.pendingHandoff.kind === kind || context.pendingHandoff.kind === "stopped")
        return {
          kind: "duplicate",
        };
      let messages = context.pendingHandoff.messages;
      let firstNewIndex =
        messages.findIndex((message) => message.uuid === lastToolUseAssistantMessage.uuid) + 1 ||
        messages.length;
      if (
        messages_3.length < firstNewIndex ||
        messages
          .slice(0, firstNewIndex)
          .some(
            (message, index) =>
              messages_3[index].uuid !== message.uuid ||
              messages_3[index].type !== message.type ||
              !arraysEqual(getToolUseAndResultIds(messages_3[index]), getToolUseAndResultIds(message)),
          )
      )
        return {
          kind: "error",
          error: "invalid_handoff: the turn does not carry the lines of its pending delivery",
        };
      continues = true;
    }
    let byUuid = new Map(context.messages.map((message) => [message.uuid, message]));
    while (firstNewIndex < messages_3.length && byUuid.has(messages_3[firstNewIndex].uuid)) {
      let lookupUuid = messages_3[firstNewIndex];
      let matched = byUuid.get(lookupUuid.uuid);
      if (
        matched.type !== lookupUuid.type ||
        !arraysEqual(getToolUseAndResultIds(matched), getToolUseAndResultIds(lookupUuid))
      )
        return {
          kind: "error",
          error: "invalid_handoff: the turn carries messages the conversation already holds",
        };
      firstNewIndex++;
    }
    if (messages_3.some((message, index) => index > firstNewIndex && conversationUuids.has(message.uuid)))
      return {
        kind: "error",
        error: "invalid_handoff: the turn carries messages the conversation already holds out of order",
      };
    let answeredIds = new Set();
    for (let message of context.messages)
      if (
        message.type === "user" &&
        Array.isArray(message.message.content) &&
        !messages_3.some((message_2, index) => index < firstNewIndex && message_2.uuid === message.uuid)
      ) {
        for (let block of message.message.content)
          if (block.type === "tool_result") answeredIds.add(block.tool_use_id);
      }
    let toolUseAndResultIds = getToolUseAndResultIds(lastToolUseAssistantMessage);
    let unansweredCount = countWhere(toolUseAndResultIds, (toolUseId) => answeredIds.has(toolUseId));
    if (toolUseAndResultIds.length > 0 && unansweredCount === toolUseAndResultIds.length)
      return {
        kind: "duplicate",
      };
    if (unansweredCount > 0)
      return {
        kind: "error",
        error: "invalid_handoff: some of the calls are already answered",
      };
    if (
      firstNewIndex < messages_3.length &&
      toolUseAndResultIds.length > 0 &&
      toolUseAndResultIds.every((toolUseAndResultId) => context.recoveredToolUseIds.has(toolUseAndResultId))
    )
      return {
        kind: "error",
        error: RECOVERED_BY_RESTART_NOTE,
      };
    for (let priorRow of messages_3.slice(0, firstNewIndex)) {
      let matched = byUuid.get(priorRow.uuid);
      if ((matched.type !== "assistant" && matched.type !== "user") || matched.handedOff !== true)
        return {
          kind: "error",
          error: "invalid_handoff: the turn carries messages the conversation already holds",
        };
    }
    if (
      firstNewIndex > 0 &&
      !(kind === "history" && firstNewIndex === messages_3.length) &&
      lastConversationMessage(context.messages)?.uuid !== messages_3[firstNewIndex - 1].uuid
    )
      return {
        kind: "error",
        error: "invalid_handoff: the conversation has moved on past the part of the turn it holds",
      };
    if (context.pendingHandoff && !continues)
      return {
        kind: "error",
        error: "invalid_handoff: another handed-off turn is still queued",
      };
    if (context.runningHandoff)
      return {
        kind: "error",
        error: "invalid_handoff: another handed-off turn is still running",
      };
  }
  let requiresRewindRequestId = request.requires_rewind_request_id;
  if (requiresRewindRequestId !== undefined && firstNewIndex === 0 && !continues) {
    let sanitizedRequestId = sanitizeTelemetryString(requiresRewindRequestId);
    let appliedRewind = context.appliedRewind;
    if (appliedRewind === undefined)
      return requiredRewindError(
        "unknown",
        `this worker has carried out no rewind_conversation: request ${sanitizedRequestId} was answered by an earlier worker, refused, or not read yet`,
      );
    if (appliedRewind.requestId !== requiresRewindRequestId)
      return requiredRewindError(
        "other",
        `the last rewind this worker carried out is not rewind_conversation request ${sanitizedRequestId}: that one was refused, not read yet, or followed by another rewind`,
      );
    if ((lastConversationMessage(context.messages)?.uuid ?? null) !== appliedRewind.tipUuid)
      return requiredRewindError(
        "moved_on",
        `the conversation has moved on since rewind_conversation request ${sanitizedRequestId} cut it`,
      );
    if (context.linesWaitingAhead === true)
      return requiredRewindError(
        "lines_waiting",
        `other messages or a turn in progress wait to be added before this turn since rewind_conversation request ${sanitizedRequestId} cut it`,
      );
  }
  if (kind === "stopped" && lastCalls.size > MAX_HANDOFF_TOOL_USE_IDS)
    return {
      kind: "error",
      error: `invalid_handoff: a stopped turn ends with more than ${MAX_HANDOFF_TOOL_USE_IDS} calls`,
    };
  let sliced = messages_3.slice(firstNewIndex);
  let refusal = context.refusalOfAppended?.(sliced);
  if (refusal !== undefined)
    return {
      kind: "error",
      error: `invalid_handoff: ${refusal}`,
    };
  let pendingIds = new Set(continues ? context.pendingHandoff.messages.flatMap(getToolUseAndResultIds) : []);
  let conversationMessageIds = new Set();
  for (let message of context.messages)
    if (message.type === "assistant" && typeof message.message.id === "string")
      conversationMessageIds.add(message.message.id);
  let seenMessageIds = new Set();
  let lastMessageId;
  let lastCallIds = [];
  let resultsOnly = false;
  for (let message of firstNewIndex > 0 ? context.messages : [])
    if (message.type === "assistant") {
      lastMessageId = message.handedOff === true ? message.message.id : undefined;
      lastCallIds = getToolUseAndResultIds(message);
      resultsOnly = false;
    } else if (message.type === "user") {
      resultsOnly = isToolResultsOnlyForIds(message, lastCallIds);
      if (!resultsOnly) {
        lastMessageId = undefined;
        lastCallIds = [];
      }
    }
  for (let message of sliced) {
    if (message.type !== "assistant") {
      resultsOnly = isToolResultsOnlyForIds(message, lastCallIds);
      if (!resultsOnly) {
        lastMessageId = undefined;
        lastCallIds = [];
      }
      continue;
    }
    let sameMessageContinues =
      resultsOnly &&
      message.message.id === lastMessageId &&
      Array.isArray(message.message.content) &&
      message.message.content.length > 0 &&
      message.message.content.every((block) => block.type === "tool_use");
    lastMessageId = message.message.id;
    lastCallIds = getToolUseAndResultIds(message);
    resultsOnly = false;
    if (sameMessageContinues) {
      seenMessageIds.add(message.message.id);
      continue;
    }
    if (seenMessageIds.has(message.message.id))
      return {
        kind: "error",
        error: `invalid_handoff: message_id_repeats: assistant message id ${sanitizeTelemetryString(message.message.id)} repeats (allowed only in the next assistant message, of tool calls alone, with only results of the previous assistant message's calls between)`,
      };
    if (conversationMessageIds.has(message.message.id))
      return {
        kind: "error",
        error: `invalid_handoff: assistant message id ${sanitizeTelemetryString(message.message.id)} is already in the conversation`,
      };
    seenMessageIds.add(message.message.id);
  }
  let callIds = new Set();
  let unansweredCalls = new Set();
  for (let [index, handedMessage] of messages_3.entries()) {
    if (
      (handedMessage.type !== "user" && handedMessage.type !== "assistant") ||
      !Array.isArray(handedMessage.message.content)
    )
      continue;
    for (let block of handedMessage.message.content)
      if (handedMessage.type === "assistant" && block.type === "tool_use") {
        if (
          index >= firstNewIndex &&
          (conversationCallIds.has(block.id) ||
            (context.handledToolUseIds.has(block.id) && !pendingIds.has(block.id)))
        )
          return {
            kind: "error",
            error: `invalid_handoff: tool_use ${sanitizeTelemetryString(block.id)} is already in the conversation or taken`,
          };
        if (callIds.has(block.id))
          return {
            kind: "error",
            error: `invalid_handoff: tool_use ${sanitizeTelemetryString(block.id)} repeats`,
          };
        callIds.add(block.id);
        if (!(handedMessage === last && (kind === "stopped" || toolUseIds.includes(block.id))))
          unansweredCalls.add(block.id);
      } else if (handedMessage.type === "user" && block.type === "tool_result") {
        if (!callIds.has(block.tool_use_id))
          return {
            kind: "error",
            error: `invalid_handoff: tool_result ${sanitizeTelemetryString(block.tool_use_id)} answers no earlier tool_use in the turn`,
          };
        if (index >= firstNewIndex && answeredIds.has(block.tool_use_id))
          return {
            kind: "error",
            error: `invalid_handoff: tool_result ${sanitizeTelemetryString(block.tool_use_id)} answers a call the conversation already answers`,
          };
        unansweredCalls.delete(block.tool_use_id);
      }
  }
  for (let callId of unansweredCalls)
    return {
      kind: "error",
      error: lastCalls.has(callId)
        ? `invalid_handoff: tool_use ${sanitizeTelemetryString(callId)} in the last message is not named`
        : `invalid_handoff: tool_use ${sanitizeTelemetryString(callId)} has no result`,
    };
  let relayMark;
  if ((kind === "run" || kind === "history") && relayMarker !== undefined && relayMarker !== null) {
    let parsed = SDKTurnHandoffTurnHandoffMessageSchema().shape.relay_marker.unwrap().safeParse(relayMarker);
    relayMark = parsed.success
      ? {
          uuid: parsed.data.uuid,
          content: parsed.data.content,
        }
      : "malformed";
  }
  let memoryLine;
  if (
    (kind === "run" ||
      (kind === "history" && !messages_3.some((message) => conversationUuids.has(message.uuid)))) &&
    memoryContext !== undefined &&
    memoryContext !== null
  ) {
    let parsed = SDKTurnHandoffTurnHandoffMessageSchema()
      .shape.memory_context.unwrap()
      .safeParse(memoryContext);
    if (!parsed.success)
      logForDebugging(
        `turn_handoff: ${["memory_context", ...(parsed.error.issues[0]?.path ?? [])].map(String).join(".")}: ${parsed.error.issues[0]?.message ?? "unparseable"}; the turn goes on without it`,
        {
          level: "warn",
        },
      );
    else if ((parsed.data.version === null) !== (parsed.data.content === null))
      logForDebugging(
        `turn_handoff: memory_context has ${parsed.data.version === null ? "content but no version" : "a version but no content"}; the turn goes on without it`,
        {
          level: "warn",
        },
      );
    else if (
      conversationUuids.has(parsed.data.uuid) ||
      messages_3.some((message) => message.uuid === parsed.data.uuid) ||
      parsed.data.uuid === relayMarker?.uuid
    )
      logForDebugging(
        "turn_handoff: memory_context.uuid is already used in the request or the conversation; the turn goes on without it",
        {
          level: "warn",
        },
      );
    else {
      let { uuid, version, content } = parsed.data;
      memoryLine = createAttachmentMessage(
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
  let handedFileNames;
  if (kind === "run" && fileNames !== undefined && fileNames !== null) {
    let schema = SDKTurnHandoffTurnHandoffMessageSchema().shape.file_names.unwrap();
    let parsed =
      arrayTooBigMessage(fileNames, MAX_HANDOFF_TOOL_RESULT_IDS) === undefined
        ? schema.safeParse(fileNames)
        : undefined;
    if (parsed?.success !== true) handedFileNames = "malformed";
    else if (parsed.data.length > 0)
      handedFileNames = parsed.data.map((entry) => ({
        fileUuid: entry.file_uuid,
        name: entry.name,
      }));
  }
  let carriedWrites;
  if (kind === "run" && context.carriedWrites) {
    let carriedWrites_2 = collectCarriedWrites(
      messages_3,
      context.carriedWrites,
      findFileWriteTool(context.tools, context.toolAliases),
    );
    let value =
      typeof carriedWrites_2 === "string"
        ? carriedWrites_2
        : carriedWrites_2 &&
          (context.carriedWrites.switchedOn
            ? carriedWritePermissionRefusal(context.carriedWrites.permissionMode)
            : "switched_off");
    if (value !== undefined)
      return {
        kind: "error",
        error: `invalid_handoff: carried_writes_${value}: ${CARRIED_WRITE_REFUSAL_TEXT[value]}`,
        carriedWrites: value,
      };
    carriedWrites = typeof carriedWrites_2 === "string" ? undefined : carriedWrites_2;
  }
  let taken = [...callIds].filter(
    (id) => !conversationCallIds.has(id) && (!context.handledToolUseIds.has(id) || pendingIds.has(id)),
  );
  for (let id of callIds) context.handledToolUseIds.add(id);
  let handedOffTurn = {
    kind,
    messages:
      kind === "run"
        ? messages_3.map((handedMessage, index) =>
            handedMessage.type === "assistant" && index === messages_3.length - 1
              ? {
                  ...handedMessage,
                  handedOffLive: toToolUseIdSet(toolUseIds),
                }
              : handedMessage,
          )
        : messages_3,
    toolUseIDs: toolUseIds,
    ...(relayMark !== undefined && {
      relayMarker: relayMark,
    }),
    ...(memoryLine && {
      memoryLine,
    }),
    ...(handedFileNames !== undefined && {
      fileNames: handedFileNames,
    }),
    ...(carriedWrites !== undefined && {
      carriedWrites,
    }),
    ...(firstNewIndex > 0 && {
      continues: true,
    }),
  };
  if (continues)
    return {
      kind: "converted",
      handedOffTurn,
      taken,
    };
  return {
    kind: "accepted",
    handedOffTurn,
    taken,
    ...(firstPlatform !== undefined && {
      clientPlatform: firstPlatform,
    }),
  };
}
//@ chunk-1kk50rk6.js:32538-32667 placement
function requiredRewindError(code, text) {
  return {
    kind: "error",
    error: `invalid_handoff: required_rewind_${code}: ${text}; nothing was appended`,
    requiredRewind: code,
  };
}
//@ chunk-1kk50rk6.js:32667-32698 placement
function remoteMcpToolName(name) {
  return buildMcpToolName(CLAUDE_CODE_REMOTE, name);
}
//@ chunk-1kk50rk6.js:32698-32897 placement
function getToolUseAndResultIds(row) {
  return (row.type === "user" || row.type === "assistant") && Array.isArray(row.message.content)
    ? row.message.content.flatMap((contentBlock) =>
        contentBlock.type === "tool_use"
          ? [contentBlock.id]
          : contentBlock.type === "tool_result"
            ? [contentBlock.tool_use_id]
            : [],
      )
    : [];
}
//@ chunk-1kk50rk6.js:32897-32985 placement
function isToolResultsOnlyForIds(row, callIds) {
  return (
    isToolResultOnlyUserMessage(row) &&
    row.message.content.every((block) => callIds.includes(block.tool_use_id))
  );
}
//@ chunk-1kk50rk6.js:32985-33055 placement
function arraysEqual(toolUseAndResultIds, toolUseAndResultIds_2) {
  return (
    toolUseAndResultIds.length === toolUseAndResultIds_2.length &&
    toolUseAndResultIds.every((a, b) => a === toolUseAndResultIds_2[b])
  );
}
//@ chunk-1kk50rk6.js:33055-33095 placement
var handoffWithoutMessagesSchema; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1kk50rk6.js:33055", () => {
  handoffWithoutMessagesSchema = DoctorLazy(() =>
    SDKTurnHandoffTurnHandoffMessageSchema().omit({
      messages: true,
    }),
  );
});
//@ chunk-1kk50rk6.js:33095-33202 placement
function arrayTooBigMessage(value, limit) {
  return Array.isArray(value) && value.length > limit
    ? `Too big: expected array to have <=${limit} items`
    : undefined;
}
//@ chunk-1kk50rk6.js:33202-33281 placement
function issuePathString(path) {
  return path !== undefined && path.length > 0 ? path.map(String).join(".") : "request";
}
//@ chunk-1kk50rk6.js:33281-33349 placement
var VERIFIED_BY_GATE = "VERIFIED_BY_GATE";
var REFUSE = "refuse";
var TENGU_STRUCTURED_BLOSSOM = "tengu_structured_blossom";
//@ chunk-1kk50rk6.js:33349-33575 placement
/**
 * 按设备证明状态与等级下限判 pass/drop；状态缺省（UNSPECIFIED）时由 unstamped 选项决定是否放行。
 */
function judgeDeviceAttestationLevel(frame, { floor = VERIFIED_BY_GATE, unstamped = REFUSE } = {}) {
  let status = normalizeAttestationStatus(frame.device_attestation_status);
  if (meetsAttestationLevel(status, floor))
    return {
      verdict: "pass",
      status,
    };
  if (status === "UNSPECIFIED" && unstamped === "pass")
    return {
      verdict: "pass",
      status,
    };
  return {
    verdict: "drop",
    status,
  };
}
//@ chunk-1kk50rk6.js:33575-33662 placement
function dropServiceVouchedAttestation(frame) {
  let verdict = judgeDeviceAttestationLevel(frame);
  return verdict.status === "SERVICE_VOUCHED"
    ? {
        ...verdict,
        verdict: "drop",
      }
    : verdict;
}
//@ chunk-1kk50rk6.js:33662-33822 placement
var ATTESTED_REQUEST_SUBTYPES; // deferred: uses HOSTED_SESSION_REFUSAL_TEXT (../cloudSession/hostedSessionRestrictions.js) of its import cycle while loading; runs once the cycle is complete
var UNAPPROVED_SETTINGS_KEYS;
deferInit("chunk-1kk50rk6.js:33662", () => {
  ATTESTED_REQUEST_SUBTYPES = new Set([
    "remote_tools_announce",
    "register_device_hooks",
    "upload_device_hook_template",
    "apply_flag_settings",
  ]);
  UNAPPROVED_SETTINGS_KEYS = new Set([...CLOUD_ALLOWED_SETTINGS_KEYS, "switchModelsOnFlag"]);
});
//@ chunk-1kk50rk6.js:33822-33904 layout
function unapprovedSettingsKeys(settings) {
  let allowedKeys = UNAPPROVED_SETTINGS_KEYS;
  return Object.keys(settings).filter((key) => !allowedKeys.has(key) && settings[key] !== null);
}
//@ chunk-1kk50rk6.js:33904-34243 placement
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
    let settings = asPlainObject(request.settings);
    return settings !== undefined &&
      (Object.hasOwn(settings, CLOUD_PLUGINS_FORWARDED_KEY) || unapprovedSettingsKeys(settings).length > 0)
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
  ensureFreshGrowthBook,
  awaitCarriedWritesFlag,
  REWIND_REQUEST_MAX_AGE_MS,
  applyTurnHandoff,
  attestedRequestSubtype,
  unapprovedSettingsKeys,
  dropServiceVouchedAttestation,
  judgeDeviceAttestationLevel,
  TENGU_STRUCTURED_BLOSSOM,
  turnHandoffAvailableMessage,
  waitForTurnPromptUploads,
  turnHandoffRegistration,
  logHandoffFlagAdvert,
  markSaidCarriedWrites,
  withEnvelopeFlag,
  carriedWritePermissionRefusal,
  findFileWriteTool,
};
