/**
 * components/permissions/FilePermissionDialog/FilePermissionDialog.tsx
 *
 * 文件类权限对话框（Edit/Write/NotebookEdit/读外部文件）：diff 预览或 IDE diff、选项（允许一次/本会话允许编辑/拒绝）与 shift+tab 切模式。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/FilePermissionDialog/FilePermissionDialog.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { resolve, resolve as resolve_2, resolve as resolve_3 } from "path";
import { useAppState } from "../../../state/AppState.js";
import { useTheme } from "../../design-system/ThemeProvider.js";
import { y, Q, ce } from "../../../../vendor/react/cjs/react.production.js";
import { tE } from "../../../utils/permissions/currentPermissionContext.js";
import {
  serializeApprovalPayload,
  markBrokenSequences,
  approvalLabelTemplate,
  safeLabel,
} from "../../../utils/permissions/approvalPayloadSerialization.js";
import { hr, truncatePathForDisplay } from "../../../utils/invisibleChars.js";
import { NotebookEditPermissionRequest } from "../NotebookEditPermissionRequest/NotebookEditPermissionRequest.js";
import { useFittedDiffBody, FittedDiffBody } from "./_new/useFittedDiffBody.js";
import { sanitizeToolNameForAnalytics } from "../../../services/analytics/metadata.js";
import { getRequestedMachineForPrompt } from "../../../bridge/deviceRegistration.js";
import { useShellPermissionFeedback } from "../useShellPermissionFeedback.js";
import { ShowInIDEPrompt } from "../../ShowInIDEPrompt.js";
import { YES_ASK_AGAIN, getFilePermissionOptions } from "./permissionOptions.js";
import { KillAgentsConfirm } from "../../KillAgentsConfirm.js";
import { isRemoteOrPluginAgent, preferValueFirst } from "../../../utils/agentContext.js";
import { PERMISSION_HANDLERS } from "./usePermissionHandler.js";
import { MessageActionsKeybindings } from "../../messageActions.js";
import {
  e,
  r,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { isPathWithinCaseAware } from "../../../utils/pathPrefix.js";
import { uppercaseDriveLetter } from "../../../utils/ide.js";
import { getCwd } from "../../../utils/cwd.js";
import { PermissionDialog_2 } from "../PermissionDialog.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { PermissionRuleExplanation, MAX_EXPLANATION_LINES } from "../PermissionRuleExplanation.js";
import { getNativeCSIuTerminalDisplayName_2 } from "../../../commands/terminalSetup/terminalSetup.js";
import { tyt, FileDialogQuestion } from "./_new/FileDialogQuestion.js";
import { getOutsideReadsExplainer } from "../permissionCardKinds.js";
import { sandboxReadBlockApplies } from "../../../utils/sandbox/sandbox-adapter.js";
import { DenialLimitFallbackNotice } from "../UnattendedAutoBlockNotice.js";
import { ASK_FIRST_REASON_TEXTS } from "../../../utils/permissions/askFirstReasons.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../CustomSelect/select.js";
import { Byline } from "../../design-system/Byline.js";
import { FittedBodyKeybindings } from "../BashPermissionRequest/commandDisplay.js";

/**
 * 文件权限对话框：根据工具类型选择 file-edit-diff/file-write-diff/notebook-edit-diff 预览（或 IDE 中显示 diff），选项由 getFilePermissionOptions 生成，处理器表 PERMISSION_HANDLERS。
 */
