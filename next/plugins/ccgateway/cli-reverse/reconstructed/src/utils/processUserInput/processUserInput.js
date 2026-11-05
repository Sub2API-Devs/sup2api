/**
 * utils/processUserInput/processUserInput.ts
 *
 * 并入已有模块：处理用户输入（斜杠命令、bash、提示词、附件）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/processUserInput/processUserInput.ts
 * pieces: chunk-g88zyy4n.js (1), chunk-m0ks5273.js (1), chunk-pwdsqzsj.js (33)
 * attribution: fingerprint 3, placement 29, layout 2, callgraph-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { personalHooksProblem, personalSettingsProblem } from "../settings/settingsProblems.js";
import { authWarmNoticeStateSlot, maybeWarmApiAuth } from "../../services/api/apiAuthWarm.js";
import { isPersonalConfigRestricted } from "../personalConfigRestriction.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import {
  makeMetaUserMessage,
  hookStopWarningMessage,
  createHookContextAttachment,
  createQueuedSettler,
  screensChanged,
  pluginsChanged,
  submitPromptWithHooks,
  runUserPromptSubmitHooks,
  CANCELLED_RESULT as CANCELLED_RESULT_2,
  hasThirdPartyPromptHooks,
  hooksSnapshotKey,
} from "./userPromptSubmitHooks.js";
import { createAttachmentMessage_2 as createAttachmentMessage, logForDebugging } from "../debug.js";
import { WORD_BOUNDARY_PATTERN, isWordCharCodeAt } from "../attachments/atMentions.js";
import { ADDRESS_REF_PATTERN } from "../sessionAddresses.js";
import { startPhaseWithin, endPhaseWithin, queryCheckpoint } from "../queryProfiler.js";
import { HostScoped } from "../hostScoped.js";
import {
  snapshotHookRegistration,
  hasHookRegistrationChanged,
  hasPromptSubmitHooks,
} from "../plugins/functionHooks/hookRegistration.js";
import { inflightCommandRuns } from "../../plugins/functionHooks/commandRunDispatch.js";
import { runPromptSubmitHooks, awaitPromptEntry } from "./promptEntryWaiters.js";
import {
  extractTextContent_2,
  getContentText,
  lastUserPromptIndex,
  nextTurnPosition,
  hasToolResultBlock,
  createSystemMessage,
  createUserMessage,
} from "../messages.js";
import { takeSubmitWaiter } from "../../plugins/functionHooks/promptSubmit.js";
import { notePromptOrigin } from "./promptOrigin.js";
import { restartElapsedTimeClock } from "../attachments/elapsedTimeReminder.js";
import { resolvePromptSource, classifyPromptSource } from "../promptSource.js";
import { isHumanOrUnset } from "../messageProvenance.js";
import {
  isGoalIdleCheckinPaused,
  notifyAutoReactHumanTurn,
  resetGoalIdleCheckinCount,
  hasUltrathinkKeyword,
} from "../../query/goalCheckIn.js";
import {
  MANAGED_HOOKS_TIER,
  executeUserPromptSubmitHooks,
  getUserPromptSubmitHookBlockingMessage,
  executeStopHooks,
  getStopHookMessage,
  executeUserPromptExpansionHooks,
} from "../hooks.js";
import { logError } from "../log.js";
import {
  getToolPermissionContext,
  getEffortValue,
  getEffortLayerOverride,
} from "../permissions/toolPermissionContext.js";
import {
  settleScreening,
  withRewriteState,
  needsRescreen,
  interruptedInputResult,
  settleScreeningResult,
} from "./promptScreening.js";
import { readerStatesFromHookMessage } from "../widgetContext.js";
import { isHumanOrigin, isHumanTurn } from "../turnOrigin.js";
import { notePersonPrompt, setPromptId, getMainThreadAgentType } from "../../bootstrap/state.js";
import { markCronWakeupMessages } from "../cronFireTexts.js";
import { setCommandDenyRules } from "../attachments/skillMentions.js";
import {
  wrapPluginPrompt,
  extractPluginPrompt,
  wrapNonUserMessage,
  sourceLabel,
} from "../messages/nonUserMessages.js";
import { unchangedOrUndefined, lastTextBlockText } from "../historyFile.js";
import { capAdditionalContext } from "../../services/tools/toolHooks.js";
import { recordPhase } from "../startupTiming.js";
import { applyHookSessionTitle } from "../sessionTitle.js";
import { cloneContent, parseSlashCommand, matchSubcommand } from "../slashCommandParsing.js";
import { replacePromptText } from "../attachments/diagnostics.js";
import { findPluginRenderHooks } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { toArray_2 } from "../generators.js";
import { getAttachmentMessages } from "../attachments.js";
import { imageLimitsForModel } from "../attachmentMedia.js";
import { isImageStoreAvailable, getMaxStoredImageId, storePastedImages } from "../imageStore.js";
import { advancePasteId, mintPasteId, flushPromptHistory } from "../../history.js";
import {
  checkImageBlockSource,
  createImageMetadataText,
  maybeResizeAndDownsampleImageBlock,
} from "../imageResizer.js";
import { isNonEmptyImageAttachment } from "../messages/messagePredicates.js";
import { setSliceField } from "../../state/sliceHelpers.js";
import { countWhere } from "../collections.js";
import { logEvent } from "../../services/analytics/index.js";
import { IMAGE_SOURCE_MARKER_PREFIX } from "../imageErrors.js";
import { findCommand, isSkillOff, isCommandEnabled } from "../../commands.js";
import { checkSkillPermission } from "../../tools/SkillTool/skillPermissions.js";
import { isUltraplanEnabled } from "../../commands/ultraplan.js";
import { findKeywordTriggerPositions } from "../ultraplan/keyword.js";
import { getProjectsThreadState } from "../projectsThreadState.js";
import { resetUnansweredSafetyCheckCount } from "../../tools/BashTool/bashPermissionFlags.js";
import {
  fetchLinkedSetupGuide,
  loadedSetupGuideNotice,
  notifySetupGuidePasted,
} from "../commandPredicates.js";
import { isVirtualPancakeEnabled } from "../permissions/permissionSetup.js";
import { wrapUserTurnContent } from "../userTurnTags.js";
import { shouldUltrathinkRaiseEffort, getEffortLevelIfSupported } from "../effort.js";
import { processTextPrompt } from "./processTextPrompt.js";
import { isActingAsBgJob, isBgSession } from "../concurrentSessions.js";
import { getOwnJobShortId } from "../../services/daemon/jobState.js";
import { isAbortError, errorMessage, StreamClosedAbortError } from "../errors.js";
import { hasActiveAgentTasks } from "../../tasks/taskStatus.js";
import { withTimeout } from "../sleep.js";
import { HOOK_STOPPED_MESSAGE } from "../../services/compact/compact.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-m0ks5273.js:22493-22630 fingerprint (2.1.88 match: applyTruncation, 0.586)
function applyTruncation(text, maxLength, label) {
  let trimmed = text.trim();
  let list = Array.from(trimmed);
  return list.length <= maxLength
    ? trimmed
    : `${list.slice(0, maxLength).join("")}
[${label} truncated after ${maxLength} characters]`;
}
//@ chunk-pwdsqzsj.js:35335-36307 placement
/**
 * 按个人设置加载检查结果处理输入：stop 时停止查询并给出说明，notice 时附加一次系统消息。
 */
function applyPersonalSettingsCheck(result, session) {
  let problem = personalHooksProblem();
  let noticeState = authWarmNoticeStateSlot.of(session);
  if (problem.kind === "clear" && isPersonalConfigRestricted() && !noticeState.countedClear) {
    noticeState.countedClear = true;
    logFeatureOk("hooks_personal_load_check");
  }
  if (problem.kind === "stop" && !noticeState.countedStop) {
    noticeState.countedStop = true;
    logFeatureBad("hooks_personal_load_check", "stopped");
  }
  if (problem.kind === "notice" && !noticeState.countedNotice) {
    noticeState.countedNotice = true;
    logFeatureSad("hooks_personal_load_check", "notice");
  }
  if (problem.kind === "host_off" && !noticeState.countedHostOff) {
    noticeState.countedHostOff = true;
    logFeatureSad("hooks_personal_load_check", "host_off");
  }
  if (problem.kind === "stop") {
    result.messages = [
      ...result.messages,
      makeMetaUserMessage(problem.text),
      hookStopWarningMessage(problem.text, {
        kind: "no_verdict",
        noVerdictKind: "personal_config_refused",
      }),
    ];
    result.shouldQuery = false;
    result.resultText = problem.text;
    result.allowedTools = undefined;
    return true;
  }
  if ((problem.kind === "notice" || problem.kind === "host_off") && !noticeState.noticed) {
    noticeState.noticed = true;
    let noticeMessages =
      problem.text === undefined
        ? []
        : [
            createAttachmentMessage({
              type: "hook_system_message",
              content: problem.text,
              hookName: "Claude Code",
              toolUseID: `personal-hooks-${session.id}`,
              hookEvent: "UserPromptSubmit",
            }),
          ];
    let contextMessages =
      problem.kind === "host_off" && problem.forClaude !== undefined
        ? [createHookContextAttachment([problem.forClaude])]
        : [];
    result.messages = [...result.messages, ...noticeMessages, ...contextMessages];
  }
  return false;
}
//@ chunk-pwdsqzsj.js:36307-36329 placement
var regExp; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pwdsqzsj.js:36307", () => {
  regExp = new RegExp(WORD_BOUNDARY_PATTERN);
});
//@ chunk-pwdsqzsj.js:36329-36394 placement
function findRegexMatch(regExp, text, lastIndex) {
  regExp.lastIndex = lastIndex;
  return regExp.test(text) ? regExp.lastIndex : -1;
}
//@ chunk-pwdsqzsj.js:36394-36942 placement
/**
 * 提取文本中的 @ 提及（支持引号路径与带空格的路径段落）。
 */
