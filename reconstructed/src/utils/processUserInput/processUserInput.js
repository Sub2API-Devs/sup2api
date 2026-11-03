/**
 * utils/processUserInput/processUserInput.ts
 *
 * 并入已有模块：处理用户输入（斜杠命令、bash、提示词、附件）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/processUserInput/processUserInput.ts
 * pieces: chunk-3g0djq3w.js (1), chunk-jv307fw4.js (1), chunk-xx1vmpsq.js (33)
 * attribution: fingerprint 3, placement 29, layout 2, callgraph-fingerprint 1
 */
import { randomUUID } from "crypto";
import { describeSettingsProblem } from "../settings/settingsProblems.js";
import { authWarmNoticeStateSlot, maybeWarmApiAuth } from "../../services/api/apiAuthWarm.js";
import { isPersonalConfigRestricted } from "../personalConfigRestriction.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import {
  makeMetaUserMessage,
  hookStopWarningMessage,
  createQueuedSettler,
  screensChanged,
  pluginsChanged,
  submitPromptWithHooks,
  runUserPromptSubmitHooks,
  CANCELLED_RESULT as CANCELLED_RESULT_2,
  hasThirdPartyPromptHooks,
  createHookContextAttachment,
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
  HOOK_STOPPED_MESSAGE,
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
import { count } from "../collections.js";
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

//@ chunk-xx1vmpsq.js:34727-35466 placement
/**
 * 按个人设置加载检查结果处理输入：stop 时停止查询并给出说明，notice 时附加一次系统消息。
 */
function applyPersonalSettingsCheck(e, session) {
  let n = describeSettingsProblem();
  let y = authWarmNoticeStateSlot.of(session);
  if (n.kind === "clear" && isPersonalConfigRestricted() && !y.countedClear) {
    y.countedClear = true;
    logFeatureOk("hooks_personal_load_check");
  }
  if (n.kind === "stop" && !y.countedStop) {
    y.countedStop = true;
    logFeatureBad("hooks_personal_load_check", "stopped");
  }
  if (n.kind === "notice" && !y.countedNotice) {
    y.countedNotice = true;
    logFeatureSad("hooks_personal_load_check", "notice");
  }
  if (n.kind === "stop") {
    e.messages = [
      ...e.messages,
      makeMetaUserMessage(n.text),
      hookStopWarningMessage(n.text, {
        kind: "no_verdict",
        noVerdictKind: "personal_config_refused",
      }),
    ];
    e.shouldQuery = false;
    e.resultText = n.text;
    e.allowedTools = undefined;
    return true;
  }
  if (n.kind === "notice" && !y.noticed) {
    y.noticed = true;
    e.messages = [
      ...e.messages,
      createAttachmentMessage({
        type: "hook_system_message",
        content: n.text,
        hookName: "Claude Code",
        toolUseID: `personal-hooks-${session.id}`,
        hookEvent: "UserPromptSubmit",
      }),
    ];
  }
  return false;
}
//@ chunk-xx1vmpsq.js:35466-35488 placement
var regExp = new RegExp(WORD_BOUNDARY_PATTERN);
//@ chunk-xx1vmpsq.js:35488-35553 placement
function findRegexMatch(regExp, s, lastIndex) {
  regExp.lastIndex = lastIndex;
  return regExp.test(s) ? regExp.lastIndex : -1;
}
//@ chunk-xx1vmpsq.js:35553-36101 placement
/**
 * 提取文本中的 @ 提及（支持引号路径与带空格的路径段落）。
 */
function extractAtMentions(e) {
  let s = [];
  let n = /\s/g;
  let regExp_2 = new RegExp(String.raw`[ \t]*\[${ADDRESS_REF_PATTERN}\]`, "y");
  let r = 0;
  let w = -1;
  let T = -1;
  let C = [];
  let I = 0;
  for (let index = e.indexOf("@"); index !== -1; index = e.indexOf("@", Math.max(index + 1, r))) {
    if (index > 0 && !regExp.test(e[index - 1])) continue;
    let R = index + 1;
    let lastIndex = -1;
    if (e[R] === '"') {
      let index = e.indexOf('"', R + 1);
      if (index > R + 1) lastIndex = index + 1;
    }
    if (lastIndex === -1) {
      if (R >= w) {
        n.lastIndex = R;
        w = n.test(e) ? n.lastIndex - 1 : e.length;
        T = -1;
        C = [];
        I = 0;
        for (let j = R + 1; j <= w; j++)
          if (isWordCharCodeAt(e, j - 1) !== isWordCharCodeAt(e, j)) {
            T = j;
            if (findRegexMatch(regExp_2, e, j) !== -1) C.push(j);
          }
      }
      while ((C[I] ?? 1 / 0) <= R) I++;
      lastIndex = C[I] ?? T;
      if (lastIndex <= R) continue;
    }
    let regexMatch = findRegexMatch(regExp_2, e, lastIndex);
    r = regexMatch === -1 ? lastIndex : regexMatch;
    s.push(e.slice(index, r));
  }
  return s;
}
//@ chunk-xx1vmpsq.js:36101-36184 placement
function overlappingMentions(rewritten, s) {
  let n = new Set(extractAtMentions(s));
  return extractAtMentions(rewritten)
    .filter((y) => n.has(y))
    .join(" ");
}
//@ chunk-xx1vmpsq.js:37461-37557 placement
var BLANK_PROMPT_MESSAGE =
  "Blank prompt \u2014 the message was only whitespace, so nothing was sent to the model.";
//@ chunk-xx1vmpsq.js:37557-37600 placement
function startInputPhase(e) {
  startPhaseWithin("process_user_input", e);
}
//@ chunk-xx1vmpsq.js:37600-37643 placement
function endInputPhase(e) {
  endPhaseWithin("process_user_input", e);
}
//@ chunk-xx1vmpsq.js:37643-37723 placement
var promptUtilsModule = () => require("./chunk-wd9kxbpn.js");
var attachmentsModule = () => require("./chunk-e321p3vc.js");
//@ chunk-xx1vmpsq.js:37723-37745 placement
class PromptState {
  state = undefined;
}
//@ chunk-xx1vmpsq.js:37745-37770 placement
var promptStateSlot = new HostScoped(() => new PromptState());
//@ chunk-xx1vmpsq.js:37770-37897 placement
function classifierJobState(context) {
  let s = promptStateSlot.of(context.session.host);
  if (s.state === undefined) s.state = promptUtilsModule?.().createClassifierJobState(context) ?? null;
  return s.state;
}
//@ chunk-xx1vmpsq.js:37897-38300 placement
/**
 * 处理用户输入（斜杠命令、bash、提示词、附件），返回要追加的消息与是否发起查询；记录 process_user_input 计时。
 */
