/**
 * components/permissions/FilePermissionDialog/FilePermissionDialog.tsx
 *
 * 文件类权限对话框（Edit/Write/NotebookEdit/读外部文件）：diff 预览或 IDE diff、选项（允许一次/本会话允许编辑/拒绝）与 shift+tab 切模式。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/FilePermissionDialog/FilePermissionDialog.tsx
 * pieces: chunk-18hwfzwa.js (6)
 * attribution: placement 5, fingerprint 1
 */
import { resolve } from "path";
import {
  init_react_production,
  useState,
  useRef,
  useMemo,
  useCallback,
} from "../../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { measureElement } from "../../../ink/hooks/useTerminalHooks.js";
import { useMeasured } from "../../../ink/components/Input.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { FittedOfferBody } from "../../AutocompactOfferDialog.js";
import { countCharInString } from "../../../utils/stringUtils.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { exitCleanupCallbackRef } from "../FolderAccessPermissionRequest.js";
import { SeeMoreHint, FittedBodyKeybindings } from "../BashPermissionRequest/commandDisplay.js";
import { useAppState } from "../../../state/AppState.js";
import { useTheme } from "../../design-system/ThemeProvider.js";
import { currentToolPermissionContext } from "../../../utils/permissions/currentPermissionContext.js";
import {
  serializeApprovalPayload,
  markBrokenSequences,
  approvalLabelTemplate,
  safeLabel,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import {
  stripInvisibleChars as stripInvisibleChars_3,
  truncatePathForDisplay_2,
} from "../../../utils/invisibleChars.js";
import { NotebookEditPermissionRequest } from "../NotebookEditPermissionRequest/NotebookEditPermissionRequest.js";
import { sanitizeToolNameForAnalytics } from "../../../services/analytics/metadata.js";
import { getRequestedMachineForPrompt } from "../../../bridge/deviceRegistration.js";
import { useShellPermissionFeedback } from "../useShellPermissionFeedback.js";
import { ShowInIDEPrompt } from "../../ShowInIDEPrompt.js";
import { YES_ASK_AGAIN, getFilePermissionOptions } from "./permissionOptions.js";
import { KillAgentsConfirm } from "../../KillAgentsConfirm.js";
import { isRemoteOrPluginAgent, preferValueFirst } from "../../../utils/agentContext.js";
import { PERMISSION_HANDLERS } from "./usePermissionHandler.js";
import { MessageActionsKeybindings } from "../../messageActions.js";
import { isPathWithinCaseAware } from "../../../utils/pathPrefix.js";
import { uppercaseDriveLetter } from "../../../utils/ide.js";
import { getCwd } from "../../../utils/cwd.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { PermissionRuleExplanation, MAX_EXPLANATION_LINES } from "../PermissionRuleExplanation.js";
import { getNativeCSIuTerminalDisplayName_2 } from "../../../commands/terminalSetup/terminalSetup.js";
import { getOutsideReadsExplainer } from "../permissionCardKinds.js";
import { sandboxReadBlockApplies } from "../../../utils/sandbox/sandbox-adapter.js";
import { DenialLimitFallbackNotice } from "../UnattendedAutoBlockNotice.js";
import { ASK_FIRST_REASON_TEXTS } from "../../../utils/permissions/askFirstReasons.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../CustomSelect/select.js";
import { Byline } from "../../design-system/Byline.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1377043-1377047 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1377043", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1377047-1378002 placement
/**
 * 文件权限对话框的 diff 区测量与裁剪：测量高度、生成占位行、计算可见行与展开快捷键，返回 fitted 状态。
 */
function useFittedDiffBody(content, isActive) {
  let $ = useMemoCache(18);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [isDrawn, setIsDrawn] = useState(false);
  let noteDrawn;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    noteDrawn = () => setIsDrawn(true);
    $[0] = noteDrawn;
  } else noteDrawn = $[0];
  let noteDrawn_2 = noteDrawn;
  let diffBoxRef = useRef(null);
  let measureHeight;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    measureHeight = () => (diffBoxRef.current === null ? 0 : measureElement(diffBoxRef.current).height);
    $[1] = measureHeight;
  } else measureHeight = $[1];
  let measured = useMeasured(measureHeight);
  let contentKey;
  if ($[2] !== content || $[3] !== isActive) {
    contentKey = isActive ? jsonStringify(content) : "";
    $[2] = content;
    $[3] = isActive;
    $[4] = contentKey;
  } else contentKey = $[4];
  let contentKey_2 = contentKey;
  let paddedBody;
  if ($[5] !== measured) {
    paddedBody = `
`.repeat(Math.max(0, measured - 1));
    $[5] = measured;
    $[6] = paddedBody;
  } else paddedBody = $[6];
  const isCut = !isScreenReaderEnabled;
  const lateBody = isDrawn ? "drawn" : "pending";
  let bodyOptions;
  if ($[7] !== contentKey_2 || $[8] !== isActive || $[9] !== isCut || $[10] !== lateBody) {
    bodyOptions = {
      isActive,
      isCut,
      contentKey: contentKey_2,
      lateBody,
    };
    $[7] = contentKey_2;
    $[8] = isActive;
    $[9] = isCut;
    $[10] = lateBody;
    $[11] = bodyOptions;
  } else bodyOptions = $[11];
  let body = FittedOfferBody(paddedBody, bodyOptions);
  let run = body.showNextRows;
  let moreBindings;
  if ($[12] !== run) {
    moreBindings = [
      {
        action: "app:toggleTranscript",
        run,
      },
    ];
    $[12] = run;
    $[13] = moreBindings;
  } else moreBindings = $[13];
  let moreBindings_2 = moreBindings;
  const rows = isActive
    ? countCharInString(
        body.text,
        `
`,
      ) + 1
    : undefined;
  let fitted;
  if ($[14] !== body || $[15] !== moreBindings_2 || $[16] !== rows) {
    fitted = {
      body,
      rows,
      diffBox: diffBoxRef,
      moreBindings: moreBindings_2,
      noteDrawn: noteDrawn_2,
    };
    $[14] = body;
    $[15] = moreBindings_2;
    $[16] = rows;
    $[17] = fitted;
  } else fitted = $[17];
  return fitted;
}
//@ chunk-18hwfzwa.js:1378002-1378346 placement
/**
 * 按 fitted 状态裁剪显示 diff（负 marginTop 实现滚动），下方加 "see more" 提示。
 */
