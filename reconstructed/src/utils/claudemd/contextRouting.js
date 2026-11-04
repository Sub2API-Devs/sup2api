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
import { deferInit } from "../../../runtime/deferred-init.js";

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
function toInlineRouting(routing) {
  let { claudeMd, ...restContext } = routing.userContext;
  return {
    ...routing,
    userContext: claudeMd === "" ? restContext : routing.userContext,
    bare: true,
    rendering: "inline",
  };
}
//@ chunk-ha3km179.js:38694-40788 placement
/**
 * 会话开始时组装上下文路由（用户/系统上下文、说明、工作者工具）。
 */
async function buildContextRouting(session, previous, options, context) {
  let { session: session_2 } = options;
  let cutFailure = logProjectTextCutFailure(session, options);
  let state = {
    userContext: cutFailure,
    systemContext: previous,
    announced: {},
    workerTools: undefined,
    sections: [],
    instructions: undefined,
    refreshReason: "session_start",
    bare: options.options.bareFork === true,
    carriesContext: Object.keys(cutFailure).length > 0 || Object.keys(previous).length > 0,
    rendering: undefined,
  };
  if (options.options.bareFork) return state;
  let rendering = latestContextRendering(context.messages) ?? announcedContextRendering(context.messages);
  if (rendering === "inline") return toInlineRouting(state);
  try {
    let instructionFiles =
      cutFailure.claudeMd === undefined
        ? undefined
        : await getUserContextInstructionFiles(
            session_2,
            isStorageV5Enabled() ? options.storageV5 : undefined,
            isStorageV5Enabled() ? options.credentials : undefined,
          );
    let filteredInstructions =
      instructionFiles && filterManagedInstructions(instructionFiles, options.options);
    let userValues = {
      ...cutFailure,
    };
    let previousValues = {
      ...previous,
    };
    let changedValues = {};
    for (let field of SESSION_CONTEXT_FIELDS) {
      let value = userValues[field] ?? previousValues[field];
      if (value) changedValues[field] = value;
      delete userValues[field];
      delete previousValues[field];
    }
    delete userValues.currentDate;
    let workerToolsContext = isIndexedCorbatoGateOn() ? userValues.workerToolsContext : undefined;
    if (workerToolsContext !== undefined) delete userValues.workerToolsContext;
    delete previousValues.currentDate;
    let memoryFiles;
    if (userValues.claudeMd !== undefined && filteredInstructions !== undefined) {
      memoryFiles = toMemoryFileEntries(filteredInstructions);
      let maxMemoryFileChars = getMaxMemoryFileChars(options.options.mainLoopModel);
      let { readFileState } = options;
      let { tools } = options.options;
      let filtered = memoryFiles.filter(
        (file) => file.type !== "Managed" && file.content.length > maxMemoryFileChars,
      );
      if (
        filtered.length > 0 &&
        readFileState !== undefined &&
        tools !== undefined &&
        hasAppState(options) &&
        !session_2.host.launchOptions.isInteractive() &&
        !session_2.host.launchOptions.diskless() &&
        tools.some((tool) => toolMatchesName(tool, FILE_READ_TOOL_NAME)) &&
        !tools.some((tool) => toolMatchesName(tool, REPL_TOOL_NAME)) &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_velvet_possum", false)
      ) {
        let toolPermissionContext = getToolPermissionContext(options);
        let startOnlyPaths = new Set(
          filtered.filter((file) => readWouldBeAutoAllowedForPath(file.path, toolPermissionContext)),
        );
        memoryFiles = memoryFiles.map((file) =>
          startOnlyPaths.has(file)
            ? {
                ...file,
                content: truncateInstructionsAtLine(file.content, file.path, maxMemoryFileChars),
                startOnly: true,
              }
            : file,
        );
        for (let file of startOnlyPaths) readFileState.markStartOnly(file.path);
        let loadState = claudeMdLoadStateByHost.of(session_2.host);
        if (startOnlyPaths.size > 0 && !loadState.announcedFileCut) {
          loadState.announcedFileCut = true;
          logFeatureSad("context_claude_md_load", "announced_file_cut");
        }
      }
      delete userValues.claudeMd;
    } else if (userValues.claudeMd === "") delete userValues.claudeMd;
    let { cacheBreaker, ...settings } = previousValues;
    let sections = [...Object.entries(userValues), ...Object.entries(settings)]
      .filter(([, value]) => value !== "")
      .map(([name, text]) => ({
        name,
        text,
      }));
    return {
      userContext: {},
      systemContext:
        cacheBreaker === undefined
          ? {}
          : {
              cacheBreaker,
            },
      announced: changedValues,
      workerTools: workerToolsContext,
      sections,
      instructions: memoryFiles,
      refreshReason: getUserContextRefreshReason(session_2) ?? "session_start",
      bare: false,
      carriesContext: state.carriesContext,
      rendering: "announced",
    };
  } catch (error) {
    logError(error);
    logRoutingFailure(
      error,
      context.querySource,
      rendering === "announced" ? "none" : "inline",
      context.afterCompaction === true,
    );
    if (rendering === "announced") {
      let { cacheBreaker } = previous;
      return {
        ...state,
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
    return toInlineRouting(state);
  }
}
//@ chunk-ha3km179.js:40788-40946 placement
/**
 * 压缩后重新构建上下文路由（仅 announced 模式），若新结果丢失指令则保留旧的。
 */
async function rebuildRoutingAfterCompaction(contextRouting, session, previous, previous_2, context) {
  if (contextRouting.rendering !== "announced") return contextRouting;
  let contextRouting_2 = await buildContextRouting(session, previous, previous_2, {
    ...context,
    afterCompaction: true,
  });
  return contextRouting.instructions && !contextRouting_2.instructions ? contextRouting : contextRouting_2;
}
//@ chunk-ha3km179.js:40946-40985 placement
/**
 * 判断对象是否带 getAppState 方法。
 */
function hasAppState(value) {
  return "getAppState" in value;
}
//@ chunk-ha3km179.js:40985-41131 placement
function logRoutingFailure(error, querySource, options, afterCompaction) {
  try {
    logEvent("tengu_context_routing_failed", {
      error_class: sanitizedErrorNameForTelemetry(error),
      query_source: agentTypeForTelemetry(querySource),
      fallback: fromEnum(options),
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
async function refreshRoutedGitStatus(messages, routing, toolUseContext, usePrefetch) {
  let { gitStatus, ...restAnnounced } = routing.announced;
  try {
    let prefetchedGitStatus = usePrefetch ? takeGitStatusPrefetch(toolUseContext.session) : undefined;
    if (!routing.carriesContext || routing.bare) return routing;
    let gitStatus;
    let sessionContextAttachmentData = getSessionContextAttachmentData(messages);
    if (sessionContextAttachmentData !== undefined) gitStatus = sessionContextAttachmentData.gitStatus;
    else if (!toolUseContext.options.omitGitStatus && shouldPrefetchGitStatus())
      gitStatus = (await (prefetchedGitStatus ?? computeGitStatus(toolUseContext.session))) ?? undefined;
    return {
      ...routing,
      announced:
        gitStatus === undefined
          ? restAnnounced
          : {
              ...restAnnounced,
              gitStatus,
            },
    };
  } catch (error) {
    logError(error);
    return {
      ...routing,
      announced: restAnnounced,
    };
  }
}
//@ chunk-ha3km179.js:41478-41774 placement
/**
 * 判断是否发送项目文档文本：到期、带上下文、非 bare、未压缩过且未读取过等条件。
 */
function shouldSendProjectDocText(messages, routing, toolUseContext, projectText, isMidChat) {
  try {
    if (
      !attachedProjectDocText.mayBeDue(toolUseContext.session) ||
      !projectText ||
      !routing.carriesContext ||
      routing.bare ||
      messages.some(isCompactBoundaryMessage) ||
      getLastProjectDocReads(messages) !== undefined ||
      loadCleanupHelpers()?.getTeleportCacheState().status === "active"
    )
      return false;
    let filtered = messages.filter((message) => message.type === "assistant");
    return (
      filtered.length === 0 ||
      (isMidChat &&
        filtered.some((message) => !isRealAssistantMessage(message)) &&
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
async function checkProjectDocReadAllowed(routing, toolUseContext, getDocumentText, announcement, hookStash) {
  let any = announcement.messages.some((message) => message.type === "assistant");
  let reads;
  try {
    let found = toolUseContext.options.tools.find((tool) => toolMatchesName(tool, PROJECTS_TOOL_NAME));
    let toolPermissionContext = getToolPermissionContext(toolUseContext);
    let projectTextValue =
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
    let hookMethod =
      found === undefined || projectTextValue
        ? undefined
        : buildProjectTextHooks(
            {
              method: "project_read",
            },
            getDocumentText(),
          );
    let isPreToolUseHook = hookMethod === "pre_tool_use_hook" && hookStash !== undefined && !isCcsTenant();
    let hasAnchor = hasUsageAnchor(announcement.messages);
    reads = await attachedProjectDocText.read(
      toolUseContext.session,
      toolUseContext.credentials,
      toolUseContext.abortController.signal,
      (anchorTokens, documents) => {
        let { bytesPerToken } = announcement.modelFacts;
        let reduced = documents.reduce(
          (acc, doc) =>
            acc +
            Math.max(doc.storedTokens ?? 0, Math.ceil(Buffer.byteLength(doc.text, "utf8") / bytesPerToken)),
          0,
        );
        return (
          reduced <= MAX_PROJECT_DOC_TOKENS &&
          calculateTokenWarningState(
            estimateTokensWithAnchor(announcement.messages, bytesPerToken) +
              stripInProgressAssistantMessage(announcement.messages) +
              roughTokenCountEstimation(
                hasAnchor
                  ? anchorTokens
                  : [
                      anchorTokens,
                      ...announcement.systemPrompt,
                      ...Object.values(routing.systemContext),
                      ...Object.values(routing.announced),
                      ...routing.sections.map((section) => section.text),
                      ...(routing.instructions ?? []).map((instruction) => instruction.content),
                    ].join(`
`),
                bytesPerToken,
              ) +
              (hasAnchor ? 0 : Math.ceil(CONTEXT_WINDOW_BASELINE_TOKENS / bytesPerToken)) +
              reduced -
              documents.reduce((acc, doc) => acc + roughTokenCountEstimation(doc.text, bytesPerToken), 0),
            announcement.modelFacts,
            toolUseContext.options.autoCompactWindow,
          ).level === "ok"
        );
      },
      found === undefined
        ? "tool_not_offered"
        : projectTextValue || hookMethod === "path_rule"
          ? "read_refused_by_rule"
          : hookMethod !== undefined && !isPreToolUseHook
            ? "read_refused_by_hook"
            : undefined,
      isPreToolUseHook ? hookStash : undefined,
    );
  } catch (error) {
    attachedProjectDocText.attachThrew(toolUseContext.session, error);
  }
  if (any && !toolUseContext.abortController.signal.aborted) reads ??= [];
  return reads === undefined
    ? routing
    : {
        ...routing,
        projectDocReads: reads,
      };
}
//@ chunk-ha3km179.js:43008-43050 placement
/**
 * 有映射函数就应用，否则原样返回。
 */
function applyMapperOrIdentity(value, announcementWalk) {
  return announcementWalk === undefined ? value : announcementWalk(value);
}
//@ chunk-ha3km179.js:43050-43128 placement
/**
 * 应用映射函数，出错记日志并返回 undefined。
 */
function safeMapOrUndefined(value, announcementWalk) {
  if (announcementWalk === undefined) return value;
  try {
    return announcementWalk(value);
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-ha3km179.js:43128-44432 placement
/**
 * 生成上下文公告附件（说明文件、日期等）。
 */
function contextAnnouncementAttachments(
  messages,
  routing,
  { querySource, resumeActive, stamp, announcementWalk },
) {
  if (resumeActive || routing.bare) return [];
  let isAuxiliary = classifyQuerySource(querySource) === "auxiliary";
  try {
    let attachments = [];
    let announcedInstructions = latestInstructionFiles(messages);
    let instructionFiles = applyMapperOrIdentity(routing.instructions, announcementWalk);
    if (instructionFiles && !(isAuxiliary && announcedInstructions)) {
      let instructionDiff = diffInstructionFiles(instructionFiles, announcedInstructions);
      if (instructionDiff) {
        let attachmentMessage = createAttachmentMessage_2(
          {
            type: "instructions",
            ...instructionDiff,
            ...(instructionDiff.changed && {
              reason: routing.refreshReason,
            }),
          },
          stamp,
        );
        attachments.push({
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
    let announcedValues = applyMapperOrIdentity(routing.announced, announcementWalk);
    let hasAnnounced = Object.keys(announcedValues).length > 0;
    if (
      sessionContextAttachmentData
        ? !isAuxiliary &&
          (hasAnnounced || routing.carriesContext) &&
          !sameSessionContextValues(sessionContextAttachmentData, announcedValues)
        : hasAnnounced || routing.carriesContext
    )
      attachments.push(
        createAttachmentMessage_2(
          sessionContextAttachmentData
            ? {
                type: "session_context",
                context: announcedValues,
                changed: true,
                reason: routing.refreshReason,
              }
            : {
                type: "session_context",
                context: announcedValues,
              },
          stamp,
        ),
      );
    let coordinatorContent = coordinatorContextContent(messages);
    let workerTools = applyMapperOrIdentity(routing.workerTools, announcementWalk);
    let isCoordinatorMode = isCoordinatorMode_2();
    if (!isAuxiliary && coordinatorContent && isIndexedCorbatoGateOn() && !isCoordinatorMode)
      attachments.push(
        createAttachmentMessage_2(
          {
            type: "coordinator_context",
            content: "",
            changed: true,
          },
          stamp,
        ),
      );
    else if (
      isCoordinatorMode &&
      workerTools !== undefined &&
      (isAuxiliary ? coordinatorContent === undefined : coordinatorContent !== workerTools)
    )
      attachments.push(
        createAttachmentMessage_2(
          {
            type: "coordinator_context",
            content: workerTools,
            ...(coordinatorContent !== undefined && {
              changed: true,
            }),
          },
          stamp,
        ),
      );
    if (routing.sections.length > 0 && getLastContextSections(messages) === undefined)
      attachments.push(
        createAttachmentMessage_2(
          {
            type: "context_sections",
            sections: applyMapperOrIdentity(routing.sections, announcementWalk),
          },
          stamp,
        ),
      );
    if (routing.projectDocReads !== undefined)
      attachments.push(
        createAttachmentMessage_2(
          {
            type: "project_doc_reads",
            reads: routing.projectDocReads,
            ...(messages.some((message) => message.type === "assistant") && {
              midChat: true,
            }),
          },
          stamp,
        ),
      );
    let today = sessionDateString();
    let lastDate = lastSessionDate(messages);
    if (isAuxiliary ? lastDate === undefined : lastDate !== today)
      attachments.push(
        createAttachmentMessage_2(
          {
            type: "date",
            date: today,
            ...(lastDate !== undefined && {
              changed: true,
            }),
            ...(isTimeZoneAssumptionEnabled() && {
              assumedUtc: true,
            }),
          },
          stamp,
        ),
      );
    return attachments;
  } catch (error) {
    logError(error);
    return [];
  }
}
//@ chunk-ha3km179.js:44432-44496 placement
/**
 * 生成上下文公告附件并上报遥测。
 */
function reportContextAnnouncements(messagesForQuery, routing, options) {
  let attachments = contextAnnouncementAttachments(messagesForQuery, routing, options);
  reportContextAnnouncements_2(attachments, options.querySource);
  return attachments;
}
//@ chunk-ha3km179.js:44496-44838 placement
/**
 * 上报 tengu_context_announcement。
 */
function reportContextAnnouncements_2(attachments, querySource) {
  for (let { attachment } of attachments)
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
function coordinatorContextContent(messages) {
  return announcementSchema().safeParse(messages.findLast(isCoordinatorContextAttachment)?.attachment).data
    ?.content;
}
//@ chunk-ha3km179.js:44918-45005 placement
/**
 * 判断消息是否为协调者上下文附件。
 */
function isCoordinatorContextAttachment(message) {
  return message.type === "attachment" && message.attachment.type === "coordinator_context";
}
//@ chunk-ha3km179.js:45005-45158 placement
function getLastContextSections(messages) {
  let last = messages.findLast(
    (message) => message.type === "attachment" && message.attachment.type === "context_sections",
  );
  return contextSectionsSchema().safeParse(last?.attachment).data?.sections;
}
//@ chunk-ha3km179.js:45158-45285 placement
function getLastProjectDocReads(messages) {
  let last = messages.findLast(
    (message) => message.type === "attachment" && message.attachment.type === "project_doc_reads",
  );
  return trackedProjectReads(last?.attachment);
}
//@ chunk-ha3km179.js:45322-45573 placement
/**
 * 并行运行项目文档读取钩子，任一阻止或出错时返回 true。
 */
async function anyDocReadHookBlocks(documents, toolUseContext, signal) {
  try {
    return (
      await Promise.all(documents.map((doc) => runProjectDocReadHooks(doc, toolUseContext, signal)))
    ).includes(true);
  } catch (error) {
    if (!signal.aborted)
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
async function runProjectDocReadHooks(input, toolUseContext, signal) {
  for await (let hookResult of executePreToolHooks(
    PROJECTS_TOOL_NAME,
    `project_doc_read_${randomUUID()}`,
    clone(input),
    toolUseContext,
    getToolPermissionContext(toolUseContext).mode,
    signal,
  ))
    if (
      hookResult.blockingError ||
      hookResult.preventContinuation ||
      (hookResult.permissionBehavior !== undefined &&
        hookResult.permissionBehavior !== "allow" &&
        hookResult.permissionBehavior !== "passthrough") ||
      (hookResult.updatedInput !== undefined && !isSameAnswerInput(hookResult.updatedInput, input))
    )
      return true;
  return false;
}
//@ chunk-ha3km179.js:45882-46099 placement
/**
 * 创建上下文空间跟踪器：阈值、已占用量与已认领量。
 */
function createContextRoomTracker(modelFacts, autoCompactWindow, messages) {
  try {
    getContextRoomThreshold(modelFacts(), autoCompactWindow);
  } catch (error) {
    logError(withTelemetryMessage(toError(error), "context room hand-in failed"));
    return;
  }
  let claimedTokens = 0;
  return {
    get threshold() {
      return getContextRoomThreshold(modelFacts(), autoCompactWindow);
    },
    held: () =>
      estimateTokensWithAnchor(messages(), modelFacts().bytesPerToken) +
      stripInProgressAssistantMessage(messages()),
    claimed: () => claimedTokens,
    claim: (tokens) => {
      claimedTokens += tokens;
    },
  };
}
//@ chunk-ha3km179.js:46099-46203 placement
function getContextRoomThreshold(modelFacts, autoCompactWindow) {
  let autoCompactThresholdTokens = getAutoCompactThresholdTokens(modelFacts, autoCompactWindow);
  return usesPayAsYouGo() || getGlobalConfig().cachedExtraUsageDisabledReason === null
    ? autoCompactThresholdTokens
    : Math.min(autoCompactThresholdTokens, SECONDARY_CONTEXT_WINDOW);
}
//@ chunk-ha3km179.js:46203-47111 placement
/**
 * 压缩后重新公告上下文。
 */
async function reannounceAfterCompact(
  compactState,
  { routing, toolUseContext, querySource, resumeActive, foreground, stamp },
) {
  try {
    let boundaryMarker = compactState.boundaryMarker;
    let anchorUuid = isCompactBoundaryMessage(boundaryMarker)
      ? boundaryMarker.compactMetadata.preservedMessages?.anchorUuid
      : undefined;
    if (
      compactState.messagesToKeep.length === 0 ||
      resumeActive ||
      (anchorUuid !== undefined && anchorUuid !== compactState.summaryMessages.at(-1)?.uuid)
    )
      return [];
    if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_calm_noodle", true)) {
      logFeatureOk("compact_kept_tail_announcements", {
        enabled: false,
        placed: 0,
      });
      return [];
    }
    let keptTypes = new Set();
    for (let message of compactState.messagesToKeep)
      if (
        message.type === "attachment" &&
        REANNOUNCED_ATTACHMENT_TYPES.has(message.attachment.type) &&
        !(message.attachment.type === "instructions" && message.attachment.changed)
      )
        keptTypes.add(message.attachment.type);
    let postCompactMessages = buildPostCompactMessages(compactState);
    let refreshedRouting = await refreshRoutedGitStatus(
      postCompactMessages,
      routing,
      toolUseContext,
      foreground,
    );
    let attachments = contextAnnouncementAttachments(postCompactMessages, refreshedRouting, {
      querySource,
      resumeActive,
      stamp,
      announcementWalk: toolUseContext.options.announcementWalk,
    }).filter((attachment) => !keptTypes.has(attachment.attachment.type));
    logFeatureOk("compact_kept_tail_announcements", {
      enabled: true,
      placed: attachments.length,
      kept_types: keptTypes.size,
    });
    reportContextAnnouncements_2(attachments, querySource);
    return attachments;
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
function insertAfterCompactBoundary(messages, insert) {
  let [first, ...rest] = messages;
  if (insert.length === 0 || first === undefined || !isCompactBoundaryMessage(first)) return messages;
  return [first, ...insert, ...rest];
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
function makeEphemeralReminder(text, source, matchedPattern) {
  let trimmed = text.trim();
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
function envReminderOf(text) {
  let text_2 = text.trim();
  return isEnvDefinedFalsy(text_2) || isEnvTruthy(text_2)
    ? null
    : makeEphemeralReminder(text_2, "env", undefined);
}
//@ chunk-ha3km179.js:47626-47641 placement
/**
 * 已告警过的客户端数据键集合（只告警一次）。
 */
var warnedEphemeralKeys; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ha3km179.js:47626", () => {
  warnedEphemeralKeys = new Set();
});
//@ chunk-ha3km179.js:47641-47761 placement
function warnIgnoredClientData(clientDataKey, reason) {
  if (warnedEphemeralKeys.has(clientDataKey)) return;
  warnedEphemeralKeys.add(clientDataKey);
  logForDebugging(`[ephemeral reminder] ignoring client_data ${clientDataKey}: ${reason}`, {
    level: "warn",
  });
}
//@ chunk-ha3km179.js:47761-48143 placement
/**
 * 读取按模型的提醒文本覆盖（环境变量或客户端数据）。
 */
function readModelReminderOverride(definition, model) {
  let envValue = env[definition.envVar];
  if (envValue !== undefined) return envReminderOf(envValue);
  let clientValue = getCachedClientData()?.[definition.clientDataKey];
  if (clientValue !== undefined && clientValue !== null)
    if (typeof clientValue !== "object" || Array.isArray(clientValue))
      warnIgnoredClientData(
        definition.clientDataKey,
        `expected a map from model pattern to text, got ${Array.isArray(clientValue) ? "array" : typeof clientValue}`,
      );
    else {
      let modelKeyedEntry = findModelKeyedEntry(clientValue, model);
      if (modelKeyedEntry !== undefined) return reminderFromClientData(definition, modelKeyedEntry);
    }
  let modelOwned = definition.modelOwn?.(getCanonicalName(model));
  return modelOwned !== undefined ? makeEphemeralReminder(modelOwned, "model", undefined) : null;
}
//@ chunk-ha3km179.js:48143-48317 placement
function reminderFromClientData(definition, [matchedPattern, pattern]) {
  if (typeof pattern !== "string") {
    warnIgnoredClientData(
      definition.clientDataKey,
      `value for pattern "${matchedPattern}" is ${typeof pattern}, expected the reminder text`,
    );
    return null;
  }
  return makeEphemeralReminder(pattern, "clientData", matchedPattern);
}
//@ chunk-ha3km179.js:48317-48729 placement
/**
 * 另一组已锁存提醒的会话状态。
 */
var REMINDER_LATCHES; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
var latchedReminderState;
var CLIENT_DATA_REMINDER;
var REMINDER_LATCHES_2;
deferInit("chunk-ha3km179.js:48317", () => {
  REMINDER_LATCHES = new SessionRootSlot(() => ({
    latched: undefined,
  }));
  latchedReminderState = new SessionRootSlot(() => ({
    latched: undefined,
  }));
  CLIENT_DATA_REMINDER = {
    clientDataKey: TENGU_TOASTY_THIMBLE,
    envVar: "CLAUDE_CODE_TOASTY_THIMBLE",
    modelOwn: (model) => (usesFablePromptBundle(model) ? BATCHING_REMINDER_TEXT : undefined),
    latches: REMINDER_LATCHES,
    logApplied: (text) => {
      logFeatureOk("batching_reminder");
      logEvent("tengu_toasty_thimble_applied", text);
    },
  };
  REMINDER_LATCHES_2 = {
    clientDataKey: TENGU_GENTLE_PARASOL,
    envVar: "CLAUDE_CODE_GENTLE_PARASOL",
    modelOwn: undefined,
    latches: latchedReminderState,
    logApplied: (text) => {
      logFeatureOk("secondary_reminder");
      logEvent("tengu_gentle_parasol_applied", text);
    },
  };
});
//@ chunk-ha3km179.js:48729-49124 placement
/**
 * 按对话锁存的提醒文本。
 */
function latchedReminderText(definition, model, context) {
  if (!shouldUseMidConvSystem(context)) return null;
  let modelReminderOverride = readModelReminderOverride(definition, context);
  if (modelReminderOverride === null) return null;
  let latches = definition.latches.of(model);
  if (latches.latched?.conversationId !== model.id)
    latches.latched = {
      conversationId: model.id,
      byModel: new Map(),
    };
  let lower = stripAnyVersatileSuffix(getCanonicalName(context)).toLowerCase();
  let byModel = latches.latched.byModel.get(lower);
  if (byModel === undefined) {
    byModel = modelReminderOverride;
    latches.latched.byModel.set(lower, byModel);
    definition.logApplied({
      model: telemetrySafeModelName(stripAnyVersatileSuffix(context)),
      source: fromEnum(modelReminderOverride.source),
      text: modelReminderOverride.textForAnalytics,
      len: modelReminderOverride.text.length,
    });
  }
  return byModel.text;
}
//@ chunk-ha3km179.js:49124-49159 placement
/**
 * 取客户端数据提醒文本。
 */
function clientDataReminderText(definition, context) {
  return latchedReminderText(CLIENT_DATA_REMINDER, definition, context);
}
//@ chunk-ha3km179.js:49159-49194 placement
/**
 * 取环境变量提醒文本。
 */
function latchedReminderTextFor(definition, context) {
  return latchedReminderText(REMINDER_LATCHES_2, definition, context);
}
//@ chunk-ha3km179.js:49194-49262 placement
/**
 * 视为排队输入的来源类型（queued_command、teammate_mailbox、poll_events）。
 */
var QUEUED_INPUT_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ha3km179.js:49194", () => {
  QUEUED_INPUT_SOURCES = new Set(["queued_command", "teammate_mailbox", "poll_events"]);
});
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
function hasKnownToolResultPrefix(text) {
  if (text.type !== "tool_result") return false;
  let prefixes =
    typeof text.content === "string"
      ? text.content
      : Array.isArray(text.content)
        ? text.content
            .map((prefix) => (prefix?.type === "text" && typeof prefix.text === "string" ? prefix.text : ""))
            .join("")
        : "";
  return rejectionMessagePrefixes().some((prefix) => prefixes.startsWith(prefix));
}
//@ chunk-ha3km179.js:49574-50279 placement
/**
 * 决定批处理提醒插入位置。
 */
function placeBatchingReminder(messages, definition, context) {
  let placement = {
    messages,
    text: null,
    secondaryText: null,
    afterUuid: null,
  };
  try {
    let stillEligible = true;
    let index = messages.length - 1;
    for (; index >= 0; index--) {
      let lastMessage = messages[index];
      if (isNonConversationMessage(lastMessage)) continue;
      if (lastMessage.type !== "attachment") break;
      if (QUEUED_INPUT_SOURCES.has(lastMessage.attachment.type)) stillEligible = false;
    }
    let anchorMessage = index >= 0 ? messages[index] : undefined;
    if (!hasToolResultBlock(anchorMessage) || isForkBoilerplateMessage(anchorMessage)) return placement;
    for (let scanIndex = index; stillEligible && scanIndex >= 0; scanIndex--) {
      let message = messages[scanIndex];
      if (isNonConversationMessage(message) || message.type === "attachment") continue;
      if (!hasToolResultBlock(message)) break;
      if (message.message.content.some(hasKnownToolResultPrefix)) stillEligible = false;
    }
    let primaryText = stillEligible ? clientDataReminderText(definition, context) : null;
    let latchedText = latchedReminderTextFor(definition, context);
    if (primaryText === null && latchedText === null) return placement;
    let pending = [];
    if (primaryText !== null)
      pending.push(
        createAttachmentMessage({
          type: "batching_reminder",
          text: primaryText,
        }),
      );
    if (latchedText !== null)
      pending.push(
        createAttachmentMessage({
          type: "secondary_reminder",
          text: latchedText,
        }),
      );
    return {
      messages: [...messages.slice(0, index + 1), ...pending, ...messages.slice(index + 1)],
      text: primaryText,
      secondaryText: latchedText,
      afterUuid: anchorMessage.uuid,
    };
  } catch (error) {
    logError(error);
    return placement;
  }
}
//@ chunk-ha3km179.js:50279-50796 placement
/**
 * 应用批处理/次级提醒到消息。
 */
function applyReminders(messages, definition, context) {
  try {
    let placement = placeBatchingReminder(messages, definition, context);
    let latchedByUuid = new Map();
    for (let j = messages.length - 1; j >= 0; j--) {
      let message = messages[j];
      if (message.type !== "attachment") {
        if (isNonConversationMessage(message)) continue;
        break;
      }
      let attachment = message.attachment;
      if (
        (attachment.type === "batching_reminder_sent" || attachment.type === "secondary_reminder_sent") &&
        attachment.clearAt === "next_user_message" &&
        !latchedByUuid.has(attachment.type)
      )
        latchedByUuid.set(attachment.type, attachment.text);
    }
    let result = [];
    for (let [uuid, text] of [
      ["batching_reminder_sent", placement.text ?? ""],
      ["secondary_reminder_sent", placement.secondaryText ?? ""],
    ]) {
      let prior = latchedByUuid.get(uuid);
      if (prior === undefined ? text !== "" : prior !== text)
        result.push({
          type: uuid,
          text,
        });
    }
    return result;
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
function hasToolResultBlock(message) {
  return (
    message?.type === "user" &&
    Array.isArray(message.message.content) &&
    message.message.content.some((block) => block.type === "tool_result")
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
