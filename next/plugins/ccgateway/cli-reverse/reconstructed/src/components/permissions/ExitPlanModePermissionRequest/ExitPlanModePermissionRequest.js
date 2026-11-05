/**
 * components/permissions/ExitPlanModePermissionRequest/ExitPlanModePermissionRequest.tsx
 *
 * 退出计划模式（批准计划）对话框：显示计划，选项"清空上下文并 auto/acceptEdits/bypass 执行、保留上下文、继续规划、ultraplan"，可按计划自动命名会话。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/ExitPlanModePermissionRequest/ExitPlanModePermissionRequest.tsx
 * pieces: chunk-czq1j3j2.js (9)
 * attribution: placement 3, fingerprint 4, layout 2
 */
import { basename } from "path";
import {
  init_react_production,
  useState,
  useEffectEvent,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  useLayoutEffect,
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
  setHasExitedPlanMode,
  setNeedsPlanModeExitAttachment,
  setNeedsAutoModeExitAttachment,
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
  stripDangerousPermissionsForAutoMode,
  restoreDangerousPermissions,
  getAutoModeConfigOrDefault,
} from "../../../utils/permissions/permissionSetup.js";
import { hasSuspiciousText, displayText } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { isRestrictedModelAllowed } from "../../../utils/model/startupModelResolution.js";
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
import { useRecentInputWithin, useRefusalTracker } from "../../CustomSelect/selectTypeahead.js";
import { setAutoModeActive, isAutoModeActive } from "../../../utils/permissions/autoModeState.js";
import { logPermissionModeChanged } from "../../../utils/telemetry/thirdPartyEventRecords.js";
import { lit as lit_2, fromEnum } from "../../../services/analytics/safeMetadata.js";
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
import { pickFirst } from "../../design-system/Dialog.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { getDisplayPath } from "../../../utils/file.js";
import { StatusIcon } from "../../design-system/StatusIcon.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1366388-1366392 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1366388", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1368885-1369483 placement
/**
 * 选择 Ultraplan 时作为 deny 反馈发回模型的说明；同一声明还有计划显示上限与过大时的占位文字。
 */
var ULTRAPLAN_HANDOFF_FEEDBACK =
  "I'm sending this plan to Ultraplan to be refined remotely. Let me know it's been handed off and that a web link will appear here in a moment \u2014 I can use that to edit and iterate on the plan in the browser once the plan has been generated. I can continue to work here in the meantime; Claude Code will notify me when the cloud plan is ready for review, and I have the option to teleport the plan back here for implementation post-approval.";
var MAX_PLAN_DISPLAY_LENGTH = 200000;
var PLAN_TOO_LARGE_TEXT =
  "(the plan is too large to be shown in full \u2014 approval is withheld; send feedback asking for a shorter plan, or press Esc)";
