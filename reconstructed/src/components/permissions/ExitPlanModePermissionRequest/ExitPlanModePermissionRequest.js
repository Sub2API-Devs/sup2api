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
import { basename } from "path";
import {
  init_react_production,
  y,
  Oo,
  P,
  Q,
  R,
  ce,
  zt,
} from "../../../../vendor/react/cjs/react.production.js";
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
import { useAppState, useSetAppState, useAppStoreDirect } from "../../../state/AppState.js";
import { useTheme_2 } from "../../design-system/ThemeProvider.js";
import { useCommandQueueOrDefault } from "../../../context/QueuedMessageContext.js";
import { useSession } from "../../../context/session.js";
import { useNotifications } from "../../../context/notifications.js";
import { registerPasteCarrier, mintPasteId } from "../../../history.js";
import { getRemoteCaps } from "../../../remote/remoteMode.js";
import { useMainLoopModel as useMainLoopModel_3 } from "../../../hooks/useMainLoopModel.js";
import { useBackgroundWorkSignal } from "../../../hooks/useBackgroundWorkItems.js";
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
import { setSliceField } from "../../../state/sliceHelpers.js";
import { recordImagePath, storeImageAndRecord } from "../../../utils/imageStore.js";
import {
  useScrollViewportHandle,
  useClaimScrollBox,
  useScrollViewportSize,
} from "../../ScrollViewportContext.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { useUnattendedNotice } from "../UnattendedAutoBlockNotice.js";
import { resolveEditorCommand } from "../../../utils/editor.js";
import { toIDEDisplayName } from "../../../utils/ide.js";
import { useInputRefusalWindow, useRefusalTracker } from "../../CustomSelect/selectTypeahead.js";
import { lit as lit_2, fromEnum } from "../../../services/analytics/safeMetadata.js";
import { isAutoModeActive, setAutoModeActive } from "../../../utils/permissions/autoModeState.js";
import { logPermissionModeChanged } from "../../../utils/telemetry/thirdPartyEventRecords.js";
import { teammateSpawnPlanHint } from "../../../tools/ExitPlanModeTool/planPreconditions.js";
import { isAgentSwarmsEnabled } from "../../../utils/agentSwarmsEnabled.js";
import { MESSAGE_MARK_SYMBOLS } from "../../../utils/messageKinds.js";
import { maybeResizeAndDownsampleImageBlock } from "../../../utils/imageResizer.js";
import { imageLimitsForModel } from "../../../utils/attachmentMedia.js";
import { editFileInEditor, editPromptInEditor } from "../../../utils/promptEditor.js";
import { notePlanFileForgotten } from "../../../utils/plans.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../CustomSelect/select.js";
import { FocusColumn } from "../../design-system/FocusColumn.js";
import { ScrollBoxDefault } from "../../../ink/components/ScrollBox.js";
import { DiffFrame } from "../../FileEditToolDiff.js";
import { MarkdownText_2 } from "../../pluginUi/render/MarkdownBlock.js";
import { PermissionRuleExplanation } from "../PermissionRuleExplanation.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { getDisplayPath } from "../../../utils/file.js";
import { StatusIcon } from "../../design-system/StatusIcon.js";

//@ chunk-18hwfzwa.js:1346542-1346546 placement
init_react_production();
//@ chunk-18hwfzwa.js:1346580-1347178 placement
/**
 * 选择 Ultraplan 时作为 deny 反馈发回模型的说明；同一声明还有计划显示上限与过大时的占位文字。
 */
var ULTRAPLAN_HANDOFF_FEEDBACK =
  "I'm sending this plan to Ultraplan to be refined remotely. Let me know it's been handed off and that a web link will appear here in a moment \u2014 I can use that to edit and iterate on the plan in the browser once the plan has been generated. I can continue to work here in the meantime; Claude Code will notify me when the cloud plan is ready for review, and I have the option to teleport the plan back here for implementation post-approval.";
