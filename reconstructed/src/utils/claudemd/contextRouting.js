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
import { randomUUID } from "crypto";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isTimeZoneAssumed, sessionDateString } from "../sessionTimeZone.js";
import { isPromptSnapshotFeatureOn, latestPromptSnapshot } from "../contextAttachments/promptSnapshot.js";
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
import {
  getUserContextInstructionFiles,
  getUserContextRefreshReason,
  takeGitStatusPrefetch,
  shouldPrefetchGitStatus,
  computeGitStatus,
} from "../../context.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { filterManagedInstructions } from "../instructionFileAccess.js";
import {
  SESSION_CONTEXT_FIELDS,
  sameSessionContextValues,
  lastSessionDate,
} from "../contextAttachments/sessionContext.js";
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
import { loadCleanupHelpers } from "../../services/compact/postCompactCleanup.js";
import { isRealAssistantMessage } from "../messages/messagePredicates.js";
import { PROJECTS_TOOL_NAME } from "../../tools/ProjectsTool/prompt.js";
import { getDenyRuleForTool, getAskRuleForTool, matchToolRule } from "../permissions/permissions.js";
import { isCcsTenant } from "../../bootstrap/state.js";
import {
  hasUsageAnchor,
  calculateTokenWarningState,
  estimateTokensWithAnchor,
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
import { MESSAGE_MARK_SYMBOLS } from "../messageKinds.js";
import { getTextBlocks } from "../messages/apiNormalization.js";
import {
  announcementSchema,
  contextSectionsSchema,
  REANNOUNCED_ATTACHMENT_TYPES,
} from "../transcript/resumeAnnouncements.js";
import { trackedProjectReads } from "../../tools/ProjectsTool/readTracking.js";
import { executePreToolHooks } from "../hooks.js";
import { clone } from "../slowOperations.js";
import { isSameAnswerInput } from "../permissions/permissionAnswer.js";
import { usesPayAsYouGo } from "../planTiers.js";
import { getGlobalConfig, getCachedClientData } from "../config.js";
import { SECONDARY_CONTEXT_WINDOW } from "../model/model.js";
import { buildPostCompactMessages } from "../../services/compact/compact.js";
import { shortHash } from "../shortHash.js";
import { isEnvDefinedFalsy, isEnvTruthy } from "../envUtils.js";
import { env } from "../env.js";
import { findModelKeyedEntry } from "../attachments/totalTokensReminder.js";
import { getCanonicalName } from "../model/canonicalModelName.js";
import { SessionRootSlot, isNonConversationMessage } from "../../bootstrap/sessionSlices.js";
import { usesFablePromptBundle } from "../model/fableMitigations.js";
import { shouldUseMidConvSystem } from "../betas.js";
import { stripAnyVersatileSuffix } from "../model/modelIds.js";
import { telemetrySafeModelName } from "../model/telemetryModelName.js";
import { isForkBoilerplateMessage } from "../../constants/xml.js";
import { getComputerUseSession } from "../computerUse/session.js";

//@ chunk-ha3km179.js:38341-38394 placement
/**
 * tengu_peppy_nest 开启且启用时区假设时返回真。
 */
function isTimeZoneAssumptionEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_peppy_nest", false) && isTimeZoneAssumed();
}
//@ chunk-ha3km179.js:38394-38479 placement
/**
 * 从最近提示快照里取上下文渲染方式。
 */
