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
import { ge } from "../../utils/identity.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { withDeadline } from "../../utils/sleep.js";
import { DoctorLazy } from "../handlers/util.js";
import { zodStrictObject, o, pe, oe } from "../../../vendor/zod/v4/classic/schemas.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { findToolByName } from "../../Tool.js";
import { homePathProblem, PGn } from "../../utils/filePersistence/homeFilePublish.js";
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
import { jKt, findLastToolUseAssistantMessage } from "../../utils/messages/messagePredicates.js";
import { Die, hasTeammateMessageEnvelope } from "../../bridge/inboundMessageOrigin.js";
import { SDKTurnHandoffTurnHandoffMessageSchema } from "../../entrypoints/sdk/controlSchemas.js";
import { toInternalMessages } from "../../utils/messages/mappers.js";
import { Nzr } from "../../utils/attachments/bridgeAttachments.js";
import { sanitizeTelemetryString } from "../../utils/sanitization.js";
import { isClaudeCodeRemoteServer } from "../../services/mcp/agentRequestMeta.js";
import { i3s } from "../../services/tools/toolExecution.js";
import { mcpInfoFromString, buildMcpToolName } from "../../services/mcp/mcpStringUtils.js";
import { count } from "../../utils/collections.js";
import { isToolResultMessage, isNotEmptyMessage } from "../../utils/messages.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../../utils/debug.js";
import { j5s } from "../../utils/permissions/permissions.js";
import { isToolResultOnlyUserMessage } from "../../services/api/claude.js";
import { normalizeAttestationStatus, meetsAttestationLevel } from "../../bridge/deviceAttestation.js";
import { jgt } from "../sdkMcpManifests.js";
import { CLOUD_PLUGINS_FORWARDED_KEY } from "../../utils/plugins/cloudPluginForwarding.js";

//@ chunk-z4g2ta8k.js:11186-11240 placement
function BNt() {
  return !isDiskless() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_steady_puppy", !1);
}
//@ chunk-z4g2ta8k.js:11361-11426 placement
function Pt(e, n) {
  if (!n) return e;
  return { ...(isPlainObject(e) ? e : {}), envelope: !0 };
}
//@ chunk-z4g2ta8k.js:11456-11510 placement
var rt = ge({ inFlight: void 0 }, (e) => {
  e.inFlight = void 0;
});
/**
 * 确保 GrowthBook 特性是新鲜的：初始化后若不新鲜则发起（合并并发的）刷新并等待。
 */
//@ chunk-z4g2ta8k.js:11510-11658 placement
async function ensureFreshGrowthBook() {
  if ((await initializeGrowthBook().catch(() => null), hasFreshGrowthBookFeatures())) return;
  ((rt.inFlight ??= refreshGrowthBookFeatures()
    .catch(() => {})
    .finally(() => {
      rt.inFlight = void 0;
    })),
    await rt.inFlight);
}
//@ chunk-z4g2ta8k.js:11658-11693 placement
var ur = 3000,
  TENGU_FIZZY_PETAL = "tengu_fizzy_petal";
//@ chunk-z4g2ta8k.js:11693-11772 placement
function ze() {
  let { source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_FIZZY_PETAL, !1);
  return { on: readFlagWithOverride(TENGU_FIZZY_PETAL, { safe: !1 }), served: isServedFeatureSource(source) };
}
//@ chunk-z4g2ta8k.js:11772-11802 placement
function aQe() {
  return ze().on;
}
//@ chunk-z4g2ta8k.js:11802-11953 placement
function logHandoffFlagAdvert() {
  logEvent("tengu_turn_handoff_flag_wait", {
    capability: lit("carried_writes"),
    at: lit("advert"),
    waited_ms: 0,
    ended: lit(ze().served ? "served" : "not_served"),
  });
}
/**
 * 回合开始时在时限内等待 carried_writes 特性开关就绪，记录等待耗时事件，返回该能力是否开启。
 */
