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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
} from "crypto";
import { describeSettingsProblem } from "../settings/settingsProblems.js";
import { Lr, maybeWarmApiAuth } from "../../services/api/apiAuthWarm.js";
import { isPersonalConfigRestricted } from "../personalConfigRestriction.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import {
  NHr,
  HHr,
  createQueuedSettler,
  screensChanged,
  R0i,
  submitPromptWithHooks,
  runUserPromptSubmitHooks,
  sUt,
  hasThirdPartyPromptHooks,
  createHookContextAttachment,
  b7e,
} from "./userPromptSubmitHooks.js";
import { createAttachmentMessage_2 as createAttachmentMessage, logForDebugging } from "../debug.js";
import { gq, Rfn } from "../attachments/atMentions.js";
import { PBe } from "../sessionAddresses.js";
import { mGt, gGt, queryCheckpoint } from "../queryProfiler.js";
import { HostScoped } from "../hostScoped.js";
import {
  snapshotHookRegistration,
  hasHookRegistrationChanged,
  hasPromptSubmitHooks,
} from "../plugins/functionHooks/hookRegistration.js";
import { Yjt } from "../../plugins/functionHooks/commandRunDispatch.js";
import { runPromptSubmitHooks, awaitPromptEntry } from "./promptEntryWaiters.js";
import {
  extractTextContent_2,
  getContentText,
  lastUserPromptIndex,
  nextTurnPosition,
  kCe,
  createSystemMessage,
  createUserMessage,
  HOOK_STOPPED_MESSAGE,
} from "../messages.js";
import { ANi } from "../../plugins/functionHooks/promptSubmit.js";
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
import { settleScreening, us, ws, interruptedInputResult, settleScreeningResult } from "./promptScreening.js";
import { isHumanOrigin, isHumanTurn } from "../turnOrigin.js";
import { notePersonPrompt, setPromptId, getMainThreadAgentType } from "../../bootstrap/state.js";
import { markCronWakeupMessages } from "../cronFireTexts.js";
import { setCommandDenyRules } from "../attachments/skillMentions.js";
import {
  wrapPluginPrompt,
  extractPluginPrompt,
  wrapNonUserMessage,
  CW,
} from "../messages/nonUserMessages.js";
import { EKt, aO } from "../historyFile.js";
import { capAdditionalContext } from "../../services/tools/toolHooks.js";
import { Br } from "../startupTiming.js";
import { applyHookSessionTitle } from "../sessionTitle.js";
import { cloneContent, parseSlashCommand, matchSubcommand } from "../slashCommandParsing.js";
import { replacePromptText } from "../attachments/diagnostics.js";
import { findPluginRenderHooks } from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { toArray_2 } from "../generators.js";
import { getAttachmentMessages } from "../attachments.js";
import { imageLimitsForModel } from "../attachmentMedia.js";
import { sDs, getMaxStoredImageId, storePastedImages } from "../imageStore.js";
import { HXn, ZR, flushPromptHistory } from "../../history.js";
import {
  checkImageBlockSource,
  createImageMetadataText,
  maybeResizeAndDownsampleImageBlock,
} from "../imageResizer.js";
import { isNonEmptyImageAttachment } from "../messages/messagePredicates.js";
import { BH } from "../../state/sliceHelpers.js";
import { count } from "../collections.js";
import { logEvent } from "../../services/analytics/index.js";
import { c4t } from "../imageErrors.js";
import { findCommand, isSkillOff, isCommandEnabled } from "../../commands.js";
import { checkSkillPermission } from "../../tools/SkillTool/skillPermissions.js";
import { isUltraplanEnabled } from "../../commands/ultraplan.js";
import { findKeywordTriggerPositions } from "../ultraplan/keyword.js";
import { getProjectsThreadState } from "../projectsThreadState.js";
import { rwt } from "../../tools/BashTool/bashPermissionFlags.js";
import { Cqs, Rqs, xBr } from "../commandPredicates.js";
import { isVirtualPancakeEnabled } from "../permissions/permissionSetup.js";
import { cbe } from "../userTurnTags.js";
import { shouldUltrathinkRaiseEffort, getEffortLevelIfSupported } from "../effort.js";
import { processTextPrompt } from "./processTextPrompt.js";
import { isActingAsBgJob, isBgSession } from "../concurrentSessions.js";
import { getOwnJobShortId } from "../../services/daemon/jobState.js";
import { isAbortError, errorMessage, StreamClosedAbortError } from "../errors.js";
import { hasActiveAgentTasks } from "../../tasks/taskStatus.js";
import { withTimeout } from "../sleep.js";

/**
 * 按个人设置加载检查结果处理输入：stop 时停止查询并给出说明，notice 时附加一次系统消息。
 */
//@ chunk-xx1vmpsq.js:34727-35466 placement
function applyPersonalSettingsCheck(e, s) {
  let n = describeSettingsProblem(),
    of = Lr.of(s);
  if (n.kind === "clear" && isPersonalConfigRestricted() && !of.countedClear)
    ((of.countedClear = !0), logFeatureOk("hooks_personal_load_check"));
  if (n.kind === "stop" && !of.countedStop)
    ((of.countedStop = !0), logFeatureBad("hooks_personal_load_check", "stopped"));
  if (n.kind === "notice" && !of.countedNotice)
    ((of.countedNotice = !0), logFeatureSad("hooks_personal_load_check", "notice"));
  if (n.kind === "stop")
    return (
      (e.messages = [
        ...e.messages,
        NHr(n.text),
        HHr(n.text, { kind: "no_verdict", noVerdictKind: "personal_config_refused" }),
      ]),
      (e.shouldQuery = !1),
      (e.resultText = n.text),
      (e.allowedTools = void 0),
      !0
    );
  if (n.kind === "notice" && !of.noticed)
    ((of.noticed = !0),
      (e.messages = [
        ...e.messages,
        createAttachmentMessage({
          type: "hook_system_message",
          content: n.text,
          hookName: "Claude Code",
          toolUseID: `personal-hooks-${s.id}`,
          hookEvent: "UserPromptSubmit",
        }),
      ]));
  return !1;
}
//@ chunk-xx1vmpsq.js:35466-35488 placement
var regExp = new RegExp(gq);
//@ chunk-xx1vmpsq.js:35488-35553 placement
function hn(e, s, n) {
  return ((e.lastIndex = n), e.test(s) ? e.lastIndex : -1);
}
/**
 * 提取文本中的 @ 提及（支持引号路径与带空格的路径段落）。
 */