function latestContextRendering(messages) {
  try {
    return isPromptSnapshotFeatureOn() ? latestPromptSnapshot(messages)?.contextRendering : undefined;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:38479-38569 placement
/**
 * 会话上下文已公告时返回 announced。
 */
function announcedContextRendering(messages) {
  try {
    return isPromptSnapshotFeatureOn() && getSessionContextAttachmentData(messages) !== undefined
      ? "announced"
      : undefined;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:38569-38694 placement
function toInlineRouting(e) {
  let { claudeMd, ...r } = e.userContext;
  return {
    ...e,
    userContext: claudeMd === "" ? r : e.userContext,
    bare: true,
    rendering: "inline",
  };
}
//@ chunk-ha3km179.js:38694-40788 placement
/**
 * 会话开始时组装上下文路由（用户/系统上下文、说明、工作者工具）。
 */
async function buildContextRouting(e, n, r, s) {
  let { session } = r;
  let y = logProjectTextCutFailure(e, r);
  let S = {
    userContext: y,
    systemContext: n,
    announced: {},
    workerTools: undefined,
    sections: [],
    instructions: undefined,
    refreshReason: "session_start",
    bare: r.options.bareFork === true,
    carriesContext: Object.keys(y).length > 0 || Object.keys(n).length > 0,
    rendering: undefined,
  };
  if (r.options.bareFork) return S;
  let M = latestContextRendering(s.messages) ?? announcedContextRendering(s.messages);
  if (M === "inline") return toInlineRouting(S);
  try {
    let R =
      y.claudeMd === undefined
        ? undefined
        : await getUserContextInstructionFiles(
            session,
            isStorageV5Enabled() ? r.storageV5 : undefined,
            isStorageV5Enabled() ? r.credentials : undefined,
          );
    let T = R && filterManagedInstructions(R, r.options);
    let w = {
      ...y,
    };
    let P = {
      ...n,
    };
    let Q = {};
    for (let V of SESSION_CONTEXT_FIELDS) {
      let fe = w[V] ?? P[V];
      if (fe) Q[V] = fe;
      delete w[V];
      delete P[V];
    }
    delete w.currentDate;
    let workerToolsContext = isIndexedCorbatoGateOn() ? w.workerToolsContext : undefined;
    if (workerToolsContext !== undefined) delete w.workerToolsContext;
    delete P.currentDate;
    let L;
    if (w.claudeMd !== undefined && T !== undefined) {
      L = toMemoryFileEntries(T);
      let maxMemoryFileChars = getMaxMemoryFileChars(r.options.mainLoopModel);
      let { readFileState } = r;
      let { tools } = r.options;
      let filtered = L.filter((re) => re.type !== "Managed" && re.content.length > maxMemoryFileChars);
      if (
        filtered.length > 0 &&
        readFileState !== undefined &&
        tools !== undefined &&
        hasAppState(r) &&
        !session.host.launchOptions.isInteractive() &&
        !session.host.launchOptions.diskless() &&
        tools.some((tool) => toolMatchesName(tool, FILE_READ_TOOL_NAME)) &&
        !tools.some((tool) => toolMatchesName(tool, REPL_TOOL_NAME)) &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_possum", false)
      ) {
        let toolPermissionContext = getToolPermissionContext(r);
        let Re = new Set(
          filtered.filter((Te) => readWouldBeAutoAllowedForPath(Te.path, toolPermissionContext)),
        );
        L = L.map((Te) =>
          Re.has(Te)
            ? {
                ...Te,
                content: truncateInstructionsAtLine(Te.content, Te.path, maxMemoryFileChars),
                startOnly: true,
              }
            : Te,
        );
        for (let Te of Re) readFileState.markStartOnly(Te.path);
        let se = claudeMdLoadStateByHost.of(session.host);
        if (Re.size > 0 && !se.announcedFileCut) {
          se.announcedFileCut = true;
          logFeatureSad("context_claude_md_load", "announced_file_cut");
        }
      }
      delete w.claudeMd;
    } else if (w.claudeMd === "") delete w.claudeMd;
    let { cacheBreaker, ...G } = P;
    let sections = [...Object.entries(w), ...Object.entries(G)]
      .filter(([, V]) => V !== "")
      .map(([V, fe]) => ({
        name: V,
        text: fe,
      }));
    return {
      userContext: {},
      systemContext:
        cacheBreaker === undefined
          ? {}
          : {
              cacheBreaker,
            },
      announced: Q,
      workerTools: workerToolsContext,
      sections,
      instructions: L,
      refreshReason: getUserContextRefreshReason(session) ?? "session_start",
      bare: false,
      carriesContext: S.carriesContext,
      rendering: "announced",
    };
  } catch (error) {
    logError(error);
    logRoutingFailure(
      error,
      s.querySource,
      M === "announced" ? "none" : "inline",
      s.afterCompaction === true,
    );
    if (M === "announced") {
      let { cacheBreaker } = n;
      return {
        ...S,
        userContext: {},
        systemContext:
          cacheBreaker === undefined
            ? {}
            : {
                cacheBreaker,
              },
        bare: true,
        rendering: "announced",
      };
    }
    return toInlineRouting(S);
  }
}
//@ chunk-ha3km179.js:40788-40946 placement
/**
 * 压缩后重新构建上下文路由（仅 announced 模式），若新结果丢失指令则保留旧的。
 */
async function rebuildRoutingAfterCompaction(contextRouting, userContext, systemContext, s, h) {
  if (contextRouting.rendering !== "announced") return contextRouting;
  let contextRouting_2 = await buildContextRouting(userContext, systemContext, s, {
    ...h,
    afterCompaction: true,
  });
  return contextRouting.instructions && !contextRouting_2.instructions ? contextRouting : contextRouting_2;
}
//@ chunk-ha3km179.js:40946-40985 placement
/**
 * 判断对象是否带 getAppState 方法。
 */
function hasAppState(e) {
  return "getAppState" in e;
}
//@ chunk-ha3km179.js:40985-41131 placement
function logRoutingFailure(error, querySource, r, afterCompaction) {
  try {
    logEvent("tengu_context_routing_failed", {
      error_class: sanitizedErrorNameForTelemetry(error),
      query_source: agentTypeForTelemetry(querySource),
      fallback: fromEnum(r),
      after_compaction: afterCompaction,
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-ha3km179.js:41131-41478 placement
/**
 * 刷新路由上下文中的 git 状态。
 */
async function refreshRoutedGitStatus(messages, n, toolUseContext, s) {
  let { gitStatus, ...y } = n.announced;
  try {
    let S = s ? takeGitStatusPrefetch(toolUseContext.session) : undefined;
    if (!n.carriesContext || n.bare) return n;
    let M;
    let sessionContextAttachmentData = getSessionContextAttachmentData(messages);
    if (sessionContextAttachmentData !== undefined) M = sessionContextAttachmentData.gitStatus;
    else if (!toolUseContext.options.omitGitStatus && shouldPrefetchGitStatus())
      M = (await (S ?? computeGitStatus(toolUseContext.session))) ?? undefined;
    return {
      ...n,
      announced:
        M === undefined
          ? y
          : {
              ...y,
              gitStatus: M,
            },
    };
  } catch (error) {
    logError(error);
    return {
      ...n,
      announced: y,
    };
  }
}
//@ chunk-ha3km179.js:41478-41774 placement
/**
 * 判断是否发送项目文档文本：到期、带上下文、非 bare、未压缩过且未读取过等条件。
 */
function shouldSendProjectDocText(messagesForQuery, n, toolUseContext, s, h) {
  try {
    if (
      !attachedProjectDocText.mayBeDue(toolUseContext.session) ||
      !s ||
      !n.carriesContext ||
      n.bare ||
      messagesForQuery.some(isCompactBoundaryMessage) ||
      getLastProjectDocReads(messagesForQuery) !== undefined ||
      loadCleanupHelpers()?.getTeleportCacheState().status === "active"
    )
      return false;
    let filtered = messagesForQuery.filter((S) => S.type === "assistant");
    return (
      filtered.length === 0 ||
      (h &&
        filtered.some((S) => !isRealAssistantMessage(S)) &&
        getFeatureValue_CACHED_MAY_BE_STALE(DOC_TEXT_WIDER_FLAG, false))
    );
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-ha3km179.js:41774-41797 placement
/**
 * 项目文档可注入的 token 上限（50000）。
 */
var MAX_PROJECT_DOC_TOKENS = 50000;
var CONTEXT_WINDOW_BASELINE_TOKENS = 200000;
//@ chunk-ha3km179.js:41797-43008 placement
/**
 * 判断能否读取项目文档（权限规则）。
 */
async function checkProjectDocReadAllowed(e, toolUseContext, r, s, h) {
  let any = s.messages.some((message) => message.type === "assistant");
  let S;
  try {
    let found = toolUseContext.options.tools.find((tool) => toolMatchesName(tool, PROJECTS_TOOL_NAME));
    let toolPermissionContext = getToolPermissionContext(toolUseContext);
    let T =
      found !== undefined &&
      (getDenyRuleForTool(toolPermissionContext, found) !== null ||
        getAskRuleForTool(toolPermissionContext, found) !== null ||
        matchToolRule(
          toolPermissionContext,
          found,
          {
            method: "project_read",
          },
          "deny",
        ) !== null ||
        matchToolRule(
          toolPermissionContext,
          found,
          {
            method: "project_read",
          },
          "ask",
        ) !== null);
    let w =
      found === undefined || T
        ? undefined
        : buildProjectTextHooks(
            {
              method: "project_read",
            },
            r(),
          );
    let P = w === "pre_tool_use_hook" && h !== undefined && !isCcsTenant();
    let Q = hasUsageAnchor(s.messages);
    S = await attachedProjectDocText.read(
      toolUseContext.session,
      toolUseContext.credentials,
      toolUseContext.abortController.signal,
      (D, L) => {
        let { bytesPerToken } = s.modelFacts;
        let reduced = L.reduce(
          (acc, V) =>
            acc + Math.max(V.storedTokens ?? 0, Math.ceil(Buffer.byteLength(V.text, "utf8") / bytesPerToken)),
          0,
        );
        return (
          reduced <= MAX_PROJECT_DOC_TOKENS &&
          calculateTokenWarningState(
            estimateTokensWithAnchor(s.messages, bytesPerToken) +
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
              (Q ? 0 : Math.ceil(CONTEXT_WINDOW_BASELINE_TOKENS / bytesPerToken)) +
              reduced -
              L.reduce((acc, V) => acc + roughTokenCountEstimation(V.text, bytesPerToken), 0),
            s.modelFacts,
            toolUseContext.options.autoCompactWindow,
          ).level === "ok"
        );
      },
      found === undefined
        ? "tool_not_offered"
        : T || w === "path_rule"
          ? "read_refused_by_rule"
          : w !== undefined && !P
            ? "read_refused_by_hook"
            : undefined,
      P ? h : undefined,
    );
  } catch (error) {
    attachedProjectDocText.attachThrew(toolUseContext.session, error);
  }
  if (any && !toolUseContext.abortController.signal.aborted) S ??= [];
  return S === undefined
    ? e
    : {
        ...e,
        projectDocReads: S,
      };
}
//@ chunk-ha3km179.js:43008-43050 placement
/**
 * 有映射函数就应用，否则原样返回。
 */
function applyMapperOrIdentity(e, announcementWalk) {
  return announcementWalk === undefined ? e : announcementWalk(e);
}
//@ chunk-ha3km179.js:43050-43128 placement
/**
 * 应用映射函数，出错记日志并返回 undefined。
 */
function safeMapOrUndefined(e, announcementWalk) {
  if (announcementWalk === undefined) return e;
  try {
    return announcementWalk(e);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:43128-44432 placement
/**
 * 生成上下文公告附件（说明文件、日期等）。
 */
function contextAnnouncementAttachments(messages, n, { querySource, resumeActive, stamp, announcementWalk }) {
  if (resumeActive || n.bare) return [];
  let S = classifyQuerySource(querySource) === "auxiliary";
  try {
    let M = [];
    let R = latestInstructionFiles(messages);
    let T = applyMapperOrIdentity(n.instructions, announcementWalk);
    if (T && !(S && R)) {
      let V = diffInstructionFiles(T, R);
      if (V) {
        let attachmentMessage = createAttachmentMessage_2(
          {
            type: "instructions",
            ...V,
            ...(V.changed && {
              reason: n.refreshReason,
            }),
          },
          stamp,
        );
        M.push({
          ...attachmentMessage,
          ...(getAutoModeConfigOrDefault().typedMarks === true && {
            [MESSAGE_MARK_SYMBOLS]: {
              texts: (attachmentMessage.rendered ?? []).flatMap(({ content }) => getTextBlocks(content)),
            },
          }),
        });
      }
    }
    let sessionContextAttachmentData = getSessionContextAttachmentData(messages);
    let P = applyMapperOrIdentity(n.announced, announcementWalk);
    let Q = Object.keys(P).length > 0;
    if (
      sessionContextAttachmentData
        ? !S && (Q || n.carriesContext) && !sameSessionContextValues(sessionContextAttachmentData, P)
        : Q || n.carriesContext
    )
      M.push(
        createAttachmentMessage_2(
          sessionContextAttachmentData
            ? {
                type: "session_context",
                context: P,
                changed: true,
                reason: n.refreshReason,
              }
            : {
                type: "session_context",
                context: P,
              },
          stamp,
        ),
      );
    let D = coordinatorContextContent(messages);
    let L = applyMapperOrIdentity(n.workerTools, announcementWalk);
    let z = isCoordinatorMode_2();
    if (!S && D && isIndexedCorbatoGateOn() && !z)
      M.push(
        createAttachmentMessage_2(
          {
            type: "coordinator_context",
            content: "",
            changed: true,
          },
          stamp,
        ),
      );
    else if (z && L !== undefined && (S ? D === undefined : D !== L))
      M.push(
        createAttachmentMessage_2(
          {
            type: "coordinator_context",
            content: L,
            ...(D !== undefined && {
              changed: true,
            }),
          },
          stamp,
        ),
      );
    if (n.sections.length > 0 && getLastContextSections(messages) === undefined)
      M.push(
        createAttachmentMessage_2(
          {
            type: "context_sections",
            sections: applyMapperOrIdentity(n.sections, announcementWalk),
          },
          stamp,
        ),
      );
    if (n.projectDocReads !== undefined)
      M.push(
        createAttachmentMessage_2(
          {
            type: "project_doc_reads",
            reads: n.projectDocReads,
            ...(messages.some((V) => V.type === "assistant") && {
              midChat: true,
            }),
          },
          stamp,
        ),
      );
    let G = sessionDateString();
    let ee = lastSessionDate(messages);
    if (S ? ee === undefined : ee !== G)
      M.push(
        createAttachmentMessage_2(
          {
            type: "date",
            date: G,
            ...(ee !== undefined && {
              changed: true,
            }),
            ...(isTimeZoneAssumptionEnabled() && {
              assumedUtc: true,
            }),
          },
          stamp,
        ),
      );
    return M;
  } catch (error) {
    logError(error);
    return [];
  }
}
//@ chunk-ha3km179.js:44432-44496 placement
/**
 * 生成上下文公告附件并上报遥测。
 */
function reportContextAnnouncements(messagesForQuery, n, r) {
  let s = contextAnnouncementAttachments(messagesForQuery, n, r);
  reportContextAnnouncements_2(s, r.querySource);
  return s;
}
//@ chunk-ha3km179.js:44496-44838 placement
/**
 * 上报 tengu_context_announcement。
 */
function reportContextAnnouncements_2(e, querySource) {
  for (let { attachment } of e)
    try {
      logEvent("tengu_context_announcement", {
        announcement_type: fromEnum(attachment.type),
        token_estimate: roughTokenCountEstimationForObject(attachment),
        updates_copy: "changed" in attachment && attachment.changed === true,
        assumed_utc: attachment.type === "date" && attachment.assumedUtc === true,
        refresh_reason: fromEnumOpt(
          attachment.type === "instructions" || attachment.type === "session_context"
            ? attachment.reason
            : undefined,
        ),
        query_source: agentTypeForTelemetry(querySource),
      });
    } catch (error) {
      logError(error);
    }
}
//@ chunk-ha3km179.js:44838-44918 placement
/**
 * 取最近一条协调者上下文附件的内容。
 */
function coordinatorContextContent(e) {
  return announcementSchema().safeParse(e.findLast(isCoordinatorContextAttachment)?.attachment).data?.content;
}
//@ chunk-ha3km179.js:44918-45005 placement
/**
 * 判断消息是否为协调者上下文附件。
 */
function isCoordinatorContextAttachment(e) {
  return e.type === "attachment" && e.attachment.type === "coordinator_context";
}
//@ chunk-ha3km179.js:45005-45158 placement
function getLastContextSections(e) {
  let last = e.findLast((r) => r.type === "attachment" && r.attachment.type === "context_sections");
  return contextSectionsSchema().safeParse(last?.attachment).data?.sections;
}
//@ chunk-ha3km179.js:45158-45285 placement
function getLastProjectDocReads(e) {
  let last = e.findLast((r) => r.type === "attachment" && r.attachment.type === "project_doc_reads");
  return trackedProjectReads(last?.attachment);
}
//@ chunk-ha3km179.js:45322-45573 placement
/**
 * 并行运行项目文档读取钩子，任一阻止或出错时返回 true。
 */
async function anyDocReadHookBlocks(e, toolUseContext, r) {
  try {
    return (await Promise.all(e.map((s) => runProjectDocReadHooks(s, toolUseContext, r)))).includes(true);
  } catch (error) {
    if (!r.aborted)
      logForDebugging(
        `project doc text: a PreToolUse hook threw (${error instanceof Error ? error.name : typeof error}), so no doc text is sent`,
        {
          level: "error",
        },
      );
    return true;
  }
}
//@ chunk-ha3km179.js:45573-45882 placement
/**
 * 运行项目文档读取 hooks。
 */
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
      (s.permissionBehavior !== undefined &&
        s.permissionBehavior !== "allow" &&
        s.permissionBehavior !== "passthrough") ||
      (s.updatedInput !== undefined && !isSameAnswerInput(s.updatedInput, e))
    )
      return true;
  return false;
}
//@ chunk-ha3km179.js:45882-46099 placement
/**
 * 创建上下文空间跟踪器：阈值、已占用量与已认领量。
 */
function createContextRoomTracker(e, autoCompactWindow, r) {
  try {
    getContextRoomThreshold(e(), autoCompactWindow);
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "context room hand-in failed"));
    return;
  }
  let s = 0;
  return {
    get threshold() {
      return getContextRoomThreshold(e(), autoCompactWindow);
    },
    held: () => estimateTokensWithAnchor(r(), e().bytesPerToken) + stripInProgressAssistantMessage(r()),
    claimed: () => s,
    claim: (h) => {
      s += h;
    },
  };
}
//@ chunk-ha3km179.js:46099-46203 placement
function getContextRoomThreshold(e, n) {
  let autoCompactThresholdTokens = getAutoCompactThresholdTokens(e, n);
  return usesPayAsYouGo() || getGlobalConfig().cachedExtraUsageDisabledReason === null
    ? autoCompactThresholdTokens
    : Math.min(autoCompactThresholdTokens, SECONDARY_CONTEXT_WINDOW);
}
//@ chunk-ha3km179.js:46203-47111 placement
/**
 * 压缩后重新公告上下文。
 */
async function reannounceAfterCompact(
  e,
  { routing, toolUseContext, querySource, resumeActive, foreground, stamp },
) {
  try {
    let boundaryMarker = e.boundaryMarker;
    let anchorUuid = isCompactBoundaryMessage(boundaryMarker)
      ? boundaryMarker.compactMetadata.preservedMessages?.anchorUuid
      : undefined;
    if (
      e.messagesToKeep.length === 0 ||
      resumeActive ||
      (anchorUuid !== undefined && anchorUuid !== e.summaryMessages.at(-1)?.uuid)
    )
      return [];
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_calm_noodle", true)) {
      logFeatureOk("compact_kept_tail_announcements", {
        enabled: false,
        placed: 0,
      });
      return [];
    }
    let T = new Set();
    for (let D of e.messagesToKeep)
      if (
        D.type === "attachment" &&
        REANNOUNCED_ATTACHMENT_TYPES.has(D.attachment.type) &&
        !(D.attachment.type === "instructions" && D.attachment.changed)
      )
        T.add(D.attachment.type);
    let postCompactMessages = buildPostCompactMessages(e);
    let P = await refreshRoutedGitStatus(postCompactMessages, routing, toolUseContext, foreground);
    let filtered = contextAnnouncementAttachments(postCompactMessages, P, {
      querySource,
      resumeActive,
      stamp,
      announcementWalk: toolUseContext.options.announcementWalk,
    }).filter((D) => !T.has(D.attachment.type));
    logFeatureOk("compact_kept_tail_announcements", {
      enabled: true,
      placed: filtered.length,
      kept_types: T.size,
    });
    reportContextAnnouncements_2(filtered, querySource);
    return filtered;
  } catch (error) {
    logError(error);
    logFeatureSad("compact_kept_tail_announcements", "announce_failed");
    return [];
  }
}
//@ chunk-ha3km179.js:47111-47207 placement
/**
 * 在压缩边界消息之后插入给定消息。
 */
function insertAfterCompactBoundary(e, n) {
  let [r, ...s] = e;
  if (n.length === 0 || r === undefined || !isCompactBoundaryMessage(r)) return e;
  return [r, ...n, ...s];
}
//@ chunk-ha3km179.js:47244-47432 placement
/**
 * 提示模型先私下列清单再批量请求的提醒文本。
 */
var TENGU_TOASTY_THIMBLE = "tengu_toasty_thimble";
var TENGU_GENTLE_PARASOL = "tengu_gentle_parasol";
var BATCHING_REMINDER_TEXT =
  "First privately list what you need next; then request every item that doesn't depend on another's result in this one response.";
//@ chunk-ha3km179.js:47432-47552 placement
function makeEphemeralReminder(e, source, matchedPattern) {
  let trimmed = e.trim();
  if (trimmed === "") return null;
  return {
    text: trimmed,
    textForAnalytics: shortHash(trimmed),
    source,
    matchedPattern,
  };
}
//@ chunk-ha3km179.js:47552-47626 placement
/**
 * 由环境变量构造一次性提醒（取值为假或真时返回 null）。
 */
function envReminderOf(e) {
  let trimmed = e.trim();
  return isEnvDefinedFalsy(trimmed) || isEnvTruthy(trimmed)
    ? null
    : makeEphemeralReminder(trimmed, "env", undefined);
}
//@ chunk-ha3km179.js:47626-47641 placement
/**
 * 已告警过的客户端数据键集合（只告警一次）。
 */
var warnedEphemeralKeys = new Set();
//@ chunk-ha3km179.js:47641-47761 placement
function warnIgnoredClientData(clientDataKey, n) {
  if (warnedEphemeralKeys.has(clientDataKey)) return;
  warnedEphemeralKeys.add(clientDataKey);
  logForDebugging(`[ephemeral reminder] ignoring client_data ${clientDataKey}: ${n}`, {
    level: "warn",
  });
}
//@ chunk-ha3km179.js:47761-48143 placement
/**
 * 读取按模型的提醒文本覆盖（环境变量或客户端数据）。
 */
function readModelReminderOverride(e, n) {
  let r = env[e.envVar];
  if (r !== undefined) return envReminderOf(r);
  let s = getCachedClientData()?.[e.clientDataKey];
  if (s !== undefined && s !== null)
    if (typeof s !== "object" || Array.isArray(s))
      warnIgnoredClientData(
        e.clientDataKey,
        `expected a map from model pattern to text, got ${Array.isArray(s) ? "array" : typeof s}`,
      );
    else {
      let modelKeyedEntry = findModelKeyedEntry(s, n);
      if (modelKeyedEntry !== undefined) return reminderFromClientData(e, modelKeyedEntry);
    }
  let h = e.modelOwn?.(getCanonicalName(n));
  return h !== undefined ? makeEphemeralReminder(h, "model", undefined) : null;
}
//@ chunk-ha3km179.js:48143-48317 placement
function reminderFromClientData(e, [matchedPattern, r]) {
  if (typeof r !== "string") {
    warnIgnoredClientData(
      e.clientDataKey,
      `value for pattern "${matchedPattern}" is ${typeof r}, expected the reminder text`,
    );
    return null;
  }
  return makeEphemeralReminder(r, "clientData", matchedPattern);
}
//@ chunk-ha3km179.js:48317-48729 placement
/**
 * 另一组已锁存提醒的会话状态。
 */
var REMINDER_LATCHES = new SessionRootSlot(() => ({
  latched: undefined,
}));
var latchedReminderState = new SessionRootSlot(() => ({
  latched: undefined,
}));
var CLIENT_DATA_REMINDER = {
  clientDataKey: TENGU_TOASTY_THIMBLE,
  envVar: "CLAUDE_CODE_TOASTY_THIMBLE",
  modelOwn: (e) => (usesFablePromptBundle(e) ? BATCHING_REMINDER_TEXT : undefined),
  latches: REMINDER_LATCHES,
  logApplied: (e) => {
    logFeatureOk("batching_reminder");
    logEvent("tengu_toasty_thimble_applied", e);
  },
};
var REMINDER_LATCHES_2 = {
  clientDataKey: TENGU_GENTLE_PARASOL,
  envVar: "CLAUDE_CODE_GENTLE_PARASOL",
  modelOwn: undefined,
  latches: latchedReminderState,
  logApplied: (e) => {
    logFeatureOk("secondary_reminder");
    logEvent("tengu_gentle_parasol_applied", e);
  },
};
//@ chunk-ha3km179.js:48729-49124 placement
/**
 * 按对话锁存的提醒文本。
 */
function latchedReminderText(e, n, r) {
  if (!shouldUseMidConvSystem(r)) return null;
  let modelReminderOverride = readModelReminderOverride(e, r);
  if (modelReminderOverride === null) return null;
  let h = e.latches.of(n);
  if (h.latched?.conversationId !== n.id)
    h.latched = {
      conversationId: n.id,
      byModel: new Map(),
    };
  let lower = stripAnyVersatileSuffix(getCanonicalName(r)).toLowerCase();
  let S = h.latched.byModel.get(lower);
  if (S === undefined) {
    S = modelReminderOverride;
    h.latched.byModel.set(lower, S);
    e.logApplied({
      model: telemetrySafeModelName(stripAnyVersatileSuffix(r)),
      source: fromEnum(modelReminderOverride.source),
      text: modelReminderOverride.textForAnalytics,
      len: modelReminderOverride.text.length,
    });
  }
  return S.text;
}
//@ chunk-ha3km179.js:49124-49159 placement
/**
 * 取客户端数据提醒文本。
 */
function clientDataReminderText(e, n) {
  return latchedReminderText(CLIENT_DATA_REMINDER, e, n);
}
//@ chunk-ha3km179.js:49159-49194 placement
/**
 * 取环境变量提醒文本。
 */
function latchedReminderTextFor(e, n) {
  return latchedReminderText(REMINDER_LATCHES_2, e, n);
}
//@ chunk-ha3km179.js:49194-49262 placement
/**
 * 视为排队输入的来源类型（queued_command、teammate_mailbox、poll_events）。
 */
var QUEUED_INPUT_SOURCES = new Set(["queued_command", "teammate_mailbox", "poll_events"]);
//@ chunk-ha3km179.js:49262-49331 placement
/**
 * 各类拒绝/取消消息的前缀列表。
 */
function rejectionMessagePrefixes() {
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
  if (e.type !== "tool_result") return false;
  let n =
    typeof e.content === "string"
      ? e.content
      : Array.isArray(e.content)
        ? e.content.map((r) => (r?.type === "text" && typeof r.text === "string" ? r.text : "")).join("")
        : "";
  return rejectionMessagePrefixes().some((r) => n.startsWith(r));
}
//@ chunk-ha3km179.js:49574-50279 placement
/**
 * 决定批处理提醒插入位置。
 */
function placeBatchingReminder(e, n, r) {
  let s = {
    messages: e,
    text: null,
    secondaryText: null,
    afterUuid: null,
  };
  try {
    let h = true;
    let y = e.length - 1;
    for (; y >= 0; y--) {
      let w = e[y];
      if (isNonConversationMessage(w)) continue;
      if (w.type !== "attachment") break;
      if (QUEUED_INPUT_SOURCES.has(w.attachment.type)) h = false;
    }
    let S = y >= 0 ? e[y] : undefined;
    if (!hasToolResultBlock(S) || isForkBoilerplateMessage(S)) return s;
    for (let w = y; h && w >= 0; w--) {
      let P = e[w];
      if (isNonConversationMessage(P) || P.type === "attachment") continue;
      if (!hasToolResultBlock(P)) break;
      if (P.message.content.some(hasKnownToolResultPrefix)) h = false;
    }
    let M = h ? clientDataReminderText(n, r) : null;
    let R = latchedReminderTextFor(n, r);
    if (M === null && R === null) return s;
    let T = [];
    if (M !== null)
      T.push(
        createAttachmentMessage({
          type: "batching_reminder",
          text: M,
        }),
      );
    if (R !== null)
      T.push(
        createAttachmentMessage({
          type: "secondary_reminder",
          text: R,
        }),
      );
    return {
      messages: [...e.slice(0, y + 1), ...T, ...e.slice(y + 1)],
      text: M,
      secondaryText: R,
      afterUuid: S.uuid,
    };
  } catch (error) {
    logError(error);
    return s;
  }
}
//@ chunk-ha3km179.js:50279-50796 placement
/**
 * 应用批处理/次级提醒到消息。
 */
function applyReminders(e, n, r) {
  try {
    let s = placeBatchingReminder(e, n, r);
    let h = new Map();
    for (let j = e.length - 1; j >= 0; j--) {
      let M = e[j];
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
      if (R === undefined ? M !== "" : R !== M)
        y.push({
          type: S,
          text: M,
        });
    }
    return y;
  } catch (error) {
    logError(error);
    return [];
  }
}
//@ chunk-ha3km179.js:50796-50895 placement = createAttachmentMessage (1)
function createAttachmentMessage(attachment) {
  return {
    type: "attachment",
    attachment,
    uuid: randomUUID(),
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
//@ chunk-ha3km179.js:51021-51062 placement
/**
 * 本回合是否用过 computer-use。
 */
function isComputerUseActiveThisTurn() {
  return getComputerUseSession().activeThisTurn;
}
//@ chunk-ha3km179.js:51062-51099 placement
/**
 * 清除本回合使用标记。
 */
function clearComputerUseActiveThisTurn() {
  getComputerUseSession().activeThisTurn = false;
}
export {
  buildContextRouting,
  rebuildRoutingAfterCompaction,
  reannounceAfterCompact,
  insertAfterCompactBoundary,
  refreshRoutedGitStatus,
  shouldSendProjectDocText,
  checkProjectDocReadAllowed,
  anyDocReadHookBlocks,
  reportContextAnnouncements,
  createContextRoomTracker,
  applyReminders,
  placeBatchingReminder,
  safeMapOrUndefined,
  isComputerUseActiveThisTurn,
  clearComputerUseActiveThisTurn,
};