//@ chunk-18hwfzwa.js:1380440-1386191 fingerprint = FilePermissionDialog (0.316)
function FilePermissionDialog({ payload: payload, answer: answer }) {
  let toolPermissionContext = useAppState((Kn) => Kn.toolPermissionContext),
    [L] = useTheme(),
    [ee] = y(tE),
    languageName = Q(() => {
      if (payload.content.kind !== "tool-use-line" || typeof payload.renderedToolUseMessage !== "string")
        return null;
      let Kn = serializeApprovalPayload(payload.renderedToolUseMessage);
      return Kn.kind === "withheld" ? String(Kn.marker) : null;
    }, [payload.content.kind, payload.renderedToolUseMessage]),
    unaryEvent = Q(
      () =>
        payload.content.kind === "tool-use-line" &&
        payload.renderedToolUseMessage == null &&
        Object.values(payload.input).some((Kn) => {
          if (typeof Kn !== "string") return !1;
          let Wn = hr(Kn);
          return markBrokenSequences(Wn) !== Wn;
        }),
      [payload.content.kind, payload.renderedToolUseMessage, payload.input],
    ),
    Be = ee ? 0 : 1,
    symlinkTarget = Q(
      () => NotebookEditPermissionRequest(payload, L, languageName, Be),
      [payload, L, languageName, Be],
    ),
    We = useFittedDiffBody(
      payload.content,
      ee &&
        !payload.showingDiffInIDE &&
        (payload.content.kind === "file-edit-diff" ||
          payload.content.kind === "file-write-diff" ||
          payload.content.kind === "notebook-edit-diff"),
    ),
    ze = !We.body.offersStanding,
    isStandingHeld = We.body.isStandingHeld,
    rt = Q(() => sanitizeToolNameForAnalytics(payload.toolName), [payload.toolName]),
    { requestedMachine: requestedMachine, runsOnMachine: runsOnMachine } = Q(
      () => getRequestedMachineForPrompt(payload.input),
      [payload.input],
    ),
    It = payload.permissionResult.inPlaceOfClassifier === !0,
    {
      acceptFeedback: acceptFeedback,
      rejectFeedback: rejectFeedback,
      setAcceptFeedback: setAcceptFeedback,
      setRejectFeedback: setRejectFeedback,
      acceptInputMode: acceptInputMode,
      rejectInputMode: rejectInputMode,
      handleInputModeToggle: handleInputModeToggle,
      handleFocus: handleFocus,
      logSubmitted: logSubmitted,
      logEscape: logEscape,
      hintNode: hintNode,
    } = useShellPermissionFeedback({
      feedbackTypeOf: ShowInIDEPrompt,
      toolName: rt,
      isMcp: payload.isMcp,
      initialFocusedType: It ? "reject" : "accept",
    }),
    {
      acceptFeedback: acceptFeedback_2,
      setAcceptFeedback: setAcceptFeedback_2,
      acceptInputMode: acceptInputMode_2,
      handleInputModeToggle: handleInputModeToggle_2,
      handleFocus: handleFocus_2,
      logSubmitted: logSubmitted_2,
      hintNode: hintNode_2,
    } = useShellPermissionFeedback({
      feedbackTypeOf: (Kn) => (Kn === YES_ASK_AGAIN ? "accept" : void 0),
      toolName: rt,
      isMcp: payload.isMcp,
    }),
    expandedPath = KillAgentsConfirm(payload.requestSource),
    Cn = payload.permissionResult.behavior === "ask" ? payload.permissionResult.decisionReason : void 0,
    No = Cn?.type === "safetyCheck" && !Cn.classifierApprovable,
    vo =
      payload.isAskCappedByOrg ||
      It ||
      payload.permissionResult.oneTimeAnswersOnly === !0 ||
      isRemoteOrPluginAgent(payload.requestSource) ||
      payload.contentWithheld === !0 ||
      languageName !== null ||
      unaryEvent,
    Yo = No || vo,
    kn = Yo || requestedMachine !== void 0,
    Fn = No && !vo && requestedMachine === void 0,
    bn = !Yo && runsOnMachine !== void 0,
    Go = payload.permissionResult.offersBlockOutsideReads === !0,
    hn = Q(
      () =>
        getFilePermissionOptions({
          filePath: payload.filePath,
          toolPermissionContext: toolPermissionContext,
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
    ),
    Mn = Q(() => {
      let mapped = hn.map((Wn) =>
        isStandingHeld && Wn.option.type === "accept-session" ? { ...Wn, disabled: !0 } : Wn,
      );
      return It ? preferValueFirst(mapped, "no") : mapped;
    }, [hn, isStandingHeld, It]),
    ideDiffConfig = ce(
      (option, input) => {
        if (answer(PERMISSION_HANDLERS(option, payload, input)) === !1) return !1;
        if (option.type === "reject") logSubmitted("reject", input);
        else if (option.type === "accept-once") logSubmitted("accept", input);
        else if (option.type === "allow-outside-read-once") logSubmitted_2("accept", input);
        return !0;
      },
      [answer, payload, logSubmitted, logSubmitted_2],
    ),
    Sn = ce(() => {
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
  MessageActionsKeybindings({ "confirm:cycleMode": Sn }, { context: "Confirmation" });
  let $n = payload.symlinkTarget
      ? e(Box, {
          paddingX: Be,
          marginBottom: 1,
          children: e(Text, {
            color: "warning",
            children: !isPathWithinCaseAware(
              uppercaseDriveLetter(resolve(payload.symlinkTarget)),
              uppercaseDriveLetter(resolve(payload.workingDir ?? getCwd())),
              !1,
            )
              ? `This will ${payload.operationType === "read" ? "read" : "modify"} ${truncatePathForDisplay(payload.symlinkTarget)} (outside working directory) via a symlink`
              : `Symlink target: ${truncatePathForDisplay(payload.symlinkTarget)}`,
          }),
        })
      : payload.symlinkUnchecked
        ? e(Box, {
            paddingX: 1,
            marginBottom: 1,
            children: e(Text, {
              color: "warning",
              children: "Could not check where this path leads on disk",
            }),
          })
        : null,
    on = !ee || Go || payload.question.kind === "file-action",
    _o =
      ee && payload.question.kind === "file-action"
        ? {
            ...payload.question,
            fileName: markBrokenSequences(truncatePathForDisplay(payload.question.fileName)),
          }
        : payload.question,
    cn = ce(
      (value) => {
        let selected = hn.find((opt) => opt.value === value);
        if (!selected || (isStandingHeld && selected.option.type === "accept-session")) return !1;
        if (selected.option.type === "reject") {
          let trimmedFeedback = rejectFeedback.trim();
          return ideDiffConfig(selected.option, trimmedFeedback || void 0);
        }
        if (selected.option.type === "accept-once") {
          let trimmedFeedback_0 = acceptFeedback.trim();
          return ideDiffConfig(selected.option, trimmedFeedback_0 || void 0);
        }
        if (selected.option.type === "allow-outside-read-once") {
          let trimmed = acceptFeedback_2.trim();
          return ideDiffConfig(selected.option, trimmed || void 0);
        }
        return ideDiffConfig(selected.option);
      },
      [hn, isStandingHeld, rejectFeedback, acceptFeedback, acceptFeedback_2, ideDiffConfig],
    ),
    Dn = ce(() => {
      if (ideDiffConfig({ type: "reject" }) === !1) return;
      logEscape();
    }, [logEscape, ideDiffConfig]),
    wn = payload.showingDiffInIDE
      ? approvalLabelTemplate`Opened changes in ${safeLabel(payload.ideName ?? "IDE")} \u29C9`
      : void 0,
    mr = r(Fragment, {
      children: [
        r(PermissionDialog_2, {
          title: ee
            ? payload.title
            : (wn ??
              (runsOnMachine !== void 0 ? `${payload.title} (runs on ${runsOnMachine})` : payload.title)),
          subtitle:
            ee && payload.subtitle !== void 0 ? markBrokenSequences(payload.subtitle) : payload.subtitle,
          innerPaddingX: 0,
          requestSource: payload.requestSource,
          frame: ee
            ? {
                onCancel: Dn,
                titleSuffix: runsOnMachine === void 0 ? void 0 : `runs on ${runsOnMachine}`,
                hints: [
                  (hintNode || hintNode_2) &&
                    e(
                      KeyboardShortcutHint,
                      { chord: "tab", action: "amend", terse: !0, format: { keyCase: "lower" } },
                      "amend",
                    ),
                  expandedPath,
                ],
              }
            : void 0,
          children: [
            $n,
            payload.permissionResult.denialLimitFallback !== void 0 &&
              e(Box, {
                paddingX: Be,
                children: e(PermissionRuleExplanation, {
                  permissionResult: payload.permissionResult,
                  toolType: "edit",
                }),
              }),
            payload.showingDiffInIDE
              ? (ee || getNativeCSIuTerminalDisplayName_2()) &&
                r(Box, {
                  flexDirection: "column",
                  paddingX: Be,
                  marginBottom: 1,
                  children: [
                    ee && e(Text, { dimColor: !0, children: wn }),
                    getNativeCSIuTerminalDisplayName_2() &&
                      e(Text, { dimColor: !0, children: "Save file to continue\u2026" }),
                  ],
                })
              : ee
                ? e(FittedDiffBody, { fitted: We, children: symlinkTarget })
                : symlinkTarget,
            payload.memoryItemHeader === !0 &&
              tyt() !== "" &&
              e(Box, { paddingX: Be, marginBottom: 1, children: e(Text, { dimColor: !0, children: tyt() }) }),
            Go &&
              e(Box, {
                paddingX: Be,
                marginBottom: 1,
                children: e(Text, {
                  dimColor: !0,
                  children: getOutsideReadsExplainer(sandboxReadBlockApplies()),
                }),
              }),
            r(Box, {
              flexDirection: "column",
              paddingX: Be,
              children: [
                It &&
                  e(PermissionRuleExplanation, {
                    permissionResult: payload.permissionResult,
                    toolType: "edit",
                    rowBudget: MAX_EXPLANATION_LINES,
                  }),
                payload.permissionResult.denialLimitFallback === void 0 &&
                  payload.permissionResult.autoDenyWindow !== void 0 &&
                  e(DenialLimitFallbackNotice, { permissionResult: payload.permissionResult }),
                on && FileDialogQuestion(_o),
                bn &&
                  e(Text, {
                    dimColor: !0,
                    children: ASK_FIRST_REASON_TEXTS["card.standing_unavailable"]({
                      name: runsOnMachine,
                      kind: "file",
                    }),
                  }),
                e(ModelSelector, {
                  hideIndexes: It,
                  selectedValue: NO_COMMITTED_ROW,
                  options: Mn,
                  inlineDescriptions: !0,
                  onChange: cn,
                  onCancel: Dn,
                  onFocus: (value_0) => {
                    (handleFocus(value_0), handleFocus_2(value_0));
                  },
                  onInputModeToggle: (Kn) => {
                    (handleInputModeToggle(Kn), handleInputModeToggle_2(Kn));
                  },
                }),
              ],
            }),
          ],
        }),
        !ee &&
          e(Box, {
            paddingX: 1,
            marginTop: 1,
            children: e(Text, {
              dimColor: !0,
              wrap: expandedPath ? "truncate" : void 0,
              children: r(Byline, {
                children: [
                  e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
                  hintNode || hintNode_2,
                  expandedPath,
                ],
              }),
            }),
          }),
      ],
    });
  return e(FittedBodyKeybindings, {
    fitted: { isFitted: ee, moreBindings: We.moreBindings, body: We.body },
    children: mr,
  });
}

export { FilePermissionDialog };