var MAX_PLAN_DISPLAY_LENGTH = 200000;
var PLAN_TOO_LARGE_TEXT =
  "(the plan is too large to be shown in full \u2014 approval is withheld; send feedback asking for a shorter plan, or press Esc)";
//@ chunk-18hwfzwa.js:1347178-1347252 placement = createDisabledBypassPermissionsContext (0.769)
function buildSetCurrentModeUpdates(currentContext) {
  return [
    {
      type: "setMode",
      mode: toExternalPermissionMode(currentContext),
      destination: "session",
    },
  ];
}
//@ chunk-18hwfzwa.js:1347252-1347759 fingerprint = autoNameSessionFromPlan (0.799)
function autoNameSessionFromPlan(plan, setAppState, isClearContext, storageV5, credentials) {
  if (isSessionPersistenceDisabled()) return;
  if (!isClearContext && getCurrentSessionTitle(getSessionId())) return;
  let ke;
  if (isActingAsBgJob()) {
    let bgJobDir = getBgJobDir();
    if (bgJobDir) ke = basename(bgJobDir);
  }
  generateSessionName(
    [
      createUserMessage({
        content: plan.slice(0, 1000),
      }),
    ],
    new AbortController().signal,
    {
      credentials,
    },
  )
    .then(async (name) => {
      let name_2 = name ? sanitizeSessionTitle(name) : "";
      if (!name_2 || getCurrentSessionTitle(getSessionId())) return;
      let sessionId = getSessionId();
      let fullPath = getTranscriptPath();
      saveAiGeneratedTitle(sessionId, name_2, storageV5);
      await saveAgentName(sessionId, name_2, fullPath, "auto", storageV5);
      updateSessionName(name_2, storageV5, "auto");
      if (ke) await syncJobName(ke, name_2, "auto", storageV5);
      setAppState((prev) => {
        if (prev.standaloneAgentContext?.name === name_2) return prev;
        return {
          ...prev,
          standaloneAgentContext: {
            ...prev.standaloneAgentContext,
            name: name_2,
          },
        };
      });
    })
    .catch(logError);
}
//@ chunk-18hwfzwa.js:1347759-1349532 fingerprint = buildPlanApprovalOptions (0.751)
function buildPlanApprovalOptions({
  showClearContext,
  showUltraplan,
  usedPercent,
  isAutoModeAvailable,
  isBypassPermissionsModeAvailable,
  autoModeGateSnapshot,
  approvalsWithheld = false,
  onFeedbackChange,
}) {
  let options = [];
  let We = {};
  let ze = {};
  let usedLabel = usedPercent !== null ? ` (${usedPercent}% used)` : "";
  let rt = Boolean(isAutoModeAvailable) && autoModeGateSnapshot;
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
        isBypassPermissionsModeAvailable,
      });
      if (At !== null) {
        We["yes-accept-edits-keep-context"] = At;
        ze["yes-accept-edits-keep-context"] = "bypassPermissions";
        options.push({
          label: At.node,
          value: "yes-accept-edits-keep-context",
        });
      }
    } else if (rt) {
      let At = autoModeRow("exit-plan-resume");
      We["yes-resume-auto-mode"] = At;
      ze["yes-resume-auto-mode"] = "auto";
      options.push({
        label: At.node,
        value: "yes-resume-auto-mode",
      });
    } else {
      let At = modeSwitchRow("acceptEdits", {
        labelVariant: "plan-keep-context",
      });
      if (At !== null) {
        We["yes-accept-edits-keep-context"] = At;
        ze["yes-accept-edits-keep-context"] = "acceptEdits";
        options.push({
          label: At.node,
          value: "yes-accept-edits-keep-context",
        });
      }
    }
    let kt = modeSwitchRow("default", {
      labelVariant: "plan-keep-context",
    });
    if (kt !== null) {
      We["yes-default-keep-context"] = kt;
      ze["yes-default-keep-context"] = "default";
      options.push({
        label: kt.node,
        value: "yes-default-keep-context",
      });
    }
  }
  if (showUltraplan)
    options.push({
      label: "No, refine with Ultraplan in a cloud session",
      value: "ultraplan",
    });
  options.push({
    type: "input",
    label: "No, keep planning",
    value: "no",
    placeholder: "Tell Claude what to change",
    ...(approvalsWithheld
      ? {}
      : {
          description: "shift+tab to approve with this feedback",
        }),
    onChange: onFeedbackChange,
  });
  return {
    options,
    keepContextRows: We,
    keepContextModes: ze,
    autoModeGateSnapshot,
  };
}
//@ chunk-18hwfzwa.js:1349532-1349577 layout
function announcePermissionMode(h) {
  announce(`[${permissionModeIndicator(h)} on]`, {
    hold: true,
  });
}
//@ chunk-18hwfzwa.js:1349577-1349866 fingerprint = getContextUsedPercent (1)
function getContextUsedPercent(usage, permissionMode) {
  if (!usage) return null;
  let runtimeModel = getRuntimeMainLoopModel({
    permissionMode,
    mainLoopModel: getMainLoopModel(),
    exceeds200kTokens: false,
  });
  let contextWindowSize = getContextWindow(runtimeModel, getSdkBetas());
  let { used } = calculateContextPercentages(
    {
      input_tokens: usage.input_tokens,
      cache_creation_input_tokens: usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: usage.cache_read_input_tokens ?? 0,
    },
    contextWindowSize,
  );
  return used;
}
//@ chunk-18hwfzwa.js:1349866-1350606 layout
/**
 * 把退出计划模式对话框的选项转换为权限结果：ultraplan 发反馈、清上下文类选项 deny、保留上下文类 allow 并带权限更新、no 带反馈与图片。
 */