//@ chunk-czq1j3j2.js:1369483-1369557 placement (2.1.88 match: createDisabledBypassPermissionsContext, 0.769)
function buildSetCurrentModeUpdates(currentContext) {
  return [
    {
      type: "setMode",
      mode: toExternalPermissionMode(currentContext),
      destination: "session",
    },
  ];
}
//@ chunk-czq1j3j2.js:1369557-1370064 fingerprint (2.1.88 match: autoNameSessionFromPlan, 0.798)
function autoNameSessionFromPlan(plan, setAppState, isClearContext, storageV5, credentials) {
  if (isSessionPersistenceDisabled()) return;
  if (!isClearContext && getCurrentSessionTitle(getSessionId())) return;
  let bgJobDirName;
  if (isActingAsBgJob()) {
    let bgJobDir = getBgJobDir();
    if (bgJobDir) bgJobDirName = basename(bgJobDir);
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
      if (bgJobDirName) await syncJobName(bgJobDirName, name_2, "auto", storageV5);
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
//@ chunk-czq1j3j2.js:1370064-1371893 fingerprint (2.1.88 match: buildPlanApprovalOptions, 0.744)
function buildPlanApprovalOptions({
  showClearContext,
  showUltraplan,
  usedPercent,
  isAutoModeAvailable,
  isBypassPermissionsModeAvailable,
  autoModeGateSnapshot,
  approvalsWithheld = false,
  modelNeedsAutoOrPlan = false,
  onFeedbackChange,
}) {
  let options = [];
  let keepContextRows = {};
  let keepContextModes = {};
  let usedLabel = usedPercent !== null ? ` (${usedPercent}% used)` : "";
  let isAutoModeOffered = Boolean(isAutoModeAvailable) && autoModeGateSnapshot;
  let autoGatedByModel = modelNeedsAutoOrPlan && isAutoModeOffered;
  let bypassPreferred = isBypassPermissionsModeAvailable && !autoGatedByModel;
  if (!approvalsWithheld && showClearContext)
    if (bypassPreferred)
      options.push({
        label: `Yes, clear context${usedLabel} and bypass permissions`,
        value: "yes-bypass-permissions",
      });
    else if (isAutoModeOffered)
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
    if (bypassPreferred) {
      let bypassRow = modeSwitchRow("bypassPermissions", {
        isBypassPermissionsModeAvailable,
      });
      if (bypassRow !== null) {
        keepContextRows["yes-accept-edits-keep-context"] = bypassRow;
        keepContextModes["yes-accept-edits-keep-context"] = "bypassPermissions";
        options.push({
          label: bypassRow.node,
          value: "yes-accept-edits-keep-context",
        });
      }
    } else if (isAutoModeOffered) {
      let resumeAutoModeRow = autoModeRow("exit-plan-resume");
      keepContextRows["yes-resume-auto-mode"] = resumeAutoModeRow;
      keepContextModes["yes-resume-auto-mode"] = "auto";
      options.push({
        label: resumeAutoModeRow.node,
        value: "yes-resume-auto-mode",
      });
    } else {
      let acceptEditsRow = modeSwitchRow("acceptEdits", {
        labelVariant: "plan-keep-context",
      });
      if (acceptEditsRow !== null) {
        keepContextRows["yes-accept-edits-keep-context"] = acceptEditsRow;
        keepContextModes["yes-accept-edits-keep-context"] = "acceptEdits";
        options.push({
          label: acceptEditsRow.node,
          value: "yes-accept-edits-keep-context",
        });
      }
    }
    let defaultRow = autoGatedByModel
      ? null
      : modeSwitchRow("default", {
          labelVariant: "plan-keep-context",
        });
    if (defaultRow !== null) {
      keepContextRows["yes-default-keep-context"] = defaultRow;
      keepContextModes["yes-default-keep-context"] = "default";
      options.push({
        label: defaultRow.node,
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
    keepContextRows,
    keepContextModes,
    autoModeGateSnapshot,
  };
}
//@ chunk-czq1j3j2.js:1371893-1371938 layout
function announcePermissionMode(mode) {
  announce(`[${permissionModeIndicator(mode)} on]`, {
    hold: true,
  });
}
//@ chunk-czq1j3j2.js:1371938-1372227 fingerprint (2.1.88 match: getContextUsedPercent, 1)
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
//@ chunk-czq1j3j2.js:1372227-1372967 layout
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
//@ chunk-czq1j3j2.js:1372967-1382630 fingerprint (2.1.88 match: ExitPlanModePermissionRequest, 0.672)
/**
 * 计划批准对话框：读取计划文件（缺失时提示先写计划），显示计划 Markdown 与上下文用量；选项由 buildPlanApprovalOptions 生成（清空上下文 + auto/acceptEdits/bypass、保留上下文、继续规划/反馈、ultraplan）；批准时设置模式并可清空上下文。
 */
function ExitPlanModePermissionRequest({ payload, answer, wouldTakeAnswer }) {
  let toolPermissionContext = useAppState((appState) => appState.toolPermissionContext);
  let setAppState = useSetAppState();
  let store = useAppStoreDirect();
  let { storageV5, credentials } = useTheme_2();
  let commandQueueOrDefault = useCommandQueueOrDefault();
  let session = useSession();
  let { addNotification } = useNotifications();
  let [forcePlain] = useState(() => false);
  let [planFeedback, setPlanFeedback] = useState("");
  let [pastedContents, setPastedContents] = useState({});
  let nextPasteIdRef = useEffectEvent(() => [planFeedback]);
  useEffect(() => registerPasteCarrier(() => nextPasteIdRef()), []);
  let isRemote = useMemo(() => getRemoteCaps() !== null, []);
  let showClearContext =
    (useAppState((appState) => appState.settings.showClearContextOnPlanAccept) ?? false) && !isRemote;
  let ultraplanSessionUrl = useAppState((appState) => appState.ultraplanSessionUrl);
  let ultraplanLaunching = useAppState((appState) => appState.ultraplanLaunching);
  let model = useMainLoopModel_3();
  let backgroundWorkSignal = useBackgroundWorkSignal();
  let showUltraplan =
    isUltraplanEnabled() &&
    isPolicyAllowed_2("allow_remote_sessions") &&
    !ultraplanSessionUrl &&
    !ultraplanLaunching &&
    backgroundWorkSignal !== null;
  let { mode, prePlanMode, isAutoModeAvailable, isBypassPermissionsModeAvailable } = toolPermissionContext;
  let { plan, planFilePath, usage } = payload;
  let [planText, setPlanText] = useState(() =>
    plan && plan.length > 0 ? plan : "No plan found. Please write your plan to the plan file first.",
  );
  let isPlanEmpty = !plan || plan.trim() === "";
  let options = useMemo(() => canPlanReturnToAutoMode(toolPermissionContext.prePlanMode), []);
  let isPlanSmall = planText.length <= MAX_PLAN_DISPLAY_LENGTH;
  let canShowPlan = useMemo(() => isPlanSmall && !hasSuspiciousText(planText), [isPlanSmall, planText]);
  let planDisplay = useMemo(() => (canShowPlan ? displayText(planText) : null), [canShowPlan, planText]);
  let isDirectRequest = payload.requestSource === undefined;
  let [allowRestrictedModel] = useState(
    () => isDirectRequest && !isRemote && isRestrictedModelAllowed(model),
  );
  let [canResumeAutoMode] = useState(
    () =>
      mode === "plan" &&
      isDirectRequest &&
      (prePlanMode === "auto" || allowRestrictedModel) &&
      (isRemote || (Boolean(isAutoModeAvailable) && options)),
  );
  let defaultModeRow = useMemo(
    () => (canResumeAutoMode ? autoModeRow("exit-plan-resume") : modeSwitchRow("default")),
    [canResumeAutoMode],
  );
  let approvalOptions = useMemo(
    () =>
      buildPlanApprovalOptions({
        showClearContext,
        showUltraplan,
        usedPercent: showClearContext ? getContextUsedPercent(usage, mode) : null,
        isAutoModeAvailable,
        isBypassPermissionsModeAvailable,
        autoModeGateSnapshot: options,
        approvalsWithheld: !canShowPlan,
        modelNeedsAutoOrPlan: allowRestrictedModel,
        onFeedbackChange: setPlanFeedback,
      }),
    [
      showClearContext,
      showUltraplan,
      usage,
      mode,
      isAutoModeAvailable,
      isBypassPermissionsModeAvailable,
      options,
      canShowPlan,
      allowRestrictedModel,
    ],
  );
  let options_2 = approvalOptions.options;
  let defaultFocusValue =
    useAppState((state) => state.proactivityLevel) === "ask" &&
    wasProactivityEverOn() &&
    approvalOptions.keepContextRows["yes-default-keep-context"] !== undefined &&
    approvalOptions.keepContextRows["yes-resume-auto-mode"] === undefined
      ? "yes-default-keep-context"
      : undefined;
  let loggedRef = useRef(false);
  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    logEvent("tengu_plan_exit_dialog_shown", {
      planLengthChars: plan?.length ?? 0,
      isEmptyPlan: isPlanEmpty,
    });
  }, [isPlanEmpty, plan]);
  let [planSaved, setPlanSaved] = useState(false);
  let [planEditedLocally, setPlanEditedLocally] = useState(false);
  useTimeout(() => setPlanSaved(false), planSaved ? 5000 : null, [planSaved]);
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
    let recordStoredImagePath = setSliceField(setAppState, "storedImagePaths");
    recordImagePath(newContent, recordStoredImagePath);
    storeImageAndRecord(newContent, recordStoredImagePath);
    setPastedContents((prev) => ({
      ...prev,
      [pasteId]: newContent,
    }));
  }
  let onRemoveImage = useCallback((id) => {
    setPastedContents((prev) => {
      let next = {
        ...prev,
      };
      delete next[id];
      return next;
    });
  }, []);
  let imageAttachments = Object.values(pastedContents).filter((attachment) => attachment.type === "image");
  let hasImages = imageAttachments.length > 0;
  let scrollViewportHandle = useScrollViewportHandle();
  let claimScrollBox = useClaimScrollBox();
  let containerRef = useRef(null);
  let [containerHeight, setContainerHeight] = useState(0);
  useLayoutEffect(() => {
    let height = containerRef.current ? measureElement(containerRef.current).height : 0;
    if (height !== containerHeight) setContainerHeight(height);
  });
  useLayoutEffect(() => {
    if (!claimScrollBox) return;
    claimScrollBox(containerHeight);
    return () => claimScrollBox(null);
  }, [claimScrollBox, containerHeight]);
  let { rows } = useScrollViewportSize({
    rows: 0,
    columns: 0,
  });
  let terminalSize = useTerminalSize();
  let hasScrollViewport = claimScrollBox !== null && scrollViewportHandle !== null;
  let unattendedNotice = useUnattendedNotice();
  let contentHeight = hasScrollViewport
    ? Math.max(1, rows - containerHeight - unattendedNotice)
    : Math.max(1, terminalSize.rows - containerHeight - 4);
  let editorCommand = resolveEditorCommand();
  let editorDisplayName = editorCommand ? toIDEDisplayName(editorCommand) : null;
  let plan_2 = useRecentInputWithin();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  function refuseInput() {
    if (plan_2() || refusedWithin()) {
      noteRefused();
      return true;
    }
    return false;
  }
  function notifyStatus(value) {
    commandQueueOrDefault.enqueuePendingNotification({
      agentId: mainAgentId(),
      value,
      mode: "task-notification",
    });
  }
  function onUltraplanNote(message) {
    notifyStatus(message);
    commandQueueOrDefault.enqueuePendingNotification({
      agentId: mainAgentId(),
      value:
        "The ultraplan note above reports what happened to the plan. Do not respond to it \u2014 wait for the user\u2019s next message.",
      mode: "task-notification",
      isMeta: true,
    });
  }
  function switchToAutoMode() {
    setHasExitedPlanMode(true);
    setNeedsPlanModeExitAttachment(true);
    setAutoModeActive(true);
    logPermissionModeChanged({
      from: "plan",
      to: "auto",
      trigger: "exit_plan_mode",
    });
    setAppState((appState) => {
      let nextContext = {
        ...appState.toolPermissionContext,
        mode: "auto",
        prePlanMode: undefined,
      };
      nextContext = {
        ...nextContext,
        startupModeDecidedByProactivityLevel: undefined,
      };
      return {
        ...appState,
        toolPermissionContext: stripDangerousPermissionsForAutoMode(nextContext),
      };
    });
  }
  async function handleResponse(value) {
    if (plan_2() || refusedWithin()) {
      noteRefused();
      return;
    }
    if (!wouldTakeAnswer()) return;
    let trimmedFeedback = planFeedback.trim();
    let acceptFeedback = trimmedFeedback || undefined;
    let toResult = (msg) =>
      exitPlanChoiceToResult(value, {
        currentPlan: planText,
        planEditedLocally,
        acceptFeedback,
        trimmedFeedback,
        hasImages,
        imageBlocks: msg,
        showClearContext,
        keepContextRow: approvalOptions.keepContextRows[value] ?? null,
      });
    if (value === "ultraplan" && backgroundWorkSignal) {
      logEvent("tengu_plan_exit", {
        planLengthChars: planText.length,
        outcome: lit_2("ultraplan"),
      });
      answer(toResult());
      launchUltraplan({
        arg: "",
        source: "exit_plan_mode",
        seedPlan: planText,
        getAppState: store.getState,
        setAppState: store.setState,
        signal: new AbortController().signal,
        queue: commandQueueOrDefault,
        surface: {
          ...backgroundWorkSignal,
          note: onUltraplanNote,
          queue: commandQueueOrDefault,
          session,
        },
        onStatusMessage: notifyStatus,
        storageV5,
        credentials,
      })
        .then(notifyStatus)
        .catch(logError);
      return;
    }
    let isKeepContextChoice =
      value === "yes-accept-edits-keep-context" ||
      value === "yes-default-keep-context" ||
      value === "yes-resume-auto-mode";
    if (isKeepContextChoice && approvalOptions.keepContextRows[value] === undefined) {
      answer(toResult());
      return;
    }
    let goingToAuto =
      (value === "yes-resume-auto-mode" || value === "yes-auto-clear-context") &&
      approvalOptions.autoModeGateSnapshot;
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
    if (value !== "no")
      autoNameSessionFromPlan(planText, setAppState, !isKeepContextChoice, storageV5, credentials);
    if (
      showClearContext &&
      (value === "yes-bypass-permissions" ||
        value === "yes-accept-edits" ||
        value === "yes-auto-clear-context")
    ) {
      let mode = "default";
      if (value === "yes-bypass-permissions") mode = "bypassPermissions";
      else if (value === "yes-accept-edits") mode = "acceptEdits";
      else if (value === "yes-auto-clear-context" && approvalOptions.autoModeGateSnapshot) {
        mode = "auto";
        setAutoModeActive(true);
      }
      logEvent("tengu_plan_exit", {
        planLengthChars: planText.length,
        outcome: fromEnum(value),
        clearContext: true,
        hasFeedback: !!acceptFeedback,
      });
      logPermissionModeChanged({
        from: "plan",
        to: mode,
        trigger: "exit_plan_mode",
      });
      let transcriptHint = `

If you need specific details from before exiting plan mode (like exact code snippets, error messages, or content you generated), read the full transcript at: ${getTranscriptPath()}`;
      let teammateHint = teammateSpawnPlanHint(isAgentSwarmsEnabled());
      let feedbackHint = acceptFeedback
        ? `

User feedback on this plan: ${acceptFeedback}`
        : "";
      let transcriptHint_2 = `Implement the following plan:

${planText}${transcriptHint}${teammateHint}${feedbackHint}`;
      setAppState((prev) => ({
        ...prev,
        initialMessage: {
          message: {
            ...createUserMessage({
              content: transcriptHint_2,
              origin: {
                kind: "auto-continuation",
              },
            }),
            planContent: planText,
            ...(getAutoModeConfigOrDefault().typedMarks === true && {
              [MESSAGE_MARK_SYMBOLS]: {
                as: "plan",
                texts: [transcriptHint_2],
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
    if (value === "yes-resume-auto-mode" && approvalOptions.autoModeGateSnapshot) {
      logEvent("tengu_plan_exit", {
        planLengthChars: planText.length,
        outcome: fromEnum(value),
        clearContext: false,
        hasFeedback: !!acceptFeedback,
      });
      switchToAutoMode();
      answer(toResult());
      announcePermissionMode("auto");
      return;
    }
    if (isKeepContextChoice) {
      let keepContextRow = approvalOptions.keepContextRows[value] ?? null;
      let nextMode = approvalOptions.keepContextModes[value];
      if (keepContextRow === null || nextMode === undefined || !isConsentRow(keepContextRow)) {
        answer(toResult());
        return;
      }
      logPermissionModeChanged({
        from: "plan",
        to: nextMode,
        trigger: "exit_plan_mode",
      });
      logEvent("tengu_plan_exit", {
        planLengthChars: planText.length,
        outcome: fromEnum(value),
        clearContext: false,
        hasFeedback: !!acceptFeedback,
      });
      setHasExitedPlanMode(true);
      setNeedsPlanModeExitAttachment(true);
      if (answer(toResult()) !== false) announcePermissionMode(nextMode);
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
              limits: imageLimitsForModel(model),
            });
            return block;
          }),
        );
      if (answer(toResult(imageBlocks)) === false) return;
      logEvent("tengu_plan_exit", {
        planLengthChars: planText.length,
        outcome: lit_2("no"),
      });
      return;
    }
  }
  let onCancel = useCallback(() => {
    if (plan_2() || refusedWithin()) {
      noteRefused();
      return;
    }
    if (!wouldTakeAnswer()) return;
    logEvent("tengu_plan_exit", {
      planLengthChars: planText.length,
      outcome: lit_2("no"),
    });
    answer({
      behavior: "deny",
    });
  }, [answer, wouldTakeAnswer, planText.length]);
  function onEmptyPlanChoice(choice) {
    if (plan_2() || refusedWithin()) {
      noteRefused();
      return;
    }
    if (!wouldTakeAnswer()) return;
    if (choice === "yes") {
      if (defaultModeRow === null || !isConsentRow(defaultModeRow)) {
        answer({
          behavior: "deny",
        });
        return;
      }
      let nextContext = {
        behavior: "allow",
        updatedInput: {},
        permissionUpdates: defaultModeRow.applies,
      };
      if (canResumeAutoMode) {
        if (!isRemote && !(mode === "plan" && isAutoModeAvailable && canPlanReturnToAutoMode(prePlanMode))) {
          answer({
            behavior: "deny",
          });
          return;
        }
        logEvent("tengu_plan_exit", {
          planLengthChars: 0,
          outcome: lit_2("yes-resume-auto-mode"),
        });
        if (answer(nextContext) !== false && !isRemote) {
          switchToAutoMode();
          announcePermissionMode("auto");
        }
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
      if (answer(nextContext) !== false) announcePermissionMode("default");
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
      if (plan_2() || refusedWithin()) {
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
            if (result.content !== planText) setPlanEditedLocally(true);
            setPlanText(result.content);
            setPlanSaved(true);
          }
        } else {
          let result = await editPromptInEditor(planText);
          if (result.error)
            addNotification({
              key: "external-editor-error",
              kind: "warning",
              text: result.error,
              color: "warning",
              priority: "high",
            });
          if (result.content !== null && result.content !== planText) {
            setPlanText(result.content);
            setPlanSaved(true);
          }
        }
      })();
      return;
    }
    if (e.shift && e.key === "tab") {
      e.preventDefault();
      if (!canShowPlan) return;
      let shortcutChoice = showClearContext
        ? (["yes-bypass-permissions", "yes-auto-clear-context", "yes-accept-edits"].find((candidate) =>
            options_2.some((value) => value.value === candidate),
          ) ?? null)
        : approvalOptions.keepContextRows["yes-accept-edits-keep-context"] !== undefined
          ? "yes-accept-edits-keep-context"
          : approvalOptions.keepContextRows["yes-resume-auto-mode"] !== undefined
            ? "yes-resume-auto-mode"
            : approvalOptions.keepContextRows["yes-default-keep-context"] !== undefined
              ? "yes-default-keep-context"
              : null;
      if (shortcutChoice === null) return;
      handleResponse(shortcutChoice);
      return;
    }
  };
  if (isPlanEmpty)
    return jsxProd_default(PermissionDialog_2, {
      color: "planMode",
      title: "Exit plan mode?",
      requestSource: payload.requestSource,
      children: jsxProd_default_2(Box, {
        ref: containerRef,
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
              refuseInput,
              selectedValue: NO_COMMITTED_ROW,
              options: [
                {
                  label: defaultModeRow !== null ? defaultModeRow.node : "Yes",
                  value: "yes",
                },
                {
                  label: "No",
                  value: "no",
                },
              ],
              onChange: onEmptyPlanChoice,
              onCancel: () => onEmptyPlanChoice("no"),
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
        height: hasScrollViewport ? contentHeight : undefined,
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
                  planDisplay !== null
                    ? jsxProd_default(MarkdownText_2, {
                        children: planDisplay,
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
        ref: containerRef,
        flexDirection: "column",
        borderStyle: "round",
        borderColor: pickFirst("planMode", forcePlain),
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
              refuseInput,
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
          editorDisplayName &&
            jsxProd_default(Box, {
              marginTop: 1,
              children: jsxProd_default_2(Text, {
                children: [
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    children: [
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "ctrl+g",
                        action: `edit in ${editorDisplayName}`,
                      }),
                      planFilePath && ` \xB7 ${getDisplayPath(planFilePath)}`,
                    ],
                  }),
                  planSaved &&
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