function FittedDiffBody({ fitted, children }) {
  return jsxProd_default_2(Box, {
    ref: fitted.body.box,
    flexDirection: "column",
    children: [
      jsxProd_default(Box, {
        ref: fitted.body.textBox,
        flexDirection: "column",
        overflowY: "hidden",
        height: fitted.rows,
        children: jsxProd_default(Box, {
          ref: fitted.diffBox,
          flexDirection: "column",
          flexShrink: 0,
          marginTop: -fitted.body.hiddenAbove,
          children: jsxProd_default(exitCleanupCallbackRef, {
            value: fitted.noteDrawn,
            children,
          }),
        }),
      }),
      jsxProd_default(SeeMoreHint, {
        body: fitted.body,
      }),
    ],
  });
}
//@ chunk-18hwfzwa.js:1378871-1378895 placement
function emptyQuestionTitle() {
  return "";
}
//@ chunk-18hwfzwa.js:1378895-1379060 placement
/**
 * 渲染文件权限对话框的问题文本："Do you want to <动作> <文件名>?"（文件名加粗）或纯文本。
 */
function FileDialogQuestion(question) {
  if (question.kind === "plain")
    return jsxProd_default(Text, {
      children: question.text,
    });
  return jsxProd_default_2(Text, {
    children: [
      "Do you want to ",
      question.verbPhrase,
      " ",
      jsxProd_default(Text, {
        bold: true,
        children: question.fileName,
      }),
      "?",
    ],
  });
}
//@ chunk-18hwfzwa.js:1380440-1386191 fingerprint = FilePermissionDialog (0.316)
/**
 * 文件权限对话框：根据工具类型选择 file-edit-diff/file-write-diff/notebook-edit-diff 预览（或 IDE 中显示 diff），选项由 getFilePermissionOptions 生成，处理器表 PERMISSION_HANDLERS。
 */