function exitPlanChoiceToResult(choice, state) {
  let {
    currentPlan,
    planEditedLocally,
    acceptFeedback,
    trimmedFeedback,
    hasImages,
    imageBlocks,
    showClearContext,
    keepContextRow,
  } = state;
  let updatedInput = planEditedLocally
    ? {
        plan: currentPlan,
      }
    : {};
  if (choice === "ultraplan")
    return {
      behavior: "deny",
      feedback: ULTRAPLAN_HANDOFF_FEEDBACK,
    };
  if (
    showClearContext &&
    (choice === "yes-bypass-permissions" ||
      choice === "yes-accept-edits" ||
      choice === "yes-auto-clear-context")
  )
    return {
      behavior: "deny",
    };
  if (
    choice === "yes-accept-edits-keep-context" ||
    choice === "yes-default-keep-context" ||
    choice === "yes-resume-auto-mode"
  ) {
    if (keepContextRow === null || !isConsentRow(keepContextRow))
      return {
        behavior: "deny",
      };
    return {
      behavior: "allow",
      updatedInput,
      permissionUpdates: keepContextRow.applies,
      feedback: acceptFeedback,
    };
  }
  if (choice === "no") {
    if (!trimmedFeedback && !hasImages) return null;
    return {
      behavior: "deny",
      feedback: trimmedFeedback || (hasImages ? "(See attached image)" : undefined),
      contentBlocks: imageBlocks && imageBlocks.length > 0 ? imageBlocks : undefined,
    };
  }
  return null;
}
//@ chunk-18hwfzwa.js:1350606-1359828 fingerprint = ExitPlanModePermissionRequest (0.679)
/**
 * 计划批准对话框：读取计划文件（缺失时提示先写计划），显示计划 Markdown 与上下文用量；选项由 buildPlanApprovalOptions 生成（清空上下文 + auto/acceptEdits/bypass、保留上下文、继续规划/反馈、ultraplan）；批准时设置模式并可清空上下文。
 */