//@ chunk-z4g2ta8k.js:11953-12221 placement
async function awaitCarriedWritesFlag(e = ur) {
  if (!ze().served) {
    let startTime = performance.now();
    (await withDeadline(ensureFreshGrowthBook(), e),
      logEvent("tengu_turn_handoff_flag_wait", {
        capability: lit("carried_writes"),
        at: lit("turn_start"),
        waited_ms: Math.round(performance.now() - startTime),
        ended: lit(ze().served ? "served" : "not_served"),
      }));
  }
  return aQe();
}
//@ chunk-z4g2ta8k.js:12221-12285 placement
var xt = ge({ saidCarriedWrites: !1 }, (e) => {
  e.saidCarriedWrites = !1;
});
//@ chunk-z4g2ta8k.js:12285-12323 placement
function Lt() {
  xt.saidCarriedWrites = !0;
}
//@ chunk-z4g2ta8k.js:12323-12366 placement
function jDs() {
  return xt.saidCarriedWrites;
}
//@ chunk-z4g2ta8k.js:12366-13422 placement
var CARRIED_WRITE_REFUSALS = 16,
  Bt = 8388608,
  lr = 1024,
  cr = {
    would_ask: "this session's permission mode would ask before a Write",
    auto_mode: "carried Writes are not placed in auto mode",
  },
  Ht = {
    switched_off: "carried Writes are not switched on just now, though this worker announced them",
    no_write_tool: "this session's Write tool is missing or is not the built-in one",
    odd_input: "an answered Write's input is not a path and content alone",
    result_text: "an answered Write's result is not the Write tool's success text",
    edited: "an Edit or NotebookEdit in the turn may have changed a file a Write made",
    refused_name: "an answered Write names a file that may not be written under the home directory",
    nested: "one answered Write's file is a directory on another's path",
    too_many: `the answered Writes name more than ${CARRIED_WRITE_REFUSALS} files`,
    too_large: `the answered Writes hold more than ${Bt} bytes`,
    not_home: "this session's working directory is not its home directory",
    ...cr,
  },
  fr = DoctorLazy(() => zodStrictObject({ file_path: o(), content: o() })),
  pr = DoctorLazy(() => pe(o(), oe())),
  mr = new Map([
    [FILE_WRITE_TOOL_NAME, "file_path"],
    [FILE_EDIT_TOOL_NAME, "file_path"],
    [NOTEBOOK_EDIT_TOOL_NAME, "notebook_path"],
  ]);
