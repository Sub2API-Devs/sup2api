/**
 * utils/claudemd/contextRouting.ts
 *
 * 2.1.316 新增：会话开始时组装上下文路由（用户/系统上下文、说明、工作者工具）；生成上下文公告附件（说明文件、日期等）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ha3km179.js (47)
 * attribution: placement 47
 */
import { randomUUID, randomUUID as randomUUID_2, randomUUID as randomUUID_3 } from "crypto";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isTimeZoneAssumed, sessionDateString } from "../sessionTimeZone.js";
import { qun, latestPromptSnapshot } from "../contextAttachments/promptSnapshot.js";
import { logError } from "../log.js";
import {
  getSessionContextAttachmentData,
  REJECT_MESSAGE,
  REJECT_MESSAGE_WITH_REASON_PREFIX,
  SUBAGENT_REJECT_MESSAGE,
  SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX,
  CANCEL_MESSAGE,
  TOOL_CALL_SKIPPED_BY_SIBLING_DENIAL,
  TOOL_CALL_SKIPPED_FOR_DELIVERY,
  APPROVAL_EXPIRED_MESSAGE,
  APPROVAL_UNANSWERED_MESSAGE,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  TOOL_CALL_ENDED_FOR_DELIVERY,
  TOOL_CALL_SESSION_ENDED,
  TOOL_RESULT_NOT_IN_COPY,
  AGENT_CALL_PROCESS_STOPPED,
} from "../messages.js";
import { logProjectTextCutFailure, buildProjectTextHooks } from "../../services/projectTexts.js";
import { getUserContextInstructionFiles, c9s, s9s, _Wo, computeGitStatus } from "../../context.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { WGr } from "../instructionFileAccess.js";
import { SESSION_CONTEXT_FIELDS, aVs, lVs } from "../contextAttachments/sessionContext.js";
import { isIndexedCorbatoGateOn, isCoordinatorMode_2 } from "../../coordinator/coordinatorMode.js";
import { toMemoryFileEntries } from "../contextAttachments/memory.js";
import { getMaxMemoryFileChars, claudeMdLoadStateByHost } from "../claudemd.js";
import { toolMatchesName } from "../../Tool.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import { getToolPermissionContext } from "../permissions/toolPermissionContext.js";
import { readWouldBeAutoAllowedForPath } from "../permissions/filesystem.js";
import {
  truncateInstructionsAtLine,
  latestInstructionFiles,
  diffInstructionFiles,
} from "../contextAttachments/instructions.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logEvent } from "../../services/analytics/index.js";
import { sanitizedErrorNameForTelemetry, withTelemetryMessage, toError } from "../errors.js";
import { agentTypeForTelemetry } from "../../services/analytics/metadata.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { attachedProjectDocText, DOC_TEXT_WIDER_FLAG } from "../../services/projects/projectContext.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { Ywt } from "../../services/compact/postCompactCleanup.js";
import { isRealAssistantMessage } from "../messages/messagePredicates.js";
import { PROJECTS_TOOL_NAME } from "../../tools/ProjectsTool/prompt.js";
import { getDenyRuleForTool, getAskRuleForTool, matchToolRule } from "../permissions/permissions.js";
import { isCcsTenant } from "../../bootstrap/state.js";
import {
  OSt,
  calculateTokenWarningState,
  Tp,
  getAutoCompactThresholdTokens,
} from "../../services/compact/autoCompact.js";
import { stripInProgressAssistantMessage } from "../../commands/btw/btw.js";
import {
  roughTokenCountEstimation,
  roughTokenCountEstimationForObject,
} from "../../services/tokenEstimation.js";
import { classifyQuerySource } from "../../services/api/requestHeaders.js";
import { createAttachmentMessage_2, logForDebugging } from "../debug.js";
import { getAutoModeConfigOrDefault } from "../permissions/permissionSetup.js";
import { gge } from "../messageKinds.js";
import { getTextBlocks } from "../messages/apiNormalization.js";
import { efn, zbt, REANNOUNCED_ATTACHMENT_TYPES } from "../transcript/resumeAnnouncements.js";
import { trackedProjectReads } from "../../tools/ProjectsTool/readTracking.js";
import { executePreToolHooks } from "../hooks.js";
import { clone } from "../slowOperations.js";
import { isSameAnswerInput } from "../permissions/permissionAnswer.js";
import { D2 } from "../planTiers.js";
import { getGlobalConfig, getCachedClientData } from "../config.js";
import { CK } from "../model/model.js";
import { buildPostCompactMessages } from "../../services/compact/compact.js";
import { gn } from "../shortHash.js";
import { isEnvDefinedFalsy, isEnvTruthy } from "../envUtils.js";
import { env } from "../env.js";
import { findModelKeyedEntry } from "../attachments/totalTokensReminder.js";
import { getCanonicalName } from "../model/canonicalModelName.js";
import { SessionRootSlot, isNonConversationMessage } from "../../bootstrap/sessionSlices.js";
import { YFe } from "../model/fableMitigations.js";
import { shouldUseMidConvSystem } from "../betas.js";
import { Bn } from "../model/modelIds.js";
import { telemetrySafeModelName } from "../model/telemetryModelName.js";
import { isForkBoilerplateMessage } from "../../constants/xml.js";
import { getComputerUseSession } from "../computerUse/session.js";

