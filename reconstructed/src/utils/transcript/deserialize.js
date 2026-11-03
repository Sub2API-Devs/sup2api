/**
 * utils/transcript/deserialize.ts
 *
 * 2.1.316 新增：转录反序列化
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (82)
 * attribution: placement 82
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import { isFirstPartyApiBackend } from "../model/providers.js";
import { logForDebugging } from "../debug.js";
import { plural } from "../stringUtils.js";
import { logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { sMt, xgs, Gbr } from "../taggedId.js";
import { errorMessage } from "../errors.js";
import {
  u9n,
  _Qo,
  WORKER_RESTARTED_PROMPT,
  Ijr,
  deserializeMessagesWithInterruptDetection,
  g3e,
  Wtn,
  cKe,
  migrateLegacyAttachmentTypes,
  dropMalformedTextBlocks,
  isTailMessage,
  interruptedTurnResumePolicy,
  Jet,
  showsCutOffCalls,
  lastMessageAgeMs,
  newerMessage,
  refusalRetryMaxAge,
  isOlderThan,
  recordTailDiagnostics,
} from "../conversationRecovery.js";
import { assistantTurnKeys } from "../../cli/print.js";
import {
  BRIEF_TOOL_NAME as BRIEF_TOOL_NAME_2,
  LEGACY_BRIEF_TOOL_NAME as LEGACY_BRIEF_TOOL_NAME_2,
} from "../../tools/BriefTool/prompt.js";
import { SEND_USER_FILE_TOOL_NAME } from "../../tools/SendUserFileTool/prompt.js";
import { PUBLISH_PLUGIN_TOOL_NAME } from "../../tools/PublishPluginTool/prompt.js";
import { AGENT, TASK } from "../../tools/AgentTool/constants.js";
import { SKILL, SKILL_2 } from "../../tools/SkillTool/skillToolNames.js";
import { REPL_TOOL_NAME, REPL_TOOL_NAME_ALIAS } from "../../tools/REPLTool/constants.js";
import { WORKFLOW_TOOL_NAME } from "../../tools/WorkflowTool/constants.js";
import {
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
  AGENT_CALL_PROCESS_STOPPED,
  isShutdownInterrupted,
  singleTextContent,
  isTurnCompanion,
  isToolUseResultMessage,
  isInterruptionOnlyMessage,
  isContextAppendMessage,
  isSyntheticApiErrorMessage,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  isValidTurnPosition,
  regroupSplitResponsesOnResume,
  normalizeMessagesForResume,
  filterThinkingOnlyUntilStable,
  isNullRenderingAttachment_2,
  normalizeMessages,
  createUserMessage,
  createAssistantMessage,
  isContinuationPrompt,
  INTERRUPT_MESSAGE,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  isTurnNotEndedNotice,
  withRenderedAttachment,
  UUID_PREFIX_LENGTH,
} from "../messages.js";
import { SHELL_TOOL_NAMES as SHELL_TOOL_NAMES_2 } from "../shell/shellToolUtils.js";
import { isPlainObject as isPlainObject_3 } from "../objectUtils.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { getMcpPrefix as getMcpPrefix_2 } from "../../services/mcp/mcpStringUtils.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { isPlainObject as isPlainObject_4 } from "../isPlainObject.js";
import { INSTRUCTION_WITHHELD_REASONS } from "../instructionFileAccess.js";
import { isBareTaskNotificationOrigin } from "../backgroundSessionResume.js";
import { filterUuidList } from "../../cli/queuedCommands.js";
import { env } from "../env.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { CONNECTGITHUB } from "../../components/ConnectGitHub/constants.js";
import { EXITPLANMODE } from "../../tools/ExitPlanModeTool/constants.js";
import { OFFER_CHROME_SETUP_TOOL_NAME } from "../../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { SHOWONBOARDINGROLEPICKER } from "../../tools/ShowOnboardingRolePickerTool/ShowOnboardingRolePickerTool.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_3 } from "../../services/projects/threadRows.js";
import { SYNTHETIC_MODEL, NO_RESPONSE_REQUESTED } from "../../constants/messages.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { TENGU_MIGHTY_FLASK } from "../../services/api/withRetry.js";
import { filterStopHookSummariesOnResume } from "./transcriptRepair.js";
import { extractPluginPrompt } from "../messages/nonUserMessages.js";
import { countToolCallsSince_2, restoreWireInputStamps } from "../wireToolInputEcho.js";
import { PERMISSION_MODES } from "../../types/permissions.js";
import { PROMPT_ORIGIN_KINDS } from "../promptSource.js";
import { Z2 } from "../../bridge/deviceRegistration.js";
import { _Wt, apiErrorKind, Ljr, refusalKind } from "./turnClassification.js";
import { isFoamySpringEnabled } from "../../services/analytics/growthbookGates.js";
import { logEvent } from "../../services/analytics/index.js";
import { count } from "../collections.js";
import { CCS_NO_REQUEST_TOKEN } from "../../services/api/errors.js";
import { logError } from "../log.js";
import { jb, Pre, isSystemLocalCommandMessage } from "../../bootstrap/sessionSlices.js";
import { bashCommandTagKindOf, localCommandTagKindOf } from "../messages/localCommandTags.js";
import { looksLikeSlashInput } from "../../commands.js";
import { TASK_NOTIFICATION } from "../../constants/xml.js";
import { getToolEndsTurnKind } from "../../services/tools/mcpResultMeta.js";
import { isBriefEnabled } from "../../tools/BriefTool/BriefTool.js";
import { addInvokedSkill } from "../../bootstrap/state.js";
import { isSoftSparkEnabled } from "../../services/compact/compactSettings.js";
import { PERSISTED_OUTPUT_TAG } from "../toolResultStorage.js";

/**
 * 移除 Anthropic API 不接受的助手内容块。
 */
//@ chunk-e6aww6q8.js:1817232-1818138 placement
function dropApiInvalidAssistantBlocks(e, { site: site }) {
  try {
    let r = scanForeignBlocks(e),
      s = r.foreignBlocks && isFirstPartyApiBackend();
    if (!s && !r.overlongToolNames) return e;
    let {
      result: h,
      removed: removed,
      spacers: spacers,
      truncated: truncated,
    } = stripForeignToolBlocks(e, s);
    if (removed === 0 && truncated === 0) return e;
    if (removed > 0)
      (logForDebugging(
        `dropApiInvalidAssistantBlocks: removed ${removed} assistant content ${plural(removed, "block")} that the Anthropic API does not produce or accept (${spacers} ${plural(spacers, "spacer")} kept)`,
        { level: "warn" },
      ),
        logFeatureSad("transcript_api_invalid_blocks", "blocks_dropped", {
          site: fromEnum(site),
          removed: removed,
          spacers: spacers,
        }));
    if (truncated > 0)
      (logForDebugging(
        `dropApiInvalidAssistantBlocks: cut ${truncated} overlong tool_use ${plural(truncated, "name")} to the Anthropic API's ${sMt}-character request limit`,
        { level: "warn" },
      ),
        logFeatureSad("transcript_api_invalid_blocks", "tool_name_truncated", {
          site: fromEnum(site),
          truncated: truncated,
        }));
    return h;
  } catch (error) {
    return (
      logForDebugging(
        `dropApiInvalidAssistantBlocks: left the history unchanged after an unexpected transcript shape (${errorMessage(error)})`,
        { level: "error" },
      ),
      logFeatureBad("transcript_api_invalid_blocks", "unexpected_shape", { site: fromEnum(site) }),
      e
    );
  }
}
/**
 * 是否有外来服务端工具块或过长工具名。
 */
//@ chunk-e6aww6q8.js:1818138-1818531 placement
function scanForeignBlocks(e) {
  let n = !1,
    r = !1;
  for (let s of e) {
    if (s.type !== "assistant" || !Array.isArray(s.message.content)) continue;
    for (let h of s.message.content) {
      let y = h;
      if (h2(y) || (RM(y) && y.type === "server_tool_use" && !u9n(y.name))) n = !0;
      else if (RM(y) && y.type === "tool_use" && typeof y.name === "string" && xgs(y.name)) r = !0;
      if (n && r) return { foreignBlocks: n, overlongToolNames: r };
    }
  }
  return { foreignBlocks: n, overlongToolNames: r };
}
/**
 * 按回合收集工具结果出现在助手侧还是用户侧。
 */
//@ chunk-e6aww6q8.js:1818725-1819330 placement
function indexToolResultSides(e, n) {
  let r = new Set(),
    s = new Set(),
    h = new Set(),
    y = new Set();
  return (
    e.forEach((S, w) => {
      if (S.type === "user") {
        if (!Array.isArray(S.message.content)) return;
        for (let G of S.message.content) if (RM(G) && h2(G)) y.add(G.tool_use_id);
        return;
      }
      let L = n[w];
      if (L === void 0 || S.type !== "assistant" || !Array.isArray(S.message.content)) return;
      for (let G of S.message.content) {
        if (RM(G) && h2(G)) h.add(G.tool_use_id);
        if (!RM(G) || typeof G.tool_use_id !== "string") continue;
        if (h2(G))
          s.add(`${L}
${G.tool_use_id}`);
        else if (!NQo(G))
          r.add(`${L}
${G.tool_use_id}`);
      }
    }),
    { byServerResult: r, byClientResult: s, byAssistantSideResult: h, byUserSideResult: y }
  );
}
/**
 * 助手内容块是否为应剥离的外来工具块。
 */