//@ chunk-z4g2ta8k.js:13422-13500 placement
function $Pr(e, n) {
  let r = findToolByName(e, FILE_WRITE_TOOL_NAME, n);
  return r?.name === FILE_WRITE_TOOL_NAME && r.isMcp !== !0 ? r : void 0;
}
//@ chunk-z4g2ta8k.js:13500-15125 placement
function collectCarriedWrites(e, n, r) {
  let s = new Map(),
    h = new Set();
  for (let O of e) {
    if (O.type !== "user" || !Array.isArray(O.message.content)) continue;
    for (let A of O.message.content) {
      if (A.type !== "tool_result") continue;
      let x = s.has(A.tool_use_id);
      if ((s.set(A.tool_use_id, x ? void 0 : getSoleTextContent(A.content)), x)) h.delete(A.tool_use_id);
      else if (A.is_error === !0) h.add(A.tool_use_id);
    }
  }
  let y = new Map(),
    S = new Set(),
    k = !1;
  for (let O of e) {
    if (O.type !== "assistant" || !Array.isArray(O.message.content)) continue;
    for (let A of O.message.content) {
      let x = A.type === "tool_use" ? mr.get(A.name) : void 0;
      if (A.type !== "tool_use" || x === void 0 || !s.has(A.id) || h.has(A.id)) continue;
      let U = pr().safeParse(A.input).data?.[x];
      if (typeof U !== "string") {
        if (A.name === FILE_WRITE_TOOL_NAME) return "odd_input";
        k = !0;
        continue;
      }
      let M = homeRelativePath(U, n);
      if (M === void 0) continue;
      if (A.name !== FILE_WRITE_TOOL_NAME) {
        S.add(M);
        continue;
      }
      let safeParse = fr().safeParse(A.input);
      if (!safeParse.success) return "odd_input";
      if (r === void 0) return "no_write_tool";
      let { file_path: file_path, content: content } = safeParse.data,
        G = s.get(A.id);
      if (
        G === void 0 ||
        !["create", "update"].some(
          (L) => r.mapToolResultToToolResultBlockParam({ type: L, filePath: file_path }, A.id).content === G,
        )
      )
        return "result_text";
      y.set(M, {
        relativePath: M,
        filePath: file_path,
        content: content,
        toolUseID: A.id,
        assistantMessage: O,
      });
    }
  }
  if (y.size === 0) return;
  if (k) return "edited";
  if (y.size > CARRIED_WRITE_REFUSALS) return "too_many";
  let P = 0;
  for (let { relativePath: relativePath, filePath: filePath, content: content } of y.values()) {
    if (S.has(relativePath)) return "edited";
    if (
      homePathProblem(relativePath) !== void 0 ||
      !isWellFormedString(filePath) ||
      Buffer.byteLength(relativePath) > lr ||
      relativePath.split(posix.sep).some((U) => U === "" || Buffer.byteLength(U) > PGn)
    )
      return "refused_name";
    for (let dir = posix.dirname(relativePath); dir !== "."; dir = posix.dirname(dir))
      if (y.has(dir)) return "nested";
    P += Buffer.byteLength(content);
  }
  if (P > Bt) return "too_large";
  return n.cwd === n.home ? [...y.values()] : "not_home";
}
//@ chunk-z4g2ta8k.js:15125-15200 placement
function W1n(e) {
  if (!isAutoClassifierActive(e)) return;
  return e === "auto" ? "auto_mode" : "would_ask";
}
//@ chunk-z4g2ta8k.js:15200-15302 placement
function homeRelativePath(e, { cwd: cwd, home: home }) {
  let s = expandPathOrNull(e, cwd);
  return s?.startsWith(home + posix.sep) ? s.slice(home.length + 1) : void 0;
}
//@ chunk-z4g2ta8k.js:15302-15499 placement = extractErrorTypeFromData (1)
function getSoleTextContent(data) {
  if (typeof data === "string") return data;
  let n = data?.length === 1 ? data[0] : void 0;
  return typeof n === "object" &&
    n !== null &&
    "type" in n &&
    n.type === "text" &&
    "text" in n &&
    typeof n.text === "string"
    ? n.text
    : void 0;
}
//@ chunk-z4g2ta8k.js:15499-15540 placement
function ot(e) {
  try {
    e();
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-z4g2ta8k.js:15540-16947 placement
function waitForTurnPromptUploads({
  listTurnPromptsWaitedOn: listTurnPromptsWaitedOn,
  write: write,
  now: now = () => performance.now(),
}) {
  let s = null,
    h = { kind: "none" },
    y = new Set();
  function S(P, O) {
    ((h = { kind: "uploading", isFor: "this_wait", isRunnerTold: O }),
      (y = new Set(listTurnPromptsWaitedOn())));
    let A = now();
    (ot(P.onBegan),
      (async () => P.upload())()
        .catch((x) => (logError(toError(x)), "rejected"))
        .then((x) => k(P, x, now() - A)));
  }
  function k(P, O, A) {
    let { isFor: isFor, isRunnerTold: isRunnerTold } =
      h.kind === "uploading" ? h : { isFor: "nobody", isRunnerTold: !1 };
    if (isFor === "a_later_wait") {
      (ot(() => P.onAnswered({ outcome: O, ms: A, ledTo: "uploads_again" })), S(P, isRunnerTold));
      return;
    }
    if (
      ((h = { kind: isFor === "this_wait" ? "told" : "none" }),
      ot(() =>
        P.onAnswered({
          outcome: O,
          ms: A,
          ledTo:
            isFor === "nobody"
              ? "user_answered_first"
              : isRunnerTold
                ? "runner_told_ahead_of_result"
                : "runner_told",
        }),
      ),
      isFor === "this_wait" && !isRunnerTold)
    )
      write();
  }
  return {
    stateChanged() {
      let P = s === null ? [] : listTurnPromptsWaitedOn(),
        O = h.kind === "none" || (h.kind === "uploading" && h.isFor === "nobody"),
        A = P.some((x) => !y.has(x)) || (P.length > 0 && O && P.length < y.size);
      if (h.kind === "uploading") {
        if (P.length === 0) {
          if (h.isFor === "a_later_wait") y = new Set();
          ((h = { kind: "uploading", isFor: "nobody", isRunnerTold: !1 }), write());
          return;
        }
        if (A) h = { ...h, isFor: "a_later_wait" };
        else if (h.isFor === "nobody") h = { ...h, isFor: "this_wait" };
        if (h.isRunnerTold) write();
        return;
      }
      if (s === null || !A) {
        ((h = { kind: P.length > 0 ? "told" : "none" }), write());
        return;
      }
      S(s, !1);
    },
    resultGoesNext() {
      if (h.kind === "uploading" && h.isFor !== "nobody" && !h.isRunnerTold)
        ((h = { ...h, isRunnerTold: !0 }), write());
    },
    setUploadAhead(P) {
      if (((s = P), P === null && h.kind === "uploading"))
        h = { kind: "uploading", isFor: "nobody", isRunnerTold: !1 };
    },
  };
}
//@ chunk-z4g2ta8k.js:16984-17071 placement
var gr = [
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
  ...[...TRIGGER_TOOL_NAMES, ...REPO_TOOL_NAMES].map(vr),
];
/**
 * 判断回合交接是否可用：仅限托管云 worker（有 SDK 地址与远程会话 id、非自定义环境）且未被禁用。
 */
//@ chunk-z4g2ta8k.js:17071-17307 placement
function turnHandoffAdmission(e) {
  if (!e.sdkUrl || !e.remoteSessionId || e.environmentKind !== void 0)
    return { admitted: !1, reason: "not_managed_cloud_worker" };
  if (e.disabled) return { admitted: !1, reason: "disabled" };
  return { admitted: !0, tools: gr, hydratesCarriedLines: !1 };
}
/**
 * 判断是否携带在途写入：交接已准入、配置了中继、持久化转录且不是共享后端。
 */
//@ chunk-z4g2ta8k.js:17307-17410 placement
function shouldCarryWrites(e) {
  return e.admission.admitted && e.relayConfigured && e.persistsTranscript && !e.sharedBackend;
}
/**
 * 生成 worker 注册时声明的 turn_handoff 能力（工具、epoch、暂存文件、relay 标记、home 文件与携带写入等）；未准入且原因是 disabled 时显式发 null。
 */
//@ chunk-z4g2ta8k.js:17410-17785 placement
function turnHandoffRegistration(e, n, r, s, h) {
  if (e.admitted)
    return {
      turn_handoff: {
        v: 1,
        tools: e.tools,
        worker_epoch: n,
        staged_files: !0,
        no_query_first: !0,
        shared_message_id: !0,
        requires_rewind_request_id: !0,
        ...(r && { relay_marker: !0 }),
        ...(s && { home_files: !0, file_names: !0, ...(h && { carried_writes: !0 }) }),
        ...(e.hydratesCarriedLines && { hydrates_carried_lines: !0 }),
      },
    };
  return e.reason === "disabled" ? { turn_handoff: null } : void 0;
}
/**
 * 把外部元数据里的 turn_handoff 能力转成 system/turn_handoff_available 消息（带 uuid 与 session_id），只复制已声明为真的可选能力。
 */
//@ chunk-z4g2ta8k.js:17785-18332 placement
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
    ...(handoff.requires_rewind_request_id && { requires_rewind_request_id: !0 }),
    ...(handoff.relay_marker && { relay_marker: !0 }),
    ...(handoff.home_files && { home_files: !0 }),
    ...(handoff.file_names && { file_names: !0 }),
    ...(handoff.carried_writes && { carried_writes: !0 }),
    ...(handoff.hydrates_carried_lines && { hydrates_carried_lines: !0 }),
  };
}
//@ chunk-z4g2ta8k.js:18332-18463 placement
var RECOVERED_BY_RESTART_NOTE =
  "recovered_by_restart: this worker restarted after the turn was appended and its recovery set the turn's unrun calls aside";
