/**
 * components/permissions/ExitPlanModePermissionRequest/ExitPlanModePermissionRequest.tsx
 *
 * 退出计划模式（批准计划）对话框：显示计划，选项"清空上下文并 auto/acceptEdits/bypass 执行、保留上下文、继续规划、ultraplan"，可按计划自动命名会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/ExitPlanModePermissionRequest/ExitPlanModePermissionRequest.tsx
 * pieces: chunk-18hwfzwa.js (9)
 * attribution: placement 3, fingerprint 4, layout 2
 */
import {
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
} from "path";
import { j, y, Oo, P, Q, R, ce, zt } from "../../../../vendor/react/cjs/react.production.js";
import {
  toExternalPermissionMode,
  permissionModeIndicator,
} from "../../../utils/permissions/PermissionMode.js";
import {
  isSessionPersistenceDisabled,
  getSessionId,
  getSdkBetas,
  mainAgentId,
  setNeedsAutoModeExitAttachment,
  setHasExitedPlanMode,
  setNeedsPlanModeExitAttachment,
} from "../../../bootstrap/state.js";
import {
  getCurrentSessionTitle,
  getTranscriptPath,
  saveAiGeneratedTitle,
  saveAgentName,
} from "../../../utils/sessionStorage.js";
import { isActingAsBgJob, getBgJobDir, updateSessionName } from "../../../utils/concurrentSessions.js";
import { generateSessionName } from "../../../commands/rename/generateSessionName.js";
import { createUserMessage } from "../../../utils/messages.js";
import { sanitizeSessionTitle } from "../../../utils/stringUtils.js";
import { syncJobName } from "../../../services/daemon/jobState.js";
import { logError } from "../../../utils/log.js";
import { modeSwitchRow, autoModeRow, isConsentRow } from "../consentRows.js";
import { announce } from "../../../utils/accessibility/screenReader.js";
import { getRuntimeMainLoopModel } from "../../../utils/model/planModeModel.js";
import { getMainLoopModel } from "../../../utils/model/model.js";
import { getContextWindow } from "../../../utils/model/configs.js";
import { calculateContextPercentages } from "../../../utils/context.js";
import { useAppState, useSetAppState, Cr } from "../../../state/AppState.js";
import { Me } from "../../design-system/ThemeProvider.js";
import { Nu } from "../../../context/QueuedMessageContext.js";
import { useSession } from "../../../context/session.js";
import { useNotifications } from "../../../context/notifications.js";
import { zZ, ZR } from "../../../history.js";
import { Jn } from "../../../remote/remoteMode.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../../hooks/useMainLoopModel.js";
import { NCe } from "../../../hooks/useBackgroundWorkItems.js";
import { isUltraplanEnabled, launchUltraplan } from "../../../commands/ultraplan.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../../../services/policyLimits/policyEvidence.js";
import {
  canPlanReturnToAutoMode,
  restoreDangerousPermissions,
  getAutoModeConfigOrDefault,
  stripDangerousPermissionsForAutoMode,
} from "../../../utils/permissions/permissionSetup.js";
import { hasSuspiciousText, displayText } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { wasProactivityEverOn } from "../../../Tool.js";
import { logEvent } from "../../../services/analytics/index.js";
import { useTimeout, measureElement } from "../../../ink/hooks/useTerminalHooks.js";
import { BH } from "../../../state/sliceHelpers.js";
import { recordImagePath, cLe } from "../../../utils/imageStore.js";
import { fTe, Xmt, useScrollViewportSize } from "../../ScrollViewportContext.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { useUnattendedNotice } from "../UnattendedAutoBlockNotice.js";
import { wM } from "../../../utils/editor.js";
import { toIDEDisplayName } from "../../../utils/ide.js";
import { useInputRefusalWindow, useRefusalTracker } from "../../CustomSelect/selectTypeahead.js";
import { lit as lit_2, fromEnum } from "../../../services/analytics/safeMetadata.js";
import { isAutoModeActive, setAutoModeActive } from "../../../utils/permissions/autoModeState.js";
import { logPermissionModeChanged } from "../../../utils/telemetry/thirdPartyEventRecords.js";
import { teammateSpawnPlanHint } from "../../../tools/ExitPlanModeTool/planPreconditions.js";
import { isAgentSwarmsEnabled } from "../../../utils/agentSwarmsEnabled.js";
import { gge } from "../../../utils/messageKinds.js";
import { maybeResizeAndDownsampleImageBlock } from "../../../utils/imageResizer.js";
import { imageLimitsForModel } from "../../../utils/attachmentMedia.js";
import { editFileInEditor, editPromptInEditor } from "../../../utils/promptEditor.js";
import { notePlanFileForgotten } from "../../../utils/plans.js";
import {
  e,
  r,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../CustomSelect/select.js";
import { FocusColumn } from "../../design-system/FocusColumn.js";
import { LI } from "../../../ink/components/ScrollBox.js";
import { DiffFrame } from "../../FileEditToolDiff.js";
import { MarkdownText_2 } from "../../pluginUi/render/MarkdownBlock.js";
import { PermissionRuleExplanation } from "../PermissionRuleExplanation.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { getDisplayPath } from "../../../utils/file.js";
import { StatusIcon } from "../../design-system/StatusIcon.js";

//@ chunk-18hwfzwa.js:1346542-1346546 placement
j();
/**
 * 选择 Ultraplan 时作为 deny 反馈发回模型的说明；同一声明还有计划显示上限与过大时的占位文字。
 */
//@ chunk-18hwfzwa.js:1346580-1347178 placement
var ULTRAPLAN_HANDOFF_FEEDBACK =
    "I'm sending this plan to Ultraplan to be refined remotely. Let me know it's been handed off and that a web link will appear here in a moment \u2014 I can use that to edit and iterate on the plan in the browser once the plan has been generated. I can continue to work here in the meantime; Claude Code will notify me when the cloud plan is ready for review, and I have the option to teleport the plan back here for implementation post-approval.",
  MAX_PLAN_DISPLAY_LENGTH = 200000,
  PLAN_TOO_LARGE_TEXT =
    "(the plan is too large to be shown in full \u2014 approval is withheld; send feedback asking for a shorter plan, or press Esc)";
//@ chunk-18hwfzwa.js:1347178-1347252 placement = createDisabledBypassPermissionsContext (0.769)
function buildSetCurrentModeUpdates(currentContext) {
  return [{ type: "setMode", mode: toExternalPermissionMode(currentContext), destination: "session" }];
}
//@ chunk-18hwfzwa.js:1347252-1347759 fingerprint = autoNameSessionFromPlan (0.799)
function autoNameSessionFromPlan(h, x, D, L, ee) {
  if (isSessionPersistenceDisabled()) return;
  if (!D && getCurrentSessionTitle(getSessionId())) return;
  let ke;
  if (isActingAsBgJob()) {
    let Re = getBgJobDir();
    if (Re) ke = basename_7(Re);
  }
  generateSessionName([createUserMessage({ content: h.slice(0, 1000) })], new AbortController().signal, {
    credentials: ee,
  })
    .then(async (name) => {
      let Be = name ? sanitizeSessionTitle(name) : "";
      if (!Be || getCurrentSessionTitle(getSessionId())) return;
      let sessionId = getSessionId(),
        fullPath = getTranscriptPath();
      if (
        (saveAiGeneratedTitle(sessionId, Be, L),
        await saveAgentName(sessionId, Be, fullPath, "auto", L),
        updateSessionName(Be, L, "auto"),
        ke)
      )
        await syncJobName(ke, Be, "auto", L);
      x((prev) => {
        if (prev.standaloneAgentContext?.name === Be) return prev;
        return { ...prev, standaloneAgentContext: { ...prev.standaloneAgentContext, name: Be } };
      });
    })
    .catch(logError);
}
//@ chunk-18hwfzwa.js:1347759-1349532 fingerprint = buildPlanApprovalOptions (0.751)
function buildPlanApprovalOptions({
  showClearContext: showClearContext,
  showUltraplan: showUltraplan,
  usedPercent: usedPercent,
  isAutoModeAvailable: isAutoModeAvailable,
  isBypassPermissionsModeAvailable: isBypassPermissionsModeAvailable,
  autoModeGateSnapshot: autoModeGateSnapshot,
  approvalsWithheld: approvalsWithheld = !1,
  onFeedbackChange: onFeedbackChange,
}) {
  let options = [],
    We = {},
    ze = {},
    usedLabel = usedPercent !== null ? ` (${usedPercent}% used)` : "",
    rt = Boolean(isAutoModeAvailable) && autoModeGateSnapshot;
  if (!approvalsWithheld && showClearContext)
    if (isBypassPermissionsModeAvailable)
      options.push({
        label: `Yes, clear context${usedLabel} and bypass permissions`,
        value: "yes-bypass-permissions",
      });
    else if (rt)
      options.push({
        label: `Yes, clear context${usedLabel} and use auto mode`,
        value: "yes-auto-clear-context",
      });
    else
      options.push({
        label: `Yes, clear context${usedLabel} and auto-accept edits`,
        value: "yes-accept-edits",
      });
  if (!approvalsWithheld) {
    if (isBypassPermissionsModeAvailable) {
      let At = modeSwitchRow("bypassPermissions", {
        isBypassPermissionsModeAvailable: isBypassPermissionsModeAvailable,
      });
      if (At !== null)
        ((We["yes-accept-edits-keep-context"] = At),
          (ze["yes-accept-edits-keep-context"] = "bypassPermissions"),
          options.push({ label: At.node, value: "yes-accept-edits-keep-context" }));
    } else if (rt) {
      let At = autoModeRow("exit-plan-resume");
      ((We["yes-resume-auto-mode"] = At),
        (ze["yes-resume-auto-mode"] = "auto"),
        options.push({ label: At.node, value: "yes-resume-auto-mode" }));
    } else {
      let At = modeSwitchRow("acceptEdits", { labelVariant: "plan-keep-context" });
      if (At !== null)
        ((We["yes-accept-edits-keep-context"] = At),
          (ze["yes-accept-edits-keep-context"] = "acceptEdits"),
          options.push({ label: At.node, value: "yes-accept-edits-keep-context" }));
    }
    let kt = modeSwitchRow("default", { labelVariant: "plan-keep-context" });
    if (kt !== null)
      ((We["yes-default-keep-context"] = kt),
        (ze["yes-default-keep-context"] = "default"),
        options.push({ label: kt.node, value: "yes-default-keep-context" }));
  }
  if (showUltraplan)
    options.push({ label: "No, refine with Ultraplan in a cloud session", value: "ultraplan" });
  return (
    options.push({
      type: "input",
      label: "No, keep planning",
      value: "no",
      placeholder: "Tell Claude what to change",
      ...(approvalsWithheld ? {} : { description: "shift+tab to approve with this feedback" }),
      onChange: onFeedbackChange,
    }),
    {
      options: options,
      keepContextRows: We,
      keepContextModes: ze,
      autoModeGateSnapshot: autoModeGateSnapshot,
    }
  );
}
//@ chunk-18hwfzwa.js:1349532-1349577 layout
function SF(h) {
  announce(`[${permissionModeIndicator(h)} on]`, { hold: !0 });
}
//@ chunk-18hwfzwa.js:1349577-1349866 fingerprint = getContextUsedPercent (1)
function getContextUsedPercent(usage, permissionMode) {
  if (!usage) return null;
  let runtimeModel = getRuntimeMainLoopModel({
      permissionMode: permissionMode,
      mainLoopModel: getMainLoopModel(),
      exceeds200kTokens: !1,
    }),
    contextWindowSize = getContextWindow(runtimeModel, getSdkBetas()),
    { used: used } = calculateContextPercentages(
      {
        input_tokens: usage.input_tokens,
        cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
        cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
      },
      contextWindowSize,
    );
  return used;
}
/**
 * 把退出计划模式对话框的选项转换为权限结果：ultraplan 发反馈、清上下文类选项 deny、保留上下文类 allow 并带权限更新、no 带反馈与图片。
 */
//@ chunk-18hwfzwa.js:1349866-1350606 layout
function exitPlanChoiceToResult(choice, state) {
  let {
      currentPlan: currentPlan,
      planEditedLocally: planEditedLocally,
      acceptFeedback: acceptFeedback,
      trimmedFeedback: trimmedFeedback,
      hasImages: hasImages,
      imageBlocks: imageBlocks,
      showClearContext: showClearContext,
      keepContextRow: keepContextRow,
    } = state,
    ze = planEditedLocally ? { plan: currentPlan } : {};
  if (choice === "ultraplan") return { behavior: "deny", feedback: ULTRAPLAN_HANDOFF_FEEDBACK };
  if (
    showClearContext &&
    (choice === "yes-bypass-permissions" ||
      choice === "yes-accept-edits" ||
      choice === "yes-auto-clear-context")
  )
    return { behavior: "deny" };
  if (
    choice === "yes-accept-edits-keep-context" ||
    choice === "yes-default-keep-context" ||
    choice === "yes-resume-auto-mode"
  ) {
    if (keepContextRow === null || !isConsentRow(keepContextRow)) return { behavior: "deny" };
    return {
      behavior: "allow",
      updatedInput: ze,
      permissionUpdates: keepContextRow.applies,
      feedback: acceptFeedback,
    };
  }
  if (choice === "no") {
    if (!trimmedFeedback && !hasImages) return null;
    return {
      behavior: "deny",
      feedback: trimmedFeedback || (hasImages ? "(See attached image)" : void 0),
      contentBlocks: imageBlocks && imageBlocks.length > 0 ? imageBlocks : void 0,
    };
  }
  return null;
}
/**
 * 计划批准对话框：读取计划文件（缺失时提示先写计划），显示计划 Markdown 与上下文用量；选项由 buildPlanApprovalOptions 生成（清空上下文 + auto/acceptEdits/bypass、保留上下文、继续规划/反馈、ultraplan）；批准时设置模式并可清空上下文。
 */
//@ chunk-18hwfzwa.js:1350606-1359828 fingerprint = ExitPlanModePermissionRequest (0.679)
function ExitPlanModePermissionRequest({
  payload: payload,
  answer: answer,
  wouldTakeAnswer: wouldTakeAnswer,
}) {
  let toolPermissionContext = useAppState((_r) => _r.toolPermissionContext),
    setAppState = useSetAppState(),
    store = Cr(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    He = Nu(),
    We = useSession(),
    { addNotification: addNotification } = useNotifications(),
    [Xe, rt] = y(""),
    [kt, At] = y({}),
    nextPasteIdRef = Oo(() => [Xe]);
  P(() => zZ(() => nextPasteIdRef()), []);
  let Ot = Q(() => Jn() !== null, []),
    Et = (useAppState((_r) => _r.settings.showClearContextOnPlanAccept) ?? !1) && !Ot,
    ultraplanSessionUrl = useAppState((_r) => _r.ultraplanSessionUrl),
    ultraplanLaunching = useAppState((_r) => _r.ultraplanLaunching),
    oo = useMainLoopModel_3(),
    Xt = NCe(),
    io =
      isUltraplanEnabled() &&
      isPolicyAllowed_2("allow_remote_sessions") &&
      !ultraplanSessionUrl &&
      !ultraplanLaunching &&
      Xt !== null,
    {
      mode: mode,
      isAutoModeAvailable: isAutoModeAvailable,
      isBypassPermissionsModeAvailable: isBypassPermissionsModeAvailable,
    } = toolPermissionContext,
    { plan: plan, planFilePath: planFilePath, usage: usage } = payload,
    [Bo, Ro] = y(() =>
      plan && plan.length > 0 ? plan : "No plan found. Please write your plan to the plan file first.",
    ),
    Ho = !plan || plan.trim() === "",
    options = Q(() => canPlanReturnToAutoMode(toolPermissionContext.prePlanMode), []),
    Wo = Bo.length <= MAX_PLAN_DISPLAY_LENGTH,
    mn = Q(() => Wo && !hasSuspiciousText(Bo), [Wo, Bo]),
    Cn = Q(() => (mn ? displayText(Bo) : null), [mn, Bo]),
    No = Q(() => modeSwitchRow("default"), []),
    vo = Q(
      () =>
        buildPlanApprovalOptions({
          showClearContext: Et,
          showUltraplan: io,
          usedPercent: Et ? getContextUsedPercent(usage, mode) : null,
          isAutoModeAvailable: isAutoModeAvailable,
          isBypassPermissionsModeAvailable: isBypassPermissionsModeAvailable,
          autoModeGateSnapshot: options,
          approvalsWithheld: !mn,
          onFeedbackChange: rt,
        }),
      [Et, io, usage, mode, isAutoModeAvailable, isBypassPermissionsModeAvailable, options, mn],
    ),
    options_2 = vo.options,
    Fn =
      useAppState((_r) => _r.proactivityLevel) === "ask" &&
      wasProactivityEverOn() &&
      vo.keepContextRows["yes-default-keep-context"] !== void 0 &&
      vo.keepContextRows["yes-resume-auto-mode"] === void 0
        ? "yes-default-keep-context"
        : void 0,
    bn = R(!1);
  P(() => {
    if (bn.current) return;
    ((bn.current = !0),
      logEvent("tengu_plan_exit_dialog_shown", { planLengthChars: plan?.length ?? 0, isEmptyPlan: Ho }));
  }, [Ho, plan]);
  let [Go, hn] = y(!1),
    [Mn, Xo] = y(!1);
  useTimeout(() => hn(!1), Go ? 5000 : null, [Go]);
  function Sn(_r, fr) {
    let $r = ZR(void 0, kt),
      newContent = {
        id: $r,
        type: "image",
        content: _r,
        mediaType: fr?.mediaType || "image/png",
        filename: fr?.filename || "Pasted image",
        dimensions: fr?.dimensions,
      },
      Er = BH(setAppState, "storedImagePaths");
    (recordImagePath(newContent, Er), cLe(newContent, Er), At((prev) => ({ ...prev, [$r]: newContent })));
  }
  let onRemoveImage = ce((id) => {
      At((prev) => {
        let next = { ...prev };
        return (delete next[id], next);
      });
    }, []),
    imageAttachments = Object.values(kt).filter((_r) => _r.type === "image"),
    _o = imageAttachments.length > 0,
    cn = fTe(),
    Dn = Xmt(),
    wn = R(null),
    [mr, Kn] = y(0);
  (zt(() => {
    let _r = wn.current ? measureElement(wn.current).height : 0;
    if (_r !== mr) Kn(_r);
  }),
    zt(() => {
      if (!Dn) return;
      return (Dn(mr), () => Dn(null));
    }, [Dn, mr]));
  let { rows: rows } = useScrollViewportSize({ rows: 0, columns: 0 }),
    Fr = useTerminalSize(),
    Zn = Dn !== null && cn !== null,
    Un = useUnattendedNotice(),
    dr = Zn ? Math.max(1, rows - mr - Un) : Math.max(1, Fr.rows - mr - 4),
    or = wM(),
    pr = or ? toIDEDisplayName(or) : null,
    plan_2 = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker();
  function Pr() {
    if (plan_2() || refusedWithin()) return (noteRefused(), !0);
    return !1;
  }
  function ts(_r) {
    He.enqueuePendingNotification({ agentId: mainAgentId(), value: _r, mode: "task-notification" });
  }
  function Gn(_r) {
    (ts(_r),
      He.enqueuePendingNotification({
        agentId: mainAgentId(),
        value:
          "The ultraplan note above reports what happened to the plan. Do not respond to it \u2014 wait for the user\u2019s next message.",
        mode: "task-notification",
        isMeta: !0,
      }));
  }
  async function handleResponse(value) {
    if (plan_2() || refusedWithin()) {
      noteRefused();
      return;
    }
    if (!wouldTakeAnswer()) return;
    let trimmedFeedback = Xe.trim(),
      $r = trimmedFeedback || void 0,
      Yr = (msg) =>
        exitPlanChoiceToResult(value, {
          currentPlan: Bo,
          planEditedLocally: Mn,
          acceptFeedback: $r,
          trimmedFeedback: trimmedFeedback,
          hasImages: _o,
          imageBlocks: msg,
          showClearContext: Et,
          keepContextRow: vo.keepContextRows[value] ?? null,
        });
    if (value === "ultraplan" && Xt) {
      (logEvent("tengu_plan_exit", { planLengthChars: Bo.length, outcome: lit_2("ultraplan") }),
        answer(Yr()),
        launchUltraplan({
          arg: "",
          source: "exit_plan_mode",
          seedPlan: Bo,
          getAppState: store.getState,
          setAppState: store.setState,
          signal: new AbortController().signal,
          queue: He,
          surface: { ...Xt, note: Gn, queue: He, session: We },
          onStatusMessage: ts,
          storageV5: storageV5,
          credentials: credentials,
        })
          .then(ts)
          .catch(logError));
      return;
    }
    let Vr =
      value === "yes-accept-edits-keep-context" ||
      value === "yes-default-keep-context" ||
      value === "yes-resume-auto-mode";
    if (Vr && vo.keepContextRows[value] === void 0) {
      answer(Yr());
      return;
    }
    let ms =
        (value === "yes-resume-auto-mode" || value === "yes-auto-clear-context") && vo.autoModeGateSnapshot,
      Xs = isAutoModeActive();
    if (value !== "no" && !ms && Xs)
      (setAutoModeActive(!1),
        setNeedsAutoModeExitAttachment(!0),
        setAppState((prev) => ({
          ...prev,
          toolPermissionContext: {
            ...restoreDangerousPermissions(prev.toolPermissionContext),
            prePlanMode: void 0,
          },
        })));
    if (value !== "no") autoNameSessionFromPlan(Bo, setAppState, !Vr, storageV5, credentials);
    if (
      Et &&
      (value === "yes-bypass-permissions" ||
        value === "yes-accept-edits" ||
        value === "yes-auto-clear-context")
    ) {
      let mode = "default";
      if (value === "yes-bypass-permissions") mode = "bypassPermissions";
      else if (value === "yes-accept-edits") mode = "acceptEdits";
      else if (value === "yes-auto-clear-context" && vo.autoModeGateSnapshot)
        ((mode = "auto"), setAutoModeActive(!0));
      (logEvent("tengu_plan_exit", {
        planLengthChars: Bo.length,
        outcome: fromEnum(value),
        clearContext: !0,
        hasFeedback: !!$r,
      }),
        logPermissionModeChanged({ from: "plan", to: mode, trigger: "exit_plan_mode" }));
      let oi = `

If you need specific details from before exiting plan mode (like exact code snippets, error messages, or content you generated), read the full transcript at: ${getTranscriptPath()}`,
        Oi = teammateSpawnPlanHint(isAgentSwarmsEnabled()),
        Hi = $r
          ? `

User feedback on this plan: ${$r}`
          : "",
        transcriptHint = `Implement the following plan:

${Bo}${oi}${Oi}${Hi}`;
      (setAppState((prev) => ({
        ...prev,
        initialMessage: {
          message: {
            ...createUserMessage({ content: transcriptHint, origin: { kind: "auto-continuation" } }),
            planContent: Bo,
            ...(getAutoModeConfigOrDefault().typedMarks === !0 && {
              [gge]: { as: "plan", texts: [transcriptHint] },
            }),
            queueSkipAttachments: !0,
          },
          clearContext: !0,
          resetTrigger: "plan_mode_exit",
          mode: mode,
        },
      })),
        setHasExitedPlanMode(!0),
        answer({ behavior: "deny" }));
      return;
    }
    if (value === "yes-resume-auto-mode" && vo.autoModeGateSnapshot) {
      (logEvent("tengu_plan_exit", {
        planLengthChars: Bo.length,
        outcome: fromEnum(value),
        clearContext: !1,
        hasFeedback: !!$r,
      }),
        setHasExitedPlanMode(!0),
        setNeedsPlanModeExitAttachment(!0),
        setAutoModeActive(!0),
        logPermissionModeChanged({ from: "plan", to: "auto", trigger: "exit_plan_mode" }),
        setAppState((prev) => {
          let Ci = { ...prev.toolPermissionContext, mode: "auto", prePlanMode: void 0 };
          return (
            (Ci = { ...Ci, startupModeDecidedByProactivityLevel: void 0 }),
            { ...prev, toolPermissionContext: stripDangerousPermissionsForAutoMode(Ci) }
          );
        }),
        answer(Yr()),
        SF("auto"));
      return;
    }
    if (Vr) {
      let ws = vo.keepContextRows[value] ?? null,
        Ci = vo.keepContextModes[value];
      if (ws === null || Ci === void 0 || !isConsentRow(ws)) {
        answer(Yr());
        return;
      }
      if (
        (logPermissionModeChanged({ from: "plan", to: Ci, trigger: "exit_plan_mode" }),
        logEvent("tengu_plan_exit", {
          planLengthChars: Bo.length,
          outcome: fromEnum(value),
          clearContext: !1,
          hasFeedback: !!$r,
        }),
        setHasExitedPlanMode(!0),
        setNeedsPlanModeExitAttachment(!0),
        answer(Yr()) !== !1)
      )
        SF(Ci);
      return;
    }
    if (value === "no") {
      if (!trimmedFeedback && !_o) return;
      let imageBlocks;
      if (_o)
        imageBlocks = await Promise.all(
          imageAttachments.map(async (img) => {
            let { block: block } = await maybeResizeAndDownsampleImageBlock({
              data: img.content,
              mediaType: img.mediaType,
              limits: imageLimitsForModel(oo),
            });
            return block;
          }),
        );
      if (answer(Yr(imageBlocks)) === !1) return;
      logEvent("tengu_plan_exit", { planLengthChars: Bo.length, outcome: lit_2("no") });
      return;
    }
  }
  let Zr = ce(() => {
    if (plan_2() || refusedWithin()) {
      noteRefused();
      return;
    }
    if (!wouldTakeAnswer()) return;
    (logEvent("tengu_plan_exit", { planLengthChars: Bo.length, outcome: lit_2("no") }),
      answer({ behavior: "deny" }));
  }, [answer, wouldTakeAnswer, Bo.length]);
  function wr(_r) {
    if (plan_2() || refusedWithin()) {
      noteRefused();
      return;
    }
    if (!wouldTakeAnswer()) return;
    if (_r === "yes") {
      if (No === null || !isConsentRow(No)) {
        answer({ behavior: "deny" });
        return;
      }
      if (
        (logEvent("tengu_plan_exit", { planLengthChars: 0, outcome: lit_2("yes-default") }),
        isAutoModeActive())
      )
        (setAutoModeActive(!1),
          setNeedsAutoModeExitAttachment(!0),
          setAppState((Yr) => ({
            ...Yr,
            toolPermissionContext: {
              ...restoreDangerousPermissions(Yr.toolPermissionContext),
              prePlanMode: void 0,
            },
          })));
      if (
        (setHasExitedPlanMode(!0),
        setNeedsPlanModeExitAttachment(!0),
        answer({ behavior: "allow", updatedInput: {}, permissionUpdates: No.applies }) !== !1)
      )
        SF("default");
      return;
    }
    (logEvent("tengu_plan_exit", { planLengthChars: 0, outcome: lit_2("no") }), answer({ behavior: "deny" }));
  }
  let zr = (_r) => {
    if (_r.ctrl && _r.key === "g") {
      if ((_r.preventDefault(), plan_2() || refusedWithin())) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) return;
      (logEvent("tengu_plan_external_editor_used", {}),
        (async () => {
          if (planFilePath) {
            let fr = await editFileInEditor(planFilePath);
            if ((notePlanFileForgotten(planFilePath), fr.error))
              addNotification({
                key: "external-editor-error",
                kind: "warning",
                text: fr.error,
                color: "warning",
                priority: "high",
              });
            if (fr.content !== null) {
              if (fr.content !== Bo) Xo(!0);
              (Ro(fr.content), hn(!0));
            }
          } else {
            let resized = await editPromptInEditor(Bo);
            if (resized.error)
              addNotification({
                key: "external-editor-error",
                kind: "warning",
                text: resized.error,
                color: "warning",
                priority: "high",
              });
            if (resized.content !== null && resized.content !== Bo) (Ro(resized.content), hn(!0));
          }
        })());
      return;
    }
    if (_r.shift && _r.key === "tab") {
      if ((_r.preventDefault(), !mn)) return;
      let fr = Et
        ? (["yes-bypass-permissions", "yes-auto-clear-context", "yes-accept-edits"].find(($r) =>
            options_2.some((value) => value.value === $r),
          ) ?? null)
        : vo.keepContextRows["yes-accept-edits-keep-context"] !== void 0
          ? "yes-accept-edits-keep-context"
          : vo.keepContextRows["yes-resume-auto-mode"] !== void 0
            ? "yes-resume-auto-mode"
            : vo.keepContextRows["yes-default-keep-context"] !== void 0
              ? "yes-default-keep-context"
              : null;
      if (fr === null) return;
      handleResponse(fr);
      return;
    }
  };
  if (Ho)
    return e(PermissionDialog_2, {
      color: "planMode",
      title: "Exit plan mode?",
      requestSource: payload.requestSource,
      children: r(Box, {
        ref: wn,
        flexDirection: "column",
        paddingX: 1,
        marginTop: 1,
        children: [
          e(Text, { children: "Claude wants to exit plan mode" }),
          e(Box, {
            marginTop: 1,
            children: e(ModelSelector, {
              refuseInput: Pr,
              selectedValue: NO_COMMITTED_ROW,
              options: [
                { label: No !== null ? No.node : "Yes", value: "yes" },
                { label: "No", value: "no" },
              ],
              onChange: wr,
              onCancel: () => wr("no"),
            }),
          }),
        ],
      }),
    });
  return r(FocusColumn, {
    onKeyDown: zr,
    children: [
      e(LI, {
        ref: cn?.attach,
        flexDirection: "column",
        height: Zn ? dr : void 0,
        stickyScroll: !1,
        children: e(PermissionDialog_2, {
          color: "planMode",
          title: "Ready to code?",
          innerPaddingX: 0,
          requestSource: payload.requestSource,
          children: r(Box, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              e(Box, {
                paddingX: 1,
                flexDirection: "column",
                children: e(Text, { children: "Here is Claude's plan:" }),
              }),
              e(DiffFrame, {
                marginBottom: 1,
                children:
                  Cn !== null
                    ? e(MarkdownText_2, { children: Cn })
                    : e(Text, { dimColor: !0, children: PLAN_TOO_LARGE_TEXT }),
              }),
              e(Box, {
                flexDirection: "column",
                paddingX: 1,
                children: e(PermissionRuleExplanation, {
                  permissionResult: payload.permissionResult,
                  toolType: "tool",
                }),
              }),
            ],
          }),
        }),
      }),
      r(Box, {
        ref: wn,
        flexDirection: "column",
        borderStyle: "round",
        borderColor: "planMode",
        borderLeft: !1,
        borderRight: !1,
        borderBottom: !1,
        paddingX: 1,
        flexShrink: 0,
        children: [
          e(Text, {
            dimColor: !0,
            children: "Claude has written up a plan and is ready to execute. Would you like to proceed?",
          }),
          e(Box, {
            marginTop: 1,
            children: e(ModelSelector, {
              refuseInput: Pr,
              selectedValue: NO_COMMITTED_ROW,
              options: options_2,
              defaultFocusValue: Fn,
              onChange: (prev) => void handleResponse(prev),
              onCancel: Zr,
              onImagePaste: Sn,
              pastedContents: kt,
              onRemoveImage: onRemoveImage,
            }),
          }),
          pr &&
            e(Box, {
              marginTop: 1,
              children: r(Text, {
                children: [
                  r(Text, {
                    dimColor: !0,
                    children: [
                      e(KeyboardShortcutHint, { chord: "ctrl+g", action: `edit in ${pr}` }),
                      planFilePath && ` \xB7 ${getDisplayPath(planFilePath)}`,
                    ],
                  }),
                  Go &&
                    r(Fragment, {
                      children: [
                        e(Text, { dimColor: !0, children: " \xB7 " }),
                        r(Text, {
                          color: "success",
                          children: [e(StatusIcon, { status: "success", withSpace: !0 }), "Plan saved!"],
                        }),
                      ],
                    }),
                ],
              }),
            }),
        ],
      }),
    ],
  });
}

export { ExitPlanModePermissionRequest, buildSetCurrentModeUpdates };