//@ chunk-xx1vmpsq.js:35553-36101 placement
function extractAtMentions(e) {
  let s = [],
    n = /\s/g,
    regExp_2 = new RegExp(String.raw`[ \t]*\[${PBe}\]`, "y"),
    r = 0,
    w = -1,
    T = -1,
    C = [],
    I = 0;
  for (let index = e.indexOf("@"); index !== -1; index = e.indexOf("@", Math.max(index + 1, r))) {
    if (index > 0 && !regExp.test(e[index - 1])) continue;
    let R = index + 1,
      E = -1;
    if (e[R] === '"') {
      let index = e.indexOf('"', R + 1);
      if (index > R + 1) E = index + 1;
    }
    if (E === -1) {
      if (R >= w) {
        ((n.lastIndex = R), (w = n.test(e) ? n.lastIndex - 1 : e.length), (T = -1), (C = []), (I = 0));
        for (let v = R + 1; v <= w; v++)
          if (Rfn(e, v - 1) !== Rfn(e, v)) {
            if (((T = v), hn(regExp_2, e, v) !== -1)) C.push(v);
          }
      }
      while ((C[I] ?? 1 / 0) <= R) I++;
      if (((E = C[I] ?? T), E <= R)) continue;
    }
    let A = hn(regExp_2, e, E);
    ((r = A === -1 ? E : A), s.push(e.slice(index, r)));
  }
  return s;
}
//@ chunk-xx1vmpsq.js:36101-36184 placement
function Us(e, s) {
  let n = new Set(extractAtMentions(s));
  return extractAtMentions(e)
    .filter((y) => n.has(y))
    .join(" ");
}
//@ chunk-xx1vmpsq.js:37461-37557 placement
var kn = "Blank prompt \u2014 the message was only whitespace, so nothing was sent to the model.";
//@ chunk-xx1vmpsq.js:37557-37600 placement
function Rt(e) {
  mGt("process_user_input", e);
}
//@ chunk-xx1vmpsq.js:37600-37643 placement
function ft(e) {
  gGt("process_user_input", e);
}
//@ chunk-xx1vmpsq.js:37643-37723 placement
var ks = () => require("./chunk-wd9kxbpn.js"),
  jr = () => require("./chunk-e321p3vc.js");
//@ chunk-xx1vmpsq.js:37723-37745 placement
class Mn {
  state = void 0;
}
//@ chunk-xx1vmpsq.js:37745-37770 placement
var Wr = new HostScoped(() => new Mn());
//@ chunk-xx1vmpsq.js:37770-37897 placement
function classifierJobState(e) {
  let of = Wr.of(e.session.host);
  if (of.state === void 0) of.state = ks?.().createClassifierJobState(e) ?? null;
  return of.state;
}
/**
 * 处理用户输入（斜杠命令、bash、提示词、附件），返回要追加的消息与是否发起查询；记录 process_user_input 计时。
 */