//@ chunk-e6aww6q8.js:1819330-1819730 placement
function isForeignToolBlock(e, n, r) {
  if (h2(e)) return !0;
  if (!RM(e)) return !1;
  if (e.type === "tool_use") return r.byAssistantSideResult.has(e.id) && !r.byUserSideResult.has(e.id);
  if (e.type !== "server_tool_use" && e.type !== "mcp_tool_use") return !1;
  let s =
    typeof e.id === "string"
      ? `${n}
${e.id}`
      : void 0;
  if (s !== void 0 && r.byServerResult.has(s)) return !1;
  return (s !== void 0 && r.byClientResult.has(s)) || (e.type === "server_tool_use" && !u9n(e.name));
}
/**
 * 遍历助手消息内容：移除外来服务端工具调用/结果块（被删后紧跟思考块时插入占位文本以保持思考块合法）， 并把过长或旧的工具名改为规范名；返回结果与移除/插入/改名计数。
 */
//@ chunk-e6aww6q8.js:1819730-1820482 placement
function stripForeignToolBlocks(messages, stripForeign) {
  let turnKeys = assistantTurnKeys(messages),
    resultSides = indexToolResultSides(messages, turnKeys),
    turnState = new Map(),
    y = 0,
    S = 0,
    w = 0;
  return {
    result: messages.flatMap((G, q) => {
      let Z = turnKeys[q];
      if (Z === void 0 || G.type !== "assistant" || !Array.isArray(G.message.content)) return [G];
      let Se = [],
        { lastKeptIsThinking: lastKeptIsThinking, removedSince: removedSince } = turnState.get(Z) ?? {
          lastKeptIsThinking: !1,
          removedSince: !1,
        },
        Ee = !1;
      for (let Ae of G.message.content) {
        if (stripForeign && isForeignToolBlock(Ae, Z, resultSides)) {
          ((y += 1), (removedSince = !0), (Ee = !0));
          continue;
        }
        if (removedSince && lastKeptIsThinking && isThinkingBlockObject(Ae))
          (Se.push({ type: "text", text: _Qo, citations: [] }), (S += 1), (Ee = !0));
        let Ie = Ae;
        if (RM(Ae) && Ae.type === "tool_use") {
          let Me = Gbr(Ae.name);
          if (Me !== void 0) ((Ie = { ...Ae, name: Me }), (w += 1), (Ee = !0));
        }
        (Se.push(Ie), (lastKeptIsThinking = isThinkingBlockObject(Ae)), (removedSince = !1));
      }
      if ((turnState.set(Z, { lastKeptIsThinking: lastKeptIsThinking, removedSince: removedSince }), !Ee))
        return [G];
      return Se.length === 0 ? [] : [{ ...G, message: { ...G.message, content: Se } }];
    }),
    removed: y,
    spacers: S,
    truncated: w,
  };
}
//@ chunk-e6aww6q8.js:1820482-1820534 placement
function RM(e) {
  return typeof e === "object" && e !== null;
}
//@ chunk-e6aww6q8.js:1820534-1820635 placement
function hasToolResultBlock(e) {
  return e.type === "user" && Array.isArray(e.message.content) && e.message.content.some(h2);
}
//@ chunk-e6aww6q8.js:1820635-1820687 placement
function h2(e) {
  return RM(e) && e.type === "tool_result";
}
//@ chunk-e6aww6q8.js:1820687-1820781 placement
function NQo(e) {
  let n = e.type;
  return n === "tool_use" || n === "server_tool_use" || n === "mcp_tool_use";
}
//@ chunk-e6aww6q8.js:1820781-1820863 placement = hasThinkingContent (1)
function isThinkingBlockObject(m) {
  return RM(m) && (m.type === "thinking" || m.type === "redacted_thinking");
}
//@ chunk-e6aww6q8.js:1820863-1820957 placement
var b3e = new Set([BRIEF_TOOL_NAME_2, LEGACY_BRIEF_TOOL_NAME_2, SEND_USER_FILE_TOOL_NAME]),
  $Qo = new Set([PUBLISH_PLUGIN_TOOL_NAME, ...[], ...[]]),
  HQo = new Set([AGENT, TASK, SKILL, REPL_TOOL_NAME, REPL_TOOL_NAME_ALIAS, WORKFLOW_TOOL_NAME]);
//@ chunk-e6aww6q8.js:1820957-1820995 placement
function mpn(e) {
  return e === AGENT || e === TASK;
}
//@ chunk-e6aww6q8.js:1820995-1821127 placement
function isResumableToolName(e, n, r = !1) {
  return (
    typeof e === "string" &&
    !n.has(e) &&
    !$Qo.has(e) &&
    !b3e.has(e) &&
    (!HQo.has(e) || (r && mpn(e))) &&
    !e.startsWith(SKILL_2)
  );
}
/**
 * 中断产生的 tool_result 行（会话结束/未复制/进程停止）。
 */
//@ chunk-e6aww6q8.js:1821127-1821366 placement
function isStopInterruptionRow(e) {
  return (
    e.type === "user" &&
    e.toolDenialKind === "interrupted" &&
    Array.isArray(e.message.content) &&
    e.message.content.length > 0 &&
    e.message.content.every(
      (n) =>
        n.type === "tool_result" &&
        (n.content === TOOL_CALL_SESSION_ENDED ||
          n.content === TOOL_RESULT_NOT_IN_COPY ||
          n.content === AGENT_CALL_PROCESS_STOPPED),
    )
  );
}
//@ chunk-e6aww6q8.js:1821366-1821516 placement
function toolResultIds(e) {
  return e.type === "user" && Array.isArray(e.message.content)
    ? e.message.content.flatMap((n) => (n.type === "tool_result" ? [n.tool_use_id] : []))
    : [];
}
//@ chunk-e6aww6q8.js:1821516-1821563 placement
function k3e(e) {
  return e.type === "user" && isShutdownInterrupted(e);
}
//@ chunk-e6aww6q8.js:1821563-1821742 placement
function dropRedundantShutdownRows(e) {
  if (!e.some(k3e)) return e;
  let n = new Set(e.filter((s) => !k3e(s)).flatMap(toolResultIds)),
    filtered = e.filter((s) => !(k3e(s) && toolResultIds(s).every((h) => n.has(h))));
  return filtered.length === e.length ? e : filtered;
}
/**
 * 统计本回合被中断的工具步数及是否与上回合重复。
 */
//@ chunk-e6aww6q8.js:1821742-1822379 placement
function summarizeInterruptedSteps(e, n) {
  let r = new Map(),
    s = [],
    h = !1;
  for (let S of e) {
    if (S.type !== "user" && S.type !== "assistant") continue;
    if (!isStopInterruptionRow(S)) {
      if (((h = !1), S.type === "assistant")) {
        for (let w of S.message.content)
          if (w.type === "tool_use")
            r.set(w.id, {
              name: w.name,
              step:
                SHELL_TOOL_NAMES_2.includes(w.name) &&
                isPlainObject_3(w.input) &&
                typeof w.input.command === "string"
                  ? w.input.command
                  : w.input,
            });
      }
      continue;
    }
    if (!h) s.push([]);
    h = !0;
    for (let w of S.message.content) {
      let L = typeof w !== "string" && w.type === "tool_result" ? r.get(w.tool_use_id) : void 0;
      if (L !== void 0) s.at(-1).push(L);
    }
  }
  let y = s.at(-2) ?? [];
  return {
    inTurn: s.reduce((S, w) => S + w.length, 0),
    repeatsPrevious: n.size > 0 && (s.at(-1) ?? []).some((S) => y.some((w) => En(S, w))),
  };
}
//@ chunk-e6aww6q8.js:1822379-1822668 placement
function collectResumableToolUseIds(e, n, r, s) {
  let h = new Set();
  for (let y of e) {
    if (y.type !== "assistant" || y.handedOff === !0 || !Array.isArray(y.message.content)) continue;
    let filtered = y.message.content.filter((w) => w.type === "tool_use").filter((w) => n.has(w.id));
    if (filtered.every((w) => isResumableToolName(w.name, r, s))) for (let w of filtered) h.add(w.id);
  }
  return h;
}
//@ chunk-e6aww6q8.js:1822668-1822683 placement
var UQo = getMcpPrefix_2(REMOTE_DEVICES);
//@ chunk-e6aww6q8.js:1822683-1822771 placement
function Etn(e, n) {
  return new Set(
    e
      .map(unresolvedToolUseIds)
      .filter((r) => r.every((s) => n.has(s)))
      .flat(),
  );
}
/**
 * 把关机中断的工具结果改写为指定的中断内容。
 */