//@ chunk-z4g2ta8k.js:18463-18528 placement
function WDs(e, n) {
  return { requestId: e, tipUuid: jKt(n)?.uuid ?? null };
}
//@ chunk-z4g2ta8k.js:18528-18571 placement
var BPr = 1800000,
  Sr = 4096,
  wr = 200,
  it = 16,
  Rr = 16;
/**
 * 计算 rewind 请求的年龄：以服务端时间（或本机与最新帧时间的较大者）减去存储时间。
 */
//@ chunk-z4g2ta8k.js:18571-18691 placement
function rewindRequestAge({
  storedAt: storedAt,
  serviceNow: serviceNow,
  newestFrameAt: newestFrameAt,
  machineNow: machineNow,
}) {
  if (storedAt === void 0) return;
  return (serviceNow ?? Math.max(machineNow, newestFrameAt ?? machineNow)) - storedAt;
}
/**
 * 把服务端时钟下的存储时间换算到本机时钟。
 */
//@ chunk-z4g2ta8k.js:18691-18792 placement
function serviceClockStoredAt({ storedAt: storedAt, serviceNow: serviceNow, machineNow: machineNow }) {
  if (storedAt === void 0 || serviceNow === void 0) return;
  return machineNow - (serviceNow - storedAt);
}
/**
 * 云 worker 接手回合（turn_handoff）：校验交接载荷（消息、tool_use_ids、记忆上下文、required rewind），把消息追加到本地转录并恢复在途写入，非法时返回 invalid_handoff。
 */