//@ chunk-ha3km179.js:38341-38394 placement
function Za() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_peppy_nest", !1) && isTimeZoneAssumed();
}
//@ chunk-ha3km179.js:38394-38479 placement
function Am(e) {
  try {
    return qun() ? latestPromptSnapshot(e)?.contextRendering : void 0;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:38479-38569 placement
function vm(e) {
  try {
    return qun() && getSessionContextAttachmentData(e) !== void 0 ? "announced" : void 0;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:38569-38694 placement
function toInlineRouting(e) {
  let { claudeMd: claudeMd, ...r } = e.userContext;
  return { ...e, userContext: claudeMd === "" ? r : e.userContext, bare: !0, rendering: "inline" };
}
/**
 * 会话开始时组装上下文路由（用户/系统上下文、说明、工作者工具）。
 */
//@ chunk-ha3km179.js:38694-40788 placement
async function buildContextRouting(e, n, r, s) {
  let { session: session } = r,
    y = logProjectTextCutFailure(e, r),
    S = {
      userContext: y,
      systemContext: n,
      announced: {},
      workerTools: void 0,
      sections: [],
      instructions: void 0,
      refreshReason: "session_start",
      bare: r.options.bareFork === !0,
      carriesContext: Object.keys(y).length > 0 || Object.keys(n).length > 0,
      rendering: void 0,
    };
  if (r.options.bareFork) return S;
  let M = Am(s.messages) ?? vm(s.messages);
  if (M === "inline") return toInlineRouting(S);
  try {
    let R =
        y.claudeMd === void 0
          ? void 0
          : await getUserContextInstructionFiles(
              session,
              isStorageV5Enabled() ? r.storageV5 : void 0,
              isStorageV5Enabled() ? r.credentials : void 0,
            ),
      T = R && WGr(R, r.options),
      w = { ...y },
      P = { ...n },
      Q = {};
    for (let V of SESSION_CONTEXT_FIELDS) {
      let fe = w[V] ?? P[V];
      if (fe) Q[V] = fe;
      (delete w[V], delete P[V]);
    }
    delete w.currentDate;
    let D = isIndexedCorbatoGateOn() ? w.workerToolsContext : void 0;
    if (D !== void 0) delete w.workerToolsContext;
    delete P.currentDate;
    let L;
    if (w.claudeMd !== void 0 && T !== void 0) {
      L = toMemoryFileEntries(T);
      let V = getMaxMemoryFileChars(r.options.mainLoopModel),
        { readFileState: readFileState } = r,
        { tools: tools } = r.options,
        filtered = L.filter((re) => re.type !== "Managed" && re.content.length > V);
      if (
        filtered.length > 0 &&
        readFileState !== void 0 &&
        tools !== void 0 &&
        wm(r) &&
        !session.host.launchOptions.isInteractive() &&
        !session.host.launchOptions.diskless() &&
        tools.some((re) => toolMatchesName(re, FILE_READ_TOOL_NAME)) &&
        !tools.some((re) => toolMatchesName(re, REPL_TOOL_NAME)) &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_possum", !1)
      ) {
        let re = getToolPermissionContext(r),
          Re = new Set(filtered.filter((Te) => readWouldBeAutoAllowedForPath(Te.path, re)));
        L = L.map((Te) =>
          Re.has(Te)
            ? { ...Te, content: truncateInstructionsAtLine(Te.content, Te.path, V), startOnly: !0 }
            : Te,
        );
        for (let Te of Re) readFileState.markStartOnly(Te.path);
        let of = claudeMdLoadStateByHost.of(session.host);
        if (Re.size > 0 && !of.announcedFileCut)
          ((of.announcedFileCut = !0), logFeatureSad("context_claude_md_load", "announced_file_cut"));
      }
      delete w.claudeMd;
    } else if (w.claudeMd === "") delete w.claudeMd;
    let { cacheBreaker: cacheBreaker, ...G } = P,
      mapped = [...Object.entries(w), ...Object.entries(G)]
        .filter(([, V]) => V !== "")
        .map(([V, fe]) => ({ name: V, text: fe }));
    return {
      userContext: {},
      systemContext: cacheBreaker === void 0 ? {} : { cacheBreaker: cacheBreaker },
      announced: Q,
      workerTools: D,
      sections: mapped,
      instructions: L,
      refreshReason: c9s(session) ?? "session_start",
      bare: !1,
      carriesContext: S.carriesContext,
      rendering: "announced",
    };
  } catch (error) {
    if (
      (logError(error),
      logRoutingFailure(
        error,
        s.querySource,
        M === "announced" ? "none" : "inline",
        s.afterCompaction === !0,
      ),
      M === "announced")
    ) {
      let { cacheBreaker: cacheBreaker } = n;
      return {
        ...S,
        userContext: {},
        systemContext: cacheBreaker === void 0 ? {} : { cacheBreaker: cacheBreaker },
        bare: !0,
        rendering: "announced",
      };
    }
    return toInlineRouting(S);
  }
}
/**
 * 压缩后重新构建上下文路由（仅 announced 模式），若新结果丢失指令则保留旧的。
 */
//@ chunk-ha3km179.js:40788-40946 placement
async function rebuildRoutingAfterCompaction(e, n, r, s, h) {
  if (e.rendering !== "announced") return e;
  let y = await buildContextRouting(n, r, s, { ...h, afterCompaction: !0 });
  return e.instructions && !y.instructions ? e : y;
}
//@ chunk-ha3km179.js:40946-40985 placement
function wm(e) {
  return "getAppState" in e;
}
//@ chunk-ha3km179.js:40985-41131 placement
function logRoutingFailure(e, n, r, s) {
  try {
    logEvent("tengu_context_routing_failed", {
      error_class: sanitizedErrorNameForTelemetry(e),
      query_source: agentTypeForTelemetry(n),
      fallback: fromEnum(r),
      after_compaction: s,
    });
  } catch (error) {
    logError(error);
  }
}
/**
 * 刷新路由上下文中的 git 状态。
 */
//@ chunk-ha3km179.js:41131-41478 placement
async function refreshRoutedGitStatus(e, n, r, s) {
  let { gitStatus: gitStatus, ...y } = n.announced;
  try {
    let S = s ? s9s(r.session) : void 0;
    if (!n.carriesContext || n.bare) return n;
    let M,
      R = getSessionContextAttachmentData(e);
    if (R !== void 0) M = R.gitStatus;
    else if (!r.options.omitGitStatus && _Wo()) M = (await (S ?? computeGitStatus(r.session))) ?? void 0;
    return { ...n, announced: M === void 0 ? y : { ...y, gitStatus: M } };
  } catch (error) {
    return (logError(error), { ...n, announced: y });
  }
}
/**
 * 判断是否发送项目文档文本：到期、带上下文、非 bare、未压缩过且未读取过等条件。
 */
//@ chunk-ha3km179.js:41478-41774 placement
function shouldSendProjectDocText(e, n, r, s, h) {
  try {
    if (
      !attachedProjectDocText.mayBeDue(r.session) ||
      !s ||
      !n.carriesContext ||
      n.bare ||
      e.some(isCompactBoundaryMessage) ||
      getLastProjectDocReads(e) !== void 0 ||
      Ywt()?.getTeleportCacheState().status === "active"
    )
      return !1;
    let filtered = e.filter((S) => S.type === "assistant");
    return (
      filtered.length === 0 ||
      (h &&
        filtered.some((S) => !isRealAssistantMessage(S)) &&
        getFeatureValue_CACHED_MAY_BE_STALE(DOC_TEXT_WIDER_FLAG, !1))
    );
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-ha3km179.js:41774-41797 placement
var Im = 50000,
  Pm = 200000;
/**
 * 判断能否读取项目文档（权限规则）。
 */
//@ chunk-ha3km179.js:41797-43008 placement
async function checkProjectDocReadAllowed(e, n, r, s, h) {
  let any = s.messages.some((message) => message.type === "assistant"),
    S;
  try {
    let found = n.options.tools.find((tool) => toolMatchesName(tool, PROJECTS_TOOL_NAME)),
      R = getToolPermissionContext(n),
      T =
        found !== void 0 &&
        (getDenyRuleForTool(R, found) !== null ||
          getAskRuleForTool(R, found) !== null ||
          matchToolRule(R, found, { method: "project_read" }, "deny") !== null ||
          matchToolRule(R, found, { method: "project_read" }, "ask") !== null),
      w = found === void 0 || T ? void 0 : buildProjectTextHooks({ method: "project_read" }, r()),
      P = w === "pre_tool_use_hook" && h !== void 0 && !isCcsTenant(),
      Q = OSt(s.messages);
    S = await attachedProjectDocText.read(
      n.session,
      n.credentials,
      n.abortController.signal,
      (D, L) => {
        let { bytesPerToken: bytesPerToken } = s.modelFacts,
          reduced = L.reduce(
            (ee, V) =>
              ee +
              Math.max(V.storedTokens ?? 0, Math.ceil(Buffer.byteLength(V.text, "utf8") / bytesPerToken)),
            0,
          );
        return (
          reduced <= Im &&
          calculateTokenWarningState(
            Tp(s.messages, bytesPerToken) +
              stripInProgressAssistantMessage(s.messages) +
              roughTokenCountEstimation(
                Q
                  ? D
                  : [
                      D,
                      ...s.systemPrompt,
                      ...Object.values(e.systemContext),
                      ...Object.values(e.announced),
                      ...e.sections.map((section) => section.text),
                      ...(e.instructions ?? []).map((ee) => ee.content),
                    ].join(`
`),
                bytesPerToken,
              ) +
              (Q ? 0 : Math.ceil(Pm / bytesPerToken)) +
              reduced -
              L.reduce((ee, V) => ee + roughTokenCountEstimation(V.text, bytesPerToken), 0),
            s.modelFacts,
            n.options.autoCompactWindow,
          ).level === "ok"
        );
      },
      found === void 0
        ? "tool_not_offered"
        : T || w === "path_rule"
          ? "read_refused_by_rule"
          : w !== void 0 && !P
            ? "read_refused_by_hook"
            : void 0,
      P ? h : void 0,
    );
  } catch (error) {
    attachedProjectDocText.attachThrew(n.session, error);
  }
  if (any && !n.abortController.signal.aborted) S ??= [];
  return S === void 0 ? e : { ...e, projectDocReads: S };
}
//@ chunk-ha3km179.js:43008-43050 placement
function Fr(e, n) {
  return n === void 0 ? e : n(e);
}
//@ chunk-ha3km179.js:43050-43128 placement
function nl(e, n) {
  if (n === void 0) return e;
  try {
    return n(e);
  } catch (error) {
    logError(error);
    return;
  }
}
/**
 * 生成上下文公告附件（说明文件、日期等）。
 */
//@ chunk-ha3km179.js:43128-44432 placement
function contextAnnouncementAttachments(
  e,
  n,
  { querySource: querySource, resumeActive: resumeActive, stamp: stamp, announcementWalk: announcementWalk },
) {
  if (resumeActive || n.bare) return [];
  let S = classifyQuerySource(querySource) === "auxiliary";
  try {
    let M = [],
      R = latestInstructionFiles(e),
      T = Fr(n.instructions, announcementWalk);
    if (T && !(S && R)) {
      let V = diffInstructionFiles(T, R);
      if (V) {
        let fe = createAttachmentMessage_2(
          { type: "instructions", ...V, ...(V.changed && { reason: n.refreshReason }) },
          stamp,
        );
        M.push({
          ...fe,
          ...(getAutoModeConfigOrDefault().typedMarks === !0 && {
            [gge]: { texts: (fe.rendered ?? []).flatMap(({ content: content }) => getTextBlocks(content)) },
          }),
        });
      }
    }
    let w = getSessionContextAttachmentData(e),
      P = Fr(n.announced, announcementWalk),
      Q = Object.keys(P).length > 0;
    if (w ? !S && (Q || n.carriesContext) && !aVs(w, P) : Q || n.carriesContext)
      M.push(
        createAttachmentMessage_2(
          w
            ? { type: "session_context", context: P, changed: !0, reason: n.refreshReason }
            : { type: "session_context", context: P },
          stamp,
        ),
      );
    let D = Om(e),
      L = Fr(n.workerTools, announcementWalk),
      z = isCoordinatorMode_2();
    if (!S && D && isIndexedCorbatoGateOn() && !z)
      M.push(createAttachmentMessage_2({ type: "coordinator_context", content: "", changed: !0 }, stamp));
    else if (z && L !== void 0 && (S ? D === void 0 : D !== L))
      M.push(
        createAttachmentMessage_2(
          { type: "coordinator_context", content: L, ...(D !== void 0 && { changed: !0 }) },
          stamp,
        ),
      );
    if (n.sections.length > 0 && getLastContextSections(e) === void 0)
      M.push(
        createAttachmentMessage_2(
          { type: "context_sections", sections: Fr(n.sections, announcementWalk) },
          stamp,
        ),
      );
    if (n.projectDocReads !== void 0)
      M.push(
        createAttachmentMessage_2(
          {
            type: "project_doc_reads",
            reads: n.projectDocReads,
            ...(e.some((V) => V.type === "assistant") && { midChat: !0 }),
          },
          stamp,
        ),
      );
    let G = sessionDateString(),
      ee = lVs(e);
    if (S ? ee === void 0 : ee !== G)
      M.push(
        createAttachmentMessage_2(
          { type: "date", date: G, ...(ee !== void 0 && { changed: !0 }), ...(Za() && { assumedUtc: !0 }) },
          stamp,
        ),
      );
    return M;
  } catch (error) {
    return (logError(error), []);
  }
}
//@ chunk-ha3km179.js:44432-44496 placement
function rl(e, n, r) {
  let s = contextAnnouncementAttachments(e, n, r);
  return (reportContextAnnouncements(s, r.querySource), s);
}
/**
 * 上报 tengu_context_announcement。
 */
//@ chunk-ha3km179.js:44496-44838 placement
function reportContextAnnouncements(e, n) {
  for (let { attachment: attachment } of e)
    try {
      logEvent("tengu_context_announcement", {
        announcement_type: fromEnum(attachment.type),
        token_estimate: roughTokenCountEstimationForObject(attachment),
        updates_copy: "changed" in attachment && attachment.changed === !0,
        assumed_utc: attachment.type === "date" && attachment.assumedUtc === !0,
        refresh_reason: fromEnumOpt(
          attachment.type === "instructions" || attachment.type === "session_context"
            ? attachment.reason
            : void 0,
        ),
        query_source: agentTypeForTelemetry(n),
      });
    } catch (error) {
      logError(error);
    }
}
//@ chunk-ha3km179.js:44838-44918 placement
function Om(e) {
  return efn().safeParse(e.findLast(Dm)?.attachment).data?.content;
}
//@ chunk-ha3km179.js:44918-45005 placement
function Dm(e) {
  return e.type === "attachment" && e.attachment.type === "coordinator_context";
}
//@ chunk-ha3km179.js:45005-45158 placement
function getLastContextSections(e) {
  let last = e.findLast((r) => r.type === "attachment" && r.attachment.type === "context_sections");
  return zbt().safeParse(last?.attachment).data?.sections;
}
//@ chunk-ha3km179.js:45158-45285 placement
function getLastProjectDocReads(e) {
  let last = e.findLast((r) => r.type === "attachment" && r.attachment.type === "project_doc_reads");
  return trackedProjectReads(last?.attachment);
}
/**
 * 并行运行项目文档读取钩子，任一阻止或出错时返回 true。
 */
//@ chunk-ha3km179.js:45322-45573 placement
async function anyDocReadHookBlocks(e, n, r) {
  try {
    return (await Promise.all(e.map((s) => runProjectDocReadHooks(s, n, r)))).includes(!0);
  } catch (error) {
    if (!r.aborted)
      logForDebugging(
        `project doc text: a PreToolUse hook threw (${error instanceof Error ? error.name : typeof error}), so no doc text is sent`,
        { level: "error" },
      );
    return !0;
  }
}
/**
 * 运行项目文档读取 hooks。
 */
//@ chunk-ha3km179.js:45573-45882 placement
async function runProjectDocReadHooks(e, n, r) {
  for await (let s of executePreToolHooks(
    PROJECTS_TOOL_NAME,
    `project_doc_read_${randomUUID()}`,
    clone(e),
    n,
    getToolPermissionContext(n).mode,
    r,
  ))
    if (
      s.blockingError ||
      s.preventContinuation ||
      (s.permissionBehavior !== void 0 &&
        s.permissionBehavior !== "allow" &&
        s.permissionBehavior !== "passthrough") ||
      (s.updatedInput !== void 0 && !isSameAnswerInput(s.updatedInput, e))
    )
      return !0;
  return !1;
}
/**
 * 创建上下文空间跟踪器：阈值、已占用量与已认领量。
 */
//@ chunk-ha3km179.js:45882-46099 placement
function createContextRoomTracker(e, n, r) {
  try {
    getContextRoomThreshold(e(), n);
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "context room hand-in failed"));
    return;
  }
  let s = 0;
  return {
    get threshold() {
      return getContextRoomThreshold(e(), n);
    },
    held: () => Tp(r(), e().bytesPerToken) + stripInProgressAssistantMessage(r()),
    claimed: () => s,
    claim: (h) => {
      s += h;
    },
  };
}
//@ chunk-ha3km179.js:46099-46203 placement
function getContextRoomThreshold(e, n) {
  let r = getAutoCompactThresholdTokens(e, n);
  return D2() || getGlobalConfig().cachedExtraUsageDisabledReason === null ? r : Math.min(r, CK);
}
/**
 * 压缩后重新公告上下文。
 */
//@ chunk-ha3km179.js:46203-47111 placement
async function reannounceAfterCompact(
  e,
  {
    routing: routing,
    toolUseContext: toolUseContext,
    querySource: querySource,
    resumeActive: resumeActive,
    foreground: foreground,
    stamp: stamp,
  },
) {
  try {
    let boundaryMarker = e.boundaryMarker,
      R = isCompactBoundaryMessage(boundaryMarker)
        ? boundaryMarker.compactMetadata.preservedMessages?.anchorUuid
        : void 0;
    if (
      e.messagesToKeep.length === 0 ||
      resumeActive ||
      (R !== void 0 && R !== e.summaryMessages.at(-1)?.uuid)
    )
      return [];
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_calm_noodle", !0))
      return (logFeatureOk("compact_kept_tail_announcements", { enabled: !1, placed: 0 }), []);
    let T = new Set();
    for (let D of e.messagesToKeep)
      if (
        D.type === "attachment" &&
        REANNOUNCED_ATTACHMENT_TYPES.has(D.attachment.type) &&
        !(D.attachment.type === "instructions" && D.attachment.changed)
      )
        T.add(D.attachment.type);
    let w = buildPostCompactMessages(e),
      P = await refreshRoutedGitStatus(w, routing, toolUseContext, foreground),
      filtered = contextAnnouncementAttachments(w, P, {
        querySource: querySource,
        resumeActive: resumeActive,
        stamp: stamp,
        announcementWalk: toolUseContext.options.announcementWalk,
      }).filter((D) => !T.has(D.attachment.type));
    return (
      logFeatureOk("compact_kept_tail_announcements", {
        enabled: !0,
        placed: filtered.length,
        kept_types: T.size,
      }),
      reportContextAnnouncements(filtered, querySource),
      filtered
    );
  } catch (error) {
    return (logError(error), logFeatureSad("compact_kept_tail_announcements", "announce_failed"), []);
  }
}
//@ chunk-ha3km179.js:47111-47207 placement
function ir(e, n) {
  let [r, ...s] = e;
  if (n.length === 0 || r === void 0 || !isCompactBoundaryMessage(r)) return e;
  return [r, ...n, ...s];
}
//@ chunk-ha3km179.js:47244-47432 placement
var TENGU_TOASTY_THIMBLE = "tengu_toasty_thimble",
  TENGU_GENTLE_PARASOL = "tengu_gentle_parasol",
  Qm =
    "First privately list what you need next; then request every item that doesn't depend on another's result in this one response.";
//@ chunk-ha3km179.js:47432-47552 placement
function makeEphemeralReminder(e, n, r) {
  let trimmed = e.trim();
  if (trimmed === "") return null;
  return { text: trimmed, textForAnalytics: gn(trimmed), source: n, matchedPattern: r };
}
//@ chunk-ha3km179.js:47552-47626 placement
function $m(e) {
  let trimmed = e.trim();
  return isEnvDefinedFalsy(trimmed) || isEnvTruthy(trimmed)
    ? null
    : makeEphemeralReminder(trimmed, "env", void 0);
}
//@ chunk-ha3km179.js:47626-47641 placement
var ul = new Set();
//@ chunk-ha3km179.js:47641-47761 placement
function warnIgnoredClientData(e, n) {
  if (ul.has(e)) return;
  (ul.add(e), logForDebugging(`[ephemeral reminder] ignoring client_data ${e}: ${n}`, { level: "warn" }));
}
/**
 * 读取按模型的提醒文本覆盖（环境变量或客户端数据）。
 */
//@ chunk-ha3km179.js:47761-48143 placement
function readModelReminderOverride(e, n) {
  let r = env[e.envVar];
  if (r !== void 0) return $m(r);
  let s = getCachedClientData()?.[e.clientDataKey];
  if (s !== void 0 && s !== null)
    if (typeof s !== "object" || Array.isArray(s))
      warnIgnoredClientData(
        e.clientDataKey,
        `expected a map from model pattern to text, got ${Array.isArray(s) ? "array" : typeof s}`,
      );
    else {
      let y = findModelKeyedEntry(s, n);
      if (y !== void 0) return reminderFromClientData(e, y);
    }
  let h = e.modelOwn?.(getCanonicalName(n));
  return h !== void 0 ? makeEphemeralReminder(h, "model", void 0) : null;
}
//@ chunk-ha3km179.js:48143-48317 placement
function reminderFromClientData(e, [n, r]) {
  if (typeof r !== "string")
    return (
      warnIgnoredClientData(
        e.clientDataKey,
        `value for pattern "${n}" is ${typeof r}, expected the reminder text`,
      ),
      null
    );
  return makeEphemeralReminder(r, "clientData", n);
}
/**
 * 批处理/次级提醒的配置与锁存。
 */
//@ chunk-ha3km179.js:48317-48729 placement
var REMINDER_LATCHES = new SessionRootSlot(() => ({ latched: void 0 })),
  zm = new SessionRootSlot(() => ({ latched: void 0 })),
  Xm = {
    clientDataKey: TENGU_TOASTY_THIMBLE,
    envVar: "CLAUDE_CODE_TOASTY_THIMBLE",
    modelOwn: (e) => (YFe(e) ? Qm : void 0),
    latches: REMINDER_LATCHES,
    logApplied: (e) => {
      (logFeatureOk("batching_reminder"), logEvent("tengu_toasty_thimble_applied", e));
    },
  },
  Zm = {
    clientDataKey: TENGU_GENTLE_PARASOL,
    envVar: "CLAUDE_CODE_GENTLE_PARASOL",
    modelOwn: void 0,
    latches: zm,
    logApplied: (e) => {
      (logFeatureOk("secondary_reminder"), logEvent("tengu_gentle_parasol_applied", e));
    },
  };
/**
 * 按对话锁存的提醒文本。
 */
//@ chunk-ha3km179.js:48729-49124 placement
function latchedReminderText(e, n, r) {
  if (!shouldUseMidConvSystem(r)) return null;
  let s = readModelReminderOverride(e, r);
  if (s === null) return null;
  let of = e.latches.of(n);
  if (of.latched?.conversationId !== n.id) of.latched = { conversationId: n.id, byModel: new Map() };
  let lower = Bn(getCanonicalName(r)).toLowerCase(),
    S = of.latched.byModel.get(lower);
  if (S === void 0)
    ((S = s),
      of.latched.byModel.set(lower, S),
      e.logApplied({
        model: telemetrySafeModelName(Bn(r)),
        source: fromEnum(s.source),
        text: s.textForAnalytics,
        len: s.text.length,
      }));
  return S.text;
}
//@ chunk-ha3km179.js:49124-49159 placement
function ef(e, n) {
  return latchedReminderText(Xm, e, n);
}
//@ chunk-ha3km179.js:49159-49194 placement
function tf(e, n) {
  return latchedReminderText(Zm, e, n);
}
//@ chunk-ha3km179.js:49194-49262 placement
var of = new Set(["queued_command", "teammate_mailbox", "poll_events"]);
//@ chunk-ha3km179.js:49262-49331 placement
function nf() {
  return [
    REJECT_MESSAGE,
    REJECT_MESSAGE_WITH_REASON_PREFIX,
    SUBAGENT_REJECT_MESSAGE,
    SUBAGENT_REJECT_MESSAGE_WITH_REASON_PREFIX,
    CANCEL_MESSAGE,
    TOOL_CALL_SKIPPED_BY_SIBLING_DENIAL,
    TOOL_CALL_SKIPPED_FOR_DELIVERY,
    APPROVAL_EXPIRED_MESSAGE,
    APPROVAL_UNANSWERED_MESSAGE,
    INTERRUPT_MESSAGE_FOR_TOOL_USE,
    TOOL_CALL_ENDED_FOR_DELIVERY,
    TOOL_CALL_SESSION_ENDED,
    TOOL_RESULT_NOT_IN_COPY,
    AGENT_CALL_PROCESS_STOPPED,
  ];
}
//@ chunk-ha3km179.js:49331-49574 placement
function hasKnownToolResultPrefix(e) {
  if (e.type !== "tool_result") return !1;
  let n =
    typeof e.content === "string"
      ? e.content
      : Array.isArray(e.content)
        ? e.content.map((r) => (r?.type === "text" && typeof r.text === "string" ? r.text : "")).join("")
        : "";
  return nf().some((r) => n.startsWith(r));
}
/**
 * 决定批处理提醒插入位置。
 */
//@ chunk-ha3km179.js:49574-50279 placement
function placeBatchingReminder(e, n, r) {
  let s = { messages: e, text: null, secondaryText: null, afterUuid: null };
  try {
    let h = !0,
      y = e.length - 1;
    for (; y >= 0; y--) {
      let w = e[y];
      if (isNonConversationMessage(w)) continue;
      if (w.type !== "attachment") break;
      if (of.has(w.attachment.type)) h = !1;
    }
    let S = y >= 0 ? e[y] : void 0;
    if (!hasToolResultBlock(S) || isForkBoilerplateMessage(S)) return s;
    for (let w = y; h && w >= 0; w--) {
      let P = e[w];
      if (isNonConversationMessage(P) || P.type === "attachment") continue;
      if (!hasToolResultBlock(P)) break;
      if (P.message.content.some(hasKnownToolResultPrefix)) h = !1;
    }
    let M = h ? ef(n, r) : null,
      R = tf(n, r);
    if (M === null && R === null) return s;
    let T = [];
    if (M !== null) T.push(createAttachmentMessage({ type: "batching_reminder", text: M }));
    if (R !== null) T.push(createAttachmentMessage({ type: "secondary_reminder", text: R }));
    return {
      messages: [...e.slice(0, y + 1), ...T, ...e.slice(y + 1)],
      text: M,
      secondaryText: R,
      afterUuid: S.uuid,
    };
  } catch (error) {
    return (logError(error), s);
  }
}
/**
 * 应用批处理/次级提醒到消息。
 */
//@ chunk-ha3km179.js:50279-50796 placement
function applyReminders(e, n, r) {
  try {
    let s = placeBatchingReminder(e, n, r),
      h = new Map();
    for (let S = e.length - 1; S >= 0; S--) {
      let M = e[S];
      if (M.type !== "attachment") {
        if (isNonConversationMessage(M)) continue;
        break;
      }
      let attachment = M.attachment;
      if (
        (attachment.type === "batching_reminder_sent" || attachment.type === "secondary_reminder_sent") &&
        attachment.clearAt === "next_user_message" &&
        !h.has(attachment.type)
      )
        h.set(attachment.type, attachment.text);
    }
    let y = [];
    for (let [S, M] of [
      ["batching_reminder_sent", s.text ?? ""],
      ["secondary_reminder_sent", s.secondaryText ?? ""],
    ]) {
      let R = h.get(S);
      if (R === void 0 ? M !== "" : R !== M) y.push({ type: S, text: M });
    }
    return y;
  } catch (error) {
    return (logError(error), []);
  }
}
//@ chunk-ha3km179.js:50796-50895 placement = createAttachmentMessage (1)
function createAttachmentMessage(attachment) {
  return {
    type: "attachment",
    attachment: attachment,
    uuid: randomUUID_2(),
    timestamp: new Date().toISOString(),
  };
}
//@ chunk-ha3km179.js:50895-51021 placement
function hasToolResultBlock(e) {
  return (
    e?.type === "user" &&
    Array.isArray(e.message.content) &&
    e.message.content.some((n) => n.type === "tool_result")
  );
}
/**
 * 本回合是否用过 computer-use。
 */
//@ chunk-ha3km179.js:51021-51062 placement
function isComputerUseActiveThisTurn() {
  return getComputerUseSession().activeThisTurn;
}
/**
 * 清除本回合使用标记。
 */
//@ chunk-ha3km179.js:51062-51099 placement
function clearComputerUseActiveThisTurn() {
  getComputerUseSession().activeThisTurn = !1;
}

export {
  buildContextRouting,
  rebuildRoutingAfterCompaction,
  reannounceAfterCompact,
  ir,
  refreshRoutedGitStatus,
  shouldSendProjectDocText,
  checkProjectDocReadAllowed,
  anyDocReadHookBlocks,
  rl,
  createContextRoomTracker,
  applyReminders,
  placeBatchingReminder,
  nl,
  isComputerUseActiveThisTurn,
  clearComputerUseActiveThisTurn,
};
