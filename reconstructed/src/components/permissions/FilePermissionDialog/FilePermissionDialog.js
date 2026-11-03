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
import { init_react_production, y, R, Q, ce } from "../../../../vendor/react/cjs/react.production.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
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

//@ chunk-18hwfzwa.js:1377043-1377047 placement
init_react_production();
//@ chunk-18hwfzwa.js:1377047-1378002 placement
/**
 * 文件权限对话框的 diff 区测量与裁剪：测量高度、生成占位行、计算可见行与展开快捷键，返回 fitted 状态。
 */
function useFittedDiffBody(content, x) {
  let ke = w(18);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [L, ee] = y(false);
  let Re;
  if (ke[0] === MEMO_CACHE_SENTINEL) {
    Re = () => ee(true);
    ke[0] = Re;
  } else Re = ke[0];
  let noteDrawn = Re;
  let He = R(null);
  let We;
  if (ke[1] === MEMO_CACHE_SENTINEL) {
    We = () => (He.current === null ? 0 : measureElement(He.current).height);
    ke[1] = We;
  } else We = ke[1];
  let measured = useMeasured(We);
  let Xe;
  if (ke[2] !== content || ke[3] !== x) {
    Xe = x ? jsonStringify(content) : "";
    ke[2] = content;
    ke[3] = x;
    ke[4] = Xe;
  } else Xe = ke[4];
  let contentKey = Xe;
  let kt;
  if (ke[5] !== measured) {
    kt = `
`.repeat(Math.max(0, measured - 1));
    ke[5] = measured;
    ke[6] = kt;
  } else kt = ke[6];
  const isCut = !isScreenReaderEnabled;
  const lateBody = L ? "drawn" : "pending";
  let Ot;
  if (ke[7] !== contentKey || ke[8] !== x || ke[9] !== isCut || ke[10] !== lateBody) {
    Ot = {
      isActive: x,
      isCut,
      contentKey,
      lateBody,
    };
    ke[7] = contentKey;
    ke[8] = x;
    ke[9] = isCut;
    ke[10] = lateBody;
    ke[11] = Ot;
  } else Ot = ke[11];
  let Et = FittedOfferBody(kt, Ot);
  let run = Et.showNextRows;
  let Lt;
  if (ke[12] !== run) {
    Lt = [
      {
        action: "app:toggleTranscript",
        run,
      },
    ];
    ke[12] = run;
    ke[13] = Lt;
  } else Lt = ke[13];
  let moreBindings = Lt;
  const rows = x
    ? countCharInString(
        Et.text,
        `
`,
      ) + 1
    : undefined;
  let io;
  if (ke[14] !== Et || ke[15] !== moreBindings || ke[16] !== rows) {
    io = {
      body: Et,
      rows,
      diffBox: He,
      moreBindings,
      noteDrawn,
    };
    ke[14] = Et;
    ke[15] = moreBindings;
    ke[16] = rows;
    ke[17] = io;
  } else io = ke[17];
  return io;
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
function FileDialogQuestion(h) {
  if (h.kind === "plain")
    return jsxProd_default(Text, {
      children: h.text,
    });
  return jsxProd_default_2(Text, {
    children: [
      "Do you want to ",
      h.verbPhrase,
      " ",
      jsxProd_default(Text, {
        bold: true,
        children: h.fileName,
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
  let toolPermissionContext = useAppState((Kn) => Kn.toolPermissionContext);
  let [theme] = useTheme();
  let [ee] = y(currentToolPermissionContext);
  let languageName = Q(() => {
    if (payload.content.kind !== "tool-use-line" || typeof payload.renderedToolUseMessage !== "string")
      return null;
    let Kn = serializeApprovalPayload(payload.renderedToolUseMessage);
    return Kn.kind === "withheld" ? String(Kn.marker) : null;
  }, [payload.content.kind, payload.renderedToolUseMessage]);
  let unaryEvent = Q(
    () =>
      payload.content.kind === "tool-use-line" &&
      payload.renderedToolUseMessage == null &&
      Object.values(payload.input).some((Kn) => {
        if (typeof Kn !== "string") return false;
        let Wn = stripInvisibleChars_3(Kn);
        return markBrokenSequences(Wn) !== Wn;
      }),
    [payload.content.kind, payload.renderedToolUseMessage, payload.input],
  );
  let paddingX = ee ? 0 : 1;
  let symlinkTarget = Q(
    () => NotebookEditPermissionRequest(payload, theme, languageName, paddingX),
    [payload, theme, languageName, paddingX],
  );
  let fittedDiffBody = useFittedDiffBody(
    payload.content,
    ee &&
      !payload.showingDiffInIDE &&
      (payload.content.kind === "file-edit-diff" ||
        payload.content.kind === "file-write-diff" ||
        payload.content.kind === "notebook-edit-diff"),
  );
  let ze = !fittedDiffBody.body.offersStanding;
  let isStandingHeld = fittedDiffBody.body.isStandingHeld;
  let toolName = Q(() => sanitizeToolNameForAnalytics(payload.toolName), [payload.toolName]);
  let { requestedMachine, runsOnMachine } = Q(
    () => getRequestedMachineForPrompt(payload.input),
    [payload.input],
  );
  let It = payload.permissionResult.inPlaceOfClassifier === true;
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
    initialFocusedType: It ? "reject" : "accept",
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
    feedbackTypeOf: (Kn) => (Kn === YES_ASK_AGAIN ? "accept" : undefined),
    toolName,
    isMcp: payload.isMcp,
  });
  let expandedPath = KillAgentsConfirm(payload.requestSource);
  let decisionReason =
    payload.permissionResult.behavior === "ask" ? payload.permissionResult.decisionReason : undefined;
  let No = decisionReason?.type === "safetyCheck" && !decisionReason.classifierApprovable;
  let vo =
    payload.isAskCappedByOrg ||
    It ||
    payload.permissionResult.oneTimeAnswersOnly === true ||
    isRemoteOrPluginAgent(payload.requestSource) ||
    payload.contentWithheld === true ||
    languageName !== null ||
    unaryEvent;
  let Yo = No || vo;
  let kn = Yo || requestedMachine !== undefined;
  let Fn = No && !vo && requestedMachine === undefined;
  let bn = !Yo && runsOnMachine !== undefined;
  let Go = payload.permissionResult.offersBlockOutsideReads === true;
  let hn = Q(
    () =>
      getFilePermissionOptions({
        filePath: payload.filePath,
        toolPermissionContext,
        operationType: payload.operationType,
        onRejectFeedbackChange: setRejectFeedback,
        onAcceptFeedbackChange: setAcceptFeedback,
        yesInputMode: acceptInputMode,
        noInputMode: rejectInputMode,
        standingRowVetoed: kn || ze,
        directoryGrantOnly: Fn && !ze,
        offerBlockOutsideReads: Go,
        onAllowOnceFeedbackChange: setAcceptFeedback_2,
        allowOnceInputMode: acceptInputMode_2,
      }),
    [
      payload.filePath,
      payload.operationType,
      kn,
      ze,
      Fn,
      Go,
      toolPermissionContext,
      acceptInputMode,
      rejectInputMode,
      setAcceptFeedback_2,
      acceptInputMode_2,
    ],
  );
  let options = Q(() => {
    let mapped = hn.map((Wn) =>
      isStandingHeld && Wn.option.type === "accept-session"
        ? {
            ...Wn,
            disabled: true,
          }
        : Wn,
    );
    return It ? preferValueFirst(mapped, "no") : mapped;
  }, [hn, isStandingHeld, It]);
  let ideDiffConfig = ce(
    (option, input) => {
      if (answer(PERMISSION_HANDLERS(option, payload, input)) === false) return false;
      if (option.type === "reject") logSubmitted("reject", input);
      else if (option.type === "accept-once") logSubmitted("accept", input);
      else if (option.type === "allow-outside-read-once") logSubmitted_2("accept", input);
      return true;
    },
    [answer, payload, logSubmitted, logSubmitted_2],
  );
  let Sn = ce(() => {
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
    let found = hn.find((Wn) => Wn.option.type === "accept-session");
    if (found && !isStandingHeld) ideDiffConfig(found.option);
  }, [
    acceptInputMode,
    rejectInputMode,
    handleInputModeToggle,
    acceptInputMode_2,
    handleInputModeToggle_2,
    hn,
    isStandingHeld,
    ideDiffConfig,
  ]);
  MessageActionsKeybindings(
    {
      "confirm:cycleMode": Sn,
    },
    {
      context: "Confirmation",
    },
  );
  let $n = payload.symlinkTarget
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
  let on = !ee || Go || payload.question.kind === "file-action";
  let _o =
    ee && payload.question.kind === "file-action"
      ? {
          ...payload.question,
          fileName: markBrokenSequences(truncatePathForDisplay_2(payload.question.fileName)),
        }
      : payload.question;
  let onChange = ce(
    (value) => {
      let selected = hn.find((opt) => opt.value === value);
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
    [hn, isStandingHeld, rejectFeedback, acceptFeedback, acceptFeedback_2, ideDiffConfig],
  );
  let onCancel = ce(() => {
    if (
      ideDiffConfig({
        type: "reject",
      }) === false
    )
      return;
    logEscape();
  }, [logEscape, ideDiffConfig]);
  let wn = payload.showingDiffInIDE
    ? approvalLabelTemplate`Opened changes in ${safeLabel(payload.ideName ?? "IDE")} \u29C9`
    : undefined;
  let children = jsxProd_default_2(Fragment, {
    children: [
      jsxProd_default_2(PermissionDialog_2, {
        title: ee
          ? payload.title
          : (wn ??
            (runsOnMachine !== undefined ? `${payload.title} (runs on ${runsOnMachine})` : payload.title)),
        subtitle:
          ee && payload.subtitle !== undefined ? markBrokenSequences(payload.subtitle) : payload.subtitle,
        innerPaddingX: 0,
        requestSource: payload.requestSource,
        frame: ee
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
          $n,
          payload.permissionResult.denialLimitFallback !== undefined &&
            jsxProd_default(Box, {
              paddingX,
              children: jsxProd_default(PermissionRuleExplanation, {
                permissionResult: payload.permissionResult,
                toolType: "edit",
              }),
            }),
          payload.showingDiffInIDE
            ? (ee || getNativeCSIuTerminalDisplayName_2()) &&
              jsxProd_default_2(Box, {
                flexDirection: "column",
                paddingX,
                marginBottom: 1,
                children: [
                  ee &&
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: wn,
                    }),
                  getNativeCSIuTerminalDisplayName_2() &&
                    jsxProd_default(Text, {
                      dimColor: true,
                      children: "Save file to continue\u2026",
                    }),
                ],
              })
            : ee
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
          Go &&
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
              It &&
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
              on && FileDialogQuestion(_o),
              bn &&
                jsxProd_default(Text, {
                  dimColor: true,
                  children: ASK_FIRST_REASON_TEXTS["card.standing_unavailable"]({
                    name: runsOnMachine,
                    kind: "file",
                  }),
                }),
              jsxProd_default(ModelSelector, {
                hideIndexes: It,
                selectedValue: NO_COMMITTED_ROW,
                options,
                inlineDescriptions: true,
                onChange,
                onCancel,
                onFocus: (value_0) => {
                  handleFocus(value_0);
                  handleFocus_2(value_0);
                },
                onInputModeToggle: (Kn) => {
                  handleInputModeToggle(Kn);
                  handleInputModeToggle_2(Kn);
                },
              }),
            ],
          }),
        ],
      }),
      !ee &&
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
      isFitted: ee,
      moreBindings: fittedDiffBody.moreBindings,
      body: fittedDiffBody.body,
    },
    children,
  });
}
export { FilePermissionDialog };