//@ chunk-e6aww6q8.js:1822771-1823453 placement
function rewriteShutdownInterrupts(e, n, r, s) {
  let h = new Set(s);
  for (let S of e)
    if (S.type === "user" && Array.isArray(S.message.content) && !isShutdownInterrupted(S)) {
      for (let w of S.message.content) if (w.type === "tool_result") h.add(w.tool_use_id);
    }
  let y = new Set();
  return e.map((S) => {
    for (let q of unresolvedToolUseIds(S)) if (!h.has(q)) y.add(q);
    if (S.type !== "user" || !Array.isArray(S.message.content) || !isShutdownInterrupted(S)) return S;
    let { content: content } = S.message;
    if (!content.every((q) => q.type !== "tool_result" || y.has(q.tool_use_id))) return S;
    for (let q of content) if (q.type === "tool_result") r.add(q.tool_use_id);
    let { interruptedByShutdown: interruptedByShutdown, ...G } = S;
    return {
      ...G,
      toolUseResult: n,
      toolDenialKind: "interrupted",
      message: {
        ...S.message,
        content: content.map((q) => (q.type === "tool_result" ? { ...q, content: n } : q)),
      },
    };
  });
}
//@ chunk-e6aww6q8.js:1823453-1823515 placement
function jQo(e) {
  return typeof e === "string" && e.startsWith(UQo);
}
//@ chunk-e6aww6q8.js:1823515-1823727 placement
function unresolvedToolUseIds(e) {
  if (e.type !== "assistant" || e.handedOff === !0 || !Array.isArray(e.message.content)) return [];
  let filtered = e.message.content.filter((r) => r.type === "tool_use");
  return filtered.every((r) => jQo(r.name)) ? filtered.map((r) => r.id) : [];
}
/**
 * 按类型校验附件负载（技能、钩子、文件、提醒等）。
 */
//@ chunk-e6aww6q8.js:1823727-1824796 placement
function isValidAttachmentPayload(e) {
  if (typeof e !== "object" || e === null || !("type" in e) || typeof e.type !== "string") return !1;
  switch (e.type) {
    case "invoked_skills":
      return (
        "skills" in e &&
        Array.isArray(e.skills) &&
        e.skills.every((skill) => typeof skill === "object" && skill !== null)
      );
    case "hook_success":
      return "content" in e && typeof e.content === "string";
    case "skill_listing":
      return (
        !("names" in e) ||
        e.names === void 0 ||
        (Array.isArray(e.names) &&
          e.names.length <= GQo &&
          e.names.every((n) => typeof n === "string" && n.length <= qQo))
      );
    case "hook_additional_context":
      return "content" in e && Array.isArray(e.content) && e.content.every((n) => typeof n === "string");
    case "task_reminder":
    case "todo_reminder":
      return "content" in e && Array.isArray(e.content) && e.content.every(isPlainObject_4);
    case "file":
    case "already_read_file":
      return "content" in e && isPlainObject_4(e.content);
    case "withheld_memory":
      return (
        "by" in e &&
        typeof e.by === "string" &&
        e.by !== "" &&
        "entries" in e &&
        Array.isArray(e.entries) &&
        e.entries.every(
          (entry) =>
            isPlainObject_4(entry) &&
            "path" in entry &&
            typeof entry.path === "string" &&
            "why" in entry &&
            typeof entry.why === "string" &&
            Object.hasOwn(INSTRUCTION_WITHHELD_REASONS, entry.why) &&
            "displayPath" in entry &&
            typeof entry.displayPath === "string",
        )
      );
    default:
      return !0;
  }
}
//@ chunk-e6aww6q8.js:1824796-1824817 placement
var GQo = 4096,
  qQo = 512;
/**
 * 过滤 type 为 attachment 但负载校验失败的条目，有丢弃时记录“转录部分损坏”的错误日志；无丢弃时原样返回。
 */
//@ chunk-e6aww6q8.js:1824817-1825136 placement
function dropMalformedAttachments(e) {
  let n = 0,
    filtered = e.filter((s) => {
      if (s.type === "attachment" && !isValidAttachmentPayload(s.attachment)) return ((n += 1), !1);
      return !0;
    });
  if (n === 0) return e;
  return (
    logForDebugging(
      `transcript load: dropped ${n} attachment ${plural(n, "entry", "entries")} with a missing or malformed payload \u2014 the session transcript appears partially corrupt`,
      { level: "error" },
    ),
    filtered
  );
}
/**
 * 提示来源不是人、自动续写或未分类（含排队命令）。
 */
//@ chunk-e6aww6q8.js:1825136-1825469 placement
function isMachineOriginPrompt(e) {
  let n =
      e.type === "user"
        ? e.origin
        : e.type === "attachment" && e.attachment.type === "queued_command"
          ? e.attachment.origin
          : void 0,
    r = n;
  if (typeof r !== "object" || r === null) return !1;
  let s = "kind" in r ? r.kind : void 0;
  return (
    s !== "human" &&
    !isBareTaskNotificationOrigin(n) &&
    s !== "auto-continuation" &&
    s !== "unclassified" &&
    !("senderTaskId" in r && r.senderTaskId !== void 0)
  );
}
//@ chunk-e6aww6q8.js:1825469-1825544 placement
function YSt(e) {
  return e.type === "user" ? filterUuidList(e.summarizedTurnPromptUuids) : [];
}
/**
 * CLAUDE_CODE_TERMINAL_MCP_TOOLS 列出的会结束回合的 MCP 工具。
 */
//@ chunk-e6aww6q8.js:1825544-1825660 placement
function getTerminalMcpTools() {
  return new Set(
    (env.CLAUDE_CODE_TERMINAL_MCP_TOOLS || "")
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean),
  );
}
//@ chunk-e6aww6q8.js:1825660-1826100 placement = hasSuccessfulToolCall (0.85)
function hasSuccessfulToolCall_2(e) {
  let n = getTerminalMcpTools();
  if (n.size === 0) return !1;
  let r = new Set();
  for (let s = e.length - 1; s >= 0; s--) {
    let h = e[s];
    if (h.type === "user") {
      if (h.isMeta) continue;
      let content = h.message.content;
      if (!Array.isArray(content)) return !1;
      let S = !1;
      for (let w of content)
        if (w.type === "tool_result") {
          if (((S = !0), !w.is_error)) r.add(w.tool_use_id);
        }
      if (!S) return !1;
    } else if (h.type === "assistant") {
      for (let y of h.message.content) if (y.type === "tool_use" && r.has(y.id) && n.has(y.name)) return !0;
    }
  }
  return !1;
}
//@ chunk-e6aww6q8.js:1826100-1826179 placement
class ResumeRefusedError extends Error {
  constructor(e) {
    super(e);
    this.name = "ResumeRefusedError";
  }
}
//@ chunk-e6aww6q8.js:1826179-1826241 placement
function p9n(e) {
  if (e.refused !== void 0) throw new ResumeRefusedError(e.refused);
}
/**
 * 交互类工具名与已废弃附件类型。
 */
//@ chunk-e6aww6q8.js:1826241-1826542 placement
var INTERACTIVE_TOOL_NAMES = new Set([
    ASKUSERQUESTION,
    CONNECTGITHUB,
    EXITPLANMODE,
    OFFER_CHROME_SETUP_TOOL_NAME,
    SHOWONBOARDINGROLEPICKER,
    require("./chunk-kmvx6c21.js").CONTINUE_IN_PROJECTS_TOOL_NAME,
  ]),
  OBSOLETE_ATTACHMENT_TYPES = new Set([
    "compaction_reminder",
    "companion_intro",
    "echo_activities",
    "pen_mode_enter",
    "pen_mode_exit",
    "verify_plan_reminder",
    "fold_nudge",
    "context_tip",
    "audio_transcript",
    "new_file",
    "new_directory",
  ]);
/**
 * meta 用户行内容是中断标记。
 */
//@ chunk-e6aww6q8.js:1831380-1831491 placement
function isInterruptMarkerRow(e) {
  if (e.type !== "user" || e.isMeta !== !0) return !1;
  let n = singleTextContent(e.message.content);
  return isInterruptMarkerText(n) || n === WORKER_RESTARTED_PROMPT;
}
//@ chunk-e6aww6q8.js:1831491-1831598 placement
function isInterruptMarkerText(e) {
  if (e === void 0) return !1;
  let n = Ijr();
  return e === n || e === deserializeMessagesWithInterruptDetection || (g3e.includes(n) && g3e.includes(e));
}
//@ chunk-e6aww6q8.js:1831598-1831675 placement
function tRe(e) {
  return (
    isTurnCompanion(e) ||
    e.isCompactSummary === !0 ||
    isToolUseResultMessage(e) ||
    isInterruptionOnlyMessage(e) ||
    isInterruptMarkerRow(e)
  );
}
/**
 * 最后一条真实用户提示的 uuid（可用压缩摘要中的提示）。
 */