function extractAtMentions(text) {
  let mentions = [];
  let whitespacePattern = /\s/g;
  let regExp_2 = new RegExp(String.raw`[ \t]*\[${ADDRESS_REF_PATTERN}\]`, "y");
  let consumedUpTo = 0;
  let wordEnd = -1;
  let lastBoundary = -1;
  let boundaryIndexes = [];
  let boundaryCursor = 0;
  for (
    let index = text.indexOf("@");
    index !== -1;
    index = text.indexOf("@", Math.max(index + 1, consumedUpTo))
  ) {
    if (index > 0 && !regExp.test(text[index - 1])) continue;
    let nameStart = index + 1;
    let lastIndex = -1;
    if (text[nameStart] === '"') {
      let index = text.indexOf('"', nameStart + 1);
      if (index > nameStart + 1) lastIndex = index + 1;
    }
    if (lastIndex === -1) {
      if (nameStart >= wordEnd) {
        whitespacePattern.lastIndex = nameStart;
        wordEnd = whitespacePattern.test(text) ? whitespacePattern.lastIndex - 1 : text.length;
        lastBoundary = -1;
        boundaryIndexes = [];
        boundaryCursor = 0;
        for (let j = nameStart + 1; j <= wordEnd; j++)
          if (isWordCharCodeAt(text, j - 1) !== isWordCharCodeAt(text, j)) {
            lastBoundary = j;
            if (findRegexMatch(regExp_2, text, j) !== -1) boundaryIndexes.push(j);
          }
      }
      while ((boundaryIndexes[boundaryCursor] ?? 1 / 0) <= nameStart) boundaryCursor++;
      lastIndex = boundaryIndexes[boundaryCursor] ?? lastBoundary;
      if (lastIndex <= nameStart) continue;
    }
    let regexMatch = findRegexMatch(regExp_2, text, lastIndex);
    consumedUpTo = regexMatch === -1 ? lastIndex : regexMatch;
    mentions.push(text.slice(index, consumedUpTo));
  }
  return mentions;
}
//@ chunk-pwdsqzsj.js:36942-37025 placement
function overlappingMentions(text, originalText) {
  let originalMentions = new Set(extractAtMentions(originalText));
  return extractAtMentions(text)
    .filter((mention) => originalMentions.has(mention))
    .join(" ");
}
//@ chunk-pwdsqzsj.js:38352-38448 placement
var BLANK_PROMPT_MESSAGE =
  "Blank prompt \u2014 the message was only whitespace, so nothing was sent to the model.";
//@ chunk-pwdsqzsj.js:38448-38491 placement
function startInputPhase(threshold) {
  startPhaseWithin("process_user_input", threshold);
}
//@ chunk-pwdsqzsj.js:38491-38534 placement
function endInputPhase(label) {
  endPhaseWithin("process_user_input", label);
}
//@ chunk-pwdsqzsj.js:38534-38614 placement
var promptUtilsModule = () => require("../../services/agentStatus/LINK_SCAN_MAX_BYTES.lazy.js");
var attachmentsModule = () => require("../../services/classifierSummary.js");
//@ chunk-pwdsqzsj.js:38614-38636 placement
class PromptState {
  state = undefined;
}
//@ chunk-pwdsqzsj.js:38636-38661 placement
var promptStateSlot; // deferred: uses PromptState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-pwdsqzsj.js:38636", () => {
  promptStateSlot = new HostScoped(() => new PromptState());
});
//@ chunk-pwdsqzsj.js:38661-38788 placement
function classifierJobState(context) {
  let state = promptStateSlot.of(context.session.host);
  if (state.state === undefined)
    state.state = promptUtilsModule?.().createClassifierJobState(context) ?? null;
  return state.state;
}
//@ chunk-pwdsqzsj.js:38788-39191 placement
/**
 * 处理用户输入（斜杠命令、bash、提示词、附件），返回要追加的消息与是否发起查询；记录 process_user_input 计时。
 */