//@ chunk-z4g2ta8k.js:18792-31502 placement
function applyTurnHandoff(e, n) {
  let {
    relay_marker: relay_marker,
    memory_context: memory_context,
    message_client_platform: message_client_platform,
    file_names: file_names,
    ...S
  } = e;
  for (let [w, I] of [
    ["messages", wr],
    ["tool_use_ids", it],
  ]) {
    let H = arrayTooBigMessage(e[w], I);
    if (H !== void 0) return { kind: "error", error: `invalid_handoff: ${w} ${H}` };
  }
  let messages = e.messages,
    P = Array.isArray(messages) ? messages : [];
  for (let [w, I] of P.entries()) {
    let H = typeof I === "object" && I !== null && "message" in I ? I.message : void 0,
      se = arrayTooBigMessage(typeof H === "object" && H !== null && "content" in H ? H.content : void 0, Sr);
    if (se !== void 0)
      return { kind: "error", error: `invalid_handoff: messages.${w}.message.content ${se}` };
  }
  let O =
      typeof message_client_platform === "string" && Die(message_client_platform)
        ? message_client_platform
        : void 0,
    element = SDKTurnHandoffTurnHandoffMessageSchema().shape.messages.element;
  for (let [w, I] of P.entries()) {
    let H = typeof I === "object" && I !== null && "type" in I ? I.type : void 0;
    if (element.options.find((option) => option.shape.type.value === H)?.safeParse(I).success !== !0)
      return { kind: "error", error: `invalid_handoff: messages.${w} Invalid input` };
  }
  let safeParse = (P.length > 0 ? kr() : SDKTurnHandoffTurnHandoffMessageSchema()).safeParse(S);
  if (!safeParse.success)
    return {
      kind: "error",
      error: `invalid_handoff: ${br(safeParse.error.issues[0]?.path)} ${safeParse.error.issues[0]?.message ?? "unparseable"}`,
    };
  let { messages: messages_2, tool_use_ids: tool_use_ids } = e;
  if (new Set(tool_use_ids).size !== tool_use_ids.length)
    return { kind: "error", error: "invalid_handoff: tool_use_ids repeat" };
  if (new Set(messages_2.map((w) => w.uuid)).size !== messages_2.length)
    return { kind: "error", error: "invalid_handoff: message uuids repeat" };
  for (let [w, I] of messages_2.entries()) {
    if (typeof I.uuid !== "string")
      return { kind: "error", error: "invalid_handoff: every message needs a uuid" };
    if (
      (I.type === "user" && (I.isSynthetic === !0 || I.is_virtual)) ||
      (I.type === "assistant" && (I.is_meta === !0 || I.is_virtual))
    )
      return { kind: "error", error: `invalid_handoff: messages.${w} is not a plain conversation line` };
  }
  let mapped = toInternalMessages(
      messages_2.map((w) =>
        w.type === "user"
          ? {
              type: "user",
              uuid: w.uuid,
              session_id: w.session_id,
              parent_tool_use_id: null,
              message: w.message,
              timestamp: w.timestamp,
              tool_result_meta: w.tool_result_meta,
            }
          : {
              type: "assistant",
              uuid: w.uuid,
              session_id: w.session_id,
              parent_tool_use_id: null,
              message: w.message,
            },
      ),
    ).map((w, I) => {
      if (w.type !== "assistant" && w.type !== "user") return w;
      let H = messages_2[I],
        se = "image_file_uuids" in H ? H.image_file_uuids : void 0;
      return {
        ...w,
        handedOff: !0,
        ...(w.type === "user" &&
          Array.isArray(se) &&
          se.length > 0 &&
          se.length <= Nzr(w.message.content) &&
          se.every((Ee) => typeof Ee === "string") && { imageFileUuids: se }),
        ...(I === 0 &&
          w.type === "user" &&
          O !== void 0 &&
          !hasTeammateMessageEnvelope(w.message.content) && { origin: { kind: "human" } }),
      };
    }),
    at = mapped.at(-1),
    z = mapped[0],
    G = O !== void 0 && z?.type === "user" && !hasTeammateMessageEnvelope(z.message.content) ? O : void 0;
  if (mapped.length !== messages_2.length || at?.type !== "assistant")
    return { kind: "error", error: "invalid_handoff: the last message is not an assistant message" };
  for (let w of mapped)
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
  if (Array.isArray(at.message.content))
    for (let w of at.message.content) {
      if (w.type !== "tool_use") continue;
      if (L.has(w.id))
        return { kind: "error", error: `invalid_handoff: tool_use ${sanitizeTelemetryString(w.id)} repeats` };
      L.set(w.id, w);
    }
  let j;
  if (tool_use_ids.length > 0) {
    if (e.stopped) return { kind: "error", error: "invalid_handoff: a stopped turn names no calls to run" };
    j = "run";
  } else if (e.stopped) {
    if (L.size === 0)
      return { kind: "error", error: "invalid_handoff: a stopped turn ends with calls that have not run" };
    j = "stopped";
  } else j = "history";
  let ae = new Set(),
    de = new Set();
  for (let message of n.messages) {
    if ((message.type !== "user" && message.type !== "assistant") || !Array.isArray(message.message.content))
      continue;
    for (let I of message.message.content)
      if (message.type === "assistant" && I.type === "tool_use") ae.add(I.id);
      else if (message.type === "user" && I.type === "tool_result") de.add(I.tool_use_id);
  }
  let ne = (w) => n.handledToolUseIds.has(w) || de.has(w),
    filtered = (n.mcpClients ?? []).filter(isClaudeCodeRemoteServer);
  for (let w of tool_use_ids) {
    let I = L.get(w);
    if (I === void 0)
      return {
        kind: "error",
        error: `invalid_handoff: tool_use ${sanitizeTelemetryString(w)} is not in the last message`,
      };
    if (!n.acceptedTools.includes(I.name))
      return { kind: "error", error: `unsupported_tool: ${sanitizeTelemetryString(I.name)}` };
    if (ne(w)) continue;
    let H = findToolByName(n.tools, I.name, n.toolAliases) !== void 0,
      se = i3s(I.name, filtered);
    if (mcpInfoFromString(I.name) === null ? !H : filtered.length === 0 || (!H && !se))
      return { kind: "error", error: `unknown_tool: ${sanitizeTelemetryString(I.name)}` };
  }
  let ue = new Set(n.messages.map((message) => message.uuid)),
    Z = 0,
    be = !1;
  if (j === "run") {
    if (tool_use_ids.every((H) => n.recoveredToolUseIds.has(H)) && !tool_use_ids.every((H) => de.has(H)))
      return { kind: "error", error: RECOVERED_BY_RESTART_NOTE };
    let w = count(tool_use_ids, ne);
    if (w === tool_use_ids.length) return { kind: "duplicate" };
    if (w > 0)
      return {
        kind: "error",
        error: "invalid_handoff: some of the named calls are already taken or answered",
      };
    let I = mapped[0];
    if (I?.type !== "user" || isToolResultMessage(I) || !isNotEmptyMessage(I))
      return {
        kind: "error",
        error:
          "invalid_handoff: a request that names calls to run must start with the user's message, not empty and not a tool result",
      };
    if (n.requestAgeMs !== void 0 && n.requestAgeMs > BPr)
      return {
        kind: "error",
        error: `expired: the session service has held this request for over ${BPr / 60000} minutes; its calls were not run`,
        expiredAtAgeMs: n.requestAgeMs,
      };
    if (n.pendingHandoff)
      return { kind: "error", error: "invalid_handoff: another handed-off turn is still queued" };
    if (n.runningHandoff)
      return { kind: "error", error: "invalid_handoff: another handed-off turn is still running" };
    if (mapped.some((H) => ue.has(H.uuid)))
      return {
        kind: "error",
        error: "invalid_handoff: the turn carries messages the conversation already holds",
      };
  } else {
    let w = findLastToolUseAssistantMessage(mapped),
      I = (ee) => findLastToolUseAssistantMessage(ee.messages)?.uuid === w.uuid;
    if (n.runningHandoff && I(n.runningHandoff))
      return {
        kind: "duplicate",
        ...(j === "stopped" && n.runningHandoff.kind === "run" && { stopRunning: !0 }),
      };
    if (n.pendingHandoff && I(n.pendingHandoff)) {
      if (n.pendingHandoff.kind === j || n.pendingHandoff.kind === "stopped") return { kind: "duplicate" };
      let messages = n.pendingHandoff.messages,
        ie = messages.findIndex((Pe) => Pe.uuid === w.uuid) + 1 || messages.length;
      if (
        mapped.length < ie ||
        messages
          .slice(0, ie)
          .some(
            (Pe, nt) =>
              mapped[nt].uuid !== Pe.uuid ||
              mapped[nt].type !== Pe.type ||
              !Yt(getToolUseAndResultIds(mapped[nt]), getToolUseAndResultIds(Pe)),
          )
      )
        return {
          kind: "error",
          error: "invalid_handoff: the turn does not carry the lines of its pending delivery",
        };
      be = !0;
    }
    let H = new Map(n.messages.map((message) => [message.uuid, message]));
    while (Z < mapped.length && H.has(mapped[Z].uuid)) {
      let ee = mapped[Z],
        ie = H.get(ee.uuid);
      if (ie.type !== ee.type || !Yt(getToolUseAndResultIds(ie), getToolUseAndResultIds(ee)))
        return {
          kind: "error",
          error: "invalid_handoff: the turn carries messages the conversation already holds",
        };
      Z++;
    }
    if (mapped.some((ee, ie) => ie > Z && ue.has(ee.uuid)))
      return {
        kind: "error",
        error: "invalid_handoff: the turn carries messages the conversation already holds out of order",
      };
    let se = new Set();
    for (let message of n.messages)
      if (
        message.type === "user" &&
        Array.isArray(message.message.content) &&
        !mapped.some((ie, Pe) => Pe < Z && ie.uuid === message.uuid)
      ) {
        for (let ie of message.message.content) if (ie.type === "tool_result") se.add(ie.tool_use_id);
      }
    let Ee = getToolUseAndResultIds(w),
      Tt = count(Ee, (ee) => se.has(ee));
    if (Ee.length > 0 && Tt === Ee.length) return { kind: "duplicate" };
    if (Tt > 0) return { kind: "error", error: "invalid_handoff: some of the calls are already answered" };
    if (Z < mapped.length && Ee.length > 0 && Ee.every((ee) => n.recoveredToolUseIds.has(ee)))
      return { kind: "error", error: RECOVERED_BY_RESTART_NOTE };
    for (let ee of mapped.slice(0, Z)) {
      let ie = H.get(ee.uuid);
      if ((ie.type !== "assistant" && ie.type !== "user") || ie.handedOff !== !0)
        return {
          kind: "error",
          error: "invalid_handoff: the turn carries messages the conversation already holds",
        };
    }
    if (Z > 0 && !(j === "history" && Z === mapped.length) && jKt(n.messages)?.uuid !== mapped[Z - 1].uuid)
      return {
        kind: "error",
        error: "invalid_handoff: the conversation has moved on past the part of the turn it holds",
      };
    if (n.pendingHandoff && !be)
      return { kind: "error", error: "invalid_handoff: another handed-off turn is still queued" };
    if (n.runningHandoff)
      return { kind: "error", error: "invalid_handoff: another handed-off turn is still running" };
  }
  let requires_rewind_request_id = e.requires_rewind_request_id;
  if (requires_rewind_request_id !== void 0 && Z === 0 && !be) {
    let w = sanitizeTelemetryString(requires_rewind_request_id),
      appliedRewind = n.appliedRewind;
    if (appliedRewind === void 0)
      return requiredRewindError(
        "unknown",
        `this worker has carried out no rewind_conversation: request ${w} was answered by an earlier worker, refused, or not read yet`,
      );
    if (appliedRewind.requestId !== requires_rewind_request_id)
      return requiredRewindError(
        "other",
        `the last rewind this worker carried out is not rewind_conversation request ${w}: that one was refused, not read yet, or followed by another rewind`,
      );
    if ((jKt(n.messages)?.uuid ?? null) !== appliedRewind.tipUuid)
      return requiredRewindError(
        "moved_on",
        `the conversation has moved on since rewind_conversation request ${w} cut it`,
      );
    if (n.linesWaitingAhead === !0)
      return requiredRewindError(
        "lines_waiting",
        `other messages or a turn in progress wait to be added before this turn since rewind_conversation request ${w} cut it`,
      );
  }
  if (j === "stopped" && L.size > it)
    return { kind: "error", error: `invalid_handoff: a stopped turn ends with more than ${it} calls` };
  let sliced = mapped.slice(Z),
    Ae = n.refusalOfAppended?.(sliced);
  if (Ae !== void 0) return { kind: "error", error: `invalid_handoff: ${Ae}` };
  let Be = new Set(be ? n.pendingHandoff.messages.flatMap(getToolUseAndResultIds) : []),
    _e = new Set();
  for (let message of n.messages)
    if (message.type === "assistant" && typeof message.message.id === "string") _e.add(message.message.id);
  let Me = new Set(),
    Te,
    Se = [],
    he = !1;
  for (let w of Z > 0 ? n.messages : [])
    if (w.type === "assistant")
      ((Te = w.handedOff === !0 ? w.message.id : void 0), (Se = getToolUseAndResultIds(w)), (he = !1));
    else if (w.type === "user") {
      if (((he = Kt(w, Se)), !he)) ((Te = void 0), (Se = []));
    }
  for (let w of sliced) {
    if (w.type !== "assistant") {
      if (((he = Kt(w, Se)), !he)) ((Te = void 0), (Se = []));
      continue;
    }
    let I =
      he &&
      w.message.id === Te &&
      Array.isArray(w.message.content) &&
      w.message.content.length > 0 &&
      w.message.content.every((H) => H.type === "tool_use");
    if (((Te = w.message.id), (Se = getToolUseAndResultIds(w)), (he = !1), I)) {
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
  let R = new Set(),
    W = new Set();
  for (let [w, I] of mapped.entries()) {
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
        if ((R.add(H.id), !(I === at && (j === "stopped" || tool_use_ids.includes(H.id))))) W.add(H.id);
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
  if ((j === "run" || j === "history") && relay_marker !== void 0 && relay_marker !== null) {
    let safeParse = SDKTurnHandoffTurnHandoffMessageSchema()
      .shape.relay_marker.unwrap()
      .safeParse(relay_marker);
    Y = safeParse.success ? { uuid: safeParse.data.uuid, content: safeParse.data.content } : "malformed";
  }
  let we;
  if (
    (j === "run" || (j === "history" && !mapped.some((w) => ue.has(w.uuid)))) &&
    memory_context !== void 0 &&
    memory_context !== null
  ) {
    let safeParse = SDKTurnHandoffTurnHandoffMessageSchema()
      .shape.memory_context.unwrap()
      .safeParse(memory_context);
    if (!safeParse.success)
      logForDebugging(
        `turn_handoff: ${["memory_context", ...(safeParse.error.issues[0]?.path ?? [])].map(String).join(".")}: ${safeParse.error.issues[0]?.message ?? "unparseable"}; the turn goes on without it`,
        { level: "warn" },
      );
    else if ((safeParse.data.version === null) !== (safeParse.data.content === null))
      logForDebugging(
        `turn_handoff: memory_context has ${safeParse.data.version === null ? "content but no version" : "a version but no content"}; the turn goes on without it`,
        { level: "warn" },
      );
    else if (
      ue.has(safeParse.data.uuid) ||
      mapped.some((I) => I.uuid === safeParse.data.uuid) ||
      safeParse.data.uuid === relay_marker?.uuid
    )
      logForDebugging(
        "turn_handoff: memory_context.uuid is already used in the request or the conversation; the turn goes on without it",
        { level: "warn" },
      );
    else {
      let { uuid: uuid, version: version, content: content } = safeParse.data;
      we = createAttachmentMessage(
        { type: "cowork_memory_context", version: version, content: content },
        { now: () => new Date().toISOString(), uuid: () => uuid },
      );
    }
  }
  let ce;
  if (j === "run" && file_names !== void 0 && file_names !== null) {
    let unwrap = SDKTurnHandoffTurnHandoffMessageSchema().shape.file_names.unwrap(),
      I = arrayTooBigMessage(file_names, Rr) === void 0 ? unwrap.safeParse(file_names) : void 0;
    if (I?.success !== !0) ce = "malformed";
    else if (I.data.length > 0) ce = I.data.map((H) => ({ fileUuid: H.file_uuid, name: H.name }));
  }
  let fe;
  if (j === "run" && n.carriedWrites) {
    let w = collectCarriedWrites(mapped, n.carriedWrites, $Pr(n.tools, n.toolAliases)),
      I =
        typeof w === "string"
          ? w
          : w && (n.carriedWrites.switchedOn ? W1n(n.carriedWrites.permissionMode) : "switched_off");
    if (I !== void 0)
      return { kind: "error", error: `invalid_handoff: carried_writes_${I}: ${Ht[I]}`, carriedWrites: I };
    fe = typeof w === "string" ? void 0 : w;
  }
  let filtered_2 = [...R].filter((w) => !ae.has(w) && (!n.handledToolUseIds.has(w) || Be.has(w)));
  for (let w of R) n.handledToolUseIds.add(w);
  let Ct = {
    kind: j,
    messages:
      j === "run"
        ? mapped.map((w, I) =>
            w.type === "assistant" && I === mapped.length - 1
              ? { ...w, handedOffLive: j5s(tool_use_ids) }
              : w,
          )
        : mapped,
    toolUseIDs: tool_use_ids,
    ...(Y !== void 0 && { relayMarker: Y }),
    ...(we && { memoryLine: we }),
    ...(ce !== void 0 && { fileNames: ce }),
    ...(fe !== void 0 && { carriedWrites: fe }),
    ...(Z > 0 && { continues: !0 }),
  };
  if (be) return { kind: "converted", handedOffTurn: Ct, taken: filtered_2 };
  return {
    kind: "accepted",
    handedOffTurn: Ct,
    taken: filtered_2,
    ...(G !== void 0 && { clientPlatform: G }),
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
function vr(e) {
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
function Kt(e, n) {
  return isToolResultOnlyUserMessage(e) && e.message.content.every((r) => n.includes(r.tool_use_id));
}
//@ chunk-z4g2ta8k.js:31949-32019 placement
function Yt(e, n) {
  return e.length === n.length && e.every((r, s) => r === n[s]);
}
//@ chunk-z4g2ta8k.js:32019-32059 placement
var kr = DoctorLazy(() => SDKTurnHandoffTurnHandoffMessageSchema().omit({ messages: !0 }));
//@ chunk-z4g2ta8k.js:32059-32166 placement
function arrayTooBigMessage(e, n) {
  return Array.isArray(e) && e.length > n ? `Too big: expected array to have <=${n} items` : void 0;
}
//@ chunk-z4g2ta8k.js:32166-32245 placement
function br(e) {
  return e !== void 0 && e.length > 0 ? e.map(String).join(".") : "request";
}
//@ chunk-z4g2ta8k.js:32245-32283 placement
var VERIFIED_BY_GATE = "VERIFIED_BY_GATE",
  REFUSE = "refuse";
/**
 * 按设备证明状态与等级下限判 pass/drop；状态缺省（UNSPECIFIED）时由 unstamped 选项决定是否放行。
 */
//@ chunk-z4g2ta8k.js:32283-32509 placement
function judgeDeviceAttestationLevel(e, { floor: n = VERIFIED_BY_GATE, unstamped: r = REFUSE } = {}) {
  let s = normalizeAttestationStatus(e.device_attestation_status);
  if (meetsAttestationLevel(s, n)) return { verdict: "pass", status: s };
  if (s === "UNSPECIFIED" && r === "pass") return { verdict: "pass", status: s };
  return { verdict: "drop", status: s };
}
//@ chunk-z4g2ta8k.js:32509-32596 placement
function Zt(e) {
  let n = judgeDeviceAttestationLevel(e);
  return n.status === "SERVICE_VOUCHED" ? { ...n, verdict: "drop" } : n;
}
//@ chunk-z4g2ta8k.js:32596-32714 placement
var ATTESTED_REQUEST_SUBTYPES = new Set([
  "remote_tools_announce",
  "register_device_hooks",
  "upload_device_hook_template",
  "apply_flag_settings",
]);
/**
 * 识别需要设备证明的 control_request 子类型：界面类返回 ui_surface，apply_flag_settings 只在带云插件转发键时算，其他非白名单子类型返回 undefined。
 */
//@ chunk-z4g2ta8k.js:32714-33069 placement
function attestedRequestSubtype(e) {
  let n = e.type === "control_request" ? e.request : void 0;
  if (typeof n !== "object" || n === null) return;
  let subtype = n.subtype;
  if (jgt(subtype)) return "ui_surface";
  if (typeof subtype !== "string" || !ATTESTED_REQUEST_SUBTYPES.has(subtype)) return;
  if (subtype === "apply_flag_settings") {
    let settings = n.settings;
    return typeof settings === "object" &&
      settings !== null &&
      !Array.isArray(settings) &&
      Object.hasOwn(settings, CLOUD_PLUGINS_FORWARDED_KEY)
      ? "apply_flag_settings"
      : void 0;
  }
  return subtype;
}

export {
  turnHandoffAdmission,
  shouldCarryWrites,
  BNt,
  aQe,
  jDs,
  WDs,
  rewindRequestAge,
  serviceClockStoredAt,
  W1n,
  $Pr,
  ensureFreshGrowthBook,
  awaitCarriedWritesFlag,
  applyTurnHandoff,
  BPr,
  attestedRequestSubtype,
  Zt,
  judgeDeviceAttestationLevel,
  turnHandoffAvailableMessage,
  waitForTurnPromptUploads,
  turnHandoffRegistration,
  logHandoffFlagAdvert,
  Lt,
  Pt,
};