async function processUserInput(e) {
  let { input } = e;
  let n = false;
  let y = snapshotHookRegistration();
  let reading = e.uuid === undefined ? undefined : inflightCommandRuns.get(e.uuid)?.reading;
  let w =
    reading === undefined
      ? y
      : {
          ...reading,
          wasUnknown: reading.wasUnknown || y.wasUnknown,
        };
  let T = await runPromptSubmitHooks(
    typeof input === "string"
      ? input
      : extractTextContent_2(
          input,
          `
`,
        ),
    (C) => {
      n = C === undefined;
      return processUserInputBase(
        C === undefined
          ? {
              ...e,
              readAtDispatch: w,
            }
          : {
              ...e,
              readAtDispatch: w,
              userPromptRecording: C,
            },
      );
    },
    {
      prompt: e.interactionPrompt,
      reading: w,
    },
  );
  if (T.noVerdict && n) T.wasUnscreenedAtDispatch = true;
  return T;
}
//@ chunk-xx1vmpsq.js:38300-47765 placement
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
  let qt = typeof input === "string" ? input : null;
  if (mode === "prompt" && qt !== null && !isMeta) setUserInputOnProcessing?.(qt, origin);
  queryCheckpoint("query_process_user_input_base_start");
  let promptSource_2 =
    shouldQuery === false && isMeta && queryHeldForNextTurn !== true
      ? undefined
      : resolvePromptSource({
          isNonInteractive: context.options.isNonInteractiveSession,
          isMeta,
          callerSource: promptSource ?? (isHumanOrUnset(origin) ? undefined : "system"),
        });
  let Kt = skipAttachments ?? (origin?.kind === "plugin" ? "all" : undefined);
  let readTriggers = [...(context.nestedMemoryAttachmentTriggers ?? [])];
  context.consumedNestedMemoryTriggers = [];
  let je = getContentText(input) || "";
  let We;
  let Me = false;
  let et = false;
  let xe = false;
  let pt = readAtDispatch;
  let xt = async ({ submission, result: X, enter, queued }, promptSource) => {
    if (X.shouldQuery && shouldQuery !== false) onQueryCommitted?.();
    pt = snapshotHookRegistration();
    let ot = promptSubmitted === undefined ? undefined : readPromptScreens(context);
    if (
      promptSubmitted === undefined ||
      ot === undefined ||
      (submission.command !== undefined &&
        submission.text !== je &&
        (promptSubmitted.stopped === undefined || screensChanged(promptSubmitted.under, ot))) ||
      pluginsChanged(promptSubmitted.under, ot)
    )
      return submitPromptWithHooks({
        submission,
        origin,
        bridgeOrigin,
        mode,
        shouldWait: wait,
        context,
        result: X,
        promptSource,
        wakeupSource,
        queued,
        isStartInput: aheadOfSessionStart === true || isGoalIdleCheckinPaused(uuid),
        enter,
        bound: () => {
          pt = snapshotHookRegistration();
        },
      });
    if (screensChanged(promptSubmitted.under, ot)) {
      let Ue = await runUserPromptSubmitHooks({
        text: submission.command === undefined ? promptSubmitted.text : submission.text,
        typed: submission.text,
        context,
        result: X,
        promptSource,
        wakeupSource,
        tiers: MANAGED_HOOKS_TIER,
      });
      let qe =
        Ue.blocked !== undefined
          ? Ue
          : await runUserPromptSubmitHooks({
              text: promptSubmitted.text,
              typed: submission.text,
              context,
              result: X,
              promptSource,
              wakeupSource,
              tiers: {
                managedHooksExcluded: true,
              },
            });
      let $t = Ue.wasCancelled === true || qe.wasCancelled === true;
      return qe.blocked !== undefined && !($t && qe.stopped !== undefined)
        ? {
            ended: qe.blocked,
            stopped: qe.stopped,
          }
        : $t
          ? CANCELLED_RESULT_2
          : {
              proceeds: {
                text: promptSubmitted.text,
                context: promptSubmitted.context,
                sessionTitle: qe.sessionTitle ?? Ue.sessionTitle,
              },
            };
    }
    X.messages.push(...promptSubmitted.messages);
    if (promptSubmitted.stopped !== undefined) {
      X.shouldQuery = false;
      X.resultText = promptSubmitted.stopped;
      return {
        ended: X,
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
  let Ut =
    (shouldQuery === false && queryHeldForNextTurn !== true) ||
    skipSubmissionHooks === true ||
    promptSource_2 === undefined
      ? undefined
      : async (j) => {
          let X = {
            messages: [],
            shouldQuery: true,
          };
          if (describeSettingsProblem().kind === "stop")
            return {
              ran: j,
              rows: X,
              outcome: undefined,
            };
          let ce = await xt(
            {
              submission: {
                text: slashLineAfterRewrite(je, j) ?? je,
                input,
                pastedContents,
                command: {
                  name: j.name,
                  args: j.argsRanWith,
                },
                ...(isMeta === true && {
                  isMeta: true,
                }),
              },
              result: X,
              enter:
                entries &&
                (() => deferred.promise.then(({ messages }) => awaitPromptEntry(entries, messages))),
              queued: {
                ...queuedSettler,
                settleWhen: (me) =>
                  queuedSettler.settleWhen(
                    Promise.all([me, deferred.promise]).then(([ht, { queries: ot }]) =>
                      ot ? ht : Promise.reject(Error("no query")),
                    ),
                  ),
              },
            },
            promptSource_2,
          ).catch((error) => {
            logError(error);
            return {
              error,
            };
          });
          return "error" in ce
            ? {
                ran: j,
                rows: X,
                outcome: undefined,
                threw: ce,
              }
            : {
                ran: j,
                rows: X,
                outcome: ce,
              };
        };
  let x = await processUserInputBase_2(
    input,
    mode,
    context,
    promptSource_2,
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
    Kt,
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
        Me = settleScreening({
          recording: userPromptRecording,
          onScreened,
          screened: withRewriteState({}, We),
          isRunReached: xe,
          since: readAtDispatch,
        });
      },
      ranAs: (j) => {
        xe = true;
        We = slashLineAfterRewrite(je, j);
      },
      withheld: () => {
        et = true;
      },
      isUnknownSinceDispatch: () => hasHookRegistrationChanged(readAtDispatch),
      isHeldForOrganization: () =>
        needsRescreen({
          since: readAtDispatch,
          isRunReached: xe,
        }),
      passed: () => {
        if (hasHookRegistrationChanged(readAtDispatch)) {
          et = true;
          return;
        }
        Me = true;
        userPromptRecording?.settled(withRewriteState({}, We));
        onScreened?.(withRewriteState({}, We));
      },
    },
    Ut,
    inboundOrigin,
    clientBashCommand === true,
    clientBashCommandCwd,
    toolsUsed,
  ).catch((error) => {
    deferred.resolve({
      messages: [],
      queries: false,
    });
    throw error;
  });
  deferred.resolve({
    messages: x.messages,
    queries: x.shouldQuery,
  });
  let { promptRow, ranCommand, lineCheck } = x;
  delete x.promptRow;
  delete x.ranCommand;
  delete x.lineCheck;
  if (lineCheck?.threw !== undefined) throw lineCheck.threw.error;
  let B = slashLineAfterRewrite(je, ranCommand);
  let H = x.ambientAttachmentsOwed === true;
  delete x.ambientAttachmentsOwed;
  if (isHumanOrigin(origin) && !isMeta && verifiedSlackHumanTurn !== true) {
    let last = x.messages.findLast(
      (message) => message.type === "user" && !message.isMeta && isHumanTurn(message),
    );
    if (last) notePersonPrompt(last.uuid, last.timestamp, context.options.messageClientPlatform);
  }
  markCronWakeupMessages(x.messages, wakeupSource);
  if (scheduledTaskId !== undefined) {
    let filtered = x.messages.filter((message) => message.type === "user");
    let X = filtered.find((ce) => ce.promptSource !== undefined) ?? filtered[0];
    if (X) {
      X.scheduledTaskId = scheduledTaskId;
      if (scheduledFireId !== undefined) X.scheduledFireId = scheduledFireId;
    }
  }
  try {
    let X =
      promptSource_2 !== undefined &&
      x.shouldQuery &&
      (shouldQuery !== false || queryHeldForNextTurn === true)
        ? lastUserPromptIndex(x.messages)
        : -1;
    let ce = X === -1 ? undefined : x.messages[X];
    if (ce?.type === "user" && ce.turnOrigin === undefined) {
      ce.turnOrigin = classifyPromptSource({
        origin,
        isMeta,
        wakeupSource,
        promptSource: promptSource_2,
        hostInitiator,
      });
      let me =
        shouldQuery === false ? undefined : nextTurnPosition(messages ?? context.messages, ce.turnOrigin);
      if (me !== undefined) ce.turnPosition = me;
    }
  } catch (error) {
    logError(error);
  }
  queryCheckpoint("query_process_user_input_base_end");
  if (pollEventDelivery === true && x.messages.length > 0)
    x.messages.push(
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
    setCommandDenyRules(context.setToolPermissionContext, x.disallowedTools ?? []);
  let shouldQuery_2 = queryHeldForNextTurn === true && x.shouldQuery;
  if (shouldQuery === false) x.shouldQuery = false;
  if ((x.shouldQuery || shouldQuery_2) && applyPersonalSettingsCheck(x, context.session)) {
    if (
      !Me &&
      (et ||
        !settleScreening({
          recording: userPromptRecording,
          onScreened,
          screened: withRewriteState({}, We),
          isRunReached: xe,
          since: readAtDispatch,
        }))
    )
      x.noVerdict = true;
    return x;
  }
  let h = () =>
    hasHookRegistrationChanged(pt) ||
    ((ranCommand !== undefined || xe) && hasHookRegistrationChanged(readAtDispatch));
  let P = (text, X) =>
    ranCommand !== undefined &&
    isMeta !== true &&
    promptRow?.message.isMeta !== true &&
    text !== X &&
    !(
      origin?.kind === "plugin" &&
      origin.asUser !== true &&
      text ===
        wrapPluginPrompt(X, origin.name, {
          midTurn: false,
        })
    );
  if (
    (!x.shouldQuery && !shouldQuery_2) ||
    mode === "bash" ||
    x.forkDispatched ||
    x.queriesAfterRun === true ||
    skipSubmissionHooks === true ||
    promptSource_2 === undefined
  ) {
    if (B !== undefined && x.screened?.dropped !== true)
      x.screened = {
        rewritten: B,
      };
    let j = x.screened?.dropped === true;
    let X = needsRescreen({
      since: readAtDispatch,
      isRunReached: xe,
    });
    if (!Me && X && x.ownPassCutShort && !j)
      return interruptedInputResult(x, context, queuedSettler.origin !== undefined);
    let proceeds = et ? undefined : lineCheck?.outcome?.proceeds;
    let ht = withRewriteState(x.screened ?? {}, We);
    if (!Me && proceeds !== undefined) {
      let Ue = !j && P(proceeds.text, B ?? je);
      settleScreeningResult({
        result: x,
        screened: Ue
          ? {
              rewritten: proceeds.text,
            }
          : ht,
        isUnknown: h(),
        recording: userPromptRecording,
        onScreened,
      });
    } else if (
      !Me &&
      ((et && !j) ||
        !settleScreening({
          recording: userPromptRecording,
          onScreened,
          screened: ht,
          isRunReached: xe,
          since: readAtDispatch,
        }))
    )
      x.noVerdict = true;
    if (X && j && context.abortController.signal.aborted) x.endedUnderAbort = true;
    if (x.noVerdict && x.engineDeferredSlash !== undefined) userPromptRecording?.handedOn();
    if (H)
      await collectInputAttachments({
        result: x,
        context,
        history: messages,
        querySource,
      });
    await appendWorkflowAuthoringMessages(x, messages, context.options.tools);
    return x;
  }
  let D = x.screened?.dropped === true;
  if (D) delete x.screened;
  let O =
    D &&
    needsRescreen({
      since: readAtDispatch,
      isRunReached: xe,
    });
  queryCheckpoint("query_hooks_start");
  startInputPhase("input_hooks");
  let expandedInput = x.expandedInput ?? input;
  let le = B ?? (getContentText(expandedInput) || "");
  let Ce = isMeta === true || promptRow?.message.isMeta === true;
  let Ae = promptRow === undefined && ranCommand === undefined;
  let startTime = performance.now();
  let Z;
  if (lineCheck?.outcome !== undefined) {
    Z = lineCheck.outcome;
    if (Z.ended !== undefined && Z.stopped !== undefined)
      Z = {
        ...Z,
        ended: {
          ...x,
          ...Z.ended,
          messages: [...x.messages, ...Z.ended.messages],
        },
      };
    else if (Z.proceeds !== undefined) x.messages.push(...lineCheck.rows.messages);
  } else
    Z = await xt(
      {
        submission: {
          text: le,
          input: expandedInput,
          pastedContents,
          ...(ranCommand !== undefined && {
            command: {
              name: ranCommand.name,
              args: ranCommand.argsRanWith,
            },
          }),
          ...(Ce && {
            isMeta: true,
          }),
          ...(Ae && {
            unplaceable: `Prompt not sent: ${promptSubmitHookLabel()} changed it, and Claude Code has no place to put the change.`,
          }),
        },
        result: x,
        enter: entries === undefined ? undefined : () => awaitPromptEntry(entries, x.messages),
        queued: queuedSettler,
      },
      promptSource_2,
    );
  if (Z.ended !== undefined) {
    endInputPhase("input_hooks");
    let j = Z.stopped === undefined ? undefined : (Z.text ?? promptSubmitted?.text);
    let X = unchangedOrUndefined(
      le,
      j !== undefined && origin?.kind === "plugin" && origin.asUser !== true
        ? wrapPluginPrompt(j, origin.name, {
            midTurn: false,
          })
        : j,
    );
    let ce = X === undefined ? undefined : reframeSubmittedMessage(promptRow, expandedInput, X);
    if (ce !== undefined) {
      ce.promptRewritten = true;
      let pluginPrompt = extractPluginPrompt(ce);
      if (pluginPrompt !== undefined) ce.pluginPrompt = pluginPrompt;
    }
    if (hasThirdPartyPromptHooks()) {
      let me = dropMentionAttachments(
        Z.stopped === undefined ? x.messages : Z.ended.messages,
        context.readFileState,
      );
      if (Z.stopped !== undefined) Z.ended.messages = me.kept;
    }
    if (Z.stopped !== undefined && ranCommand !== undefined && !Ce && j !== undefined && j !== le)
      Z.ended.messages.push(...slashLineChangedNotice(messages ?? context.messages));
    Z.ended.screened =
      Z.stopped === undefined
        ? {
            dropped: true,
          }
        : {
            rewritten: ce !== undefined || ranCommand !== undefined ? (X ?? B) : undefined,
          };
    settleScreeningResult({
      result: Z.ended,
      screened: Z.ended.screened,
      isUnknown: h(),
      recording: userPromptRecording,
      onScreened,
    });
    if (!context.abortController.signal.aborted) return Z.ended;
    return {
      ...Z.ended,
      messages:
        Z.stopped === undefined
          ? [...isNullRenderingAttachment_2(x.messages, context), ...Z.ended.messages]
          : Z.ended.messages,
      endedUnderAbort: true,
    };
  }
  if (Z.proceeds === undefined) {
    endInputPhase("input_hooks");
    return interruptedInputResult(x, context, queuedSettler.origin !== undefined);
  }
  let text = Z.proceeds.text;
  let yt = text === le ? undefined : reframeSubmittedMessage(promptRow, expandedInput, text);
  if (yt !== undefined) {
    yt.promptRewritten = true;
    let pluginPrompt = extractPluginPrompt(yt);
    if (pluginPrompt !== undefined) yt.pluginPrompt = pluginPrompt;
  }
  let Xt = P(text, le);
  if (yt !== undefined || Xt)
    x.screened = {
      rewritten: text,
    };
  else if (B !== undefined)
    x.screened = {
      rewritten: B,
    };
  if (yt === undefined && text !== le)
    logForDebugging(
      "prompt.submit: the chain left another text and no row takes it (a slash command's typed line, or a hidden prompt); it stands as it came",
    );
  if (O) x.noVerdict = true;
  else
    settleScreeningResult({
      result: x,
      screened: x.screened ?? {},
      isUnknown: h(),
      recording: userPromptRecording,
      onScreened,
    });
  if (Xt) x.messages.push(...slashLineChangedNotice(messages ?? context.messages));
  let rs = await capAdditionalContext(Z.proceeds.context ?? [], "prompt.submit", context.storageV5);
  if (rs.length > 0) x.messages.push(createHookContextAttachment(rs, "prompt.submit"));
  if (yt !== undefined && Kt === undefined && textNotTyped !== true)
    x.messages = await recollectMentionAttachments({
      messages: x.messages,
      prompt: yt,
      rewritten: text,
      input,
      preExpansionInput,
      readTriggers,
      context,
      history: messages,
      querySource,
    });
  recordPhase("prompt_submit_hooks_ms", performance.now() - startTime, startTime);
  if (Z.proceeds.sessionTitle)
    await applyHookSessionTitle(
      context.session.id,
      Z.proceeds.sessionTitle,
      context.storageV5,
      context.credentials,
    );
  endInputPhase("input_hooks");
  queryCheckpoint("query_hooks_end");
  if (H)
    await collectInputAttachments({
      result: x,
      context,
      history: messages,
      querySource,
    });
  await appendWorkflowAuthoringMessages(x, messages, context.options.tools);
  return x;
}
//@ chunk-xx1vmpsq.js:47765-47885 placement = isNullRenderingAttachment (1)
function isNullRenderingAttachment(msg) {
  return (
    msg.type === "attachment" &&
    !MENTION_ATTACHMENT_TYPES_2.has(msg.attachment.type) &&
    !MENTION_ATTACHMENT_TYPES.has(msg.attachment.type) &&
    !isPromptSubmitHookAttachment(msg.attachment)
  );
}
//@ chunk-xx1vmpsq.js:47885-47988 placement
function isPromptSubmitHookAttachment(attachment) {
  return (
    "hookEvent" in attachment &&
    attachment.hookEvent === "UserPromptSubmit" &&
    attachment.type !== "async_hook_response"
  );
}
//@ chunk-xx1vmpsq.js:47988-48102 placement = isNullRenderingAttachment (0.815)
function isNullRenderingAttachment_2(messages, { readFileState }) {
  for (let n of messages) if (n.type === "attachment") forgetReadState(n.attachment, readFileState);
  return messages.filter(isNullRenderingAttachment);
}
//@ chunk-xx1vmpsq.js:48102-48204 placement
function forgetReadState(attachment, s) {
  if (attachment.type === "file") s.delete(attachment.filename);
  if (attachment.type === "nested_memory") s.delete(attachment.path);
}
//@ chunk-xx1vmpsq.js:48204-48392 placement
async function appendWorkflowAuthoringMessages(e, messages, tools) {
  if (!e.shouldQuery) return;
  try {
    let { getWorkflowAuthoringAutoloadMessages } = require("./chunk-70r0mv35.js");
    e.messages.push(...(await getWorkflowAuthoringAutoloadMessages(e.messages, messages, tools)));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-xx1vmpsq.js:48392-48496 placement
function frameContent(message, s, n) {
  let y = {
    ...message,
    message: {
      ...message.message,
      content: cloneContent(n),
    },
  };
  wrapNonUserMessage(y, s);
  return y.message.content;
}
//@ chunk-xx1vmpsq.js:48496-49116 placement
/**
 * 重新包装提交的消息（插件来源加框，保留非文本块）。
 */
function reframeSubmittedMessage(promptRow, expandedInput, n) {
  if (promptRow === undefined || promptRow.message.isMeta) return;
  let { message, unframed } = promptRow;
  let { origin } = message;
  let T = origin !== undefined && frameContent(message, origin, " ") !== " " ? origin : undefined;
  if (typeof unframed === "string") {
    message.message.content = T === undefined ? replacePromptText(unframed, n) : frameContent(message, T, n);
    return message;
  }
  let filtered = unframed.filter(
    (E, A) =>
      E.type === "text" &&
      (typeof expandedInput === "string"
        ? A > 0 || expandedInput.trim() === ""
        : expandedInput[A]?.type !== "text"),
  );
  let filtered_2 = unframed.filter((E) => !filtered.includes(E));
  if (
    !filtered_2.some((E) => E.type === "text") &&
    (filtered_2.length === 0 || hasToolResultBlock(filtered_2))
  )
    return;
  if (T !== undefined) {
    message.message.content = frameContent(message, T, [
      {
        type: "text",
        text: n,
      },
      ...filtered,
      ...filtered_2.filter((E) => E.type !== "text"),
    ]);
    return message;
  }
  let R = replacePromptText(filtered_2, n);
  message.message.content = filtered.length === 0 ? R : [...(typeof R === "string" ? [] : R), ...filtered];
  return message;
}
//@ chunk-xx1vmpsq.js:49116-49244 placement
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
//@ chunk-xx1vmpsq.js:49244-49423 placement
function slashLineAfterRewrite(e, s) {
  if (s === undefined || s.argsRanWith === s.args) return;
  return s.args !== "" && e.endsWith(s.args)
    ? e.slice(0, e.length - s.args.length) + s.argsRanWith
    : `/${s.name} ${s.argsRanWith}`;
}
//@ chunk-xx1vmpsq.js:49423-49712 placement
function slashLineChangedNotice(e) {
  let s = `prompt.submit: ${promptSubmitHookLabel()} changed a slash command's typed line. That change is never applied: its arguments are changed at command.run, a skill body at skill.prompt.`;
  return e.some((y) => y.type === "system" && y.subtype === "informational" && y.content === s)
    ? []
    : [createSystemMessage(s, "warning")];
}
//@ chunk-xx1vmpsq.js:49712-49920 placement
function promptSubmitHookLabel() {
  let pluginRenderHooks = findPluginRenderHooks("prompt.submit");
  let filtered = pluginRenderHooks.filter((pluginRenderHook) => pluginRenderHook.tier !== "builtin");
  let n = new Set((filtered.length > 0 ? filtered : pluginRenderHooks).map((y) => sourceLabel(y.plugin)));
  return n.size > 0 ? `a mod hooked on prompt.submit (${[...n].join(", ")})` : "a hook";
}
//@ chunk-xx1vmpsq.js:49920-50307 placement
/**
 * MENTION_ATTACHMENT_TYPES：提及类附件类型。
 */
var MENTION_ATTACHMENT_TYPES_2 = new Set([
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
var MENTION_ATTACHMENT_TYPES = new Set([
  "ultrathink_effort",
  "workflow_keyword_request",
  "unknown_command_fallback",
  "selected_lines_in_ide",
  "selected_lines_in_diff",
  "opened_file_in_ide",
  "inlined_image_paths",
  "thread_state",
]);
//@ chunk-xx1vmpsq.js:50307-50643 placement
async function collectInputAttachments({ result: e, context, history, querySource }) {
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
  let index = e.messages.findIndex((message) => message.type === "user" && message.turnCompanion !== true);
  e.messages.splice(index === -1 ? 1 : index + 1, 0, ...array);
}
//@ chunk-xx1vmpsq.js:50643-50972 placement
/**
 * 去掉提及类附件，返回保留的消息与是否有 peer 提及。
 */
function dropMentionAttachments(e, readFileState) {
  let n = [];
  let peerMinted = false;
  for (let r of e) {
    if (
      r.type === "attachment" &&
      r.attachment.type === "hook_additional_context" &&
      r.attachment.hookName === "prompt.mention"
    )
      continue;
    if (r.type !== "attachment" || !MENTION_ATTACHMENT_TYPES_2.has(r.attachment.type)) {
      n.push(r);
      continue;
    }
    forgetReadState(r.attachment, readFileState);
    peerMinted ||= r.attachment.type === "peer_mention";
  }
  return {
    kept: n,
    peerMinted,
  };
}
//@ chunk-xx1vmpsq.js:50972-51483 placement
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
  let M = overlappingMentions(rewritten, getContentText(input) || "");
  let R = preExpansionInput === undefined ? undefined : overlappingMentions(rewritten, preExpansionInput);
  let E = [...readTriggers, ...(context.consumedNestedMemoryTriggers ?? [])];
  let { kept, peerMinted } = dropMentionAttachments(messages, context.readFileState);
  context.nestedMemoryAttachmentTriggers?.push(...E);
  let array = await toArray_2(
    getAttachmentMessages(
      M,
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
        preExpansionInput: peerMinted ? R : undefined,
      },
    ),
  );
  kept.splice(kept.indexOf(prompt) + 1, 0, ...array);
  return kept;
}
//@ chunk-xx1vmpsq.js:51483-59588 fingerprint = processUserInputBase (0.493)
/**
 * processUserInputBase：处理一次用户输入：图片、粘贴、! bash 模式、/ 斜杠命令、普通提示，产出要加入会话的消息与 shouldQuery。
 */
async function processUserInputBase_2(
  e,
  mode,
  context,
  y,
  pastedContents,
  ideSelection,
  messages,
  uuid,
  isAlreadyProcessing,
  querySource,
  canUseTool,
  permissionMode,
  skipSlashCommands,
  bridgeOrigin,
  modelScheduledOrigin,
  isMeta,
  re,
  preExpansionInput,
  suppressWorkflowKeyword,
  origin,
  shouldQuery,
  inlinedImagePaths,
  ze,
  verifiedSlackHumanTurn,
  localStdinOrigin,
  submittedBySessionChannelPerson,
  composerEnter,
  stampThreadState,
  wakeupSource,
  hostInitiator,
  artifactCommentTurn,
  de = false,
  gt = false,
  ownFilePaths,
  hold,
  userPromptLine,
  Yt,
  inboundOrigin,
  markOutputAsPasted = false,
  sentForDirectory,
  toolsUsed,
) {
  let Ze = randomUUID();
  if (!hasToolResultBlock(e)) {
    setPromptId(Ze);
    if (y !== undefined) maybeWarmApiAuth(context.credentials, context.storageV5);
  }
  if (
    mode === "prompt" &&
    typeof e === "string" &&
    e !== "" &&
    e.trim() === "" &&
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
  let se = [];
  let he = [];
  let imagePasteIds = [];
  let lt = {};
  let limits = imageLimitsForModel(context.options.mainLoopModel);
  let L = e;
  if (typeof e === "string") inputString = e;
  else if (e.length > 0) {
    queryCheckpoint("query_image_processing_start");
    let B = [];
    let H = !inlinedImagePaths?.length && isImageStoreAvailable();
    let any = e.some((h) => h.type === "image");
    if (any) startInputPhase("input_images");
    if (H && any) advancePasteId(await getMaxStoredImageId());
    for (let block of e) {
      if (block.type !== "image") {
        B.push(block);
        continue;
      }
      let P = await checkImageBlockSource(block, limits);
      B.push(P.block);
      if (P.block.type !== "image") continue;
      if (!H) {
        let metadataText = createImageMetadataText(P.dimensions ?? {});
        if (metadataText) he.push(metadataText);
        continue;
      }
      let D = mintPasteId(getContentText(e) ?? undefined, pastedContents);
      imagePasteIds.push(D);
      if (block.source.type === "base64")
        lt[D] = {
          id: D,
          type: "image",
          content: block.source.data,
          dimensions: P.dimensions,
        };
    }
    L = B;
    endInputPhase("input_images");
    queryCheckpoint("query_image_processing_end");
    inputString = lastTextBlockText(B);
    se = inputString === null ? B : B.slice(0, -1);
  }
  if (inputString === null && mode !== "prompt") throw Error(`Mode: ${mode} requires a string input.`);
  let pe = pastedContents ? Object.values(pastedContents).filter(isNonEmptyImageAttachment) : [];
  if (pe.length > 0 || Object.keys(lt).length > 0) startInputPhase("input_images");
  let Ie = await storePastedImages(
    {
      ...pastedContents,
      ...lt,
    },
    setSliceField(context.setAppState, "storedImagePaths"),
  );
  let values = Object.values(lt);
  for (let { id, dimensions } of values) {
    let imageMetadataText = createImageMetadataText(dimensions ?? {}, Ie.get(id));
    if (imageMetadataText) he.push(imageMetadataText);
  }
  if (values.length > 0) {
    let B = count(values, (img) => !Ie.has(img.id));
    if (B === 0)
      logFeatureOk("input_image_block", {
        images: values.length,
      });
    else
      logFeatureSad("input_image_block", "store_failed", {
        unstored: B,
      });
  }
  queryCheckpoint("query_pasted_image_processing_start");
  let imageProcessingResults = await Promise.all(
    pe.map(async (pastedImage) => {
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
        sourcePath: pastedImage.sourcePath ?? Ie.get(pastedImage.id),
      };
    }),
  );
  let imageContentBlocks = [];
  for (let { id, resized, originalDimensions, sourcePath } of imageProcessingResults) {
    imageContentBlocks.push(resized.block);
    if (resized.block.type !== "image") continue;
    imagePasteIds.push(id);
    if (resized.dimensions) {
      let metadataText = createImageMetadataText(resized.dimensions, sourcePath);
      if (metadataText) he.push(metadataText);
    } else if (originalDimensions) {
      let metadataText = createImageMetadataText(originalDimensions, sourcePath);
      if (metadataText) he.push(metadataText);
    } else if (sourcePath) he.push(`${IMAGE_SOURCE_MARKER_PREFIX}${sourcePath}]`);
  }
  endInputPhase("input_images");
  queryCheckpoint("query_pasted_image_processing_end");
  let Ee = mode === "prompt";
  let Ne = skipSlashCommands || de;
  let qt = context;
  let Se = inputString;
  let bridgeRewrite;
  if (bridgeOrigin && !de && inputString !== null && inputString.startsWith("/")) {
    startInputPhase("input_command");
    let { resolveBridgeSlashOverride } = await import("./chunk-thdvqv4s.js");
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
      Ne = parsed.effectiveSkipSlash;
      Se = parsed.effectiveInput;
      bridgeRewrite = parsed.bridgeRewrite;
      qt = {
        ...parsed.effectiveContext,
        dispatchedOverBridge: true,
      };
    }
  }
  if (
    verifiedSlackHumanTurn === true &&
    !bridgeOrigin &&
    !Ne &&
    inputString !== null &&
    inputString.startsWith("/")
  ) {
    startInputPhase("input_command");
    let { resolveRelaySlashRefusal } = await import("./chunk-thdvqv4s.js");
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
  let zt;
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
    zt = async (cmd, commandName, args) => {
      let { relayDispatchRefusal } = await import("./chunk-thdvqv4s.js");
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
  if (modelScheduledOrigin && !bridgeOrigin && !de && inputString !== null && inputString.startsWith("/")) {
    let slashCommand = parseSlashCommand(inputString);
    let H = slashCommand ? findCommand(slashCommand.commandName, context.options.commands) : undefined;
    let args = slashCommand?.args ?? "";
    if (!H && slashCommand && !slashCommand.isMcp && args.trim()) {
      let h = args.trimStart();
      let P = h.search(/\s/);
      let D = P === -1 ? h : h.slice(0, P);
      let command = findCommand(`${slashCommand.commandName}:${D}`, context.options.commands);
      if (command) {
        H = command;
        args = P === -1 ? "" : h.slice(P + 1).trimStart();
      }
    }
    if (H) {
      let h = isSkillOff(H) ? undefined : matchSubcommand(H, args);
      let P = h ? findCommand(h.targetName, context.options.commands) : undefined;
      let D = h && P && isCommandEnabled(P) ? P : H;
      if (
        checkSkillPermission(D, {
          commandName: D.name,
          userTypedThisTurn: false,
          isMainSession: true,
          permissionContext: getToolPermissionContext(context),
        }) === null
      )
        Ne = false;
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
    !Ne &&
    !inputString.startsWith("/") &&
    !context.options.ultraplanSessionUrl &&
    !context.getAppState().ultraplanLaunching &&
    ze !== true &&
    !isMeta &&
    isHumanOrigin(origin) &&
    flushPromptHistory(preExpansionInput ?? inputString, pastedContents)
  ) {
    logEvent("tengu_ultraplan_keyword", {});
    let rewritten = findKeywordTriggerPositions(inputString).trim();
    let { processSlashCommand } = await import("./chunk-jghdfw5c.js");
    let { ROW_COMMIT } = await import("./chunk-7qydycm2.js");
    let h = await processSlashCommand(
      `/ultraplan ${rewritten}`,
      se,
      imageContentBlocks,
      [],
      {
        ...context,
        rowCommit: ROW_COMMIT,
        dispatchedByKeyword: true,
        submissionVerifiedSlackHumanTurn: verifiedSlackHumanTurn,
        submittedOnLocalStdin: localStdinOrigin,
        userPromptHold: hold,
        userPromptLine,
      },
      uuid,
      isAlreadyProcessing,
      canUseTool,
      y,
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
      zt,
    );
    return addImageMetadataMessage(h, he);
  }
  if (inputString !== null && mode === "bash") {
    startInputPhase("input_command");
    let { processBashCommand } = await import("./chunk-w235911v.js");
    let H = await processBashCommand(inputString, se, context, {
      markOutputAsPasted,
      sentForDirectory,
    });
    endInputPhase("input_command");
    return addImageMetadataMessage(H, he);
  }
  let We = re !== "all" && (Ne || !inputString?.startsWith("/"));
  let Me = re === undefined;
  let et = Ee && !isMeta && shouldQuery !== false;
  let xe = et && isHumanOrigin(origin) && !de;
  queryCheckpoint("query_attachment_loading_start");
  if (We && Me) startInputPhase("input_attachments");
  let attachmentMessages =
    We && Me
      ? await toArray_2(
          getAttachmentMessages(
            de ? null : inputString,
            context,
            ideSelection ?? null,
            [],
            {
              now: () => new Date().toISOString(),
              uuid: () => randomUUID(),
            },
            messages,
            querySource,
            {
              isRegularUserPrompt: et,
              isHumanTypedPrompt: xe,
              ownFilePaths: de ? ownFilePaths : undefined,
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
  let xt =
    inlinedImagePaths && inlinedImagePaths.length > 0
      ? createAttachmentMessage({
          type: "inlined_image_paths",
          paths: inlinedImagePaths,
        })
      : null;
  let Tt = stampThreadState ? getProjectsThreadState() : undefined;
  let Ut = Tt
    ? createAttachmentMessage({
        type: "thread_state",
        ...Tt,
      })
    : null;
  queryCheckpoint("query_attachment_loading_end");
  if (Se !== null && !Ne && Se.startsWith("/")) {
    startInputPhase("input_command");
    let { processSlashCommand } = await import("./chunk-jghdfw5c.js");
    let { ROW_COMMIT } = await import("./chunk-7qydycm2.js");
    let oe = modelScheduledOrigin
      ? (P) =>
          checkSkillPermission(P, {
            commandName: P.name,
            userTypedThisTurn: false,
            isMainSession: context.agentId === undefined,
            permissionContext: getToolPermissionContext(context),
          }) !== null
      : undefined;
    let h = await processSlashCommand(
      Se,
      se,
      imageContentBlocks,
      attachmentMessages,
      {
        ...qt,
        rowCommit: ROW_COMMIT,
        submissionVerifiedSlackHumanTurn: verifiedSlackHumanTurn,
        submittedOnLocalStdin: localStdinOrigin,
        submittedBySessionChannelPerson,
        submittedFromComposer: composerEnter,
        userPromptHold: hold,
        userPromptLine,
      },
      uuid,
      isAlreadyProcessing,
      canUseTool,
      y,
      modelScheduledOrigin,
      oe,
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
      Yt,
      inboundOrigin,
      zt,
    );
    endInputPhase("input_command");
    if (
      mode === "prompt" &&
      !isMeta &&
      shouldQuery !== false &&
      isHumanOrigin(origin) &&
      !modelScheduledOrigin &&
      h.shouldQuery &&
      !context.abortController.signal.aborted
    ) {
      notifyAutoReactHumanTurn({
        ownWords: verifiedSlackHumanTurn !== true,
      });
      resetGoalIdleCheckinCount(context.setAppState, context.session.sessionScratch);
      resetUnansweredSafetyCheckCount();
    }
    if (h.extractPromptAttachments && !We && re === undefined) {
      startInputPhase("input_attachments");
      let array = await toArray_2(
        getAttachmentMessages(
          Se,
          context,
          ideSelection?.source === "diff" ? null : (ideSelection ?? null),
          [],
          {
            now: () => new Date().toISOString(),
            uuid: () => randomUUID(),
          },
          messages,
          querySource,
          {
            isRegularUserPrompt: et,
            isHumanTypedPrompt: xe,
            preExpansionInput,
            pastedContents,
            suppressWorkflowKeyword,
          },
        ),
      );
      endInputPhase("input_attachments");
      h.messages.splice(1, 0, ...array);
    }
    if (h.extractPromptAttachments && !We && re === "mentions") h.ambientAttachmentsOwed = true;
    if (xt) h.messages.push(xt);
    if (Ut) h.messages.push(Ut);
    return addImageMetadataMessage(h, he);
  }
  if (xt) attachmentMessages.push(xt);
  if (Ut) attachmentMessages.push(Ut);
  if (inputString !== null && mode === "prompt") {
    let trimmedInput = inputString.trim();
    let agentMention = attachmentMessages.find((oe) => oe.attachment.type === "agent_mention");
    if (agentMention) {
      let agentMentionString = `@agent-${agentMention.attachment.agentType}`;
      let h = trimmedInput === agentMentionString;
      let isPrefix = trimmedInput.startsWith(agentMentionString) && !h;
      logEvent("tengu_subagent_at_mention", {
        is_subagent_only: h,
        is_prefix: isPrefix,
      });
    }
  }
  if (et && isHumanOrigin(origin) && !gt && !context.abortController.signal.aborted) {
    notifyAutoReactHumanTurn({
      ownWords: verifiedSlackHumanTurn !== true && !de,
    });
    resetGoalIdleCheckinCount(context.setAppState, context.session.sessionScratch);
    resetUnansweredSafetyCheckCount();
  }
  let x;
  let ke;
  if (et && !de && isHumanOrUnset(origin)) {
    let B =
      typeof L === "string"
        ? L
        : extractTextContent_2(
            L,
            `
`,
          );
    if (xe && Me && verifiedSlackHumanTurn !== true && ze !== true) {
      let linkedSetupGuide = await fetchLinkedSetupGuide(
        B,
        context.credentials,
        context.abortController.signal,
      );
      if (linkedSetupGuide) {
        let oe = isVirtualPancakeEnabled()
          ? wrapUserTurnContent(linkedSetupGuide)
          : `

${linkedSetupGuide}`;
        if (typeof L === "string") ke = `${L}${oe}`;
        else {
          let last = L.findLast((P) => P.type === "text");
          ke = L.map((P) =>
            P === last && P.type === "text"
              ? {
                  ...P,
                  text: `${P.text}${oe}`,
                }
              : P,
          );
        }
        x = loadedSetupGuideNotice();
      }
    }
    notifySetupGuidePasted(B, context.credentials, context.storageV5, context.appendSystemMessage);
  }
  let we =
    xe &&
    hasUltrathinkKeyword({
      composerEnter,
      preExpansion: preExpansionInput,
      localStdinOrigin,
      input: e,
    }) &&
    shouldUltrathinkRaiseEffort(context.options.mainLoopModel, getEffortValue(context))
      ? "xhigh"
      : undefined;
  if (we) logFeatureOk("ultrathink_boost");
  let Pe = addImageMetadataMessage(
    {
      ...processTextPrompt(
        ke ?? L,
        imageContentBlocks,
        imagePasteIds,
        attachmentMessages,
        Ze,
        uuid,
        permissionMode,
        isMeta,
        getEffortLevelIfSupported(
          context.options.mainLoopModel,
          getEffortValue(context),
          we ?? getEffortLayerOverride(context.permissionLayers),
        ),
        y,
        origin,
        wakeupSource,
        hostInitiator,
        artifactCommentTurn,
        hold,
        inboundOrigin,
        toolsUsed,
        messages,
      ),
      ...(we && {
        effort: we,
      }),
      ...(We &&
        !Me && {
          ambientAttachmentsOwed: true,
        }),
    },
    he,
  );
  if (ke) Pe.expandedInput = ke;
  if (x) Pe.messages.push(x);
  if (Ne) markSkipSlashCommands(Pe.messages);
  return Pe;
}
//@ chunk-xx1vmpsq.js:59588-59665 layout
function markSkipSlashCommands(messages) {
  for (let s of messages) if (s.type === "user") s.queueSkipSlashCommands = true;
}
//@ chunk-xx1vmpsq.js:59665-60550 layout
function createClassifierTurnHooks({ querySource, context }) {
  if (promptUtilsModule) {
    let n = () =>
      isActingAsBgJob() && querySource?.startsWith("repl_main_thread") === true && !context.agentId;
    return {
      markTurnActive: (userText) => {
        try {
          if (n()) {
            let r = classifierJobState(context);
            promptUtilsModule().markTurnActive(r, getOwnJobShortId(), {
              userText,
              isTurnStart: true,
            });
            r.kicked = false;
          }
        } catch (error) {
          if (isAbortError(error)) return;
          logError(error);
        }
      },
      settleTurnEnd: async (y) => {
        try {
          if (!n()) return;
          let r = promptUtilsModule();
          let w = classifierJobState(context);
          let ownJobShortId = getOwnJobShortId();
          if (y) {
            let C = attachmentsModule();
            let I = C.detectSurfaces(false);
            let M = C.engineFor(C.sinksFor(I));
            if (M) {
              let latestRealUserAsk = r.findLatestRealUserAsk([...context.messages, ...y]);
              if (latestRealUserAsk) r.captureLatestAsk(w, latestRealUserAsk);
              let mainThreadAgentType = getMainThreadAgentType();
              let A = mainThreadAgentType
                ? context.options.agentDefinitions.activeAgents.find(
                    (activeAgent) => activeAgent.agentType === mainThreadAgentType,
                  )
                : undefined;
              let v = r
                .classifyAndPush(
                  w,
                  ownJobShortId,
                  A,
                  "",
                  y.filter((U) => U.type === "assistant"),
                  hasActiveAgentTasks(context.taskRegistry.all()),
                  M,
                  I,
                  false,
                  false,
                )
                .catch((error) => {
                  logForDebugging(`[classifier] error: ${errorMessage(error)}`, {
                    level: "error",
                  });
                });
              if (isBgSession()) await withTimeout(v, 60000, "classifier write timed out").catch(() => {});
              return;
            }
          }
          r.markTurnAborted(w, ownJobShortId);
        } catch (error) {
          if (isAbortError(error)) return;
          logError(error);
        }
      },
    };
  }
  return;
}
//@ chunk-xx1vmpsq.js:60550-60683 callgraph-fingerprint = addImageMetadataMessage (0.573)
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
//@ chunk-3g0djq3w.js:44243-45446 fingerprint = processUserInput (0.41)
async function processUserInput_2(e, commandArgs, o) {
  let u = [];
  let prompt = commandArgs ? `/${e.name} ${commandArgs}` : `/${e.name}`;
  let T = snapshotHookRegistration();
  try {
    for await (let hookResult of executeUserPromptExpansionHooks(
      e.source === "mcp" ? "mcp_prompt" : "slash_command",
      e.name,
      commandArgs,
      e.source,
      prompt,
      getToolPermissionContext(o).mode,
      o,
    )) {
      if (hookResult.message?.type === "progress") continue;
      if (hookResult.blockingError) {
        let h = `UserPromptExpansion operation blocked by hook:
${hookResult.blockingError.blockingError}`;
        let R =
          hookResult.suppressOriginalPrompt === true ||
          hasHookRegistrationChanged(T) ||
          hasPromptSubmitHooks({
            isRunReached: false,
          })
            ? h
            : `${h}

Original prompt: ${prompt}`;
        return {
          blocked: {
            messages: [createSystemMessage(R, "warning", undefined, true)],
            shouldQuery: false,
            resultText: R,
            command: e,
            screened: {
              dropped: true,
            },
          },
        };
      }
      if (hookResult.preventContinuation) {
        let h = hookResult.stopReason
          ? `${HOOK_STOPPED_MESSAGE}: ${hookResult.stopReason}`
          : HOOK_STOPPED_MESSAGE;
        return {
          blocked: {
            messages: [
              createUserMessage({
                content: h,
                isMeta: true,
              }),
              createSystemMessage(h, "warning", undefined, true),
            ],
            shouldQuery: false,
            resultText: h,
            command: e,
          },
        };
      }
      if (hookResult.additionalContexts?.length)
        u.push(
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
        u.push(hookResult.message);
    }
  } catch (error) {
    if (!(error instanceof StreamClosedAbortError)) throw error;
    logForDebugging("UserPromptExpansion hooks cancelled (control stream closed)");
  }
  return {
    hookMessages: u,
  };
}
//@ chunk-jv307fw4.js:22476-22613 fingerprint = applyTruncation (0.586)
function applyTruncation(e, n, r) {
  let trimmed = e.trim();
  let list = Array.from(trimmed);
  return list.length <= n
    ? trimmed
    : `${list.slice(0, n).join("")}
[${r} truncated after ${n} characters]`;
}
export { processUserInput, isNullRenderingAttachment_2, isNullRenderingAttachment, processUserInput_2 };