async function processUserInput(input) {
  let { input: input_2 } = input;
  let unscreened = false;
  let reading = snapshotHookRegistration();
  let reading_2 = input.uuid === undefined ? undefined : inflightCommandRuns.get(input.uuid)?.reading;
  let mergedReading =
    reading_2 === undefined
      ? reading
      : {
          ...reading_2,
          wasUnknown: reading_2.wasUnknown || reading.wasUnknown,
        };
  let result = await runPromptSubmitHooks(
    typeof input_2 === "string"
      ? input_2
      : extractTextContent_2(
          input_2,
          `
`,
        ),
    (recording) => {
      unscreened = recording === undefined;
      return processUserInputBase(
        recording === undefined
          ? {
              ...input,
              readAtDispatch: mergedReading,
            }
          : {
              ...input,
              readAtDispatch: mergedReading,
              userPromptRecording: recording,
            },
      );
    },
    {
      prompt: input.interactionPrompt,
      reading: mergedReading,
    },
  );
  if (result.noVerdict && unscreened) result.wasUnscreenedAtDispatch = true;
  return result;
}
//@ chunk-pwdsqzsj.js:39191-48910 placement
async function processUserInputBase({
  input,
  preExpansionInput,
  suppressWorkflowKeyword,
  mode,
  context,
  pastedContents,
  ideSelection,
  messages,
  setUserInputOnProcessing,
  onQueryCommitted,
  uuid,
  isAlreadyProcessing,
  querySource,
  canUseTool,
  skipSlashCommands,
  bridgeOrigin,
  clientBashCommand,
  clientBashCommandCwd,
  localStdinOrigin,
  sessionChannelPersonTyped,
  ultrathinkTyped,
  ownWordUuids,
  composerEnter,
  hostInitiator,
  inboundOrigin,
  toolsUsed,
  modelScheduledOrigin,
  wakeupSource,
  artifactCommentTurn,
  foreignWord,
  scheduledTaskId,
  scheduledFireId,
  isMeta,
  skipAttachments,
  skipSubmissionHooks,
  aheadOfSessionStart,
  pollEventDelivery,
  pollEventProvenance,
  pollEventDeclared,
  skipSkillPermissionReset,
  shouldQuery,
  queryHeldForNextTurn,
  promptSource,
  origin,
  verifiedSlackHumanTurn,
  textNotTyped,
  ownFilePaths,
  noPersonArrived,
  inlinedImagePaths,
  stampThreadState,
  widgetViews,
  promptSubmitted,
  onScreened,
  wait = false,
  entries,
  userPromptRecording,
  readAtDispatch,
}) {
  using queuedSettler = createQueuedSettler(takeSubmitWaiter(uuid));
  notePromptOrigin({
    uuid,
    origin,
    isHidden: isMeta === true,
    isStopped: context.abortController.signal.aborted,
    isRelayed: verifiedSlackHumanTurn === true,
    foreignWord,
    ownWordUuids,
    input,
  });
  restartElapsedTimeClock(context, {
    origin,
    value: input,
    isPollDelivery: skipSkillPermissionReset === true,
  });
  let stringInput = typeof input === "string" ? input : null;
  if (mode === "prompt" && stringInput !== null && !isMeta) setUserInputOnProcessing?.(stringInput, origin);
  queryCheckpoint("query_process_user_input_base_start");
  let promptSourceCategory =
    shouldQuery === false && isMeta && queryHeldForNextTurn !== true
      ? undefined
      : resolvePromptSource({
          isNonInteractive: context.options.isNonInteractiveSession,
          isMeta,
          callerSource: promptSource ?? (isHumanOrUnset(origin) ? undefined : "system"),
        });
  let skipAllAttachments = skipAttachments ?? (origin?.kind === "plugin" ? "all" : undefined);
  let readTriggers = [...(context.nestedMemoryAttachmentTriggers ?? [])];
  context.consumedNestedMemoryTriggers = [];
  let contentText = getContentText(input) || "";
  let rewrittenText;
  let screened = false;
  let withheld = false;
  let runReached = false;
  let readSnapshot = readAtDispatch;
  let submitWithHooks = async ({ submission, result, enter, queued }, promptSource) => {
    if (result.shouldQuery && shouldQuery !== false) onQueryCommitted?.();
    readSnapshot = snapshotHookRegistration();
    let screens = promptSubmitted === undefined ? undefined : readPromptScreens(context);
    if (
      promptSubmitted === undefined ||
      screens === undefined ||
      (submission.command !== undefined &&
        submission.text !== contentText &&
        (promptSubmitted.stopped === undefined || screensChanged(promptSubmitted.under, screens))) ||
      pluginsChanged(promptSubmitted.under, screens)
    )
      return submitPromptWithHooks({
        submission,
        origin,
        bridgeOrigin,
        mode,
        shouldWait: wait,
        context,
        result,
        promptSource,
        wakeupSource,
        queued,
        isStartInput: aheadOfSessionStart === true || isGoalIdleCheckinPaused(uuid),
        enter,
        bound: () => {
          readSnapshot = snapshotHookRegistration();
        },
      });
    if (screensChanged(promptSubmitted.under, screens)) {
      let managedResult = await runUserPromptSubmitHooks({
        text: submission.command === undefined ? promptSubmitted.text : submission.text,
        typed: submission.text,
        context,
        result,
        promptSource,
        wakeupSource,
        tiers: MANAGED_HOOKS_TIER,
      });
      let hookResult =
        managedResult.blocked !== undefined
          ? managedResult
          : await runUserPromptSubmitHooks({
              text: promptSubmitted.text,
              typed: submission.text,
              context,
              result,
              promptSource,
              wakeupSource,
              tiers: {
                managedHooksExcluded: true,
              },
            });
      let wasCancelled = managedResult.wasCancelled === true || hookResult.wasCancelled === true;
      return hookResult.blocked !== undefined && !(wasCancelled && hookResult.stopped !== undefined)
        ? {
            ended: hookResult.blocked,
            stopped: hookResult.stopped,
          }
        : wasCancelled
          ? CANCELLED_RESULT_2
          : {
              proceeds: {
                text: promptSubmitted.text,
                context: promptSubmitted.context,
                sessionTitle: hookResult.sessionTitle ?? managedResult.sessionTitle,
              },
            };
    }
    result.messages.push(...promptSubmitted.messages);
    if (promptSubmitted.stopped !== undefined) {
      result.shouldQuery = false;
      result.resultText = promptSubmitted.stopped;
      return {
        ended: result,
        stopped: promptSubmitted.stopped,
      };
    }
    return {
      proceeds: {
        text: promptSubmitted.text,
        context: promptSubmitted.context,
        sessionTitle: promptSubmitted.sessionTitle,
      },
    };
  };
  let deferred = Promise.withResolvers();
  let runCommand =
    (shouldQuery === false && queryHeldForNextTurn !== true) ||
    skipSubmissionHooks === true ||
    promptSourceCategory === undefined
      ? undefined
      : async (command) => {
          let rows = {
            messages: [],
            shouldQuery: true,
          };
          if (personalSettingsProblem().kind === "stop")
            return {
              ran: command,
              rows,
              outcome: undefined,
            };
          let outcome = await submitWithHooks(
            {
              submission: {
                text: slashLineAfterRewrite(contentText, command) ?? contentText,
                input,
                pastedContents,
                command: {
                  name: command.name,
                  args: command.argsRanWith,
                },
                ...(isMeta === true && {
                  isMeta: true,
                }),
              },
              result: rows,
              enter:
                entries &&
                (() => deferred.promise.then(({ messages }) => awaitPromptEntry(entries, messages))),
              queued: {
                ...queuedSettler,
                settleWhen: (queuedRun) =>
                  queuedSettler.settleWhen(
                    Promise.all([queuedRun, deferred.promise]).then(([priorRun, { queries }]) =>
                      queries ? priorRun : Promise.reject(Error("no query")),
                    ),
                  ),
              },
            },
            promptSourceCategory,
          ).catch((error) => {
            logError(error);
            return {
              error,
            };
          });
          return "error" in outcome
            ? {
                ran: command,
                rows,
                outcome: undefined,
                threw: outcome,
              }
            : {
                ran: command,
                rows,
                outcome,
              };
        };
  let result = await processUserInputBase_2(
    input,
    mode,
    context,
    promptSourceCategory,
    pastedContents,
    ideSelection,
    messages,
    uuid,
    isAlreadyProcessing,
    querySource,
    canUseTool,
    getToolPermissionContext(context).mode,
    skipSlashCommands,
    bridgeOrigin,
    modelScheduledOrigin,
    isMeta,
    skipAllAttachments,
    preExpansionInput,
    suppressWorkflowKeyword,
    origin,
    shouldQuery,
    inlinedImagePaths,
    promptSubmitted !== undefined,
    verifiedSlackHumanTurn,
    localStdinOrigin,
    sessionChannelPersonTyped,
    composerEnter,
    stampThreadState,
    wakeupSource,
    hostInitiator,
    artifactCommentTurn,
    textNotTyped === true,
    noPersonArrived === true,
    ownFilePaths,
    userPromptRecording?.hold,
    {
      forked: () => {
        screened = settleScreening({
          recording: userPromptRecording,
          onScreened,
          screened: withRewriteState({}, rewrittenText),
          isRunReached: runReached,
          since: readAtDispatch,
        });
      },
      ranAs: (ranAs) => {
        runReached = true;
        rewrittenText = slashLineAfterRewrite(contentText, ranAs);
      },
      withheld: () => {
        withheld = true;
      },
      isUnknownSinceDispatch: () => hasHookRegistrationChanged(readAtDispatch),
      isHeldForOrganization: () =>
        needsRescreen({
          since: readAtDispatch,
          isRunReached: runReached,
        }),
      passed: () => {
        if (hasHookRegistrationChanged(readAtDispatch)) {
          withheld = true;
          return;
        }
        screened = true;
        userPromptRecording?.settled(withRewriteState({}, rewrittenText));
        onScreened?.(withRewriteState({}, rewrittenText));
      },
    },
    runCommand,
    inboundOrigin,
    clientBashCommand === true,
    clientBashCommandCwd,
    toolsUsed,
    ultrathinkTyped === true,
  ).catch((error) => {
    deferred.resolve({
      messages: [],
      queries: false,
    });
    throw error;
  });
  deferred.resolve({
    messages: result.messages,
    queries: result.shouldQuery,
  });
  let { promptRow, ranCommand, lineCheck } = result;
  delete result.promptRow;
  delete result.ranCommand;
  delete result.lineCheck;
  if (lineCheck?.threw !== undefined) throw lineCheck.threw.error;
  let rewrittenSlashLine = slashLineAfterRewrite(contentText, ranCommand);
  let ambientOwed = result.ambientAttachmentsOwed === true;
  delete result.ambientAttachmentsOwed;
  let viewsInfo = readerStatesFromHookMessage(widgetViews, {
    queries: result.shouldQuery && shouldQuery !== false,
    tools: context.options.tools,
  });
  if (viewsInfo !== undefined)
    result.messages.push(
      createAttachmentMessage({
        type: "widget_context_hint",
        views: viewsInfo.views,
        ...(viewsInfo.more > 0 && {
          moreViews: viewsInfo.more,
        }),
      }),
    );
  if (isHumanOrigin(origin) && !isMeta && verifiedSlackHumanTurn !== true) {
    let last = result.messages.findLast(
      (message) => message.type === "user" && !message.isMeta && isHumanTurn(message),
    );
    if (last) notePersonPrompt(last.uuid, last.timestamp, context.options.messageClientPlatform);
  }
  markCronWakeupMessages(result.messages, wakeupSource);
  if (scheduledTaskId !== undefined) {
    let filtered = result.messages.filter((message) => message.type === "user");
    let targetMessage = filtered.find((message) => message.promptSource !== undefined) ?? filtered[0];
    if (targetMessage) {
      targetMessage.scheduledTaskId = scheduledTaskId;
      if (scheduledFireId !== undefined) targetMessage.scheduledFireId = scheduledFireId;
    }
  }
  try {
    let promptIndex =
      promptSourceCategory !== undefined &&
      result.shouldQuery &&
      (shouldQuery !== false || queryHeldForNextTurn === true)
        ? lastUserPromptIndex(result.messages)
        : -1;
    let userMessage = promptIndex === -1 ? undefined : result.messages[promptIndex];
    if (userMessage?.type === "user" && userMessage.turnOrigin === undefined) {
      userMessage.turnOrigin = classifyPromptSource({
        origin,
        isMeta,
        wakeupSource,
        promptSource: promptSourceCategory,
        hostInitiator,
      });
      let turnPosition =
        shouldQuery === false
          ? undefined
          : nextTurnPosition(messages ?? context.messages, userMessage.turnOrigin);
      if (turnPosition !== undefined) userMessage.turnPosition = turnPosition;
    }
  } catch (error) {
    logError(error);
  }
  queryCheckpoint("query_process_user_input_base_end");
  if (pollEventDelivery === true && result.messages.length > 0)
    result.messages.push(
      createAttachmentMessage({
        type: "poll_events",
        deliveredVia: "value_dispatch",
        envelopes: [],
        kinds: [],
        remainingWakeCount: 0,
        ...(pollEventProvenance !== undefined && {
          provenance: pollEventProvenance,
        }),
        ...(pollEventDeclared !== undefined && {
          declared: pollEventDeclared,
        }),
      }),
    );
  if (!isAlreadyProcessing && skipSkillPermissionReset !== true)
    setCommandDenyRules(context.setToolPermissionContext, result.disallowedTools ?? []);
  let shouldQuery_2 = queryHeldForNextTurn === true && result.shouldQuery;
  if (shouldQuery === false) result.shouldQuery = false;
  if ((result.shouldQuery || shouldQuery_2) && applyPersonalSettingsCheck(result, context.session)) {
    if (
      !screened &&
      (withheld ||
        !settleScreening({
          recording: userPromptRecording,
          onScreened,
          screened: withRewriteState({}, rewrittenText),
          isRunReached: runReached,
          since: readAtDispatch,
        }))
    )
      result.noVerdict = true;
    return result;
  }
  let isUnknownSinceDispatch = () =>
    hasHookRegistrationChanged(readSnapshot) ||
    ((ranCommand !== undefined || runReached) && hasHookRegistrationChanged(readAtDispatch));
  let isRewriteOfPrompt = (text, promptTextArg) =>
    ranCommand !== undefined &&
    isMeta !== true &&
    promptRow?.message.isMeta !== true &&
    text !== promptTextArg &&
    !(
      origin?.kind === "plugin" &&
      origin.asUser !== true &&
      text ===
        wrapPluginPrompt(promptTextArg, origin.name, {
          midTurn: false,
        })
    );
  if (
    (!result.shouldQuery && !shouldQuery_2) ||
    mode === "bash" ||
    result.forkDispatched ||
    result.queriesAfterRun === true ||
    skipSubmissionHooks === true ||
    promptSourceCategory === undefined
  ) {
    if (rewrittenSlashLine !== undefined && result.screened?.dropped !== true)
      result.screened = {
        rewritten: rewrittenSlashLine,
      };
    let dropped = result.screened?.dropped === true;
    let needsRescreenNow = needsRescreen({
      since: readAtDispatch,
      isRunReached: runReached,
    });
    if (!screened && needsRescreenNow && result.ownPassCutShort && !dropped)
      return interruptedInputResult(result, context, queuedSettler.origin !== undefined);
    let proceeds = withheld ? undefined : lineCheck?.outcome?.proceeds;
    let screenedState = withRewriteState(result.screened ?? {}, rewrittenText);
    if (!screened && proceeds !== undefined) {
      let rewrittenByHook = !dropped && isRewriteOfPrompt(proceeds.text, rewrittenSlashLine ?? contentText);
      settleScreeningResult({
        result,
        screened: rewrittenByHook
          ? {
              rewritten: proceeds.text,
            }
          : screenedState,
        isUnknown: isUnknownSinceDispatch(),
        recording: userPromptRecording,
        onScreened,
      });
    } else if (
      !screened &&
      ((withheld && !dropped) ||
        !settleScreening({
          recording: userPromptRecording,
          onScreened,
          screened: screenedState,
          isRunReached: runReached,
          since: readAtDispatch,
        }))
    )
      result.noVerdict = true;
    if (needsRescreenNow && dropped && context.abortController.signal.aborted) result.endedUnderAbort = true;
    if (result.noVerdict && result.engineDeferredSlash !== undefined) userPromptRecording?.handedOn();
    if (ambientOwed)
      await collectInputAttachments({
        result,
        context,
        history: messages,
        querySource,
      });
    await appendWorkflowAuthoringMessages(result, messages, context.options.tools);
    return result;
  }
  let dropped = result.screened?.dropped === true;
  if (dropped) delete result.screened;
  let needsRescreenAfterDrop =
    dropped &&
    needsRescreen({
      since: readAtDispatch,
      isRunReached: runReached,
    });
  queryCheckpoint("query_hooks_start");
  startInputPhase("input_hooks");
  let expandedInput = result.expandedInput ?? input;
  let promptText = rewrittenSlashLine ?? (getContentText(expandedInput) || "");
  let messageIsMeta = isMeta === true || promptRow?.message.isMeta === true;
  let noPromptRow = promptRow === undefined && ranCommand === undefined;
  let startTime = performance.now();
  let hookOutcome;
  if (lineCheck?.outcome !== undefined) {
    hookOutcome = lineCheck.outcome;
    if (hookOutcome.ended !== undefined && hookOutcome.stopped !== undefined)
      hookOutcome = {
        ...hookOutcome,
        ended: {
          ...result,
          ...hookOutcome.ended,
          messages: [...result.messages, ...hookOutcome.ended.messages],
        },
      };
    else if (hookOutcome.proceeds !== undefined) result.messages.push(...lineCheck.rows.messages);
  } else
    hookOutcome = await submitWithHooks(
      {
        submission: {
          text: promptText,
          input: expandedInput,
          pastedContents,
          ...(ranCommand !== undefined && {
            command: {
              name: ranCommand.name,
              args: ranCommand.argsRanWith,
            },
          }),
          ...(messageIsMeta && {
            isMeta: true,
          }),
          ...(noPromptRow && {
            unplaceable: `Prompt not sent: ${promptSubmitHookLabel()} changed it, and Claude Code has no place to put the change.`,
          }),
        },
        result,
        enter: entries === undefined ? undefined : () => awaitPromptEntry(entries, result.messages),
        queued: queuedSettler,
      },
      promptSourceCategory,
    );
  if (hookOutcome.ended !== undefined) {
    endInputPhase("input_hooks");
    let stoppedText =
      hookOutcome.stopped === undefined ? undefined : (hookOutcome.text ?? promptSubmitted?.text);
    let rewrittenNormalized = unchangedOrUndefined(
      promptText,
      stoppedText !== undefined && origin?.kind === "plugin" && origin.asUser !== true
        ? wrapPluginPrompt(stoppedText, origin.name, {
            midTurn: false,
          })
        : stoppedText,
    );
    let reframed =
      rewrittenNormalized === undefined
        ? undefined
        : reframeSubmittedMessage(promptRow, expandedInput, rewrittenNormalized);
    if (reframed !== undefined) {
      reframed.promptRewritten = true;
      let pluginPrompt = extractPluginPrompt(reframed);
      if (pluginPrompt !== undefined) reframed.pluginPrompt = pluginPrompt;
    }
    if (hasThirdPartyPromptHooks()) {
      let deduped = dropMentionAttachments(
        hookOutcome.stopped === undefined ? result.messages : hookOutcome.ended.messages,
        context.readFileState,
      );
      if (hookOutcome.stopped !== undefined) hookOutcome.ended.messages = deduped.kept;
    }
    if (
      hookOutcome.stopped !== undefined &&
      ranCommand !== undefined &&
      !messageIsMeta &&
      stoppedText !== undefined &&
      stoppedText !== promptText
    )
      hookOutcome.ended.messages.push(...slashLineChangedNotice(messages ?? context.messages));
    hookOutcome.ended.screened =
      hookOutcome.stopped === undefined
        ? {
            dropped: true,
          }
        : {
            rewritten:
              reframed !== undefined || ranCommand !== undefined
                ? (rewrittenNormalized ?? rewrittenSlashLine)
                : undefined,
          };
    settleScreeningResult({
      result: hookOutcome.ended,
      screened: hookOutcome.ended.screened,
      isUnknown: isUnknownSinceDispatch(),
      recording: userPromptRecording,
      onScreened,
    });
    if (!context.abortController.signal.aborted) return hookOutcome.ended;
    return {
      ...hookOutcome.ended,
      messages:
        hookOutcome.stopped === undefined
          ? [...isNullRenderingAttachment_2(result.messages, context), ...hookOutcome.ended.messages]
          : hookOutcome.ended.messages,
      endedUnderAbort: true,
    };
  }
  if (hookOutcome.proceeds === undefined) {
    endInputPhase("input_hooks");
    return interruptedInputResult(result, context, queuedSettler.origin !== undefined);
  }
  let text = hookOutcome.proceeds.text;
  let reframedProceed =
    text === promptText ? undefined : reframeSubmittedMessage(promptRow, expandedInput, text);
  if (reframedProceed !== undefined) {
    reframedProceed.promptRewritten = true;
    let pluginPrompt = extractPluginPrompt(reframedProceed);
    if (pluginPrompt !== undefined) reframedProceed.pluginPrompt = pluginPrompt;
  }
  let lineChanged = isRewriteOfPrompt(text, promptText);
  if (reframedProceed !== undefined || lineChanged)
    result.screened = {
      rewritten: text,
    };
  else if (rewrittenSlashLine !== undefined)
    result.screened = {
      rewritten: rewrittenSlashLine,
    };
  if (reframedProceed === undefined && text !== promptText)
    logForDebugging(
      "prompt.submit: the chain left another text and no row takes it (a slash command's typed line, or a hidden prompt); it stands as it came",
    );
  if (needsRescreenAfterDrop) result.noVerdict = true;
  else
    settleScreeningResult({
      result,
      screened: result.screened ?? {},
      isUnknown: isUnknownSinceDispatch(),
      recording: userPromptRecording,
      onScreened,
    });
  if (lineChanged) result.messages.push(...slashLineChangedNotice(messages ?? context.messages));
  let contextBlocks = await capAdditionalContext(
    hookOutcome.proceeds.context ?? [],
    "prompt.submit",
    context.storageV5,
  );
  if (contextBlocks.length > 0)
    result.messages.push(createHookContextAttachment(contextBlocks, "prompt.submit"));
  if (reframedProceed !== undefined && skipAllAttachments === undefined && textNotTyped !== true)
    result.messages = await recollectMentionAttachments({
      messages: result.messages,
      prompt: reframedProceed,
      rewritten: text,
      input,
      preExpansionInput,
      readTriggers,
      context,
      history: messages,
      querySource,
    });
  recordPhase("prompt_submit_hooks_ms", performance.now() - startTime, startTime);
  if (hookOutcome.proceeds.sessionTitle)
    await applyHookSessionTitle(
      context.session.id,
      hookOutcome.proceeds.sessionTitle,
      context.storageV5,
      context.credentials,
    );
  endInputPhase("input_hooks");
  queryCheckpoint("query_hooks_end");
  if (ambientOwed)
    await collectInputAttachments({
      result,
      context,
      history: messages,
      querySource,
    });
  await appendWorkflowAuthoringMessages(result, messages, context.options.tools);
  return result;
}
//@ chunk-pwdsqzsj.js:48910-49030 placement (2.1.88 match: isNullRenderingAttachment, 1)
function isNullRenderingAttachment(msg) {
  return (
    msg.type === "attachment" &&
    !MENTION_ATTACHMENT_TYPES_2.has(msg.attachment.type) &&
    !MENTION_ATTACHMENT_TYPES.has(msg.attachment.type) &&
    !isPromptSubmitHookAttachment(msg.attachment)
  );
}
//@ chunk-pwdsqzsj.js:49030-49133 placement
function isPromptSubmitHookAttachment(attachment) {
  return (
    "hookEvent" in attachment &&
    attachment.hookEvent === "UserPromptSubmit" &&
    attachment.type !== "async_hook_response"
  );
}
//@ chunk-pwdsqzsj.js:49133-49247 placement (2.1.88 match: isNullRenderingAttachment, 0.813)
function isNullRenderingAttachment_2(messages, { readFileState }) {
  for (let message of messages)
    if (message.type === "attachment") forgetReadState(message.attachment, readFileState);
  return messages.filter(isNullRenderingAttachment);
}
//@ chunk-pwdsqzsj.js:49247-49349 placement
function forgetReadState(attachment, readFileState) {
  if (attachment.type === "file") readFileState.delete(attachment.filename);
  if (attachment.type === "nested_memory") readFileState.delete(attachment.path);
}
//@ chunk-pwdsqzsj.js:49349-49537 placement
async function appendWorkflowAuthoringMessages(result, messages, tools) {
  if (!result.shouldQuery) return;
  try {
    let { getWorkflowAuthoringAutoloadMessages } = require("../getWorkflowAuthoringAutoloadMessages.lazy.js");
    result.messages.push(...(await getWorkflowAuthoringAutoloadMessages(result.messages, messages, tools)));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-pwdsqzsj.js:49537-49641 placement
function frameContent(message, origin, content) {
  let wrapped = {
    ...message,
    message: {
      ...message.message,
      content: cloneContent(content),
    },
  };
  wrapNonUserMessage(wrapped, origin);
  return wrapped.message.content;
}
//@ chunk-pwdsqzsj.js:49641-50261 placement
/**
 * 重新包装提交的消息（插件来源加框，保留非文本块）。
 */
function reframeSubmittedMessage(promptRow, expandedInput, newText) {
  if (promptRow === undefined || promptRow.message.isMeta) return;
  let { message, unframed } = promptRow;
  let { origin } = message;
  let wrappedOrigin = origin !== undefined && frameContent(message, origin, " ") !== " " ? origin : undefined;
  if (typeof unframed === "string") {
    message.message.content =
      wrappedOrigin === undefined
        ? replacePromptText(unframed, newText)
        : frameContent(message, wrappedOrigin, newText);
    return message;
  }
  let filtered = unframed.filter(
    (block, index) =>
      block.type === "text" &&
      (typeof expandedInput === "string"
        ? index > 0 || expandedInput.trim() === ""
        : expandedInput[index]?.type !== "text"),
  );
  let prompt = unframed.filter((block) => !filtered.includes(block));
  if (!prompt.some((block) => block.type === "text") && (prompt.length === 0 || hasToolResultBlock(prompt)))
    return;
  if (wrappedOrigin !== undefined) {
    message.message.content = frameContent(message, wrappedOrigin, [
      {
        type: "text",
        text: newText,
      },
      ...filtered,
      ...prompt.filter((block) => block.type !== "text"),
    ]);
    return message;
  }
  let replaced = replacePromptText(prompt, newText);
  message.message.content =
    filtered.length === 0 ? replaced : [...(typeof replaced === "string" ? [] : replaced), ...filtered];
  return message;
}
//@ chunk-pwdsqzsj.js:50261-50389 placement
function readPromptScreens(context) {
  try {
    return hooksSnapshotKey(context);
  } catch (error) {
    logForDebugging(`the drain could not read what screens a prompt now: ${error}`, {
      level: "error",
    });
    return;
  }
}
//@ chunk-pwdsqzsj.js:50389-50568 placement
function slashLineAfterRewrite(line, commandRun) {
  if (commandRun === undefined || commandRun.argsRanWith === commandRun.args) return;
  return commandRun.args !== "" && line.endsWith(commandRun.args)
    ? line.slice(0, line.length - commandRun.args.length) + commandRun.argsRanWith
    : `/${commandRun.name} ${commandRun.argsRanWith}`;
}
//@ chunk-pwdsqzsj.js:50568-50857 placement
function slashLineChangedNotice(messages) {
  let notice = `prompt.submit: ${promptSubmitHookLabel()} changed a slash command's typed line. That change is never applied: its arguments are changed at command.run, a skill body at skill.prompt.`;
  return messages.some(
    (message) =>
      message.type === "system" && message.subtype === "informational" && message.content === notice,
  )
    ? []
    : [createSystemMessage(notice, "warning")];
}
//@ chunk-pwdsqzsj.js:50857-51065 placement
function promptSubmitHookLabel() {
  let pluginRenderHooks = findPluginRenderHooks("prompt.submit");
  let filtered = pluginRenderHooks.filter((pluginRenderHook) => pluginRenderHook.tier !== "builtin");
  let labels = new Set(
    (filtered.length > 0 ? filtered : pluginRenderHooks).map((hook) => sourceLabel(hook.plugin)),
  );
  return labels.size > 0 ? `a mod hooked on prompt.submit (${[...labels].join(", ")})` : "a hook";
}
//@ chunk-pwdsqzsj.js:51065-51474 placement
/**
 * MENTION_ATTACHMENT_TYPES：提及类附件类型。
 */
var MENTION_ATTACHMENT_TYPES_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MENTION_ATTACHMENT_TYPES;
deferInit("chunk-pwdsqzsj.js:51065", () => {
  MENTION_ATTACHMENT_TYPES_2 = new Set([
    "file",
    "already_read_file",
    "at_mention_reference",
    "pdf_reference",
    "directory",
    "mcp_resource",
    "agent_mention",
    "peer_mention",
    "skill_mention",
    "nested_memory",
    "withheld_memory",
  ]);
  MENTION_ATTACHMENT_TYPES = new Set([
    "ultrathink_effort",
    "workflow_keyword_request",
    "unknown_command_fallback",
    "selected_lines_in_ide",
    "selected_lines_in_diff",
    "opened_file_in_ide",
    "inlined_image_paths",
    "thread_state",
    "widget_context_hint",
  ]);
});
//@ chunk-pwdsqzsj.js:51474-51810 placement
async function collectInputAttachments({ result, context, history, querySource }) {
  startInputPhase("input_attachments");
  let array = await toArray_2(
    getAttachmentMessages(
      null,
      context,
      null,
      [],
      {
        now: () => new Date().toISOString(),
        uuid: () => randomUUID(),
      },
      history,
      querySource,
      {
        deliveredTurnStart: true,
      },
    ),
  );
  endInputPhase("input_attachments");
  let index = result.messages.findIndex(
    (message) => message.type === "user" && message.turnCompanion !== true,
  );
  result.messages.splice(index === -1 ? 1 : index + 1, 0, ...array);
}
//@ chunk-pwdsqzsj.js:51810-52139 placement
/**
 * 去掉提及类附件，返回保留的消息与是否有 peer 提及。
 */
function dropMentionAttachments(messages, readFileState) {
  let kept = [];
  let peerMinted = false;
  for (let message of messages) {
    if (
      message.type === "attachment" &&
      message.attachment.type === "hook_additional_context" &&
      message.attachment.hookName === "prompt.mention"
    )
      continue;
    if (message.type !== "attachment" || !MENTION_ATTACHMENT_TYPES_2.has(message.attachment.type)) {
      kept.push(message);
      continue;
    }
    forgetReadState(message.attachment, readFileState);
    peerMinted ||= message.attachment.type === "peer_mention";
  }
  return {
    kept,
    peerMinted,
  };
}
//@ chunk-pwdsqzsj.js:52139-52650 placement
/**
 * 提示被改写后重新收集提及附件并插在提示之后。
 */
async function recollectMentionAttachments({
  messages,
  prompt,
  rewritten,
  input,
  preExpansionInput,
  readTriggers,
  context,
  history,
  querySource,
}) {
  let mentionText = overlappingMentions(rewritten, getContentText(input) || "");
  let preExpansionMentionText =
    preExpansionInput === undefined ? undefined : overlappingMentions(rewritten, preExpansionInput);
  let triggers = [...readTriggers, ...(context.consumedNestedMemoryTriggers ?? [])];
  let { kept, peerMinted } = dropMentionAttachments(messages, context.readFileState);
  context.nestedMemoryAttachmentTriggers?.push(...triggers);
  let array = await toArray_2(
    getAttachmentMessages(
      mentionText,
      context,
      null,
      [],
      {
        now: () => new Date().toISOString(),
        uuid: randomUUID,
      },
      history,
      querySource,
      {
        inputMentionsOnly: true,
        isHumanTypedPrompt: peerMinted,
        preExpansionInput: peerMinted ? preExpansionMentionText : undefined,
      },
    ),
  );
  kept.splice(kept.indexOf(prompt) + 1, 0, ...array);
  return kept;
}
//@ chunk-pwdsqzsj.js:52650-60747 fingerprint (2.1.88 match: processUserInputBase, 0.495)
/**
 * processUserInputBase：处理一次用户输入：图片、粘贴、! bash 模式、/ 斜杠命令、普通提示，产出要加入会话的消息与 shouldQuery。
 */
async function processUserInputBase_2(
  input,
  mode,
  context,
  promptIdSeed,
  pastedContents,
  ideSelection,
  knownTools,
  uuid,
  isAlreadyProcessing,
  querySource,
  canUseTool,
  permissionMode,
  skipSlashCommands,
  bridgeOrigin,
  modelScheduledOrigin,
  isMeta,
  attachmentsMode,
  preExpansionInput,
  suppressWorkflowKeyword,
  origin,
  shouldQuery,
  inlinedImagePaths,
  skipUltraplan,
  verifiedSlackHumanTurn,
  localStdinOrigin,
  submittedBySessionChannelPerson,
  composerEnter,
  stampThreadState,
  wakeupSource,
  hostInitiator,
  artifactCommentTurn,
  skipSlashAndAttach = false,
  skipNotify = false,
  ownFilePaths,
  userPromptHold,
  userPromptLine,
  lineCheckRunner,
  inboundOrigin,
  markOutputAsPasted = false,
  sentForDirectory,
  toolsUsed,
  ultrathinkTyped = false,
) {
  let promptId = randomUUID();
  if (!hasToolResultBlock(input)) {
    setPromptId(promptId);
    if (promptIdSeed !== undefined) maybeWarmApiAuth(context.credentials, context.storageV5);
  }
  if (
    mode === "prompt" &&
    typeof input === "string" &&
    input !== "" &&
    input.trim() === "" &&
    context.options.isNonInteractiveSession &&
    !isMeta &&
    shouldQuery !== false
  ) {
    logFeatureOk("prompt_submit_empty");
    return {
      messages: [createSystemMessage(BLANK_PROMPT_MESSAGE, "warning")],
      shouldQuery: false,
      resultText: BLANK_PROMPT_MESSAGE,
    };
  }
  let inputString = null;
  let precedingInputBlocks = [];
  let imageMetadataTexts = [];
  let imagePasteIds = [];
  let inlinePastedImages = {};
  let limits = imageLimitsForModel(context.options.mainLoopModel);
  let content = input;
  if (typeof input === "string") inputString = input;
  else if (input.length > 0) {
    queryCheckpoint("query_image_processing_start");
    let keptBlocks = [];
    let imageStoreReady = !inlinedImagePaths?.length && isImageStoreAvailable();
    let any = input.some((block) => block.type === "image");
    if (any) startInputPhase("input_images");
    if (imageStoreReady && any) advancePasteId(await getMaxStoredImageId());
    for (let block of input) {
      if (block.type !== "image") {
        keptBlocks.push(block);
        continue;
      }
      let checkedBlock = await checkImageBlockSource(block, limits);
      keptBlocks.push(checkedBlock.block);
      if (checkedBlock.block.type !== "image") continue;
      if (!imageStoreReady) {
        let metadataText = createImageMetadataText(checkedBlock.dimensions ?? {});
        if (metadataText) imageMetadataTexts.push(metadataText);
        continue;
      }
      let pasteId = mintPasteId(getContentText(input) ?? undefined, pastedContents);
      imagePasteIds.push(pasteId);
      if (block.source.type === "base64")
        inlinePastedImages[pasteId] = {
          id: pasteId,
          type: "image",
          content: block.source.data,
          dimensions: checkedBlock.dimensions,
        };
    }
    content = keptBlocks;
    endInputPhase("input_images");
    queryCheckpoint("query_image_processing_end");
    inputString = lastTextBlockText(keptBlocks);
    precedingInputBlocks = inputString === null ? keptBlocks : keptBlocks.slice(0, -1);
  }
  if (inputString === null && mode !== "prompt") throw Error(`Mode: ${mode} requires a string input.`);
  let pastedImageEntries = pastedContents
    ? Object.values(pastedContents).filter(isNonEmptyImageAttachment)
    : [];
  if (pastedImageEntries.length > 0 || Object.keys(inlinePastedImages).length > 0)
    startInputPhase("input_images");
  let storedPaths = await storePastedImages(
    {
      ...pastedContents,
      ...inlinePastedImages,
    },
    setSliceField(context.setAppState, "storedImagePaths"),
  );
  let values = Object.values(inlinePastedImages);
  for (let { id, dimensions } of values) {
    let imageMetadataText = createImageMetadataText(dimensions ?? {}, storedPaths.get(id));
    if (imageMetadataText) imageMetadataTexts.push(imageMetadataText);
  }
  if (values.length > 0) {
    let unstoredCount = countWhere(values, (img) => !storedPaths.has(img.id));
    if (unstoredCount === 0)
      logFeatureOk("input_image_block", {
        images: values.length,
      });
    else
      logFeatureSad("input_image_block", "store_failed", {
        unstored: unstoredCount,
      });
  }
  queryCheckpoint("query_pasted_image_processing_start");
  let imageProcessingResults = await Promise.all(
    pastedImageEntries.map(async (pastedImage) => {
      logEvent("tengu_pasted_image_resize_attempt", {
        original_size_bytes: pastedImage.content.length,
      });
      let resized = await maybeResizeAndDownsampleImageBlock({
        data: pastedImage.content,
        mediaType: pastedImage.mediaType,
        limits,
      });
      resized.block.type;
      return {
        id: pastedImage.id,
        resized,
        originalDimensions: pastedImage.dimensions,
        sourcePath: pastedImage.sourcePath ?? storedPaths.get(pastedImage.id),
      };
    }),
  );
  let processedBlocks = [];
  for (let { id, resized, originalDimensions, sourcePath } of imageProcessingResults) {
    processedBlocks.push(resized.block);
    if (resized.block.type !== "image") continue;
    imagePasteIds.push(id);
    if (resized.dimensions) {
      let metadataText = createImageMetadataText(resized.dimensions, sourcePath);
      if (metadataText) imageMetadataTexts.push(metadataText);
    } else if (originalDimensions) {
      let metadataText = createImageMetadataText(originalDimensions, sourcePath);
      if (metadataText) imageMetadataTexts.push(metadataText);
    } else if (sourcePath) imageMetadataTexts.push(`${IMAGE_SOURCE_MARKER_PREFIX}${sourcePath}]`);
  }
  endInputPhase("input_images");
  queryCheckpoint("query_pasted_image_processing_end");
  let isPromptMode = mode === "prompt";
  let skipSlash = skipSlashCommands || skipSlashAndAttach;
  let effectiveContext = context;
  let effectiveInput = inputString;
  let bridgeRewrite;
  if (bridgeOrigin && !skipSlashAndAttach && inputString !== null && inputString.startsWith("/")) {
    startInputPhase("input_command");
    let { resolveBridgeSlashOverride } = await import("../../bridge/bridgeSlashCommands.js");
    let parsed = resolveBridgeSlashOverride({
      inputString,
      context,
      uuid,
      origin,
      verifiedSlackHumanTurn,
    });
    endInputPhase("input_command");
    if (parsed.kind === "blocked") return parsed.result;
    if (parsed.kind === "updated") {
      skipSlash = parsed.effectiveSkipSlash;
      effectiveInput = parsed.effectiveInput;
      bridgeRewrite = parsed.bridgeRewrite;
      effectiveContext = {
        ...parsed.effectiveContext,
        dispatchedOverBridge: true,
      };
    }
  }
  if (
    verifiedSlackHumanTurn === true &&
    !bridgeOrigin &&
    !skipSlash &&
    inputString !== null &&
    inputString.startsWith("/")
  ) {
    startInputPhase("input_command");
    let { resolveRelaySlashRefusal } = await import("../../bridge/bridgeSlashCommands.js");
    let relaySlashRefusal = resolveRelaySlashRefusal({
      inputString,
      context,
      uuid,
      origin,
      inboundOrigin,
    });
    endInputPhase("input_command");
    if (relaySlashRefusal.kind === "blocked") return relaySlashRefusal.result;
  }
  let relayCommandGate;
  if (
    (verifiedSlackHumanTurn === true || bridgeOrigin === true || origin?.kind === "task-notification") &&
    inputString !== null
  ) {
    let author = {
      origin,
      relayAuthored: verifiedSlackHumanTurn === true,
      inboundOrigin,
      bridgeCarried: bridgeOrigin === true,
      bridgeRewrite,
    };
    let inputString_2 = inputString;
    relayCommandGate = async (cmd, commandName, args) => {
      let { relayDispatchRefusal } = await import("../../bridge/bridgeSlashCommands.js");
      return relayDispatchRefusal({
        cmd,
        commandName,
        args,
        inputString: inputString_2,
        uuid,
        author,
      });
    };
  }
  if (
    modelScheduledOrigin &&
    !bridgeOrigin &&
    !skipSlashAndAttach &&
    inputString !== null &&
    inputString.startsWith("/")
  ) {
    let slashCommand = parseSlashCommand(inputString);
    let scheduledCommand = slashCommand
      ? findCommand(slashCommand.commandName, context.options.commands)
      : undefined;
    let args = slashCommand?.args ?? "";
    if (!scheduledCommand && slashCommand && !slashCommand.isMcp && args.trim()) {
      let scheduledArgs = args.trimStart();
      let spaceIndex = scheduledArgs.search(/\s/);
      let firstWord = spaceIndex === -1 ? scheduledArgs : scheduledArgs.slice(0, spaceIndex);
      let command = findCommand(`${slashCommand.commandName}:${firstWord}`, context.options.commands);
      if (command) {
        scheduledCommand = command;
        args = spaceIndex === -1 ? "" : scheduledArgs.slice(spaceIndex + 1).trimStart();
      }
    }
    if (scheduledCommand) {
      let subcommandMatch = isSkillOff(scheduledCommand)
        ? undefined
        : matchSubcommand(scheduledCommand, args);
      let subcommandTarget = subcommandMatch
        ? findCommand(subcommandMatch.targetName, context.options.commands)
        : undefined;
      let permissionTarget =
        subcommandMatch && subcommandTarget && isCommandEnabled(subcommandTarget)
          ? subcommandTarget
          : scheduledCommand;
      if (
        checkSkillPermission(permissionTarget, {
          commandName: permissionTarget.name,
          userTypedThisTurn: false,
          isMainSession: true,
          permissionContext: getToolPermissionContext(context),
        }) === null
      )
        skipSlash = false;
    }
  }
  let classifierTurnHooks = createClassifierTurnHooks({
    querySource,
    context,
  });
  if (
    isUltraplanEnabled() &&
    mode === "prompt" &&
    !context.options.isNonInteractiveSession &&
    inputString !== null &&
    !skipSlash &&
    !inputString.startsWith("/") &&
    !context.options.ultraplanSessionUrl &&
    !context.getAppState().ultraplanLaunching &&
    skipUltraplan !== true &&
    !isMeta &&
    isHumanOrigin(origin) &&
    flushPromptHistory(preExpansionInput ?? inputString, pastedContents)
  ) {
    logEvent("tengu_ultraplan_keyword", {});
    let rewritten = findKeywordTriggerPositions(inputString).trim();
    let { processSlashCommand } = await import("./processSlashCommand.js");
    let { ROW_COMMIT } = await import("../../commands/config/configShorthand.js");
    let ultraplanResult = await processSlashCommand(
      `/ultraplan ${rewritten}`,
      precedingInputBlocks,
      processedBlocks,
      [],
      {
        ...context,
        rowCommit: ROW_COMMIT,
        dispatchedByKeyword: true,
        submissionVerifiedSlackHumanTurn: verifiedSlackHumanTurn,
        submittedOnLocalStdin: localStdinOrigin,
        userPromptHold,
        userPromptLine,
      },
      uuid,
      isAlreadyProcessing,
      canUseTool,
      promptIdSeed,
      undefined,
      undefined,
      undefined,
      classifierTurnHooks,
      {
        executeUserPromptSubmitHooks,
        getUserPromptSubmitHookBlockingMessage,
        executeStopHooks,
        getStopHookMessage,
      },
      origin,
      inlinedImagePaths,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      inboundOrigin,
      relayCommandGate,
    );
    return addImageMetadataMessage(ultraplanResult, imageMetadataTexts);
  }
  if (inputString !== null && mode === "bash") {
    startInputPhase("input_command");
    let { processBashCommand } = await import("./processBashCommand.js");
    let bashResult = await processBashCommand(inputString, precedingInputBlocks, context, {
      markOutputAsPasted,
      sentForDirectory,
    });
    endInputPhase("input_command");
    return addImageMetadataMessage(bashResult, imageMetadataTexts);
  }
  let shouldLoadAttachments = attachmentsMode !== "all" && (skipSlash || !inputString?.startsWith("/"));
  let isFullAttachmentsMode = attachmentsMode === undefined;
  let isRegularPrompt = isPromptMode && !isMeta && shouldQuery !== false;
  let isHumanTyped = isRegularPrompt && isHumanOrigin(origin) && !skipSlashAndAttach;
  queryCheckpoint("query_attachment_loading_start");
  if (shouldLoadAttachments && isFullAttachmentsMode) startInputPhase("input_attachments");
  let attachmentMessages =
    shouldLoadAttachments && isFullAttachmentsMode
      ? await toArray_2(
          getAttachmentMessages(
            skipSlashAndAttach ? null : inputString,
            context,
            ideSelection ?? null,
            [],
            {
              now: () => new Date().toISOString(),
              uuid: () => randomUUID(),
            },
            knownTools,
            querySource,
            {
              isRegularUserPrompt: isRegularPrompt,
              isHumanTypedPrompt: isHumanTyped,
              ownFilePaths: skipSlashAndAttach ? ownFilePaths : undefined,
              preExpansionInput,
              pastedContents,
              suppressWorkflowKeyword,
              heldAppend:
                shouldQuery === false &&
                !isMeta &&
                verifiedSlackHumanTurn !== true &&
                (origin === undefined || origin.kind === "human"),
            },
          ),
        )
      : [];
  endInputPhase("input_attachments");
  let inlinedImagesAttachment =
    inlinedImagePaths && inlinedImagePaths.length > 0
      ? createAttachmentMessage({
          type: "inlined_image_paths",
          paths: inlinedImagePaths,
        })
      : null;
  let threadState = stampThreadState ? getProjectsThreadState() : undefined;
  let threadStateAttachment = threadState
    ? createAttachmentMessage({
        type: "thread_state",
        ...threadState,
      })
    : null;
  queryCheckpoint("query_attachment_loading_end");
  if (effectiveInput !== null && !skipSlash && effectiveInput.startsWith("/")) {
    startInputPhase("input_command");
    let { processSlashCommand } = await import("./processSlashCommand.js");
    let { ROW_COMMIT } = await import("../../commands/config/configShorthand.js");
    let skillPermissionCheck = modelScheduledOrigin
      ? (command) =>
          checkSkillPermission(command, {
            commandName: command.name,
            userTypedThisTurn: false,
            isMainSession: context.agentId === undefined,
            permissionContext: getToolPermissionContext(context),
          }) !== null
      : undefined;
    let slashResult = await processSlashCommand(
      effectiveInput,
      precedingInputBlocks,
      processedBlocks,
      attachmentMessages,
      {
        ...effectiveContext,
        rowCommit: ROW_COMMIT,
        submissionVerifiedSlackHumanTurn: verifiedSlackHumanTurn,
        submittedOnLocalStdin: localStdinOrigin,
        submittedBySessionChannelPerson,
        submittedFromComposer: composerEnter,
        userPromptHold,
        userPromptLine,
      },
      uuid,
      isAlreadyProcessing,
      canUseTool,
      promptIdSeed,
      modelScheduledOrigin,
      skillPermissionCheck,
      modelScheduledOrigin ? undefined : preExpansionInput,
      classifierTurnHooks,
      {
        executeUserPromptSubmitHooks,
        getUserPromptSubmitHookBlockingMessage,
        executeStopHooks,
        getStopHookMessage,
      },
      origin,
      inlinedImagePaths,
      ideSelection?.source === "diff" ? undefined : ideSelection,
      isMeta,
      permissionMode,
      wakeupSource,
      hostInitiator,
      lineCheckRunner,
      inboundOrigin,
      relayCommandGate,
    );
    endInputPhase("input_command");
    if (
      mode === "prompt" &&
      !isMeta &&
      shouldQuery !== false &&
      isHumanOrigin(origin) &&
      !modelScheduledOrigin &&
      slashResult.shouldQuery &&
      !context.abortController.signal.aborted
    ) {
      notifyAutoReactHumanTurn({
        ownWords: verifiedSlackHumanTurn !== true,
      });
      resetGoalIdleCheckinCount(context.setAppState, context.session.sessionScratch);
      resetUnansweredSafetyCheckCount();
    }
    if (slashResult.extractPromptAttachments && !shouldLoadAttachments && attachmentsMode === undefined) {
      startInputPhase("input_attachments");
      let array = await toArray_2(
        getAttachmentMessages(
          effectiveInput,
          context,
          ideSelection?.source === "diff" ? null : (ideSelection ?? null),
          [],
          {
            now: () => new Date().toISOString(),
            uuid: () => randomUUID(),
          },
          knownTools,
          querySource,
          {
            isRegularUserPrompt: isRegularPrompt,
            isHumanTypedPrompt: isHumanTyped,
            preExpansionInput,
            pastedContents,
            suppressWorkflowKeyword,
          },
        ),
      );
      endInputPhase("input_attachments");
      slashResult.messages.splice(1, 0, ...array);
    }
    if (slashResult.extractPromptAttachments && !shouldLoadAttachments && attachmentsMode === "mentions")
      slashResult.ambientAttachmentsOwed = true;
    if (inlinedImagesAttachment) slashResult.messages.push(inlinedImagesAttachment);
    if (threadStateAttachment) slashResult.messages.push(threadStateAttachment);
    return addImageMetadataMessage(slashResult, imageMetadataTexts);
  }
  if (inlinedImagesAttachment) attachmentMessages.push(inlinedImagesAttachment);
  if (threadStateAttachment) attachmentMessages.push(threadStateAttachment);
  if (inputString !== null && mode === "prompt") {
    let trimmedInput = inputString.trim();
    let agentMention = attachmentMessages.find(
      (attachment) => attachment.attachment.type === "agent_mention",
    );
    if (agentMention) {
      let agentMentionString = `@agent-${agentMention.attachment.agentType}`;
      let isOnlyMention = trimmedInput === agentMentionString;
      let isPrefix = trimmedInput.startsWith(agentMentionString) && !isOnlyMention;
      logEvent("tengu_subagent_at_mention", {
        is_subagent_only: isOnlyMention,
        is_prefix: isPrefix,
      });
    }
  }
  if (isRegularPrompt && isHumanOrigin(origin) && !skipNotify && !context.abortController.signal.aborted) {
    notifyAutoReactHumanTurn({
      ownWords: verifiedSlackHumanTurn !== true && !skipSlashAndAttach,
    });
    resetGoalIdleCheckinCount(context.setAppState, context.session.sessionScratch);
    resetUnansweredSafetyCheckCount();
  }
  let setupGuideNotice;
  let expandedContent;
  if (isRegularPrompt && !skipSlashAndAttach && isHumanOrUnset(origin)) {
    let plainText =
      typeof content === "string"
        ? content
        : extractTextContent_2(
            content,
            `
`,
          );
    if (isHumanTyped && isFullAttachmentsMode && verifiedSlackHumanTurn !== true && skipUltraplan !== true) {
      let content_2 = await fetchLinkedSetupGuide(
        plainText,
        context.credentials,
        context.abortController.signal,
      );
      if (content_2) {
        let guideSuffix = isVirtualPancakeEnabled()
          ? wrapUserTurnContent(content_2)
          : `

${content_2}`;
        if (typeof content === "string") expandedContent = `${content}${guideSuffix}`;
        else {
          let last = content.findLast((block) => block.type === "text");
          expandedContent = content.map((block) =>
            block === last && block.type === "text"
              ? {
                  ...block,
                  text: `${block.text}${guideSuffix}`,
                }
              : block,
          );
        }
        setupGuideNotice = loadedSetupGuideNotice();
      }
    }
    notifySetupGuidePasted(plainText, context.credentials, context.storageV5, context.appendSystemMessage);
  }
  let ultrathinkEffort =
    isHumanTyped &&
    (ultrathinkTyped ||
      hasUltrathinkKeyword({
        composerEnter,
        preExpansion: preExpansionInput,
        localStdinOrigin,
        input,
      })) &&
    shouldUltrathinkRaiseEffort(context.options.mainLoopModel, getEffortValue(context), ultrathinkTyped)
      ? "xhigh"
      : undefined;
  if (ultrathinkEffort) logFeatureOk("ultrathink_boost");
  let result = addImageMetadataMessage(
    {
      ...processTextPrompt(
        expandedContent ?? content,
        processedBlocks,
        imagePasteIds,
        attachmentMessages,
        promptId,
        uuid,
        permissionMode,
        isMeta,
        getEffortLevelIfSupported(
          context.options.mainLoopModel,
          getEffortValue(context),
          ultrathinkEffort ?? getEffortLayerOverride(context.permissionLayers),
        ),
        promptIdSeed,
        origin,
        wakeupSource,
        hostInitiator,
        artifactCommentTurn,
        userPromptHold,
        inboundOrigin,
        toolsUsed,
        knownTools,
      ),
      ...(ultrathinkEffort && {
        effort: ultrathinkEffort,
      }),
      ...(shouldLoadAttachments &&
        !isFullAttachmentsMode && {
          ambientAttachmentsOwed: true,
        }),
    },
    imageMetadataTexts,
  );
  if (expandedContent) result.expandedInput = expandedContent;
  if (setupGuideNotice) result.messages.push(setupGuideNotice);
  if (skipSlash) markSkipSlashCommands(result.messages);
  return result;
}
//@ chunk-pwdsqzsj.js:60747-60824 layout
function markSkipSlashCommands(messages) {
  for (let message of messages) if (message.type === "user") message.queueSkipSlashCommands = true;
}
//@ chunk-pwdsqzsj.js:60824-61709 layout
function createClassifierTurnHooks({ querySource, context }) {
  if (promptUtilsModule) {
    let shouldClassify = () =>
      isActingAsBgJob() && querySource?.startsWith("repl_main_thread") === true && !context.agentId;
    return {
      markTurnActive: (userText) => {
        try {
          if (shouldClassify()) {
            let state = classifierJobState(context);
            promptUtilsModule().markTurnActive(state, getOwnJobShortId(), {
              userText,
              isTurnStart: true,
            });
            state.kicked = false;
          }
        } catch (error) {
          if (isAbortError(error)) return;
          logError(error);
        }
      },
      settleTurnEnd: async (messages) => {
        try {
          if (!shouldClassify()) return;
          let promptUtils = promptUtilsModule();
          let state = classifierJobState(context);
          let ownJobShortId = getOwnJobShortId();
          if (messages) {
            let attachments = attachmentsModule();
            let surfaces = attachments.detectSurfaces(false);
            let engine = attachments.engineFor(attachments.sinksFor(surfaces));
            if (engine) {
              let latestRealUserAsk = promptUtils.findLatestRealUserAsk([...context.messages, ...messages]);
              if (latestRealUserAsk) promptUtils.captureLatestAsk(state, latestRealUserAsk);
              let mainThreadAgentType = getMainThreadAgentType();
              let agentDef = mainThreadAgentType
                ? context.options.agentDefinitions.activeAgents.find(
                    (activeAgent) => activeAgent.agentType === mainThreadAgentType,
                  )
                : undefined;
              let classifyPromise = promptUtils
                .classifyAndPush(
                  state,
                  ownJobShortId,
                  agentDef,
                  "",
                  messages.filter((message) => message.type === "assistant"),
                  hasActiveAgentTasks(context.taskRegistry.all()),
                  engine,
                  surfaces,
                  false,
                  false,
                )
                .catch((error) => {
                  logForDebugging(`[classifier] error: ${errorMessage(error)}`, {
                    level: "error",
                  });
                });
              if (isBgSession())
                await withTimeout(classifyPromise, 60000, "classifier write timed out").catch(() => {});
              return;
            }
          }
          promptUtils.markTurnAborted(state, ownJobShortId);
        } catch (error) {
          if (isAbortError(error)) return;
          logError(error);
        }
      },
    };
  }
  return;
}
//@ chunk-pwdsqzsj.js:61709-61842 callgraph-fingerprint (2.1.88 match: addImageMetadataMessage, 0.58)
function addImageMetadataMessage(result, imageMetadataTexts) {
  if (imageMetadataTexts.length > 0)
    result.messages.push(
      createUserMessage({
        content: imageMetadataTexts.map((text) => ({
          type: "text",
          text,
        })),
        isMeta: true,
        turnCompanion: true,
      }),
    );
  return result;
}
//@ chunk-g88zyy4n.js:44756-45959 fingerprint (2.1.88 match: processUserInput, 0.408)
async function processUserInput_2(command, commandArgs, context) {
  let hookMessages = [];
  let prompt = commandArgs ? `/${command.name} ${commandArgs}` : `/${command.name}`;
  let hookSnapshot = snapshotHookRegistration();
  try {
    for await (let hookResult of executeUserPromptExpansionHooks(
      command.source === "mcp" ? "mcp_prompt" : "slash_command",
      command.name,
      commandArgs,
      command.source,
      prompt,
      getToolPermissionContext(context).mode,
      context,
    )) {
      if (hookResult.message?.type === "progress") continue;
      if (hookResult.blockingError) {
        let blockedText = `UserPromptExpansion operation blocked by hook:
${hookResult.blockingError.blockingError}`;
        let message =
          hookResult.suppressOriginalPrompt === true ||
          hasHookRegistrationChanged(hookSnapshot) ||
          hasPromptSubmitHooks({
            isRunReached: false,
          })
            ? blockedText
            : `${blockedText}

Original prompt: ${prompt}`;
        return {
          blocked: {
            messages: [createSystemMessage(message, "warning", undefined, true)],
            shouldQuery: false,
            resultText: message,
            command,
            screened: {
              dropped: true,
            },
          },
        };
      }
      if (hookResult.preventContinuation) {
        let stopText = hookResult.stopReason
          ? `${HOOK_STOPPED_MESSAGE}: ${hookResult.stopReason}`
          : HOOK_STOPPED_MESSAGE;
        return {
          blocked: {
            messages: [
              createUserMessage({
                content: stopText,
                isMeta: true,
              }),
              createSystemMessage(stopText, "warning", undefined, true),
            ],
            shouldQuery: false,
            resultText: stopText,
            command,
          },
        };
      }
      if (hookResult.additionalContexts?.length)
        hookMessages.push(
          createAttachmentMessage({
            type: "hook_additional_context",
            content: hookResult.additionalContexts,
            hookName: "UserPromptExpansion",
            toolUseID: `hook-${randomUUID()}`,
            hookEvent: "UserPromptExpansion",
          }),
        );
      if (
        hookResult.message &&
        !(
          hookResult.message.type === "attachment" &&
          hookResult.message.attachment.type === "hook_success" &&
          hookResult.message.attachment.content === ""
        )
      )
        hookMessages.push(hookResult.message);
    }
  } catch (error) {
    if (!(error instanceof StreamClosedAbortError)) throw error;
    logForDebugging("UserPromptExpansion hooks cancelled (control stream closed)");
  }
  return {
    hookMessages,
  };
}
export { processUserInput, isNullRenderingAttachment_2, isNullRenderingAttachment, processUserInput_2 };