function FilePermissionDialog({ payload, answer }) {
  let toolPermissionContext = useAppState((appState) => appState.toolPermissionContext);
  let [theme] = useTheme();
  let [isFitted] = useState(currentToolPermissionContext);
  let languageName = useMemo(() => {
    if (payload.content.kind !== "tool-use-line" || typeof payload.renderedToolUseMessage !== "string")
      return null;
    let serialized = serializeApprovalPayload(payload.renderedToolUseMessage);
    return serialized.kind === "withheld" ? String(serialized.marker) : null;
  }, [payload.content.kind, payload.renderedToolUseMessage]);
  let unaryEvent = useMemo(
    () =>
      payload.content.kind === "tool-use-line" &&
      payload.renderedToolUseMessage == null &&
      Object.values(payload.input).some((value) => {
        if (typeof value !== "string") return false;
        let sanitized = stripInvisibleChars_3(value);
        return markBrokenSequences(sanitized) !== sanitized;
      }),
    [payload.content.kind, payload.renderedToolUseMessage, payload.input],
  );
  let paddingX = isFitted ? 0 : 1;
  let symlinkTarget = useMemo(
    () => NotebookEditPermissionRequest(payload, theme, languageName, paddingX),
    [payload, theme, languageName, paddingX],
  );
  let fittedDiffBody = useFittedDiffBody(
    payload.content,
    isFitted &&
      !payload.showingDiffInIDE &&
      (payload.content.kind === "file-edit-diff" ||
        payload.content.kind === "file-write-diff" ||
        payload.content.kind === "notebook-edit-diff"),
  );
  let standingVetoed = !fittedDiffBody.body.offersStanding;
  let isStandingHeld = fittedDiffBody.body.isStandingHeld;
  let toolName = useMemo(() => sanitizeToolNameForAnalytics(payload.toolName), [payload.toolName]);
  let { requestedMachine, runsOnMachine } = useMemo(
    () => getRequestedMachineForPrompt(payload.input),
    [payload.input],
  );
  let hideIndexes = payload.permissionResult.inPlaceOfClassifier === true;
  let {
    acceptFeedback,
    rejectFeedback,
    setAcceptFeedback,
    setRejectFeedback,
    acceptInputMode,
    rejectInputMode,
    handleInputModeToggle,
    handleFocus,
    logSubmitted,
    logEscape,
    hintNode,
  } = useShellPermissionFeedback({
    feedbackTypeOf: ShowInIDEPrompt,
    toolName,
    isMcp: payload.isMcp,
    initialFocusedType: hideIndexes ? "reject" : "accept",
  });
  let {
    acceptFeedback: acceptFeedback_2,
    setAcceptFeedback: setAcceptFeedback_2,
    acceptInputMode: acceptInputMode_2,
    handleInputModeToggle: handleInputModeToggle_2,
    handleFocus: handleFocus_2,
    logSubmitted: logSubmitted_2,
    hintNode: hintNode_2,
  } = useShellPermissionFeedback({
    feedbackTypeOf: (option) => (option === YES_ASK_AGAIN ? "accept" : undefined),
    toolName,
    isMcp: payload.isMcp,
  });
  let expandedPath = KillAgentsConfirm(payload.requestSource);
  let decisionReason =
    payload.permissionResult.behavior === "ask" ? payload.permissionResult.decisionReason : undefined;
  let isSafetyCheck = decisionReason?.type === "safetyCheck" && !decisionReason.classifierApprovable;
  let noStanding =
    payload.isAskCappedByOrg ||
    hideIndexes ||
    payload.permissionResult.oneTimeAnswersOnly === true ||
    isRemoteOrPluginAgent(payload.requestSource) ||
    payload.contentWithheld === true ||
    languageName !== null ||
    unaryEvent;
  let noStanding_2 = isSafetyCheck || noStanding;
  let veto = noStanding_2 || requestedMachine !== undefined;
  let directoryGrantOnly = isSafetyCheck && !noStanding && requestedMachine === undefined;
  let showUnavailableReason = !noStanding_2 && runsOnMachine !== undefined;
  let offersBlockOutsideReads = payload.permissionResult.offersBlockOutsideReads === true;
  let optionEntries = useMemo(
    () =>
      getFilePermissionOptions({
        filePath: payload.filePath,
        toolPermissionContext,
        operationType: payload.operationType,
        onRejectFeedbackChange: setRejectFeedback,
        onAcceptFeedbackChange: setAcceptFeedback,
        yesInputMode: acceptInputMode,
        noInputMode: rejectInputMode,
        standingRowVetoed: veto || standingVetoed,
        directoryGrantOnly: directoryGrantOnly && !standingVetoed,
        offerBlockOutsideReads: offersBlockOutsideReads,
        onAllowOnceFeedbackChange: setAcceptFeedback_2,
        allowOnceInputMode: acceptInputMode_2,
      }),
    [
      payload.filePath,
      payload.operationType,
      veto,
      standingVetoed,
      directoryGrantOnly,
      offersBlockOutsideReads,
      toolPermissionContext,
      acceptInputMode,
      rejectInputMode,
      setAcceptFeedback_2,
      acceptInputMode_2,
    ],
  );
  let options = useMemo(() => {
    let suggestions = optionEntries.map((entry) =>
      isStandingHeld && entry.option.type === "accept-session"
        ? {
            ...entry,
            disabled: true,
          }
        : entry,
    );
    return hideIndexes ? preferValueFirst(suggestions, "no") : suggestions;
  }, [optionEntries, isStandingHeld, hideIndexes]);
  let ideDiffConfig = useCallback(
    (option, input) => {
      if (answer(PERMISSION_HANDLERS(option, payload, input)) === false) return false;
      if (option.type === "reject") logSubmitted("reject", input);
      else if (option.type === "accept-once") logSubmitted("accept", input);
      else if (option.type === "allow-outside-read-once") logSubmitted_2("accept", input);
      return true;
    },
    [answer, payload, logSubmitted, logSubmitted_2],
  );
  let onCycleMode = useCallback(() => {
    if (acceptInputMode) {
      handleInputModeToggle("yes");
      return;
    }
    if (rejectInputMode) {
      handleInputModeToggle("no");
      return;
    }
    if (acceptInputMode_2) {
      handleInputModeToggle_2(YES_ASK_AGAIN);
      return;
    }
    let found = optionEntries.find((entry) => entry.option.type === "accept-session");
    if (found && !isStandingHeld) ideDiffConfig(found.option);
  }, [
    acceptInputMode,
    rejectInputMode,
    handleInputModeToggle,
    acceptInputMode_2,
    handleInputModeToggle_2,
    optionEntries,
    isStandingHeld,
    ideDiffConfig,
  ]);
  MessageActionsKeybindings(
    {
      "confirm:cycleMode": onCycleMode,
    },
    {
      context: "Confirmation",
    },
  );
  let symlinkNotice = payload.symlinkTarget
    ? jsxProd_default(Box, {
        paddingX,
        marginBottom: 1,
        children: jsxProd_default(Text, {
          color: "warning",
          children: !isPathWithinCaseAware(
            uppercaseDriveLetter(resolve(payload.symlinkTarget)),
            uppercaseDriveLetter(resolve(payload.workingDir ?? getCwd())),
            false,
          )
            ? `This will ${payload.operationType === "read" ? "read" : "modify"} ${truncatePathForDisplay_2(payload.symlinkTarget)} (outside working directory) via a symlink`
            : `Symlink target: ${truncatePathForDisplay_2(payload.symlinkTarget)}`,
        }),
      })
    : payload.symlinkUnchecked
      ? jsxProd_default(Box, {
          paddingX: 1,
          marginBottom: 1,
          children: jsxProd_default(Text, {
            color: "warning",
            children: "Could not check where this path leads on disk",
          }),
        })
      : null;
  let showQuestion = !isFitted || offersBlockOutsideReads || payload.question.kind === "file-action";
  let question =
    isFitted && payload.question.kind === "file-action"
      ? {
          ...payload.question,
          fileName: markBrokenSequences(truncatePathForDisplay_2(payload.question.fileName)),
        }
      : payload.question;
  let onChange = useCallback(
    (value) => {
      let selected = optionEntries.find((opt) => opt.value === value);
      if (!selected || (isStandingHeld && selected.option.type === "accept-session")) return false;
      if (selected.option.type === "reject") {
        let trimmedFeedback = rejectFeedback.trim();
        return ideDiffConfig(selected.option, trimmedFeedback || undefined);
      }
      if (selected.option.type === "accept-once") {
        let trimmedFeedback = acceptFeedback.trim();
        return ideDiffConfig(selected.option, trimmedFeedback || undefined);
      }
      if (selected.option.type === "allow-outside-read-once") {
        let trimmed = acceptFeedback_2.trim();
        return ideDiffConfig(selected.option, trimmed || undefined);
      }
      return ideDiffConfig(selected.option);
    },
    [optionEntries, isStandingHeld, rejectFeedback, acceptFeedback, acceptFeedback_2, ideDiffConfig],
  );
  let onCancel = useCallback(() => {
    if (
      ideDiffConfig({
        type: "reject",
      }) === false
    )
      return;
    logEscape();
  }, [logEscape, ideDiffConfig]);
  let ideLabel = payload.showingDiffInIDE
    ? approvalLabelTemplate`Opened changes in ${safeLabel(payload.ideName ?? "IDE")} \u29C9`
    : undefined;
  let children = jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default_2(PermissionDialog_2, {
        title: isFitted
          ? payload.title
          : (ideLabel ??
            (runsOnMachine !== undefined ? `${payload.title} (runs on ${runsOnMachine})` : payload.title)),
        subtitle:
          isFitted && payload.subtitle !== undefined
            ? markBrokenSequences(payload.subtitle)
            : payload.subtitle,
        innerPaddingX: 0,
        requestSource: payload.requestSource,
        frame: isFitted
          ? {
              onCancel,
              titleSuffix: runsOnMachine === undefined ? undefined : `runs on ${runsOnMachine}`,
              hints: [
                (hintNode || hintNode_2) &&
                  jsxProd_default(
                    KeyboardShortcutHint,
                    {
                      chord: "tab",
                      action: "amend",
                      terse: true,
                      format: {
                        keyCase: "lower",
                      },
                    },
                    "amend",
                  ),
                expandedPath,
              ],
            }
          : undefined,
        children: [
          symlinkNotice,
          payload.permissionResult.denialLimitFallback !== undefined &&
            jsxProd_default(Box, {
              paddingX,
              children: jsxProd_default(PermissionRuleExplanation, {
                permissionResult: payload.permissionResult,
                toolType: "edit",
              }),
            }),
          payload.showingDiffInIDE
            ? (isFitted || getNativeCSIuTerminalDisplayName_2()) &&
              jsxProd_default_2(Box, {
                flexDirection: "column",
                paddingX,
                marginBottom: 1,
                children: [
                  isFitted &&
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: ideLabel,
                    }),
                  getNativeCSIuTerminalDisplayName_2() &&
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: "Save file to continue\u2026",
                    }),
                ],
              })
            : isFitted
              ? jsxProd_default(FittedDiffBody, {
                  fitted: fittedDiffBody,
                  children: symlinkTarget,
                })
              : symlinkTarget,
          payload.memoryItemHeader === true &&
            emptyQuestionTitle() !== "" &&
            jsxProd_default(Box, {
              paddingX,
              marginBottom: 1,
              children: jsxProd_default(Text, {
                dimColor: true,
                children: emptyQuestionTitle(),
              }),
            }),
          offersBlockOutsideReads &&
            jsxProd_default(Box, {
              paddingX,
              marginBottom: 1,
              children: jsxProd_default(Text, {
                dimColor: true,
                children: getOutsideReadsExplainer(sandboxReadBlockApplies()),
              }),
            }),
          jsxProd_default_2(Box, {
            flexDirection: "column",
            paddingX,
            children: [
              hideIndexes &&
                jsxProd_default(PermissionRuleExplanation, {
                  permissionResult: payload.permissionResult,
                  toolType: "edit",
                  rowBudget: MAX_EXPLANATION_LINES,
                }),
              payload.permissionResult.denialLimitFallback === undefined &&
                payload.permissionResult.autoDenyWindow !== undefined &&
                jsxProd_default(DenialLimitFallbackNotice, {
                  permissionResult: payload.permissionResult,
                }),
              showQuestion && FileDialogQuestion(question),
              showUnavailableReason &&
                jsxProd_default(Text, {
                  dimColor: true,
                  children: ASK_FIRST_REASON_TEXTS["card.standing_unavailable"]({
                    name: runsOnMachine,
                    kind: "file",
                  }),
                }),
              jsxProd_default(ModelSelector, {
                hideIndexes,
                selectedValue: NO_COMMITTED_ROW,
                options,
                inlineDescriptions: true,
                onChange,
                onCancel,
                onFocus: (value_0) => {
                  handleFocus(value_0);
                  handleFocus_2(value_0);
                },
                onInputModeToggle: (mode) => {
                  handleInputModeToggle(mode);
                  handleInputModeToggle_2(mode);
                },
              }),
            ],
          }),
        ],
      }),
      !isFitted &&
        jsxProd_default(Box, {
          paddingX: 1,
          marginTop: 1,
          children: jsxProd_default(Text, {
            dimColor: true,
            wrap: expandedPath ? "truncate" : undefined,
            children: jsxProd_default_2(Byline, {
              children: [
                jsxProd_default(KeyboardShortcutHint, {
                  chord: "escape",
                  action: "cancel",
                }),
                hintNode || hintNode_2,
                expandedPath,
              ],
            }),
          }),
        }),
    ],
  });
  return jsxProd_default(FittedBodyKeybindings, {
    fitted: {
      isFitted,
      moreBindings: fittedDiffBody.moreBindings,
      body: fittedDiffBody.body,
    },
    children,
  });
}
export { FilePermissionDialog };