//@ chunk-e6aww6q8.js:1831675-1831946 placement
function findLastUserPromptUuid(e, { orSummarizedPrompt: n = !1 } = {}) {
  let r,
    s = n;
  for (let h = e.length - 1; h >= 0; h--) {
    let y = e[h];
    if (y.type !== "user") {
      s &&= !isCompactBoundaryMessage_3(y);
      continue;
    }
    if (!sBo(e, h)) {
      if (s && y.isCompactSummary === !0) ((r = YSt(y)[0]), (s = !1));
      continue;
    }
    return localCommandKind(y) !== void 0 || y.isMeta || processQueuedCommands_2(y) ? void 0 : y.uuid;
  }
  return r;
}
//@ chunk-e6aww6q8.js:1831946-1832045 placement
function sBo(e, n) {
  let r = e[n];
  if (r?.type !== "user" || tRe(r)) return !1;
  return localCommandKind(r) === void 0 || !isLocalCommandRecordTail(e, n);
}
//@ chunk-e6aww6q8.js:1832045-1832115 placement
function ztn(e) {
  return e.turnOrigin !== void 0 || e.promptSource !== void 0;
}
//@ chunk-e6aww6q8.js:1832115-1832347 placement
function isPromptKeptAfter(e, n) {
  for (let r = n + 1; r < e.length; r++) {
    let s = e[r];
    if (s.type === "system") {
      if (s.subtype === "informational" && s.promptSubmitEnding?.promptKept === !0) return !0;
    } else if (s.type === "assistant" || (s.type === "user" && ztn(s))) return !1;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:1832347-1832633 placement
function hasOwnTurnInSession(e, n) {
  for (let r = e.length - 1; r >= 0; r--) {
    let s = e[r];
    if (s.type !== "user" && s.type !== "assistant") continue;
    if (!("sessionId" in s && s.sessionId === n)) return !1;
    if (
      s.type === "assistant"
        ? s.message.model !== SYNTHETIC_MODEL
        : ztn(s) &&
          s.queueTranscriptOnly !== !0 &&
          !isContextAppendMessage(s) &&
          !isInterruptMarkerRow(s) &&
          !isPromptKeptAfter(e, r)
    )
      return !0;
  }
  return !1;
}
/**
 * 开启 CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_APPENDS 时去掉夹在用户行后的合成 API 错误。
 */
//@ chunk-e6aww6q8.js:1832633-1833053 placement
function dropContextAppendErrors(e, n) {
  if (!env.CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_APPENDS) return e;
  let r;
  for (let s = 0; s < e.length; s++) {
    let h = e[s],
      y = e[s - 1];
    if (
      y?.type === "user" &&
      isSyntheticApiErrorMessage(h) &&
      h.uuid !== n &&
      !(
        Array.isArray(y.message.content) &&
        y.message.content.length > 0 &&
        y.message.content.every(
          (S) =>
            S.type === "tool_result" &&
            (S.content === TOOL_CALL_SESSION_ENDED ||
              S.content === TOOL_RESULT_NOT_IN_COPY ||
              S.content === AGENT_CALL_PROCESS_STOPPED),
        )
      )
    ) {
      if (((r ??= e.slice(0, s)), isPlainInterruptMarker(y) && y.uuid !== n)) r.pop();
      continue;
    }
    r?.push(h);
  }
  return r ?? e;
}
/**
 * 无 promptSource 的 meta 中断标记行。
 */
//@ chunk-e6aww6q8.js:1833053-1833172 placement
function isPlainInterruptMarker(e) {
  if (e.type !== "user" || e.isMeta !== !0 || e.promptSource !== void 0) return !1;
  return isInterruptMarkerText(singleTextContent(e.message.content));
}
//@ chunk-e6aww6q8.js:1833172-1833267 placement
function wJo(e) {
  return (
    isPlainInterruptMarker(e) &&
    e.type === "user" &&
    (singleTextContent(e.message.content) === deserializeMessagesWithInterruptDetection ||
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MIGHTY_FLASK, !1) === !0)
  );
}
//@ chunk-e6aww6q8.js:1833267-1833338 placement
function Mjr(e, n) {
  return deserializeMessagesImpl(e, void 0, void 0, void 0, void 0, n).messages;
}
//@ chunk-e6aww6q8.js:1833338-1833444 placement
var FILE_ATTACHMENT_TYPES = [
  "file",
  "directory",
  "pdf_reference",
  "compact_file_reference",
  "already_read_file",
  "nested_memory",
];
/**
 * 反序列化会话转录为消息列表，并为缺 id 的消息补上 id。
 */
//@ chunk-e6aww6q8.js:1833444-1842520 placement
function deserializeMessagesImpl(e, n, r, s, h, y, S, w, L = !1, G = !1, q, Z = !1) {
  try {
    let Se = h ?? env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN,
      ke = Wtn(),
      we =
        q &&
        e.findLast(
          (jo) =>
            jo.type === "assistant" &&
            Array.isArray(jo.message.content) &&
            jo.message.content.some((Qr) => Qr.type === "tool_use"),
        ),
      Ee = !!we && !("sessionId" in we && we.sessionId === q.ownSessionId),
      Ae = !ke ? INTERRUPT_MESSAGE_FOR_TOOL_USE : y || Ee ? TOOL_RESULT_NOT_IN_COPY : TOOL_CALL_SESSION_ENDED;
    cKe(e);
    let Ie = filterStopHookSummariesOnResume(e),
      Me = dropRetractedMessages_2(Ie),
      We = dropMalformedAttachments(Me),
      ze = dropContextAppendErrors(We, s),
      lt = 0,
      mapped = ze.map((jo) => {
        if (jo.type === "assistant" && !jo.message.id && jo.requestId === void 0)
          return ((lt += 1), { ...jo, message: { ...jo.message, id: randomUUID_24() } });
        if (jo.type === "user" && jo.pluginPrompt === void 0) {
          let Qr = extractPluginPrompt(jo);
          if (Qr !== void 0) return { ...jo, pluginPrompt: Qr };
        }
        return jo;
      });
    if (lt > 0)
      logForDebugging(
        `deserializeMessages: stamped a message.id on ${lt} id-less assistant entr${lt === 1 ? "y" : "ies"} (pre-#61940 stream-json injection)`,
      );
    let nt = 0,
      flattened = mapped
        .map(migrateLegacyAttachmentTypes)
        .filter((jo) => jo !== null)
        .flatMap((jo) => {
          let Qr = dropMalformedTextBlocks(jo);
          if (Qr === null) return [jo];
          nt += 1;
          let content = Qr.message.content;
          if (Array.isArray(content) && content.length === 0) return [];
          return [Qr];
        });
    if (nt > 0)
      logForDebugging(
        `deserializeMessages: dropped non-string text block(s) from ${nt} message(s) \u2014 interrupted-stream artifact`,
        { level: "warn" },
      );
    let Et = dropApiInvalidAssistantBlocks(flattened, { site: "resume" });
    for (let jo of Et) {
      if (jo.type === "assistant" && jo.wireToolInputs !== void 0) {
        let Qr = countToolCallsSince_2(jo.wireToolInputs, jo.message?.content, jo.batchToolUses);
        if (Qr === void 0) delete jo.wireToolInputs;
        else jo.wireToolInputs = Qr;
      }
      if (jo.type === "assistant" && (jo.wireToolInputs !== void 0 || jo.wireIngestContext !== void 0)) {
        let Qr = restoreWireInputStamps(jo.wireIngestContext, jo.wireToolInputs, jo.message?.content);
        if (Qr === void 0) delete jo.wireIngestContext;
        else jo.wireIngestContext = Qr;
      }
    }
    let yt = new Set(PERMISSION_MODES),
      gt = new Set(PROMPT_ORIGIN_KINDS);
    for (let jo of Et) {
      if (jo.type === "user" && jo.permissionMode !== void 0 && !yt.has(jo.permissionMode))
        jo.permissionMode = void 0;
      if (jo.type === "user" && jo.promptId !== void 0) delete jo.promptId;
      if (jo.type === "user" && jo.turnOrigin !== void 0 && !gt.has(jo.turnOrigin)) delete jo.turnOrigin;
      if (jo.type === "user" && jo.turnPosition !== void 0 && !isValidTurnPosition(jo.turnPosition))
        delete jo.turnPosition;
      if (jo.type === "user") {
        delete jo.joinedNoticeOwn;
        for (let Qr of ["origin", "queueOrigin"]) {
          let fi = jo[Qr];
          if (fi?.kind === "task-notification" && fi.producer !== void 0) {
            let { producer: producer, ...Ja } = fi;
            jo[Qr] = Ja;
          }
        }
      }
      if (
        jo.type === "attachment" &&
        jo.attachment?.type === "queued_command" &&
        jo.attachment.origin?.kind === "task-notification" &&
        jo.attachment.origin.producer !== void 0
      ) {
        let { producer: producer, ...fi } = jo.attachment.origin;
        jo.attachment = { ...jo.attachment, origin: fi };
      }
    }
    let At = dropRedundantShutdownRows(regroupSplitResponsesOnResume(Et)),
      It = ke && !Z2(),
      Yt = new Set(),
      qt = It ? rewriteShutdownInterrupts(At, Ae, Yt, [w, ...(S ?? [])]) : At,
      Zt = new Set(),
      rn = new Map(),
      pn = new Map(),
      no = new Set(),
      hn = isTailMessage(Et, s),
      ho = q?.ownSessionId,
      yn = Se === !0 && ho !== void 0 && !hasOwnTurnInSession(Et, ho),
      Kn = interruptedTurnResumePolicy(G),
      Xn = Kn?.maxAgeMs ?? 0,
      fo = Jet(Et, Xn),
      To = Se && !n?.size && !r,
      bo = To && !fo,
      vn = bo && w === void 0 && showsCutOffCalls(),
      co = normalizeMessagesForResume(
        qt,
        n,
        bo
          ? {
              dropSiblingBlocks: !0,
              outTrailingUnresolvedToolUseIds: Zt,
              outSupersededToolNames: rn,
              outTrailingUnresolvedCallsByResponse: pn,
              shutdownUnwindResultsDoNotResolve: !0,
            }
          : { outTrailingUnresolvedToolUseIds: no },
      ),
      So =
        It && w === void 0 && ![...Zt].some((jo) => S?.has(jo))
          ? findUnresolvedToolUses_2(qt, Etn(qt, Zt), !0)
          : new Set();
    for (let jo of So) (Zt.delete(jo), rn.delete(jo));
    let ko =
        So.size === 0
          ? co
          : appendInterruptedToolResults(qt, n, So, So, Ae, {
              dropSiblingBlocks: !0,
              shutdownUnwindResultsDoNotResolve: !0,
            }),
      un = filterThinkingOnlyUntilStable(ko),
      last = ko.findLast(
        (jo) =>
          (jo.type === "assistant" && !_Wt(jo)) ||
          (jo.type === "user" && !isContextAppendMessage(jo) && !isQueueTranscriptOnlyUserMessage(jo)),
      ),
      $o =
        Zt.size === 0 &&
        last?.type === "assistant" &&
        last.message.stop_reason === "end_turn" &&
        un.lastIndexOf(last) === -1 &&
        last.message.content.some((jo) => jo.type === "text" && jo.text.trim().length > 0),
      yo = last?.type === "assistant" && !last.isApiErrorMessage && un.lastIndexOf(last) === -1,
      Ho =
        yo &&
        last.message.stop_reason === "end_turn" &&
        Zt.size === 0 &&
        no.size === 0 &&
        !ko
          .slice(ko.lastIndexOf(last))
          .some(
            (jo) =>
              jo.type === "attachment" &&
              (jo.attachment.type === "hook_additional_context" ||
                jo.attachment.type === "hook_blocking_error") &&
              jo.attachment.hookEvent === "Stop",
          ) &&
        hasSuccessfulToolCall_2(ko.slice(0, ko.lastIndexOf(last))),
      rr =
        w !== void 0 && isFoamySpringEnabled() && Zt.has(w)
          ? "restored_card"
          : turnsWithInteractiveTools(pn, rn, S),
      br = So.size === 0 ? void 0 : filterThinkingOnlyUntilStable(co),
      Hr = br && classifyTurnState(br, !0, rr),
      Fr =
        n?.size || r
          ? { state: { kind: "none", because: "not_judged" }, skippedApiErrorRow: void 0 }
          : Hr?.state.kind === "none"
            ? Hr
            : classifyTurnState(un, Zt.size > 0, rr, $o, last),
      cs = yn || hn || isTailMessage(un, s) || (br !== void 0 && isTailMessage(br, s)),
      _r = !1;
    if (
      Se &&
      Fr.state.kind === "interrupted_turn" &&
      Fr.state.tail === "context_rows" &&
      Zt.size === 0 &&
      no.size === 0 &&
      So.size === 0 &&
      w === void 0 &&
      !S?.size &&
      !G &&
      !fo &&
      !Jet(un, Xn) &&
      !cs &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_partitioned_finch", !0)
    ) {
      let jo = !1,
        Qr = !1,
        fi = -1;
      for (let yr = We.length - 1; yr >= 0 && fi < 0; yr--) {
        let Kr = We[yr];
        if (
          Kr.type === "system" ||
          Kr.type === "progress" ||
          (Kr.type === "attachment" &&
            "hookEvent" in Kr.attachment &&
            (Kr.attachment.hookEvent === "SessionStart" ||
              (Kr.attachment.hookEvent === "Stop" &&
                jo &&
                (Kr.attachment.type === "hook_success" || Kr.attachment.type === "hook_non_blocking_error"))))
        )
          continue;
        if (
          Kr.type === "attachment" &&
          (isNullRenderingAttachment_2(Kr) || FILE_ATTACHMENT_TYPES.includes(Kr.attachment.type))
        )
          Qr = !0;
        else if (Kr.type === "user" && Kr.isMeta === !0 && Kr.queueTranscriptOnly === !0)
          ((jo = !0), (Qr = !1));
        else fi = yr;
      }
      let Ri = We[fi],
        Ja = Ri?.uuid === void 0 ? -1 : un.findLastIndex((yr) => yr.uuid === Ri.uuid),
        Di = un[Ja];
      _r =
        jo &&
        !Qr &&
        (Ri === void 0 ||
          (Di?.type === "assistant" && !Di.isApiErrorMessage && Di.message.stop_reason === "end_turn") ||
          (Di?.type === "user" &&
            isToolUseResultMessage(Di) &&
            findToolOnlyResponseId(un, Ja, Di) !== void 0));
    }
    let Cr =
        Ho && Fr.state.kind === "interrupted_turn" && Fr.state.tail === "tool_result"
          ? {
              state: { kind: "none", because: "silent_reply_after_terminal_tool" },
              skippedApiErrorRow: Fr.skippedApiErrorRow,
            }
          : _r
            ? { state: { kind: "none", because: "no_reply_note" }, skippedApiErrorRow: Fr.skippedApiErrorRow }
            : Fr,
      Vr = To && fo && Cr.state.kind === "none",
      { state: state, skippedApiErrorRow: skippedApiErrorRow } = Vr ? classifyTrailingToolUse(qt) : Cr,
      Or = Cr.endedAtMaxTurns === !0 && state.kind === "none";
    if (Or) logEvent("tengu_max_turns_turn_classified_complete", { auto_resume: Se === !0 });
    let Io = state.kind !== "none" && cs,
      zo = !Io && state.kind !== "none" && (Zt.size > 0 || Vr ? fo : Jet(un, Xn)),
      rs = lastMessageAgeMs(Et),
      Es = rs === void 0 ? void 0 : Math.floor(rs / 60000);
    if (zo && Se)
      logEvent("tengu_resume_stale_turn_suppressed", {
        kind: fromEnum(state.kind),
        ...(Es !== void 0 && { age_min: Es }),
        ...(Kn !== void 0 && {
          bound_source: fromEnum(Kn.source),
          bound_min: Math.floor(Kn.maxAgeMs / 60000),
        }),
      });
    let Nr =
        state.kind === "none" && !Or
          ? skippedApiErrorRow
          : newerMessage(skippedApiErrorRow, classifyTurnState(qt, Zt.size > 0, rr).skippedApiErrorRow),
      Is = refusalRetryMaxAge(),
      fs = !Io && !zo && state.kind !== "none" && Nr !== void 0 && isOlderThan(Nr, Is.maxAgeMs);
    if (fs && Se) {
      let jo = Date.now() - Date.parse(Nr.timestamp ?? "");
      logEvent("tengu_resume_stale_turn_suppressed", {
        kind: fromEnum(state.kind),
        tail: lit_2("api_error"),
        error_kind: fromEnum(apiErrorKind(Nr)),
        ...(Number.isFinite(jo) && { age_min: Math.floor(jo / 60000) }),
        bound_source: fromEnum(Is.source),
        bound_min: Math.floor(Is.maxAgeMs / 60000),
      });
    }
    let as = Or && (cs || Jet(un, Xn) || (Nr !== void 0 && isOlderThan(Nr, Is.maxAgeMs))),
      Vi = { apiErrorSteppedOver: Nr !== void 0, invisibleReplyDropped: yo },
      last_2 = Et.findLast(
        (jo) =>
          (jo.type === "user" || jo.type === "assistant") && !("isSidechain" in jo && jo.isSidechain === !0),
      ),
      Wi = {
        ageMinutes: Es,
        shutdownStamped: last_2?.type === "user" && last_2.interruptedByShutdown === !0,
      },
      ii =
        vn && Zt.size > 0 && !cs && ![...Zt].some((jo) => S?.has(jo))
          ? findUnresolvedToolUses_2(
              qt,
              collectResumableToolUseIds(
                qt,
                Zt,
                INTERACTIVE_TOOL_NAMES,
                Z && state.kind === "interrupted_turn" && !fs && !y,
              ),
              !0,
            )
          : new Set(),
      wa = count([...ii], (jo) => mpn(rn.get(jo))),
      hr,
      mi = So,
      Ha = !1;
    if (ii.size > 0)
      ((mi = new Set([...So, ...ii])),
        (un = appendInterruptedToolResults(
          qt,
          n,
          mi,
          mi,
          Ae,
          { dropSiblingBlocks: !0, shutdownUnwindResultsDoNotResolve: !0 },
          state.kind === "none" || fs,
          AGENT_CALL_PROCESS_STOPPED,
        )));
    if (Io || zo || fs) hr = { kind: "none" };
    else if (state.kind === "interrupted_turn" || (state.kind === "interrupted_prompt" && ii.size > 0)) {
      if (no.size > 0)
        ((un = appendInterruptedToolResults(qt, n, no, ke ? findUnresolvedToolUses_2(qt, no, !1) : no, Ae)),
          (mi = no));
      let [jo] = normalizeMessages([createUserMessage({ content: Ijr(), isMeta: !0 })]);
      if (Se || !ke) un.push(jo);
      else Ha = !0;
      let Qr = Zt.size === 0 && no.size === 0 ? Nr : void 0,
        fi =
          Qr?.apiErrorCode === CCS_NO_REQUEST_TOKEN
            ? "no_request_token"
            : Qr?.error === "rate_limit" || Qr?.error === "model_not_found"
              ? Qr.error
              : (Qr?.apiErrorStatus ?? 0) >= 500
                ? "server_error"
                : void 0,
        Ri = findLastUserPromptUuid(qt, {
          orSummarizedPrompt: fi === "rate_limit" || fi === "no_request_token",
        });
      hr = {
        kind: "interrupted_prompt",
        message: jo,
        ...(Ri !== void 0 && { interruptedTurnUserMessageUuid: Ri }),
        tail: {
          kind: state.kind === "interrupted_turn" ? state.tail : "cut_off_call_after_prompt",
          ...Vi,
          ...Wi,
          ...(vn && {
            cutOffCalls: {
              shown: ii.size,
              ...(wa > 0 && { shownAgentCalls: wa }),
              hidden: Zt.size - ii.size,
              ...summarizeInterruptedSteps(
                un.slice(un.findLastIndex((Ja) => findLastUserPromptUuid([Ja]) === Ja.uuid) + 1),
                ii,
              ),
            },
          }),
        },
        ...(Se && fi !== void 0 && { endedOnApiError: fi }),
      };
    } else if (state.kind === "interrupted_prompt")
      hr = { ...state, tail: { kind: "unanswered_prompt", ...Vi, ...Wi } };
    else hr = { kind: state.kind };
    let $a = Io
      ? yn
        ? "not_continued_copied_tail"
        : "not_continued_rewind_anchor"
      : zo
        ? "not_continued_too_old"
        : fs
          ? "not_continued_api_error_too_old"
          : Cr.state.kind === "none"
            ? Cr.state.because
            : void 0;
    if (hr.kind === "none" && $a !== void 0)
      recordTailDiagnostics(
        hr,
        Et,
        (jo) => {
          let Qr = findLastUserPromptUuid([jo]);
          return Qr !== void 0 && Qr === jo.uuid;
        },
        (jo) => jo.type === "user" && tRe(jo),
        {
          because: $a,
          callsWithoutResult: Zt.size + no.size + So.size,
          ...Vi,
          ...(Nr !== void 0 && apiErrorKind(Nr) === "rate_limit" && { rateLimitRowSteppedOver: !0 }),
        },
        L,
      );
    let any = [...no].some((jo) => S?.has(jo) ?? !1),
      Ti =
        ke && !Se && mi.size === 0 && no.size > 0 && !n?.size && !r && !any && !hn && !isTailMessage(un, s)
          ? findUnresolvedToolUses_2(qt, no, !0)
          : new Set();
    if (Ti.size > 0) ((un = appendInterruptedToolResults(qt, n, Ti, Ti, Ae)), (mi = Ti));
    let lastIndex = un.findLastIndex((jo) => jo.type !== "system" && jo.type !== "progress"),
      _i = un[lastIndex]?.type;
    if (
      !r &&
      lastIndex !== -1 &&
      (_i === "user" || (Ha && _i === "attachment")) &&
      !isLocalCommandRecordTail(un, lastIndex) &&
      !(hr.kind === "none" && isSyntheticMessage_2(un, lastIndex)) &&
      !(state.kind === "none" && isQueueTranscriptOnlyUserMessage(un[lastIndex]))
    )
      un.splice(lastIndex + 1, 0, createAssistantMessage({ content: NO_RESPONSE_REQUESTED }));
    for (let jo of ii) (Zt.delete(jo), rn.delete(jo));
    return {
      messages: un,
      turnInterruptionState: hr,
      supersededToolUseIds: Zt,
      supersededToolNames: rn,
      answeredToolUseIds: new Set([...mi, ...Yt]),
      rescueSuppressed: Io || zo || fs || as,
    };
  } catch (error) {
    throw (logError(error), error);
  }
}
//@ chunk-e6aww6q8.js:1842520-1842770 placement
function classifyTrailingToolUse(e) {
  let n = new Set(),
    r = normalizeMessagesForResume(e, void 0, {
      dropSiblingBlocks: !0,
      outTrailingUnresolvedToolUseIds: n,
      shutdownUnwindResultsDoNotResolve: !0,
    });
  if (n.size === 0) return { state: { kind: "none", because: "other" }, skippedApiErrorRow: void 0 };
  return classifyTurnState(filterThinkingOnlyUntilStable(r), !0, AJo);
}
//@ chunk-e6aww6q8.js:1842770-1842928 placement = countToolCallsSince (1)
function messageHasToolUse(messages, sinceUuid) {
  return messages.type === "assistant" && Array.isArray(messages.message.content)
    ? messages.message.content.flatMap((block) =>
        block.type === "tool_use" && sinceUuid.has(block.id) ? [block.id] : [],
      )
    : [];
}
/**
 * 找出最后一组助手消息中未得到结果的工具调用。
 */
//@ chunk-e6aww6q8.js:1842928-1843667 placement
function findUnresolvedToolUses_2(e, n, r) {
  let s = filterThinkingOnlyUntilStable(e),
    h = (Z) => jb(Z) || (!r && Pre(Z)),
    y = (Z) =>
      Z.type === "user" &&
      Array.isArray(Z.message.content) &&
      Z.message.content.some((Se) => Se.type === "tool_result"),
    S = new Set(),
    w = Symbol("ended"),
    L = w,
    G = new Set(),
    q = { toolResult: !1, classified: !1 };
  for (let Z of s) {
    if (Z.type === "assistant" && !h(Z)) {
      if (r && Pre(Z)) {
        ((L = w), (G = new Set()));
        continue;
      }
      if (q && !q.classified) {
        if (!q.toolResult) S.clear();
        q.classified = !0;
      }
      if (S.has(Z.message.id)) {
        if (Z.message.id === L) for (let Se of messageHasToolUse(Z, n)) G.add(Se);
        continue;
      }
      (S.add(Z.message.id), (L = Z.message.id), (G = new Set(messageHasToolUse(Z, n))), (q = void 0));
      continue;
    }
    if ((Z.type === "user" && !jb(Z)) || isSystemLocalCommandMessage(Z)) {
      if (((q ??= { toolResult: !1, classified: !1 }), y(Z))) q.toolResult = !0;
      continue;
    }
    if (r && Z.type === "system" && Z.subtype === "model_refusal_fallback") ((L = w), (G = new Set()));
  }
  return G;
}
/**
 * 为未完成的工具调用补上中断的 tool_result。
 */
//@ chunk-e6aww6q8.js:1843667-1844160 placement
function appendInterruptedToolResults(e, n, r, s, h, y, S = !1, w = h) {
  let sliced = filterThinkingOnlyUntilStable(
      normalizeMessagesForResume(e, new Set([...(n ?? []), ...r]), y),
    ).slice(),
    G = [];
  for (let q of sliced) {
    if (q.type !== "assistant" || !Array.isArray(q.message.content)) continue;
    for (let Z of q.message.content) {
      if (Z.type !== "tool_use" || !s.has(Z.id)) continue;
      let Se = mpn(Z.name) ? w : h;
      G.push(
        createUserMessage({
          content: [{ type: "tool_result", content: Se, is_error: !0, tool_use_id: Z.id }],
          toolUseResult: Se,
          toolDenialKind: "interrupted",
          ...(S && { toolDenialEndsTurn: !0 }),
          sourceToolAssistantUUID: q.uuid,
        }),
      );
    }
  }
  return (sliced.push(...G), sliced);
}
//@ chunk-e6aww6q8.js:1844160-1844372 placement
function classifyTurnState(e, n, r, s = !1, h) {
  let y = [],
    S = classifyRefusalTurn(e, n, r, y, s, h),
    w = y[0];
  return S.kind === "ended_at_max_turns"
    ? { state: { kind: "none", because: "max_turns" }, skippedApiErrorRow: w, endedAtMaxTurns: !0 }
    : { state: S, skippedApiErrorRow: w };
}
/**
 * 分类转录中的拒绝回合（无回合行、已完成等）。
 */
//@ chunk-e6aww6q8.js:1844372-1847225 placement
function classifyRefusalTurn(e, n, r, s, h, y) {
  if (e.length === 0) return qR(n, "no_turn_rows");
  let S = -1,
    w = !1;
  for (let q = e.length - 1; q >= 0; q--) {
    let Z = e[q];
    if (Z.type === "system" || Z.type === "progress") continue;
    if (isQueueTranscriptOnlyUserMessage(Z)) {
      w = !0;
      continue;
    }
    if (Z.type === "assistant" && Ljr(Z)) {
      if (!_Wt(Z)) s.push(Z);
      continue;
    }
    S = q;
    break;
  }
  let L = S !== -1 ? e[S] : void 0;
  if (!L) return qR(n, "no_turn_rows");
  if (L.type === "assistant") {
    if (L.isApiErrorMessage)
      return (
        logEvent("tengu_refusal_turn_classified_complete", { verdict: fromEnum(refusalKind(L)) }),
        { kind: "none", because: "terminal_api_error" }
      );
    return Ptn(r, n);
  }
  let G = L.type === "attachment" || isContextAppendMessage(L);
  if (L.type === "user" && !G) {
    if (isLocalCommandRecordTail(e, S)) return qR(n, "local_command");
    if (
      isContinuationPrompt(L) &&
      L === y &&
      !isOlderThan(L, refusalRetryMaxAge().maxAgeMs) &&
      getFeatureValue_CACHED_MAY_BE_STALE("tengu_steady_plover", !0)
    )
      return { kind: "interrupted_turn", tail: "cut_reply_nudge" };
    if (Vtn(L, y)) return { kind: "interrupted_turn", tail: "end_turn_overridden_nudge" };
    if (L.isMeta || L.isCompactSummary) return qR(n, L.isCompactSummary ? "compact_summary" : "hidden_row");
    if (Otn(L)) return stopMarkerState(L);
    if (isToolUseResultMessage(L)) {
      let Z = classifyToolResultEnding(L, e, S, h);
      if (Z?.endsTurn) return terminalToolResultState(Z.responseId, r, n);
      if (isEndedForDeliveryRow(L)) return { kind: "none", because: "deliberate_stop_result" };
      if (hasTurnEndingDenial(e, S)) return { kind: "none", because: "deliberate_stop_result" };
      if (isBackgroundedByAbort(L)) return { kind: "none", because: "deliberate_stop_result" };
      let Se = findToolOnlyResponseId(e, S, y);
      if (Se !== void 0) return terminalToolResultState(Se, r, n);
      return { kind: "interrupted_turn", tail: Ntn(Z) };
    }
    if (processQueuedCommands_2(L)) return { kind: "interrupted_turn", tail: "task_notification" };
    let q = Ktn(L);
    if (q !== void 0)
      return q === "input" || isAfterCaveatInput(e, S)
        ? qR(n, "local_command")
        : { kind: "interrupted_turn", tail: "bash_command" };
    if (w) return { kind: "interrupted_turn", tail: "note_after_prompt" };
    return { kind: "interrupted_prompt", message: L };
  }
  if (G) {
    let q = !1,
      Z = !1;
    for (let Se = S; Se >= 0; Se--) {
      let ke = e[Se];
      if (
        ke.type === "system" ||
        ke.type === "progress" ||
        ke.type === "attachment" ||
        isContextAppendMessage(ke)
      ) {
        ((q ||= ke.type === "user"),
          (Z ||=
            ke.type === "attachment" &&
            ke.attachment.type === "max_turns_reached" &&
            ke.attachment.exitCommitted === !1));
        continue;
      }
      if (isQueueTranscriptOnlyUserMessage(ke)) {
        w = !0;
        continue;
      }
      if (ke.type === "assistant") {
        if (Ljr(ke)) {
          if (!_Wt(ke)) s.push(ke);
          continue;
        }
        if (ke.isApiErrorMessage)
          return (
            logEvent("tengu_refusal_turn_classified_complete", { verdict: fromEnum(refusalKind(ke)) }),
            { kind: "none", because: "terminal_api_error" }
          );
        if (q) return qR(n, "reply_then_reminder");
        return Ptn(r, n);
      }
      if (ke.type === "user" && ke.isCompactSummary) return qR(n, "compact_summary");
      if (ke.type === "user" && Otn(ke)) return stopMarkerState(ke);
      if (ke.type === "user" && isLocalCommandRecordTail(e, Se)) return qR(n, "local_command");
      let we = "context_rows";
      if (ke.type === "user" && isToolUseResultMessage(ke)) {
        let Ae = classifyToolResultEnding(ke, e, Se, h);
        if (Ae?.endsTurn) return terminalToolResultState(Ae.responseId, r, n);
        if (
          ((we = Ntn(Ae)),
          isEndedForDeliveryRow(ke) || isBackgroundedByAbort(ke) || hasTurnEndingDenial(e, Se))
        )
          return { kind: "none", because: "deliberate_stop_result" };
      }
      let Ee = findToolOnlyResponseId(e, Se, y);
      if (Ee !== void 0) return terminalToolResultState(Ee, r, n);
      if (Z && !n) return { kind: "ended_at_max_turns" };
      return { kind: "interrupted_turn", tail: Z ? "unresolved_call" : we };
    }
    return q || (w && env.CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_SEEDS)
      ? qR(n, "no_turn_rows")
      : { kind: "interrupted_turn", tail: "context_rows" };
  }
  return { kind: "none", because: "other" };
}
/**
 * 末尾是否本地命令记录（带 caveat）。
 */
//@ chunk-e6aww6q8.js:1847225-1847617 placement
function isLocalCommandRecordTail(e, n) {
  if (localCommandOrSlashKind(e[n]) === void 0) return !1;
  let r = !1,
    s,
    h = !0;
  for (let y = n; y >= 0; y--) {
    let S = e[y];
    if (S.type === "system" || S.type === "progress" || S.type === "attachment") continue;
    let w = localCommandOrSlashKind(S);
    if (w === "caveat") return s === void 0 || Date.parse(S.timestamp) >= s;
    if (w === void 0 || r) break;
    if (((r = w === "record" || w === "bareRecord"), w === "bareRecord")) s = Date.parse(S.timestamp);
    h &&= S.type === "user" && S.isMeta === !0;
  }
  return h;
}
//@ chunk-e6aww6q8.js:1847617-1847829 placement
function isAfterCaveatInput(e, n) {
  let r = !1;
  for (let s = n - 1; s >= 0; s--) {
    let h = e[s];
    if (h.type === "system" || h.type === "progress" || h.type === "attachment") continue;
    if (!r && Ktn(h) === "input") {
      r = !0;
      continue;
    }
    return r && localCommandKind(h) === "caveat";
  }
  return !1;
}
//@ chunk-e6aww6q8.js:1847829-1847907 placement
function Ktn(e) {
  return e.type === "user" && e.promptSource === void 0 ? bashCommandTagKindOf(e) : void 0;
}
//@ chunk-e6aww6q8.js:1847907-1848104 placement = isSyntheticMessage (1)
function isSyntheticMessage_2(e, n) {
  if (!isContextAppendMessage(e[n])) return !1;
  for (let r = n - 1; r >= 0; r--) {
    let s = e[r];
    if (s.type === "system" || s.type === "progress" || s.type === "attachment" || isContextAppendMessage(s))
      continue;
    return s.type === "user" && isLocalCommandRecordTail(e, r);
  }
  return !1;
}
//@ chunk-e6aww6q8.js:1848104-1848228 placement
function localCommandKind(e) {
  if (e.type !== "user" || e.promptSource !== void 0) return;
  let n = localCommandTagKindOf(e);
  return n === "caveat" && e.isMeta !== !0 ? void 0 : n;
}
//@ chunk-e6aww6q8.js:1848228-1848360 placement
function localCommandOrSlashKind(e) {
  return (
    localCommandKind(e) ??
    (e.type === "user" &&
    e.promptSource === void 0 &&
    e.isMeta !== !0 &&
    looksLikeSlashInput(e.message.content)
      ? "bareRecord"
      : void 0)
  );
}
//@ chunk-e6aww6q8.js:1848360-1848459 placement
function qR(e, n) {
  return e ? { kind: "interrupted_turn", tail: "unresolved_call" } : { kind: "none", because: n };
}
//@ chunk-e6aww6q8.js:1848459-1848602 placement
function terminalToolResultState(e, n, r) {
  return n === "restored_card" || (e !== void 0 && n.has(e))
    ? qR(r, "terminal_tool_result")
    : { kind: "none", because: "terminal_tool_result" };
}
//@ chunk-e6aww6q8.js:1848602-1848691 placement
function Ptn(e, n) {
  return e === "restored_card" ? qR(n, "reply") : { kind: "none", because: "reply" };
}
//@ chunk-e6aww6q8.js:1848691-1848707 placement
var AJo = new Set();
//@ chunk-e6aww6q8.js:1848707-1848856 placement
function turnsWithInteractiveTools(e, n, r) {
  let s = new Set();
  for (let [h, y] of e)
    if (
      y.some((S) => {
        let w = n.get(S);
        return w !== void 0 && INTERACTIVE_TOOL_NAMES.has(w) && (r?.has(S) ?? !1);
      })
    )
      s.add(h);
  return s;
}
//@ chunk-e6aww6q8.js:1848856-1848988 placement
function stopMarkerState(e) {
  return e.interruptedByShutdown
    ? { kind: "interrupted_turn", tail: "shutdown_marker" }
    : { kind: "none", because: "stop_marker" };
}
//@ chunk-e6aww6q8.js:1848988-1849055 placement
function Otn(e) {
  let n = singleTextContent(e.message.content);
  return n === INTERRUPT_MESSAGE || n === INTERRUPT_MESSAGE_FOR_TOOL_USE;
}
//@ chunk-e6aww6q8.js:1849055-1849177 placement = processQueuedCommands (1)
function processQueuedCommands_2(queuedCommands) {
  if (queuedCommands.origin?.kind !== "task-notification") return !1;
  return singleTextContent(queuedCommands.message.content)?.startsWith(`<${TASK_NOTIFICATION}>`) ?? !1;
}
//@ chunk-e6aww6q8.js:1849177-1849353 placement
function isQueueTranscriptOnlyUserMessage(e) {
  return (
    e.type === "user" &&
    e.queueTranscriptOnly === !0 &&
    (processQueuedCommands_2(e) ||
      (env.CLAUDE_CODE_RESUME_TOLERATES_CONTEXT_SEEDS &&
        e.origin?.kind === "task-notification" &&
        e.isMeta !== !0))
  );
}
//@ chunk-e6aww6q8.js:1849353-1849483 placement
function isEndedForDeliveryRow(e) {
  let content = e.message.content;
  return (
    Array.isArray(content) &&
    content.length > 0 &&
    content.every((r) => r.type === "tool_result" && r.content === TOOL_CALL_ENDED_FOR_DELIVERY)
  );
}
//@ chunk-e6aww6q8.js:1849483-1849736 placement
function findToolOnlyResponseId(e, n, r) {
  let s,
    h = !1;
  for (let y = n; y >= 0; y--) {
    let S = e[y];
    if (Vtn(S, r)) return;
    if (S.type === "assistant") {
      let { id: id } = S.message;
      if (!id || (s !== void 0 && id !== s)) return;
      if (h) return id;
      s = id;
    } else if (S.type === "user" && !isTurnCompanion(S)) {
      if (!isToolUseResultMessage(S)) return;
      h ||= getToolEndsTurnKind(S) !== !1;
    }
  }
  return;
}
//@ chunk-e6aww6q8.js:1849736-1849798 placement
function Vtn(e, n) {
  return e === n && isTurnNotEndedNotice(e) && !isOlderThan(e, refusalRetryMaxAge().maxAgeMs);
}
//@ chunk-e6aww6q8.js:1849798-1849953 placement
function hasTurnEndingDenial(e, n) {
  for (let r = n; r >= 0; r--) {
    let s = e[r];
    if (s.type === "assistant") return !1;
    if (s.type === "user" && isToolUseResultMessage(s) && s.toolDenialEndsTurn === !0) return !0;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:1849953-1850091 placement
function isBackgroundedByAbort(e) {
  let toolUseResult = e.toolUseResult;
  return (
    typeof toolUseResult === "object" &&
    toolUseResult !== null &&
    "backgroundedByTurnAbort" in toolUseResult &&
    toolUseResult.backgroundedByTurnAbort === !0
  );
}
//@ chunk-e6aww6q8.js:1850091-1850180 placement
function Ntn(e) {
  return e?.endsTurn === !1 && e.toUser ? "message_to_user_result" : "tool_result";
}
/**
 * tool_result 是否结束回合（brief 类、终止 MCP 工具）。
 */
//@ chunk-e6aww6q8.js:1850180-1850695 placement
function classifyToolResultEnding(e, n, r, s) {
  let content = e.message.content;
  if (!Array.isArray(content)) return;
  let y = content[0];
  if (y?.type !== "tool_result") return;
  let tool_use_id = y.tool_use_id;
  for (let w = r - 1; w >= 0; w--) {
    let L = n[w];
    if (L.type !== "assistant") continue;
    for (let G of L.message.content)
      if (G.type === "tool_use" && G.id === tool_use_id) {
        let q =
            env.CLAUDE_CODE_PEWTER_OWL_TOOL === !0 &&
            !isBriefEnabled() &&
            !s &&
            !isOlderThan(e, refusalRetryMaxAge().maxAgeMs) &&
            getFeatureValue_CACHED_MAY_BE_STALE("tengu_witty_hearth", !0),
          Z = b3e.has(G.name);
        return (Z && !q) || (getTerminalMcpTools().has(G.name) && !y.is_error)
          ? { endsTurn: !0, responseId: L.message.id || void 0 }
          : { endsTurn: !1, toUser: Z };
      }
  }
  return;
}
//@ chunk-e6aww6q8.js:1850695-1850963 placement
function restoreInvokedSkills(e) {
  for (let n of e) {
    if (n.type !== "attachment") continue;
    if (n.attachment.type === "invoked_skills") {
      for (let skill of n.attachment.skills)
        if (skill.name && skill.path && skill.content)
          addInvokedSkill(
            skill.name,
            skill.path,
            skill.content,
            null,
            skill.mcpSkill !== void 0,
            (isSoftSparkEnabled() && Date.parse(n.timestamp)) || Date.now(),
          );
    }
  }
}
/**
 * 比较已有消息中的 SessionStart 钩子输出（规范化持久化路径），过滤新行中重复的；hook_additional_context 逐条过滤； 没有新内容时返回空数组。
 */
//@ chunk-e6aww6q8.js:1850963-1851479 placement
function dedupeSessionStartRows(e, n) {
  if (n.length === 0) return [];
  let r = new Set();
  for (let y of e) for (let S of sessionStartRowKeys(y)) r.add(S);
  if (r.size === 0) return [...n];
  let s = !1,
    h = [];
  for (let y of n) {
    let S = sessionStartRowKeys(y);
    if (S.length === 0 || y.type !== "attachment") {
      h.push(y);
      continue;
    }
    let attachment = y.attachment;
    if (attachment.type === "hook_additional_context" && attachment.content.length > 1) {
      let filtered = attachment.content.filter((G) => !r.has(normalizePersistedOutputPath(G)));
      if (filtered.length === 0) continue;
      ((s = !0),
        h.push(
          filtered.length === attachment.content.length
            ? y
            : withRenderedAttachment(y, { ...attachment, content: filtered }),
        ));
      continue;
    }
    if (r.has(S[0])) continue;
    ((s = !0), h.push(y));
  }
  if (!s) return [];
  return h;
}
/**
 * 等待 SessionStart 钩子并追加去重后的行。
 */
//@ chunk-e6aww6q8.js:1851479-1851592 placement
async function appendSessionStartRows(e) {
  let promise = await e.sessionStartHooks.promise,
    r = dedupeSessionStartRows(e.messages, promise);
  return (e.messages.push(...r), r);
}
/**
 * SessionStart 钩子附件的比较键。
 */
//@ chunk-e6aww6q8.js:1851592-1851958 placement
function sessionStartRowKeys(e) {
  if (e.type !== "attachment") return [];
  let attachment = e.attachment;
  if (!("hookEvent" in attachment) || attachment.hookEvent !== "SessionStart") return [];
  if (attachment.type === "hook_additional_context")
    return attachment.content.map(normalizePersistedOutputPath);
  if (attachment.type === "hook_success" && attachment.content !== "")
    return [normalizePersistedOutputPath(attachment.content)];
  if (attachment.type === "hook_non_blocking_error")
    return [`${attachment.command ?? ""}\x00${attachment.exitCode}\x00${attachment.stderr}`];
  return [];
}
//@ chunk-e6aww6q8.js:1851958-1852058 placement
function normalizePersistedOutputPath(e) {
  if (!e.startsWith(PERSISTED_OUTPUT_TAG)) return e;
  return e.replace(/(saved to: ).*$/m, "$1<persisted>");
}
/**
 * 去掉被 retractedMessageUuids 撤回的消息并记遥测。
 */
//@ chunk-e6aww6q8.js:1852058-1852560 placement
function dropRetractedMessages_2(e) {
  let n = new Set(
    e.flatMap((s) =>
      (s.type === "user" ||
        s.type === "assistant" ||
        (s.type === "system" && s.subtype === "model_refusal_fallback")) &&
      Array.isArray(s.retractedMessageUuids)
        ? s.retractedMessageUuids
            .filter((retractedMessageUuid) => typeof retractedMessageUuid === "string")
            .map((h) => h.slice(0, UUID_PREFIX_LENGTH))
        : [],
    ),
  );
  if (n.size === 0) return e;
  let filtered = e.filter(
    (s) => s.type === "system" || typeof s.uuid !== "string" || !n.has(s.uuid.slice(0, UUID_PREFIX_LENGTH)),
  );
  if (filtered.length !== e.length)
    logEvent("tengu_resume_retracted_dropped", {
      dropped: e.length - filtered.length,
      chain_length: e.length,
    });
  return filtered;
}

export {
  OBSOLETE_ATTACHMENT_TYPES,
  isQueueTranscriptOnlyUserMessage,
  dropRetractedMessages_2,
  dropMalformedAttachments,
  restoreInvokedSkills,
  deserializeMessagesImpl,
  findLastUserPromptUuid,
  ResumeRefusedError,
  isInterruptMarkerRow,
  p9n,
  dropApiInvalidAssistantBlocks,
  getTerminalMcpTools,
  YSt,
  tRe,
  processQueuedCommands_2,
  isMachineOriginPrompt,
  Mjr,
  dedupeSessionStartRows,
  isPlainInterruptMarker,
  appendSessionStartRows,
  hasToolResultBlock,
  wJo,
  isStopInterruptionRow,
  hasSuccessfulToolCall_2,
  sBo,
  mpn,
};