//@ chunk-xx1vmpsq.js:37897-38300 placement
async function processUserInput(e) {
  let { input: input } = e,
    n = !1,
    y = snapshotHookRegistration(),
    r = e.uuid === void 0 ? void 0 : Yjt.get(e.uuid)?.reading,
    w = r === void 0 ? y : { ...r, wasUnknown: r.wasUnknown || y.wasUnknown },
    T = await runPromptSubmitHooks(
      typeof input === "string"
        ? input
        : extractTextContent_2(
            input,
            `
`,
          ),
      (C) => (
        (n = C === void 0),
        processUserInputBase(
          C === void 0 ? { ...e, readAtDispatch: w } : { ...e, readAtDispatch: w, userPromptRecording: C },
        )
      ),
      { prompt: e.interactionPrompt, reading: w },
    );
  if (T.noVerdict && n) T.wasUnscreenedAtDispatch = !0;
  return T;
}
//@ chunk-xx1vmpsq.js:38300-47765 placement
async function processUserInputBase({
  input: input,
  preExpansionInput: preExpansionInput,
  suppressWorkflowKeyword: suppressWorkflowKeyword,
  mode: mode,
  context: context,
  pastedContents: pastedContents,
  ideSelection: ideSelection,
  messages: messages,
  setUserInputOnProcessing: setUserInputOnProcessing,
  onQueryCommitted: onQueryCommitted,
  uuid: uuid,
  isAlreadyProcessing: isAlreadyProcessing,
  querySource: querySource,
  canUseTool: canUseTool,
  skipSlashCommands: skipSlashCommands,
  bridgeOrigin: bridgeOrigin,
  clientBashCommand: clientBashCommand,
  clientBashCommandCwd: clientBashCommandCwd,
  localStdinOrigin: localStdinOrigin,
  sessionChannelPersonTyped: sessionChannelPersonTyped,
  ownWordUuids: ownWordUuids,
  composerEnter: composerEnter,
  hostInitiator: hostInitiator,
  inboundOrigin: inboundOrigin,
  toolsUsed: toolsUsed,
  modelScheduledOrigin: modelScheduledOrigin,
  wakeupSource: wakeupSource,
  artifactCommentTurn: artifactCommentTurn,
  foreignWord: foreignWord,
  scheduledTaskId: scheduledTaskId,
  scheduledFireId: scheduledFireId,
  isMeta: isMeta,
  skipAttachments: skipAttachments,
  skipSubmissionHooks: skipSubmissionHooks,
  aheadOfSessionStart: aheadOfSessionStart,
  pollEventDelivery: pollEventDelivery,
  pollEventProvenance: pollEventProvenance,
  pollEventDeclared: pollEventDeclared,
  skipSkillPermissionReset: skipSkillPermissionReset,
  shouldQuery: shouldQuery,
  queryHeldForNextTurn: queryHeldForNextTurn,
  promptSource: promptSource,
  origin: origin,
  verifiedSlackHumanTurn: verifiedSlackHumanTurn,
  textNotTyped: textNotTyped,
  ownFilePaths: ownFilePaths,
  noPersonArrived: noPersonArrived,
  inlinedImagePaths: inlinedImagePaths,
  stampThreadState: stampThreadState,
  promptSubmitted: promptSubmitted,
  onScreened: onScreened,
  wait: wait = !1,
  entries: entries,
  userPromptRecording: userPromptRecording,
  readAtDispatch: readAtDispatch,
}) {
  using Ne = createQueuedSettler(ANi(uuid));
  (notePromptOrigin({
    uuid: uuid,
    origin: origin,
    isHidden: isMeta === !0,
    isStopped: context.abortController.signal.aborted,
    isRelayed: verifiedSlackHumanTurn === !0,
    foreignWord: foreignWord,
    ownWordUuids: ownWordUuids,
    input: input,
  }),
    restartElapsedTimeClock(context, {
      origin: origin,
      value: input,
      isPollDelivery: skipSkillPermissionReset === !0,
    }));
  let qt = typeof input === "string" ? input : null;
  if (mode === "prompt" && qt !== null && !isMeta) setUserInputOnProcessing?.(qt, origin);
  queryCheckpoint("query_process_user_input_base_start");
  let Se =
      shouldQuery === !1 && isMeta && queryHeldForNextTurn !== !0
        ? void 0
        : resolvePromptSource({
            isNonInteractive: context.options.isNonInteractiveSession,
            isMeta: isMeta,
            callerSource: promptSource ?? (isHumanOrUnset(origin) ? void 0 : "system"),
          }),
    Kt = skipAttachments ?? (origin?.kind === "plugin" ? "all" : void 0),
    zt = [...(context.nestedMemoryAttachmentTriggers ?? [])];
  context.consumedNestedMemoryTriggers = [];
  let je = getContentText(input) || "",
    We,
    Me = !1,
    et = !1,
    xe = !1,
    pt = readAtDispatch,
    xt = async ({ submission: submission, result: X, enter: enter, queued: queued }, ht) => {
      if (X.shouldQuery && shouldQuery !== !1) onQueryCommitted?.();
      pt = snapshotHookRegistration();
      let ot = promptSubmitted === void 0 ? void 0 : readPromptScreens(context);
      if (
        promptSubmitted === void 0 ||
        ot === void 0 ||
        (submission.command !== void 0 &&
          submission.text !== je &&
          (promptSubmitted.stopped === void 0 || screensChanged(promptSubmitted.under, ot))) ||
        R0i(promptSubmitted.under, ot)
      )
        return submitPromptWithHooks({
          submission: submission,
          origin: origin,
          bridgeOrigin: bridgeOrigin,
          mode: mode,
          shouldWait: wait,
          context: context,
          result: X,
          promptSource: ht,
          wakeupSource: wakeupSource,
          queued: queued,
          isStartInput: aheadOfSessionStart === !0 || isGoalIdleCheckinPaused(uuid),
          enter: enter,
          bound: () => {
            pt = snapshotHookRegistration();
          },
        });
      if (screensChanged(promptSubmitted.under, ot)) {
        let Ue = await runUserPromptSubmitHooks({
            text: submission.command === void 0 ? promptSubmitted.text : submission.text,
            typed: submission.text,
            context: context,
            result: X,
            promptSource: ht,
            wakeupSource: wakeupSource,
            tiers: MANAGED_HOOKS_TIER,
          }),
          qe =
            Ue.blocked !== void 0
              ? Ue
              : await runUserPromptSubmitHooks({
                  text: promptSubmitted.text,
                  typed: submission.text,
                  context: context,
                  result: X,
                  promptSource: ht,
                  wakeupSource: wakeupSource,
                  tiers: { managedHooksExcluded: !0 },
                }),
          $t = Ue.wasCancelled === !0 || qe.wasCancelled === !0;
        return qe.blocked !== void 0 && !($t && qe.stopped !== void 0)
          ? { ended: qe.blocked, stopped: qe.stopped }
          : $t
            ? sUt
            : {
                proceeds: {
                  text: promptSubmitted.text,
                  context: promptSubmitted.context,
                  sessionTitle: qe.sessionTitle ?? Ue.sessionTitle,
                },
              };
      }
      if ((X.messages.push(...promptSubmitted.messages), promptSubmitted.stopped !== void 0))
        return (
          (X.shouldQuery = !1),
          (X.resultText = promptSubmitted.stopped),
          { ended: X, stopped: promptSubmitted.stopped }
        );
      return {
        proceeds: {
          text: promptSubmitted.text,
          context: promptSubmitted.context,
          sessionTitle: promptSubmitted.sessionTitle,
        },
      };
    },
    withResolvers = Promise.withResolvers(),
    Ut =
      (shouldQuery === !1 && queryHeldForNextTurn !== !0) || skipSubmissionHooks === !0 || Se === void 0
        ? void 0
        : async (j) => {
            let X = { messages: [], shouldQuery: !0 };
            if (describeSettingsProblem().kind === "stop") return { ran: j, rows: X, outcome: void 0 };
            let ce = await xt(
              {
                submission: {
                  text: slashLineAfterRewrite(je, j) ?? je,
                  input: input,
                  pastedContents: pastedContents,
                  command: { name: j.name, args: j.argsRanWith },
                  ...(isMeta === !0 && { isMeta: !0 }),
                },
                result: X,
                enter:
                  entries &&
                  (() =>
                    withResolvers.promise.then(({ messages: messages }) =>
                      awaitPromptEntry(entries, messages),
                    )),
                queued: {
                  ...Ne,
                  settleWhen: (me) =>
                    Ne.settleWhen(
                      Promise.all([me, withResolvers.promise]).then(([ht, { queries: ot }]) =>
                        ot ? ht : Promise.reject(Error("no query")),
                      ),
                    ),
                },
              },
              Se,
            ).catch((me) => (logError(me), { error: me }));
            return "error" in ce
              ? { ran: j, rows: X, outcome: void 0, threw: ce }
              : { ran: j, rows: X, outcome: ce };
          },
    x = await processUserInputBase_2(
      input,
      mode,
      context,
      Se,
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
      promptSubmitted !== void 0,
      verifiedSlackHumanTurn,
      localStdinOrigin,
      sessionChannelPersonTyped,
      composerEnter,
      stampThreadState,
      wakeupSource,
      hostInitiator,
      artifactCommentTurn,
      textNotTyped === !0,
      noPersonArrived === !0,
      ownFilePaths,
      userPromptRecording?.hold,
      {
        forked: () => {
          Me = settleScreening({
            recording: userPromptRecording,
            onScreened: onScreened,
            screened: us({}, We),
            isRunReached: xe,
            since: readAtDispatch,
          });
        },
        ranAs: (j) => {
          ((xe = !0), (We = slashLineAfterRewrite(je, j)));
        },
        withheld: () => {
          et = !0;
        },
        isUnknownSinceDispatch: () => hasHookRegistrationChanged(readAtDispatch),
        isHeldForOrganization: () => ws({ since: readAtDispatch, isRunReached: xe }),
        passed: () => {
          if (hasHookRegistrationChanged(readAtDispatch)) {
            et = !0;
            return;
          }
          ((Me = !0), userPromptRecording?.settled(us({}, We)), onScreened?.(us({}, We)));
        },
      },
      Ut,
      inboundOrigin,
      clientBashCommand === !0,
      clientBashCommandCwd,
      toolsUsed,
    ).catch((j) => {
      throw (withResolvers.resolve({ messages: [], queries: !1 }), j);
    });
  withResolvers.resolve({ messages: x.messages, queries: x.shouldQuery });
  let { promptRow: promptRow, ranCommand: ranCommand, lineCheck: lineCheck } = x;
  if ((delete x.promptRow, delete x.ranCommand, delete x.lineCheck, lineCheck?.threw !== void 0))
    throw lineCheck.threw.error;
  let B = slashLineAfterRewrite(je, ranCommand),
    H = x.ambientAttachmentsOwed === !0;
  if ((delete x.ambientAttachmentsOwed, isHumanOrigin(origin) && !isMeta && verifiedSlackHumanTurn !== !0)) {
    let last = x.messages.findLast((X) => X.type === "user" && !X.isMeta && isHumanTurn(X));
    if (last) notePersonPrompt(last.uuid, last.timestamp, context.options.messageClientPlatform);
  }
  if ((markCronWakeupMessages(x.messages, wakeupSource), scheduledTaskId !== void 0)) {
    let filtered = x.messages.filter((message) => message.type === "user"),
      X = filtered.find((ce) => ce.promptSource !== void 0) ?? filtered[0];
    if (X) {
      if (((X.scheduledTaskId = scheduledTaskId), scheduledFireId !== void 0))
        X.scheduledFireId = scheduledFireId;
    }
  }
  try {
    let X =
        Se !== void 0 && x.shouldQuery && (shouldQuery !== !1 || queryHeldForNextTurn === !0)
          ? lastUserPromptIndex(x.messages)
          : -1,
      ce = X === -1 ? void 0 : x.messages[X];
    if (ce?.type === "user" && ce.turnOrigin === void 0) {
      ce.turnOrigin = classifyPromptSource({
        origin: origin,
        isMeta: isMeta,
        wakeupSource: wakeupSource,
        promptSource: Se,
        hostInitiator: hostInitiator,
      });
      let me = shouldQuery === !1 ? void 0 : nextTurnPosition(messages ?? context.messages, ce.turnOrigin);
      if (me !== void 0) ce.turnPosition = me;
    }
  } catch (error) {
    logError(error);
  }
  if (
    (queryCheckpoint("query_process_user_input_base_end"), pollEventDelivery === !0 && x.messages.length > 0)
  )
    x.messages.push(
      createAttachmentMessage({
        type: "poll_events",
        deliveredVia: "value_dispatch",
        envelopes: [],
        kinds: [],
        remainingWakeCount: 0,
        ...(pollEventProvenance !== void 0 && { provenance: pollEventProvenance }),
        ...(pollEventDeclared !== void 0 && { declared: pollEventDeclared }),
      }),
    );
  if (!isAlreadyProcessing && skipSkillPermissionReset !== !0)
    setCommandDenyRules(context.setToolPermissionContext, x.disallowedTools ?? []);
  let oe = queryHeldForNextTurn === !0 && x.shouldQuery;
  if (shouldQuery === !1) x.shouldQuery = !1;
  if ((x.shouldQuery || oe) && applyPersonalSettingsCheck(x, context.session)) {
    if (
      !Me &&
      (et ||
        !settleScreening({
          recording: userPromptRecording,
          onScreened: onScreened,
          screened: us({}, We),
          isRunReached: xe,
          since: readAtDispatch,
        }))
    )
      x.noVerdict = !0;
    return x;
  }
  let h = () =>
      hasHookRegistrationChanged(pt) ||
      ((ranCommand !== void 0 || xe) && hasHookRegistrationChanged(readAtDispatch)),
    P = (j, X) =>
      ranCommand !== void 0 &&
      isMeta !== !0 &&
      promptRow?.message.isMeta !== !0 &&
      j !== X &&
      !(
        origin?.kind === "plugin" &&
        origin.asUser !== !0 &&
        j === wrapPluginPrompt(X, origin.name, { midTurn: !1 })
      );
  if (
    (!x.shouldQuery && !oe) ||
    mode === "bash" ||
    x.forkDispatched ||
    x.queriesAfterRun === !0 ||
    skipSubmissionHooks === !0 ||
    Se === void 0
  ) {
    if (B !== void 0 && x.screened?.dropped !== !0) x.screened = { rewritten: B };
    let j = x.screened?.dropped === !0,
      X = ws({ since: readAtDispatch, isRunReached: xe });
    if (!Me && X && x.ownPassCutShort && !j) return interruptedInputResult(x, context, Ne.origin !== void 0);
    let me = et ? void 0 : lineCheck?.outcome?.proceeds,
      ht = us(x.screened ?? {}, We);
    if (!Me && me !== void 0) {
      let Ue = !j && P(me.text, B ?? je);
      settleScreeningResult({
        result: x,
        screened: Ue ? { rewritten: me.text } : ht,
        isUnknown: h(),
        recording: userPromptRecording,
        onScreened: onScreened,
      });
    } else if (
      !Me &&
      ((et && !j) ||
        !settleScreening({
          recording: userPromptRecording,
          onScreened: onScreened,
          screened: ht,
          isRunReached: xe,
          since: readAtDispatch,
        }))
    )
      x.noVerdict = !0;
    if (X && j && context.abortController.signal.aborted) x.endedUnderAbort = !0;
    if (x.noVerdict && x.engineDeferredSlash !== void 0) userPromptRecording?.handedOn();
    if (H)
      await collectInputAttachments({
        result: x,
        context: context,
        history: messages,
        querySource: querySource,
      });
    return (await appendWorkflowAuthoringMessages(x, messages, context.options.tools), x);
  }
  let D = x.screened?.dropped === !0;
  if (D) delete x.screened;
  let O = D && ws({ since: readAtDispatch, isRunReached: xe });
  (queryCheckpoint("query_hooks_start"), Rt("input_hooks"));
  let G = x.expandedInput ?? input,
    le = B ?? (getContentText(G) || ""),
    Ce = isMeta === !0 || promptRow?.message.isMeta === !0,
    Ae = promptRow === void 0 && ranCommand === void 0,
    startTime = performance.now(),
    Z;
  if (lineCheck?.outcome !== void 0) {
    if (((Z = lineCheck.outcome), Z.ended !== void 0 && Z.stopped !== void 0))
      Z = { ...Z, ended: { ...x, ...Z.ended, messages: [...x.messages, ...Z.ended.messages] } };
    else if (Z.proceeds !== void 0) x.messages.push(...lineCheck.rows.messages);
  } else
    Z = await xt(
      {
        submission: {
          text: le,
          input: G,
          pastedContents: pastedContents,
          ...(ranCommand !== void 0 && { command: { name: ranCommand.name, args: ranCommand.argsRanWith } }),
          ...(Ce && { isMeta: !0 }),
          ...(Ae && {
            unplaceable: `Prompt not sent: ${promptSubmitHookLabel()} changed it, and Claude Code has no place to put the change.`,
          }),
        },
        result: x,
        enter: entries === void 0 ? void 0 : () => awaitPromptEntry(entries, x.messages),
        queued: Ne,
      },
      Se,
    );
  if (Z.ended !== void 0) {
    ft("input_hooks");
    let j = Z.stopped === void 0 ? void 0 : (Z.text ?? promptSubmitted?.text),
      X = EKt(
        le,
        j !== void 0 && origin?.kind === "plugin" && origin.asUser !== !0
          ? wrapPluginPrompt(j, origin.name, { midTurn: !1 })
          : j,
      ),
      ce = X === void 0 ? void 0 : reframeSubmittedMessage(promptRow, G, X);
    if (ce !== void 0) {
      ce.promptRewritten = !0;
      let me = extractPluginPrompt(ce);
      if (me !== void 0) ce.pluginPrompt = me;
    }
    if (hasThirdPartyPromptHooks()) {
      let me = dropMentionAttachments(
        Z.stopped === void 0 ? x.messages : Z.ended.messages,
        context.readFileState,
      );
      if (Z.stopped !== void 0) Z.ended.messages = me.kept;
    }
    if (Z.stopped !== void 0 && ranCommand !== void 0 && !Ce && j !== void 0 && j !== le)
      Z.ended.messages.push(...slashLineChangedNotice(messages ?? context.messages));
    if (
      ((Z.ended.screened =
        Z.stopped === void 0
          ? { dropped: !0 }
          : { rewritten: ce !== void 0 || ranCommand !== void 0 ? (X ?? B) : void 0 }),
      settleScreeningResult({
        result: Z.ended,
        screened: Z.ended.screened,
        isUnknown: h(),
        recording: userPromptRecording,
        onScreened: onScreened,
      }),
      !context.abortController.signal.aborted)
    )
      return Z.ended;
    return {
      ...Z.ended,
      messages:
        Z.stopped === void 0
          ? [...isNullRenderingAttachment_2(x.messages, context), ...Z.ended.messages]
          : Z.ended.messages,
      endedUnderAbort: !0,
    };
  }
  if (Z.proceeds === void 0)
    return (ft("input_hooks"), interruptedInputResult(x, context, Ne.origin !== void 0));
  let text = Z.proceeds.text,
    yt = text === le ? void 0 : reframeSubmittedMessage(promptRow, G, text);
  if (yt !== void 0) {
    yt.promptRewritten = !0;
    let j = extractPluginPrompt(yt);
    if (j !== void 0) yt.pluginPrompt = j;
  }
  let Xt = P(text, le);
  if (yt !== void 0 || Xt) x.screened = { rewritten: text };
  else if (B !== void 0) x.screened = { rewritten: B };
  if (yt === void 0 && text !== le)
    logForDebugging(
      "prompt.submit: the chain left another text and no row takes it (a slash command's typed line, or a hidden prompt); it stands as it came",
    );
  if (O) x.noVerdict = !0;
  else
    settleScreeningResult({
      result: x,
      screened: x.screened ?? {},
      isUnknown: h(),
      recording: userPromptRecording,
      onScreened: onScreened,
    });
  if (Xt) x.messages.push(...slashLineChangedNotice(messages ?? context.messages));
  let rs = await capAdditionalContext(Z.proceeds.context ?? [], "prompt.submit", context.storageV5);
  if (rs.length > 0) x.messages.push(createHookContextAttachment(rs, "prompt.submit"));
  if (yt !== void 0 && Kt === void 0 && textNotTyped !== !0)
    x.messages = await recollectMentionAttachments({
      messages: x.messages,
      prompt: yt,
      rewritten: text,
      input: input,
      preExpansionInput: preExpansionInput,
      readTriggers: zt,
      context: context,
      history: messages,
      querySource: querySource,
    });
  if ((Br("prompt_submit_hooks_ms", performance.now() - startTime, startTime), Z.proceeds.sessionTitle))
    await applyHookSessionTitle(
      context.session.id,
      Z.proceeds.sessionTitle,
      context.storageV5,
      context.credentials,
    );
  if ((ft("input_hooks"), queryCheckpoint("query_hooks_end"), H))
    await collectInputAttachments({
      result: x,
      context: context,
      history: messages,
      querySource: querySource,
    });
  return (await appendWorkflowAuthoringMessages(x, messages, context.options.tools), x);
}
//@ chunk-xx1vmpsq.js:47765-47885 placement = isNullRenderingAttachment (1)
function isNullRenderingAttachment(msg) {
  return (
    msg.type === "attachment" &&
    !MENTION_ATTACHMENT_TYPES.has(msg.attachment.type) &&
    !$r.has(msg.attachment.type) &&
    !isPromptSubmitHookAttachment(msg.attachment)
  );
}
//@ chunk-xx1vmpsq.js:47885-47988 placement
function isPromptSubmitHookAttachment(e) {
  return "hookEvent" in e && e.hookEvent === "UserPromptSubmit" && e.type !== "async_hook_response";
}
//@ chunk-xx1vmpsq.js:47988-48102 placement = isNullRenderingAttachment (0.815)
function isNullRenderingAttachment_2(e, { readFileState: readFileState }) {
  for (let n of e) if (n.type === "attachment") forgetReadState(n.attachment, readFileState);
  return e.filter(isNullRenderingAttachment);
}
//@ chunk-xx1vmpsq.js:48102-48204 placement
function forgetReadState(e, s) {
  if (e.type === "file") s.delete(e.filename);
  if (e.type === "nested_memory") s.delete(e.path);
}
//@ chunk-xx1vmpsq.js:48204-48392 placement
async function appendWorkflowAuthoringMessages(e, s, n) {
  if (!e.shouldQuery) return;
  try {
    let {
      getWorkflowAuthoringAutoloadMessages: getWorkflowAuthoringAutoloadMessages,
    } = require("./chunk-70r0mv35.js");
    e.messages.push(...(await getWorkflowAuthoringAutoloadMessages(e.messages, s, n)));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-xx1vmpsq.js:48392-48496 placement
function frameContent(e, s, n) {
  let y = { ...e, message: { ...e.message, content: cloneContent(n) } };
  return (wrapNonUserMessage(y, s), y.message.content);
}
/**
 * 重新包装提交的消息（插件来源加框，保留非文本块）。
 */
//@ chunk-xx1vmpsq.js:48496-49116 placement
function reframeSubmittedMessage(e, s, n) {
  if (e === void 0 || e.message.isMeta) return;
  let { message: message, unframed: unframed } = e,
    { origin: origin } = message,
    T = origin !== void 0 && frameContent(message, origin, " ") !== " " ? origin : void 0;
  if (typeof unframed === "string")
    return (
      (message.message.content = T === void 0 ? replacePromptText(unframed, n) : frameContent(message, T, n)),
      message
    );
  let filtered = unframed.filter(
      (E, A) =>
        E.type === "text" && (typeof s === "string" ? A > 0 || s.trim() === "" : s[A]?.type !== "text"),
    ),
    filtered_2 = unframed.filter((E) => !filtered.includes(E));
  if (!filtered_2.some((E) => E.type === "text") && (filtered_2.length === 0 || kCe(filtered_2))) return;
  if (T !== void 0)
    return (
      (message.message.content = frameContent(message, T, [
        { type: "text", text: n },
        ...filtered,
        ...filtered_2.filter((E) => E.type !== "text"),
      ])),
      message
    );
  let R = replacePromptText(filtered_2, n);
  return (
    (message.message.content =
      filtered.length === 0 ? R : [...(typeof R === "string" ? [] : R), ...filtered]),
    message
  );
}
//@ chunk-xx1vmpsq.js:49116-49244 placement
function readPromptScreens(e) {
  try {
    return b7e(e);
  } catch (error) {
    logForDebugging(`the drain could not read what screens a prompt now: ${error}`, { level: "error" });
    return;
  }
}
//@ chunk-xx1vmpsq.js:49244-49423 placement
function slashLineAfterRewrite(e, s) {
  if (s === void 0 || s.argsRanWith === s.args) return;
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
  let e = findPluginRenderHooks("prompt.submit"),
    filtered = e.filter((y) => y.tier !== "builtin"),
    n = new Set((filtered.length > 0 ? filtered : e).map((y) => CW(y.plugin)));
  return n.size > 0 ? `a mod hooked on prompt.submit (${[...n].join(", ")})` : "a hook";
}
//@ chunk-xx1vmpsq.js:49920-50307 placement
var MENTION_ATTACHMENT_TYPES = new Set([
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
  ]),
  $r = new Set([
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
async function collectInputAttachments({
  result: e,
  context: context,
  history: history,
  querySource: querySource,
}) {
  Rt("input_attachments");
  let r = await toArray_2(
    getAttachmentMessages(
      null,
      context,
      null,
      [],
      { now: () => new Date().toISOString(), uuid: () => randomUUID_3() },
      history,
      querySource,
      { deliveredTurnStart: !0 },
    ),
  );
  ft("input_attachments");
  let index = e.messages.findIndex((message) => message.type === "user" && message.turnCompanion !== !0);
  e.messages.splice(index === -1 ? 1 : index + 1, 0, ...r);
}
/**
 * 去掉提及类附件，返回保留的消息与是否有 peer 提及。
 */
//@ chunk-xx1vmpsq.js:50643-50972 placement
function dropMentionAttachments(e, s) {
  let n = [],
    y = !1;
  for (let r of e) {
    if (
      r.type === "attachment" &&
      r.attachment.type === "hook_additional_context" &&
      r.attachment.hookName === "prompt.mention"
    )
      continue;
    if (r.type !== "attachment" || !MENTION_ATTACHMENT_TYPES.has(r.attachment.type)) {
      n.push(r);
      continue;
    }
    (forgetReadState(r.attachment, s), (y ||= r.attachment.type === "peer_mention"));
  }
  return { kept: n, peerMinted: y };
}
/**
 * 提示被改写后重新收集提及附件并插在提示之后。
 */
//@ chunk-xx1vmpsq.js:50972-51483 placement
async function recollectMentionAttachments({
  messages: messages,
  prompt: prompt,
  rewritten: rewritten,
  input: input,
  preExpansionInput: preExpansionInput,
  readTriggers: readTriggers,
  context: context,
  history: history,
  querySource: querySource,
}) {
  let M = Us(rewritten, getContentText(input) || ""),
    R = preExpansionInput === void 0 ? void 0 : Us(rewritten, preExpansionInput),
    E = [...readTriggers, ...(context.consumedNestedMemoryTriggers ?? [])],
    { kept: kept, peerMinted: peerMinted } = dropMentionAttachments(messages, context.readFileState);
  context.nestedMemoryAttachmentTriggers?.push(...E);
  let U = await toArray_2(
    getAttachmentMessages(
      M,
      context,
      null,
      [],
      { now: () => new Date().toISOString(), uuid: randomUUID_3 },
      history,
      querySource,
      { inputMentionsOnly: !0, isHumanTypedPrompt: peerMinted, preExpansionInput: peerMinted ? R : void 0 },
    ),
  );
  return (kept.splice(kept.indexOf(prompt) + 1, 0, ...U), kept);
}
/**
 * processUserInputBase：处理一次用户输入：图片、粘贴、! bash 模式、/ 斜杠命令、普通提示，产出要加入会话的消息与 shouldQuery。
 */
//@ chunk-xx1vmpsq.js:51483-59588 fingerprint = processUserInputBase (0.493)
async function processUserInputBase_2(
  e,
  s,
  n,
  y,
  r,
  w,
  T,
  C,
  I,
  M,
  R,
  E,
  A,
  v,
  U,
  Q,
  re,
  z,
  fe,
  ee,
  Y,
  ue,
  ze,
  _e,
  Ve,
  nt,
  Qe,
  It,
  at,
  St,
  jt,
  de = !1,
  gt = !1,
  Be,
  dt,
  Re,
  Yt,
  Ye,
  kt = !1,
  Je,
  ut,
) {
  let Ze = randomUUID_3();
  if (!kCe(e)) {
    if ((setPromptId(Ze), y !== void 0)) maybeWarmApiAuth(n.credentials, n.storageV5);
  }
  if (
    s === "prompt" &&
    typeof e === "string" &&
    e !== "" &&
    e.trim() === "" &&
    n.options.isNonInteractiveSession &&
    !Q &&
    Y !== !1
  )
    return (
      logFeatureOk("prompt_submit_empty"),
      { messages: [createSystemMessage(kn, "warning")], shouldQuery: !1, resultText: kn }
    );
  let inputString = null,
    se = [],
    he = [],
    Wt = [],
    lt = {},
    Jt = imageLimitsForModel(n.options.mainLoopModel),
    L = e;
  if (typeof e === "string") inputString = e;
  else if (e.length > 0) {
    queryCheckpoint("query_image_processing_start");
    let B = [],
      H = !ue?.length && sDs(),
      any = e.some((h) => h.type === "image");
    if (any) Rt("input_images");
    if (H && any) HXn(await getMaxStoredImageId());
    for (let block of e) {
      if (block.type !== "image") {
        B.push(block);
        continue;
      }
      let P = await checkImageBlockSource(block, Jt);
      if ((B.push(P.block), P.block.type !== "image")) continue;
      if (!H) {
        let metadataText = createImageMetadataText(P.dimensions ?? {});
        if (metadataText) he.push(metadataText);
        continue;
      }
      let D = ZR(getContentText(e) ?? void 0, r);
      if ((Wt.push(D), block.source.type === "base64"))
        lt[D] = { id: D, type: "image", content: block.source.data, dimensions: P.dimensions };
    }
    ((L = B),
      ft("input_images"),
      queryCheckpoint("query_image_processing_end"),
      (inputString = aO(B)),
      (se = inputString === null ? B : B.slice(0, -1)));
  }
  if (inputString === null && s !== "prompt") throw Error(`Mode: ${s} requires a string input.`);
  let pe = r ? Object.values(r).filter(isNonEmptyImageAttachment) : [];
  if (pe.length > 0 || Object.keys(lt).length > 0) Rt("input_images");
  let Ie = await storePastedImages({ ...r, ...lt }, BH(n.setAppState, "storedImagePaths")),
    values = Object.values(lt);
  for (let { id: id, dimensions: dimensions } of values) {
    let oe = createImageMetadataText(dimensions ?? {}, Ie.get(id));
    if (oe) he.push(oe);
  }
  if (values.length > 0) {
    let B = count(values, (img) => !Ie.has(img.id));
    if (B === 0) logFeatureOk("input_image_block", { images: values.length });
    else logFeatureSad("input_image_block", "store_failed", { unstored: B });
  }
  queryCheckpoint("query_pasted_image_processing_start");
  let imageProcessingResults = await Promise.all(
      pe.map(async (pastedImage) => {
        logEvent("tengu_pasted_image_resize_attempt", { original_size_bytes: pastedImage.content.length });
        let resized = await maybeResizeAndDownsampleImageBlock({
          data: pastedImage.content,
          mediaType: pastedImage.mediaType,
          limits: Jt,
        });
        return (
          resized.block.type,
          {
            id: pastedImage.id,
            resized: resized,
            originalDimensions: pastedImage.dimensions,
            sourcePath: pastedImage.sourcePath ?? Ie.get(pastedImage.id),
          }
        );
      }),
    ),
    be = [];
  for (let {
    id: id,
    resized: resized,
    originalDimensions: originalDimensions,
    sourcePath: sourcePath,
  } of imageProcessingResults) {
    if ((be.push(resized.block), resized.block.type !== "image")) continue;
    if ((Wt.push(id), resized.dimensions)) {
      let metadataText = createImageMetadataText(resized.dimensions, sourcePath);
      if (metadataText) he.push(metadataText);
    } else if (originalDimensions) {
      let metadataText = createImageMetadataText(originalDimensions, sourcePath);
      if (metadataText) he.push(metadataText);
    } else if (sourcePath) he.push(`${c4t}${sourcePath}]`);
  }
  (ft("input_images"), queryCheckpoint("query_pasted_image_processing_end"));
  let Ee = s === "prompt",
    Ne = A || de,
    qt = n,
    Se = inputString,
    Kt;
  if (v && !de && inputString !== null && inputString.startsWith("/")) {
    Rt("input_command");
    let { resolveBridgeSlashOverride: resolveBridgeSlashOverride } = await import("./chunk-thdvqv4s.js"),
      parsed = resolveBridgeSlashOverride({
        inputString: inputString,
        context: n,
        uuid: C,
        origin: ee,
        verifiedSlackHumanTurn: _e,
      });
    if ((ft("input_command"), parsed.kind === "blocked")) return parsed.result;
    if (parsed.kind === "updated")
      ((Ne = parsed.effectiveSkipSlash),
        (Se = parsed.effectiveInput),
        (Kt = parsed.bridgeRewrite),
        (qt = { ...parsed.effectiveContext, dispatchedOverBridge: !0 }));
  }
  if (_e === !0 && !v && !Ne && inputString !== null && inputString.startsWith("/")) {
    Rt("input_command");
    let { resolveRelaySlashRefusal: resolveRelaySlashRefusal } = await import("./chunk-thdvqv4s.js"),
      H = resolveRelaySlashRefusal({
        inputString: inputString,
        context: n,
        uuid: C,
        origin: ee,
        inboundOrigin: Ye,
      });
    if ((ft("input_command"), H.kind === "blocked")) return H.result;
  }
  let zt;
  if ((_e === !0 || v === !0 || ee?.kind === "task-notification") && inputString !== null) {
    let B = {
        origin: ee,
        relayAuthored: _e === !0,
        inboundOrigin: Ye,
        bridgeCarried: v === !0,
        bridgeRewrite: Kt,
      },
      H = inputString;
    zt = async (oe, h, P) => {
      let { relayDispatchRefusal: relayDispatchRefusal } = await import("./chunk-thdvqv4s.js");
      return relayDispatchRefusal({ cmd: oe, commandName: h, args: P, inputString: H, uuid: C, author: B });
    };
  }
  if (U && !v && !de && inputString !== null && inputString.startsWith("/")) {
    let B = parseSlashCommand(inputString),
      H = B ? findCommand(B.commandName, n.options.commands) : void 0,
      oe = B?.args ?? "";
    if (!H && B && !B.isMcp && oe.trim()) {
      let trimStart = oe.trimStart(),
        search = trimStart.search(/\s/),
        D = search === -1 ? trimStart : trimStart.slice(0, search),
        O = findCommand(`${B.commandName}:${D}`, n.options.commands);
      if (O) ((H = O), (oe = search === -1 ? "" : trimStart.slice(search + 1).trimStart()));
    }
    if (H) {
      let h = isSkillOff(H) ? void 0 : matchSubcommand(H, oe),
        P = h ? findCommand(h.targetName, n.options.commands) : void 0,
        D = h && P && isCommandEnabled(P) ? P : H;
      if (
        checkSkillPermission(D, {
          commandName: D.name,
          userTypedThisTurn: !1,
          isMainSession: !0,
          permissionContext: getToolPermissionContext(n),
        }) === null
      )
        Ne = !1;
    }
  }
  let je = createClassifierTurnHooks({ querySource: M, context: n });
  if (
    isUltraplanEnabled() &&
    s === "prompt" &&
    !n.options.isNonInteractiveSession &&
    inputString !== null &&
    !Ne &&
    !inputString.startsWith("/") &&
    !n.options.ultraplanSessionUrl &&
    !n.getAppState().ultraplanLaunching &&
    ze !== !0 &&
    !Q &&
    isHumanOrigin(ee) &&
    flushPromptHistory(z ?? inputString, r)
  ) {
    logEvent("tengu_ultraplan_keyword", {});
    let rewritten = findKeywordTriggerPositions(inputString).trim(),
      { processSlashCommand: processSlashCommand } = await import("./chunk-jghdfw5c.js"),
      { ROW_COMMIT: ROW_COMMIT } = await import("./chunk-7qydycm2.js"),
      h = await processSlashCommand(
        `/ultraplan ${rewritten}`,
        se,
        be,
        [],
        {
          ...n,
          rowCommit: ROW_COMMIT,
          dispatchedByKeyword: !0,
          submissionVerifiedSlackHumanTurn: _e,
          submittedOnLocalStdin: Ve,
          userPromptHold: dt,
          userPromptLine: Re,
        },
        C,
        I,
        R,
        y,
        void 0,
        void 0,
        void 0,
        je,
        {
          executeUserPromptSubmitHooks: executeUserPromptSubmitHooks,
          getUserPromptSubmitHookBlockingMessage: getUserPromptSubmitHookBlockingMessage,
          executeStopHooks: executeStopHooks,
          getStopHookMessage: getStopHookMessage,
        },
        ee,
        ue,
        void 0,
        void 0,
        void 0,
        void 0,
        void 0,
        void 0,
        Ye,
        zt,
      );
    return addImageMetadataMessage(h, he);
  }
  if (inputString !== null && s === "bash") {
    Rt("input_command");
    let { processBashCommand: processBashCommand } = await import("./chunk-w235911v.js"),
      H = await processBashCommand(inputString, se, n, { markOutputAsPasted: kt, sentForDirectory: Je });
    return (ft("input_command"), addImageMetadataMessage(H, he));
  }
  let We = re !== "all" && (Ne || !inputString?.startsWith("/")),
    Me = re === void 0,
    et = Ee && !Q && Y !== !1,
    xe = et && isHumanOrigin(ee) && !de;
  if ((queryCheckpoint("query_attachment_loading_start"), We && Me)) Rt("input_attachments");
  let pt =
    We && Me
      ? await toArray_2(
          getAttachmentMessages(
            de ? null : inputString,
            n,
            w ?? null,
            [],
            { now: () => new Date().toISOString(), uuid: () => randomUUID_3() },
            T,
            M,
            {
              isRegularUserPrompt: et,
              isHumanTypedPrompt: xe,
              ownFilePaths: de ? Be : void 0,
              preExpansionInput: z,
              pastedContents: r,
              suppressWorkflowKeyword: fe,
              heldAppend: Y === !1 && !Q && _e !== !0 && (ee === void 0 || ee.kind === "human"),
            },
          ),
        )
      : [];
  ft("input_attachments");
  let xt = ue && ue.length > 0 ? createAttachmentMessage({ type: "inlined_image_paths", paths: ue }) : null,
    Tt = It ? getProjectsThreadState() : void 0,
    Ut = Tt ? createAttachmentMessage({ type: "thread_state", ...Tt }) : null;
  if ((queryCheckpoint("query_attachment_loading_end"), Se !== null && !Ne && Se.startsWith("/"))) {
    Rt("input_command");
    let { processSlashCommand: processSlashCommand } = await import("./chunk-jghdfw5c.js"),
      { ROW_COMMIT: ROW_COMMIT } = await import("./chunk-7qydycm2.js"),
      oe = U
        ? (P) =>
            checkSkillPermission(P, {
              commandName: P.name,
              userTypedThisTurn: !1,
              isMainSession: n.agentId === void 0,
              permissionContext: getToolPermissionContext(n),
            }) !== null
        : void 0,
      h = await processSlashCommand(
        Se,
        se,
        be,
        pt,
        {
          ...qt,
          rowCommit: ROW_COMMIT,
          submissionVerifiedSlackHumanTurn: _e,
          submittedOnLocalStdin: Ve,
          submittedBySessionChannelPerson: nt,
          submittedFromComposer: Qe,
          userPromptHold: dt,
          userPromptLine: Re,
        },
        C,
        I,
        R,
        y,
        U,
        oe,
        U ? void 0 : z,
        je,
        {
          executeUserPromptSubmitHooks: executeUserPromptSubmitHooks,
          getUserPromptSubmitHookBlockingMessage: getUserPromptSubmitHookBlockingMessage,
          executeStopHooks: executeStopHooks,
          getStopHookMessage: getStopHookMessage,
        },
        ee,
        ue,
        w?.source === "diff" ? void 0 : w,
        Q,
        E,
        at,
        St,
        Yt,
        Ye,
        zt,
      );
    if (
      (ft("input_command"),
      s === "prompt" &&
        !Q &&
        Y !== !1 &&
        isHumanOrigin(ee) &&
        !U &&
        h.shouldQuery &&
        !n.abortController.signal.aborted)
    )
      (notifyAutoReactHumanTurn({ ownWords: _e !== !0 }),
        resetGoalIdleCheckinCount(n.setAppState, n.session.sessionScratch),
        rwt());
    if (h.extractPromptAttachments && !We && re === void 0) {
      Rt("input_attachments");
      let P = await toArray_2(
        getAttachmentMessages(
          Se,
          n,
          w?.source === "diff" ? null : (w ?? null),
          [],
          { now: () => new Date().toISOString(), uuid: () => randomUUID_3() },
          T,
          M,
          {
            isRegularUserPrompt: et,
            isHumanTypedPrompt: xe,
            preExpansionInput: z,
            pastedContents: r,
            suppressWorkflowKeyword: fe,
          },
        ),
      );
      (ft("input_attachments"), h.messages.splice(1, 0, ...P));
    }
    if (h.extractPromptAttachments && !We && re === "mentions") h.ambientAttachmentsOwed = !0;
    if (xt) h.messages.push(xt);
    if (Ut) h.messages.push(Ut);
    return addImageMetadataMessage(h, he);
  }
  if (xt) pt.push(xt);
  if (Ut) pt.push(Ut);
  if (inputString !== null && s === "prompt") {
    let trimmedInput = inputString.trim(),
      agentMention = pt.find((oe) => oe.attachment.type === "agent_mention");
    if (agentMention) {
      let agentMentionString = `@agent-${agentMention.attachment.agentType}`,
        h = trimmedInput === agentMentionString,
        P = trimmedInput.startsWith(agentMentionString) && !h;
      logEvent("tengu_subagent_at_mention", { is_subagent_only: h, is_prefix: P });
    }
  }
  if (et && isHumanOrigin(ee) && !gt && !n.abortController.signal.aborted)
    (notifyAutoReactHumanTurn({ ownWords: _e !== !0 && !de }),
      resetGoalIdleCheckinCount(n.setAppState, n.session.sessionScratch),
      rwt());
  let x, ke;
  if (et && !de && isHumanOrUnset(ee)) {
    let B =
      typeof L === "string"
        ? L
        : extractTextContent_2(
            L,
            `
`,
          );
    if (xe && Me && _e !== !0 && ze !== !0) {
      let H = await Cqs(B, n.credentials, n.abortController.signal);
      if (H) {
        let oe = isVirtualPancakeEnabled()
          ? cbe(H)
          : `

${H}`;
        if (typeof L === "string") ke = `${L}${oe}`;
        else {
          let last = L.findLast((P) => P.type === "text");
          ke = L.map((P) => (P === last && P.type === "text" ? { ...P, text: `${P.text}${oe}` } : P));
        }
        x = Rqs();
      }
    }
    xBr(B, n.credentials, n.storageV5, n.appendSystemMessage);
  }
  let we =
    xe &&
    hasUltrathinkKeyword({ composerEnter: Qe, preExpansion: z, localStdinOrigin: Ve, input: e }) &&
    shouldUltrathinkRaiseEffort(n.options.mainLoopModel, getEffortValue(n))
      ? "xhigh"
      : void 0;
  if (we) logFeatureOk("ultrathink_boost");
  let Pe = addImageMetadataMessage(
    {
      ...processTextPrompt(
        ke ?? L,
        be,
        Wt,
        pt,
        Ze,
        C,
        E,
        Q,
        getEffortLevelIfSupported(
          n.options.mainLoopModel,
          getEffortValue(n),
          we ?? getEffortLayerOverride(n.permissionLayers),
        ),
        y,
        ee,
        at,
        St,
        jt,
        dt,
        Ye,
        ut,
        T,
      ),
      ...(we && { effort: we }),
      ...(We && !Me && { ambientAttachmentsOwed: !0 }),
    },
    he,
  );
  if (ke) Pe.expandedInput = ke;
  if (x) Pe.messages.push(x);
  if (Ne) markSkipSlashCommands(Pe.messages);
  return Pe;
}
//@ chunk-xx1vmpsq.js:59588-59665 layout
function markSkipSlashCommands(e) {
  for (let s of e) if (s.type === "user") s.queueSkipSlashCommands = !0;
}
//@ chunk-xx1vmpsq.js:59665-60550 layout
function createClassifierTurnHooks({ querySource: querySource, context: context }) {
  if (ks) {
    let n = () => isActingAsBgJob() && querySource?.startsWith("repl_main_thread") === !0 && !context.agentId;
    return {
      markTurnActive: (y) => {
        try {
          if (n()) {
            let r = classifierJobState(context);
            (ks().markTurnActive(r, getOwnJobShortId(), { userText: y, isTurnStart: !0 }), (r.kicked = !1));
          }
        } catch (error) {
          if (isAbortError(error)) return;
          logError(error);
        }
      },
      settleTurnEnd: async (y) => {
        try {
          if (!n()) return;
          let r = ks(),
            w = classifierJobState(context),
            T = getOwnJobShortId();
          if (y) {
            let C = jr(),
              detectSurfaces = C.detectSurfaces(!1),
              engineFor = C.engineFor(C.sinksFor(detectSurfaces));
            if (engineFor) {
              let latestRealUserAsk = r.findLatestRealUserAsk([...context.messages, ...y]);
              if (latestRealUserAsk) r.captureLatestAsk(w, latestRealUserAsk);
              let E = getMainThreadAgentType(),
                A = E
                  ? context.options.agentDefinitions.activeAgents.find(
                      (activeAgent) => activeAgent.agentType === E,
                    )
                  : void 0,
                v = r
                  .classifyAndPush(
                    w,
                    T,
                    A,
                    "",
                    y.filter((U) => U.type === "assistant"),
                    hasActiveAgentTasks(context.taskRegistry.all()),
                    engineFor,
                    detectSurfaces,
                    !1,
                    !1,
                  )
                  .catch((U) => {
                    logForDebugging(`[classifier] error: ${errorMessage(U)}`, { level: "error" });
                  });
              if (isBgSession()) await withTimeout(v, 60000, "classifier write timed out").catch(() => {});
              return;
            }
          }
          r.markTurnAborted(w, T);
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
        content: imageMetadataTexts.map((text) => ({ type: "text", text: text })),
        isMeta: !0,
        turnCompanion: !0,
      }),
    );
  return result;
}
//@ chunk-3g0djq3w.js:44243-45446 fingerprint = processUserInput (0.41)
async function processUserInput_2(e, n, o) {
  let u = [],
    s = n ? `/${e.name} ${n}` : `/${e.name}`,
    T = snapshotHookRegistration();
  try {
    for await (let hookResult of executeUserPromptExpansionHooks(
      e.source === "mcp" ? "mcp_prompt" : "slash_command",
      e.name,
      n,
      e.source,
      s,
      getToolPermissionContext(o).mode,
      o,
    )) {
      if (hookResult.message?.type === "progress") continue;
      if (hookResult.blockingError) {
        let h = `UserPromptExpansion operation blocked by hook:
${hookResult.blockingError.blockingError}`,
          R =
            hookResult.suppressOriginalPrompt === !0 ||
            hasHookRegistrationChanged(T) ||
            hasPromptSubmitHooks({ isRunReached: !1 })
              ? h
              : `${h}

Original prompt: ${s}`;
        return {
          blocked: {
            messages: [createSystemMessage(R, "warning", void 0, !0)],
            shouldQuery: !1,
            resultText: R,
            command: e,
            screened: { dropped: !0 },
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
              createUserMessage({ content: h, isMeta: !0 }),
              createSystemMessage(h, "warning", void 0, !0),
            ],
            shouldQuery: !1,
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
  return { hookMessages: u };
}
//@ chunk-jv307fw4.js:22476-22613 fingerprint = applyTruncation (0.586)
function applyTruncation(e, n, r) {
  let trimmed = e.trim(),
    list = Array.from(trimmed);
  return list.length <= n
    ? trimmed
    : `${list.slice(0, n).join("")}
[${r} truncated after ${n} characters]`;
}

export { processUserInput, isNullRenderingAttachment_2, isNullRenderingAttachment, processUserInput_2 };