function ExitPlanModePermissionRequest({ payload, answer, wouldTakeAnswer }) {
  let toolPermissionContext = useAppState((_r) => _r.toolPermissionContext);
  let setAppState = useSetAppState();
  let store = useAppStoreDirect();
  let { storageV5, credentials } = useTheme_2();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let session = useSession();
  let { addNotification } = useNotifications();
  let [planFeedback, setPlanFeedback] = y("");
  let [pastedContents, setPastedContents] = y({});
  let nextPasteIdRef = Oo(() => [planFeedback]);
  P(() => registerPasteCarrier(() => nextPasteIdRef()), []);
  let Ot = Q(() => getRemoteCaps() !== null, []);
  let Et = (useAppState((_r) => _r.settings.showClearContextOnPlanAccept) ?? false) && !Ot;
  let ultraplanSessionUrl = useAppState((_r) => _r.ultraplanSessionUrl);
  let ultraplanLaunching = useAppState((_r) => _r.ultraplanLaunching);
  let mainLoopModel = useMainLoopModel_3();
  let backgroundWorkSignal = useBackgroundWorkSignal();
  let showUltraplan =
    isUltraplanEnabled() &&
    isPolicyAllowed_2("allow_remote_sessions") &&
    !ultraplanSessionUrl &&
    !ultraplanLaunching &&
    backgroundWorkSignal !== null;
  let { mode, isAutoModeAvailable, isBypassPermissionsModeAvailable } = toolPermissionContext;
  let { plan, planFilePath, usage } = payload;
  let [plan_2, Ro] = y(() =>
    plan && plan.length > 0 ? plan : "No plan found. Please write your plan to the plan file first.",
  );
  let Ho = !plan || plan.trim() === "";
  let options = Q(() => canPlanReturnToAutoMode(toolPermissionContext.prePlanMode), []);
  let Wo = plan_2.length <= MAX_PLAN_DISPLAY_LENGTH;
  let mn = Q(() => Wo && !hasSuspiciousText(plan_2), [Wo, plan_2]);
  let Cn = Q(() => (mn ? displayText(plan_2) : null), [mn, plan_2]);
  let No = Q(() => modeSwitchRow("default"), []);
  let vo = Q(
    () =>
      buildPlanApprovalOptions({
        showClearContext: Et,
        showUltraplan,
        usedPercent: Et ? getContextUsedPercent(usage, mode) : null,
        isAutoModeAvailable,
        isBypassPermissionsModeAvailable,
        autoModeGateSnapshot: options,
        approvalsWithheld: !mn,
        onFeedbackChange: setPlanFeedback,
      }),
    [Et, showUltraplan, usage, mode, isAutoModeAvailable, isBypassPermissionsModeAvailable, options, mn],
  );
  let options_2 = vo.options;
  let defaultFocusValue =
    useAppState((_r) => _r.proactivityLevel) === "ask" &&
    wasProactivityEverOn() &&
    vo.keepContextRows["yes-default-keep-context"] !== undefined &&
    vo.keepContextRows["yes-resume-auto-mode"] === undefined
      ? "yes-default-keep-context"
      : undefined;
  let bn = R(false);
  P(() => {
    if (bn.current) return;
    bn.current = true;
    logEvent("tengu_plan_exit_dialog_shown", {
      planLengthChars: plan?.length ?? 0,
      isEmptyPlan: Ho,
    });
  }, [Ho, plan]);
  let [Go, hn] = y(false);
  let [Mn, Xo] = y(false);
  useTimeout(() => hn(false), Go ? 5000 : null, [Go]);
  function onImagePaste(base64Image, mediaType) {
    let pasteId = mintPasteId(undefined, pastedContents);
    let newContent = {
      id: pasteId,
      type: "image",
      content: base64Image,
      mediaType: mediaType?.mediaType || "image/png",
      filename: mediaType?.filename || "Pasted image",
      dimensions: mediaType?.dimensions,
    };
    let Er = setSliceField(setAppState, "storedImagePaths");
    recordImagePath(newContent, Er);
    storeImageAndRecord(newContent, Er);
    setPastedContents((prev) => ({
      ...prev,
      [pasteId]: newContent,
    }));
  }
  let onRemoveImage = ce((id) => {
    setPastedContents((prev) => {
      let next = {
        ...prev,
      };
      delete next[id];
      return next;
    });
  }, []);
  let imageAttachments = Object.values(pastedContents).filter((_r) => _r.type === "image");
  let hasImages = imageAttachments.length > 0;
  let scrollViewportHandle = useScrollViewportHandle();
  let claimScrollBox = useClaimScrollBox();
  let wn = R(null);
  let [mr, Kn] = y(0);
  zt(() => {
    let height = wn.current ? measureElement(wn.current).height : 0;
    if (height !== mr) Kn(height);
  });
  zt(() => {
    if (!claimScrollBox) return;
    claimScrollBox(mr);
    return () => claimScrollBox(null);
  }, [claimScrollBox, mr]);
  let { rows } = useScrollViewportSize({
    rows: 0,
    columns: 0,
  });
  let terminalSize = useTerminalSize();
  let Zn = claimScrollBox !== null && scrollViewportHandle !== null;
  let unattendedNotice = useUnattendedNotice();
  let dr = Zn ? Math.max(1, rows - mr - unattendedNotice) : Math.max(1, terminalSize.rows - mr - 4);
  let editorCommand = resolveEditorCommand();
  let pr = editorCommand ? toIDEDisplayName(editorCommand) : null;
  let plan_3 = useInputRefusalWindow();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  function Pr() {
    if (plan_3() || refusedWithin()) {
      noteRefused();
      return true;
    }
    return false;
  }
  function ts(value) {
    commandQueueOrDefault.enqueuePendingNotification({
      agentId: mainAgentId(),
      value,
      mode: "task-notification",
    });
  }
  function Gn(_r) {
    ts(_r);
    commandQueueOrDefault.enqueuePendingNotification({
      agentId: mainAgentId(),
      value:
        "The ultraplan note above reports what happened to the plan. Do not respond to it \u2014 wait for the user\u2019s next message.",
      mode: "task-notification",
      isMeta: true,
    });
  }
  async function handleResponse(value) {
    if (plan_3() || refusedWithin()) {
      noteRefused();
      return;
    }
    if (!wouldTakeAnswer()) return;
    let trimmedFeedback = planFeedback.trim();
    let acceptFeedback = trimmedFeedback || undefined;
    let Yr = (msg) =>
      exitPlanChoiceToResult(value, {
        currentPlan: plan_2,
        planEditedLocally: Mn,
        acceptFeedback,
        trimmedFeedback,
        hasImages,
        imageBlocks: msg,
        showClearContext: Et,
        keepContextRow: vo.keepContextRows[value] ?? null,
      });
    if (value === "ultraplan" && backgroundWorkSignal) {
      logEvent("tengu_plan_exit", {
        planLengthChars: plan_2.length,
        outcome: lit_2("ultraplan"),
      });
      answer(Yr());
      launchUltraplan({
        arg: "",
        source: "exit_plan_mode",
        seedPlan: plan_2,
        getAppState: store.getState,
        setAppState: store.setState,
        signal: new AbortController().signal,
        queue: commandQueueOrDefault,
        surface: {
          ...backgroundWorkSignal,
          note: Gn,
          queue: commandQueueOrDefault,
          session,
        },
        onStatusMessage: ts,
        storageV5,
        credentials,
      })
        .then(ts)
        .catch(logError);
      return;
    }
    let Vr =
      value === "yes-accept-edits-keep-context" ||
      value === "yes-default-keep-context" ||
      value === "yes-resume-auto-mode";
    if (Vr && vo.keepContextRows[value] === undefined) {
      answer(Yr());
      return;
    }
    let goingToAuto =
      (value === "yes-resume-auto-mode" || value === "yes-auto-clear-context") && vo.autoModeGateSnapshot;
    let autoWasUsedDuringPlan = isAutoModeActive();
    if (value !== "no" && !goingToAuto && autoWasUsedDuringPlan) {
      setAutoModeActive(false);
      setNeedsAutoModeExitAttachment(true);
      setAppState((prev) => ({
        ...prev,
        toolPermissionContext: {
          ...restoreDangerousPermissions(prev.toolPermissionContext),
          prePlanMode: undefined,
        },
      }));
    }
    if (value !== "no") autoNameSessionFromPlan(plan_2, setAppState, !Vr, storageV5, credentials);
    if (
      Et &&
      (value === "yes-bypass-permissions" ||
        value === "yes-accept-edits" ||
        value === "yes-auto-clear-context")
    ) {
      let mode = "default";
      if (value === "yes-bypass-permissions") mode = "bypassPermissions";
      else if (value === "yes-accept-edits") mode = "acceptEdits";
      else if (value === "yes-auto-clear-context" && vo.autoModeGateSnapshot) {
        mode = "auto";
        setAutoModeActive(true);
      }
      logEvent("tengu_plan_exit", {
        planLengthChars: plan_2.length,
        outcome: fromEnum(value),
        clearContext: true,
        hasFeedback: !!acceptFeedback,
      });
      logPermissionModeChanged({
        from: "plan",
        to: mode,
        trigger: "exit_plan_mode",
      });
      let oi = `

If you need specific details from before exiting plan mode (like exact code snippets, error messages, or content you generated), read the full transcript at: ${getTranscriptPath()}`;
      let Oi = teammateSpawnPlanHint(isAgentSwarmsEnabled());
      let Hi = acceptFeedback
        ? `

User feedback on this plan: ${acceptFeedback}`
        : "";
      let transcriptHint = `Implement the following plan:

${plan_2}${oi}${Oi}${Hi}`;
      setAppState((prev) => ({
        ...prev,
        initialMessage: {
          message: {
            ...createUserMessage({
              content: transcriptHint,
              origin: {
                kind: "auto-continuation",
              },
            }),
            planContent: plan_2,
            ...(getAutoModeConfigOrDefault().typedMarks === true && {
              [MESSAGE_MARK_SYMBOLS]: {
                as: "plan",
                texts: [transcriptHint],
              },
            }),
            queueSkipAttachments: true,
          },
          clearContext: true,
          resetTrigger: "plan_mode_exit",
          mode,
        },
      }));
      setHasExitedPlanMode(true);
      answer({
        behavior: "deny",
      });
      return;
    }
    if (value === "yes-resume-auto-mode" && vo.autoModeGateSnapshot) {
      logEvent("tengu_plan_exit", {
        planLengthChars: plan_2.length,
        outcome: fromEnum(value),
        clearContext: false,
        hasFeedback: !!acceptFeedback,
      });
      setHasExitedPlanMode(true);
      setNeedsPlanModeExitAttachment(true);
      setAutoModeActive(true);
      logPermissionModeChanged({
        from: "plan",
        to: "auto",
        trigger: "exit_plan_mode",
      });
      setAppState((prev) => {
        let Ci = {
          ...prev.toolPermissionContext,
          mode: "auto",
          prePlanMode: undefined,
        };
        Ci = {
          ...Ci,
          startupModeDecidedByProactivityLevel: undefined,
        };
        return {
          ...prev,
          toolPermissionContext: stripDangerousPermissionsForAutoMode(Ci),
        };
      });
      answer(Yr());
      announcePermissionMode("auto");
      return;
    }
    if (Vr) {
      let ws = vo.keepContextRows[value] ?? null;
      let Ci = vo.keepContextModes[value];
      if (ws === null || Ci === undefined || !isConsentRow(ws)) {
        answer(Yr());
        return;
      }
      logPermissionModeChanged({
        from: "plan",
        to: Ci,
        trigger: "exit_plan_mode",
      });
      logEvent("tengu_plan_exit", {
        planLengthChars: plan_2.length,
        outcome: fromEnum(value),
        clearContext: false,
        hasFeedback: !!acceptFeedback,
      });
      setHasExitedPlanMode(true);
      setNeedsPlanModeExitAttachment(true);
      if (answer(Yr()) !== false) announcePermissionMode(Ci);
      return;
    }
    if (value === "no") {
      if (!trimmedFeedback && !hasImages) return;
      let imageBlocks;
      if (hasImages)
        imageBlocks = await Promise.all(
          imageAttachments.map(async (img) => {
            let { block } = await maybeResizeAndDownsampleImageBlock({
              data: img.content,
              mediaType: img.mediaType,
              limits: imageLimitsForModel(mainLoopModel),
            });
            return block;
          }),
        );
      if (answer(Yr(imageBlocks)) === false) return;
      logEvent("tengu_plan_exit", {
        planLengthChars: plan_2.length,
        outcome: lit_2("no"),
      });
      return;
    }
  }
  let onCancel = ce(() => {
    if (plan_3() || refusedWithin()) {
      noteRefused();
      return;
    }
    if (!wouldTakeAnswer()) return;
    logEvent("tengu_plan_exit", {
      planLengthChars: plan_2.length,
      outcome: lit_2("no"),
    });
    answer({
      behavior: "deny",
    });
  }, [answer, wouldTakeAnswer, plan_2.length]);
  function wr(_r) {
    if (plan_3() || refusedWithin()) {
      noteRefused();
      return;
    }
    if (!wouldTakeAnswer()) return;
    if (_r === "yes") {
      if (No === null || !isConsentRow(No)) {
        answer({
          behavior: "deny",
        });
        return;
      }
      logEvent("tengu_plan_exit", {
        planLengthChars: 0,
        outcome: lit_2("yes-default"),
      });
      if (isAutoModeActive()) {
        setAutoModeActive(false);
        setNeedsAutoModeExitAttachment(true);
        setAppState((prev) => ({
          ...prev,
          toolPermissionContext: {
            ...restoreDangerousPermissions(prev.toolPermissionContext),
            prePlanMode: undefined,
          },
        }));
      }
      setHasExitedPlanMode(true);
      setNeedsPlanModeExitAttachment(true);
      if (
        answer({
          behavior: "allow",
          updatedInput: {},
          permissionUpdates: No.applies,
        }) !== false
      )
        announcePermissionMode("default");
      return;
    }
    logEvent("tengu_plan_exit", {
      planLengthChars: 0,
      outcome: lit_2("no"),
    });
    answer({
      behavior: "deny",
    });
  }
  let onKeyDown = (e) => {
    if (e.ctrl && e.key === "g") {
      e.preventDefault();
      if (plan_3() || refusedWithin()) {
        noteRefused();
        return;
      }
      if (!wouldTakeAnswer()) return;
      logEvent("tengu_plan_external_editor_used", {});
      (async () => {
        if (planFilePath) {
          let result = await editFileInEditor(planFilePath);
          notePlanFileForgotten(planFilePath);
          if (result.error)
            addNotification({
              key: "external-editor-error",
              kind: "warning",
              text: result.error,
              color: "warning",
              priority: "high",
            });
          if (result.content !== null) {
            if (result.content !== plan_2) Xo(true);
            Ro(result.content);
            hn(true);
          }
        } else {
          let result = await editPromptInEditor(plan_2);
          if (result.error)
            addNotification({
              key: "external-editor-error",
              kind: "warning",
              text: result.error,
              color: "warning",
              priority: "high",
            });
          if (result.content !== null && result.content !== plan_2) {
            Ro(result.content);
            hn(true);
          }
        }
      })();
      return;
    }
    if (e.shift && e.key === "tab") {
      e.preventDefault();
      if (!mn) return;
      let fr = Et
        ? (["yes-bypass-permissions", "yes-auto-clear-context", "yes-accept-edits"].find(($r) =>
            options_2.some((value) => value.value === $r),
          ) ?? null)
        : vo.keepContextRows["yes-accept-edits-keep-context"] !== undefined
          ? "yes-accept-edits-keep-context"
          : vo.keepContextRows["yes-resume-auto-mode"] !== undefined
            ? "yes-resume-auto-mode"
            : vo.keepContextRows["yes-default-keep-context"] !== undefined
              ? "yes-default-keep-context"
              : null;
      if (fr === null) return;
      handleResponse(fr);
      return;
    }
  };
  if (Ho)
    return jsxProd_default(PermissionDialog_2, {
      color: "planMode",
      title: "Exit plan mode?",
      requestSource: payload.requestSource,
      children: jsxProd_default_2(Box, {
        ref: wn,
        flexDirection: "column",
        paddingX: 1,
        marginTop: 1,
        children: [
          jsxProd_default(Text, {
            children: "Claude wants to exit plan mode",
          }),
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(ModelSelector, {
              refuseInput: Pr,
              selectedValue: NO_COMMITTED_ROW,
              options: [
                {
                  label: No !== null ? No.node : "Yes",
                  value: "yes",
                },
                {
                  label: "No",
                  value: "no",
                },
              ],
              onChange: wr,
              onCancel: () => wr("no"),
            }),
          }),
        ],
      }),
    });
  return jsxProd_default_2(FocusColumn, {
    onKeyDown,
    children: [
      jsxProd_default(ScrollBoxDefault, {
        ref: scrollViewportHandle?.attach,
        flexDirection: "column",
        height: Zn ? dr : undefined,
        stickyScroll: false,
        children: jsxProd_default(PermissionDialog_2, {
          color: "planMode",
          title: "Ready to code?",
          innerPaddingX: 0,
          requestSource: payload.requestSource,
          children: jsxProd_default_2(Box, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              jsxProd_default(Box, {
                paddingX: 1,
                flexDirection: "column",
                children: jsxProd_default(Text, {
                  children: "Here is Claude's plan:",
                }),
              }),
              jsxProd_default(DiffFrame, {
                marginBottom: 1,
                children:
                  Cn !== null
                    ? jsxProd_default(MarkdownText_2, {
                        children: Cn,
                      })
                    : jsxProd_default(Text, {
                        dimColor: true,
                        children: PLAN_TOO_LARGE_TEXT,
                      }),
              }),
              jsxProd_default(Box, {
                flexDirection: "column",
                paddingX: 1,
                children: jsxProd_default(PermissionRuleExplanation, {
                  permissionResult: payload.permissionResult,
                  toolType: "tool",
                }),
              }),
            ],
          }),
        }),
      }),
      jsxProd_default_2(Box, {
        ref: wn,
        flexDirection: "column",
        borderStyle: "round",
        borderColor: "planMode",
        borderLeft: false,
        borderRight: false,
        borderBottom: false,
        paddingX: 1,
        flexShrink: 0,
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: "Claude has written up a plan and is ready to execute. Would you like to proceed?",
          }),
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default(ModelSelector, {
              refuseInput: Pr,
              selectedValue: NO_COMMITTED_ROW,
              options: options_2,
              defaultFocusValue,
              onChange: (prev) => void handleResponse(prev),
              onCancel,
              onImagePaste,
              pastedContents,
              onRemoveImage,
            }),
          }),
          pr &&
            jsxProd_default(Box, {
              marginTop: 1,
              children: jsxProd_default_2(Text, {
                children: [
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "ctrl+g",
                        action: `edit in ${pr}`,
                      }),
                      planFilePath && ` \xB7 ${getDisplayPath(planFilePath)}`,
                    ],
                  }),
                  Go &&
                    jsxProd_default_2(Fragment, {
                      children: [
                        jsxProd_default(Text, {
                          dimColor: true,
                          children: " \xB7 ",
                        }),
                        jsxProd_default_2(Text, {
                          color: "success",
                          children: [
                            jsxProd_default(StatusIcon, {
                              status: "success",
                              withSpace: true,
                            }),
                            "Plan saved!",
                          ],
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
