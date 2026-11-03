/**
 * components/MessageSelector.tsx
 *
 * 回退（Rewind）消息选择器：列出可选用户消息，提供"恢复代码和对话/仅对话/仅代码/从此处总结"等选项及 diff 统计。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/MessageSelector.tsx
 * pieces: chunk-18hwfzwa.js (15), chunk-wyqg6m3h.js (1)
 * attribution: affinity 1, fingerprint 8, layout 3, file-local 1, placement 3
 */
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
} from "crypto";
import * as pathModule from "path";
import {
  TURN_DIFF_COUNTING_MS,
  fileHistoryEnabled,
  fileHistoryGetDiffStats,
  RewindNoFilesRestoredError,
  fileHistoryCanRestore,
  fileHistoryGetTurnDiffStats,
  fileHistoryRewind,
  reduceFileHistoryState,
} from "../utils/fileHistory.js";
import { useAppState, Cr, useSetAppState } from "../state/AppState.js";
import { y, Q, P, ce, R } from "../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import {
  createUserMessage,
  isRealUserPromptMessage,
  getUserMessageText,
  isEmptyMessageText,
  isSyntheticMessage,
  isToolUseResultMessage,
  parseQueuedCommandAttachment,
} from "../utils/messages.js";
import { logEvent } from "../services/analytics/index.js";
import { errorMessage } from "../utils/errors.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { CompactionError } from "../services/compact/compact.js";
import { logError } from "../utils/log.js";
import { logForDebugging } from "../utils/debug.js";
import { REWIND_UNSAFE_PATH_REASON, RESTORE_FILES_CAVEAT } from "../constants/messages.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { useRegisterKeybindingContext } from "../keybindings/KeybindingContext.js";
import { nd } from "../utils/stableEmptyObject.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { Dialog } from "./design-system/Dialog.js";
import { ErrorText } from "./ErrorText.js";
import { HintText } from "./design-system/HintText.js";
import { formatRelativeTimeAgo, truncate } from "../utils/format.js";
import { Spinner } from "./Spinner.js";
import { PromptDialog } from "./hooks/PromptDialog.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { re } from "../../vendor/@inquirer/figures/dist/esm/index.js";
import { merged, pM } from "./CustomSelect/select.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../runtime/bun-runtime.js";
import { DiffStatCounts } from "./PrBadge.js";
import { jwr } from "../utils/systemReminder.js";
import { findLastCommandMessage, Xwt, extractBashInput } from "../utils/messages/apiNormalization.js";
import { truncateToLength } from "../utils/stringUtils.js";
import { isHumanTurn } from "../utils/turnOrigin.js";
import { hasCronToolUse } from "../cli/print/rateLimitForwarding.js";
import { Me } from "./design-system/ThemeProvider.js";
import { useSession } from "../context/session.js";
import { ug } from "../screens/repl/ReplEffects.js";
import { mainAgentId, getParentSessionId } from "../bootstrap/state.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import { getLastSessionLog } from "../utils/conversationRecovery.js";

//@ chunk-18hwfzwa.js:415610-415635 affinity
class Uje extends Error {}
//@ chunk-18hwfzwa.js:415635-415696 fingerprint = isSummarizeOption (1)
function isSummarizeOption(option) {
  return option === "summarize" || option === "summarize_up_to";
}
//@ chunk-18hwfzwa.js:415696-415729 layout
var REWIND = "Rewind",
  xje = "(current)";
//@ chunk-18hwfzwa.js:415729-422268 fingerprint = MessageSelector (0.642)
function MessageSelector({
  messages: messages,
  onPreRestore: onPreRestore,
  onRestoreMessage: onRestoreMessage,
  onRestoreCode: onRestoreCode,
  onSummarize: onSummarize,
  onClose: onClose,
  preselectedMessage: preselectedMessage,
  onResumePreviousSession: onResumePreviousSession,
  parentSessionId: parentSessionId,
  confirmDescription: confirmDescription,
  restoreWait: restoreWait,
  rowCountingMs: rowCountingMs = TURN_DIFF_COUNTING_MS,
}) {
  let fileHistory = useAppState((ur) => ur.fileHistory),
    [kt, At] = y(void 0),
    [It, Ot] = y(!1),
    isFileHistoryEnabled = fileHistoryEnabled(),
    { rows: rows } = useTerminalSize(),
    Lt = useIsFullscreen() ? Math.floor(rows / 2) : rows,
    oo = isFileHistoryEnabled ? 3 : 2,
    Xt = 12,
    max = Math.max(2, Math.floor((Lt - 12) / oo)),
    currentUUID = Q(randomUUID_9, []),
    messageOptions = Q(randomUUID_9, []),
    ao = !!onResumePreviousSession,
    co = Q(
      () => [
        ...(ao ? [{ ...createUserMessage({ content: "" }), uuid: messageOptions }] : []),
        ...messages.filter(isRealUserPromptMessage),
        { ...createUserMessage({ content: "" }), uuid: currentUUID },
      ],
      [messages, currentUUID, messageOptions, ao],
    ),
    bo = co.length > 1,
    [Ao, Bo] = y(void 0),
    [Ro, Ho] = y(preselectedMessage),
    [Io, Wo] = y(() => new Date()),
    [mn, Cn] = y(void 0);
  P(() => {
    if (!preselectedMessage || !isFileHistoryEnabled) return;
    let ur = !1;
    return (
      fileHistoryGetDiffStats(fileHistory, preselectedMessage.uuid).then((stats) => {
        if (!ur) Cn(stats);
      }),
      () => {
        ur = !0;
      }
    );
  }, [preselectedMessage, isFileHistoryEnabled, fileHistory]);
  let [No, vo] = y(null),
    Yo = No !== null,
    [kn, Fn] = y("both"),
    [bn, Go] = y(""),
    [hn, Mn] = y("");
  function getRestoreOptions(canRestoreCode) {
    let Ir = canRestoreCode
        ? [
            { value: "both", label: "Restore code and conversation" },
            { value: "conversation", label: "Restore conversation" },
            { value: "code", label: "Restore code" },
          ]
        : [{ value: "conversation", label: "Restore conversation" }],
      Pr = {
        type: "input",
        placeholder: "add context (optional)",
        initialValue: "",
        allowEmptySubmitToCancel: !0,
        screenReaderEmptySubmit: !0,
        showLabelWithValue: !0,
        labelValueSeparator: ": ",
      };
    if (onSummarize)
      (Ir.push({ value: "summarize", label: "Summarize from here", ...Pr, onChange: Go }),
        Ir.push({ value: "summarize_up_to", label: "Summarize up to here", ...Pr, onChange: Mn }));
    return (Ir.push({ value: "nevermind", label: "Never mind" }), Ir);
  }
  P(() => {
    logEvent("tengu_message_selector_opened", {});
  }, []);
  async function restoreConversationDirectly(message) {
    (onPreRestore(), vo("conversation"));
    try {
      (await onRestoreMessage(message), vo(null), onClose());
    } catch (error_0) {
      (logConversationRestoreError(error_0),
        vo(null),
        At(`Failed to restore the conversation:
${errorMessage(error_0)}`));
    }
  }
  async function handleSelect(message_0) {
    if (message_0.uuid === messageOptions) {
      (onPreRestore(), onClose(), onResumePreviousSession?.());
      return;
    }
    let index = messages.indexOf(message_0),
      Pr = messages.length - 1 - index;
    if (
      (logEvent("tengu_message_selector_selected", {
        index_from_end: Pr,
        message_type: fromEnum(message_0.type),
        is_current_prompt: !1,
      }),
      !messages.includes(message_0))
    ) {
      onClose();
      return;
    }
    if (!isFileHistoryEnabled) {
      if (confirmDescription === void 0) {
        await restoreConversationDirectly(message_0);
        return;
      }
      (Wo(new Date()), Ho(message_0));
      return;
    }
    let diffStats = await fileHistoryGetDiffStats(fileHistory, message_0.uuid);
    (Wo(new Date()), Ho(message_0), Cn(diffStats));
  }
  async function onSelectRestoreOption(option) {
    if ((logEvent("tengu_message_selector_restore_option_selected", { option: fromEnum(option) }), !Ro)) {
      At("Message not found.");
      return;
    }
    if (option === "nevermind") {
      if (preselectedMessage) onClose();
      else Ho(void 0);
      return;
    }
    if (isSummarizeOption(option) && onSummarize) {
      (onPreRestore(), vo(option), At(void 0), Ot(!1));
      try {
        let Ur = option === "summarize_up_to" ? "up_to" : "from",
          Zr = (Ur === "up_to" ? hn : bn).trim() || void 0;
        (await onSummarize(Ro, Zr, Ur), vo(null), Ho(void 0), onClose());
      } catch (error_1) {
        if (!(error_1 instanceof CompactionError)) logError(error_1);
        (vo(null),
          Ho(void 0),
          At(`Failed to summarize:
${errorMessage(error_1)}`));
      }
      return;
    }
    (onPreRestore(), vo(option), At(void 0), Ot(!1));
    let codeError = null,
      conversationError = null,
      ts = 0;
    if (option === "code" || option === "both")
      try {
        ts = (await onRestoreCode(Ro))?.skippedLinks ?? 0;
      } catch (error_2) {
        if (((codeError = error_2), codeError instanceof RewindNoFilesRestoredError))
          logForDebugging(`MessageSelector: rewind failed: ${codeError.message}`, { level: "error" });
        else logError(codeError);
      }
    if (option === "conversation" || option === "both")
      try {
        await onRestoreMessage(Ro);
      } catch (error_3) {
        ((conversationError = error_3), logConversationRestoreError(conversationError));
      }
    (vo(null), Ho(void 0));
    let Gn =
      ts > 0
        ? `Restored the code, but skipped ${ts} ${ts === 1 ? "file" : "files"}: ${REWIND_UNSAFE_PATH_REASON}. Skipped files were left untouched \u2014 run with --debug for the paths.`
        : void 0;
    if (conversationError && codeError)
      At(`Failed to restore the conversation and code:
${errorMessage(conversationError)}
${errorMessage(codeError)}`);
    else if (codeError)
      At(`Failed to restore the code:
${errorMessage(codeError)}`);
    else if (conversationError || Gn)
      (Ot(!conversationError),
        At(
          [
            conversationError
              ? `Failed to restore the conversation:
${errorMessage(conversationError)}`
              : void 0,
            Gn,
          ].filter(Boolean).join(`

`),
        ));
    else onClose();
  }
  let handleEscape = ce(() => {
      if (Ro && !preselectedMessage) {
        Ho(void 0);
        return;
      }
      (logEvent("tengu_message_selector_cancelled", {}), onClose());
    }, [onClose, Ro, preselectedMessage]),
    cn = useGlobalExitKeybindings(
      void 0,
      () => {
        if (!Yo || restoreWait === void 0) return !1;
        return (restoreWait.onStopWaiting(), !0);
      },
      !!Ro,
    );
  useRegisterKeybindingContext("MessageSelector", !Yo && !kt && !Ro && bo);
  let [Dn, wn] = y({}),
    mr = R(new Map());
  P(() => {
    if (!isFileHistoryEnabled || preselectedMessage) return;
    let abortController = new AbortController();
    async function Ir() {
      let Pr = {},
        ts = {
          pairCounts: mr.current,
          countUntil: performance.now() + rowCountingMs,
          signal: abortController.signal,
        };
      for (let Gn = co.length - 1; Gn >= 0; Gn--) {
        let Ur = co[Gn];
        if (Ur.uuid === currentUUID || Ur.uuid === messageOptions) continue;
        if (!fileHistoryCanRestore(fileHistory, Ur.uuid)) {
          Pr[Gn] = void 0;
          continue;
        }
        let Zr = Gn + 1;
        while (Zr < co.length - 1 && !fileHistoryCanRestore(fileHistory, co[Zr].uuid)) Zr++;
        let nextUserMessage = co.at(Zr);
        if (
          ((Pr[Gn] = await fileHistoryGetTurnDiffStats(
            fileHistory,
            Ur.uuid,
            nextUserMessage?.uuid !== currentUUID ? nextUserMessage?.uuid : void 0,
            ts,
          )),
          abortController.signal.aborted)
        )
          return;
      }
      wn(Pr);
    }
    return (
      Ir().catch(logError),
      () => {
        abortController.abort();
      }
    );
  }, [co, currentUUID, messageOptions, fileHistory, isFileHistoryEnabled, preselectedMessage, rowCountingMs]);
  let Kn = isFileHistoryEnabled && mn?.filesChanged && mn.filesChanged.length > 0,
    Wn = !kt && !Ro && !preselectedMessage && bo,
    Fr = !kt && !!Ro && bo,
    Zn = isFileHistoryEnabled
      ? "Restore the code and/or conversation to the point before\u2026"
      : "Restore the conversation to the point before\u2026",
    Un = !1,
    dr = nd(Un),
    or =
      confirmDescription !== void 0 && !isSummarizeOption(kn)
        ? e(Text, {
            dimColor: !0,
            children: kn === "nevermind" ? "The conversation will be unchanged." : confirmDescription,
          })
        : e(RestoreOptionDescription, {
            selectedRestoreOption: kn,
            canRestoreCode: !!Kn,
            diffStatsForRestore: mn,
            isOneParagraph: Un,
          }),
    pr = !!Ro && bo,
    Qn = r(Byline, {
      children: [
        !kt &&
          bo &&
          e(KeyboardShortcutHint, { chord: "enter", action: Un && Fr ? "confirm" : "continue", ...dr }),
        e(KeyboardShortcutHint, { chord: "escape", action: "cancel", ...dr }),
      ],
    });
  return r(Dialog, {
    title: Un && Fr ? REWIND : "Rewind",
    subtitle: Un && Wn ? Zn : void 0,
    color: Un && kt && !It ? "error" : "suggestion",
    onCancel: handleEscape,
    isCancelActive: !Ro || !bo,
    hideInputGuide: pr && !Un,
    inputGuide: Un
      ? (prev_1) => {
          if (!pr) return prev_1.pending ? `Press ${prev_1.keyName} again to cancel` : Qn;
          if (Yo) return " ";
          return cn.pending ? `Press ${cn.keyName} again to exit` : Qn;
        }
      : Qn,
    children: [
      Un && kt ? e(Text, { children: kt }) : e(ErrorText, { error: kt }),
      !bo && e(HintText, { children: "Nothing to rewind to yet." }),
      Fr &&
        r(Fragment, {
          children: [
            Un
              ? e(Box, {
                  paddingLeft: 2,
                  children: e(UserMessageOption, {
                    userMessage: Ro,
                    color: "text",
                    isCurrent: !1,
                    isRedesign: !0,
                    age: formatRelativeTimeAgo(new Date(Ro.timestamp), { now: Io }),
                  }),
                })
              : r(Fragment, {
                  children: [
                    r(Text, {
                      children: [
                        "Confirm you want to restore",
                        " ",
                        !mn && "the conversation ",
                        "to the point before you sent this message:",
                      ],
                    }),
                    r(Box, {
                      flexDirection: "column",
                      paddingLeft: 1,
                      borderStyle: "single",
                      borderRight: !1,
                      borderTop: !1,
                      borderBottom: !1,
                      borderLeft: !0,
                      borderLeftDimColor: !0,
                      children: [
                        e(UserMessageOption, {
                          userMessage: Ro,
                          color: "text",
                          isCurrent: !1,
                          isRedesign: !1,
                        }),
                        r(Text, {
                          dimColor: !0,
                          children: ["(", formatRelativeTimeAgo(new Date(Ro.timestamp), { now: Io }), ")"],
                        }),
                      ],
                    }),
                  ],
                }),
            Un && Kn
              ? r(Box, {
                  flexDirection: "column",
                  children: [or, e(Text, { dimColor: !0, children: RESTORE_FILES_CAVEAT })],
                })
              : or,
            isSummarizeOption(No)
              ? r(Box, {
                  flexDirection: "row",
                  gap: 1,
                  children: [e(Spinner, {}), e(Text, { children: "Summarizing\u2026" })],
                })
              : Yo && restoreWait !== void 0
                ? e(PromptDialog, {
                    message: restoreWait.message,
                    onCancel: restoreWait.onStopWaiting,
                    escAction: "stop waiting",
                  })
                : e(ModelSelector, {
                    isDisabled: Yo,
                    options: getRestoreOptions(!!Kn),
                    defaultFocusValue: Kn ? "both" : "conversation",
                    onFocus: (prev_2) => Fn(prev_2),
                    onChange: (value) => onSelectRestoreOption(value),
                    onCancel: () => (preselectedMessage ? onClose() : Ho(void 0)),
                  }),
            Kn &&
              !Un &&
              e(Box, {
                marginBottom: 1,
                children: r(Text, { dimColor: !0, children: [re.warning, " ", RESTORE_FILES_CAVEAT] }),
              }),
          ],
        }),
      Wn &&
        r(Fragment, {
          children: [
            !Un && e(Text, { children: Zn }),
            e(merged, {
              visibleCount: max * oo + 2,
              defaultFocusIndex: Ao ?? co.length - 1,
              onFocus: Bo,
              isDisabled: Yo,
              scrollBar: !1,
              onSelect: (value_0) => {
                let Ir = co[value_0];
                if (Ir) handleSelect(Ir);
              },
              children: co.map((msg, visibleOptionIndex) =>
                e(
                  merged.Item,
                  {
                    lines: oo,
                    children: e(computeDiffStatsBetweenMessages, {
                      message: msg,
                      isCurrent: msg.uuid === currentUUID,
                      isPreClear: msg.uuid === messageOptions,
                      parentSessionId: parentSessionId,
                      metadataLoaded: isFileHistoryEnabled && visibleOptionIndex in Dn,
                      metadata: Dn[visibleOptionIndex],
                      isRedesign: Un,
                    }),
                  },
                  msg.uuid,
                ),
              ),
            }),
          ],
        }),
    ],
  });
}
//@ chunk-18hwfzwa.js:422268-422399 layout
function logConversationRestoreError(h) {
  if (h instanceof Uje) {
    logForDebugging(`MessageSelector: conversation restore not done: ${h.message}`, { level: "error" });
    return;
  }
  logError(h);
}
//@ chunk-18hwfzwa.js:422399-422832 fingerprint = getRestoreOptionConversationText (0.939)
function getRestoreOptionConversationText(option) {
  switch (option) {
    case "summarize":
      return "Messages after this point will be summarized.";
    case "summarize_up_to":
      return "Preceding messages will be summarized. This and subsequent messages will remain unchanged \u2014 you will stay at the end of the conversation.";
    case "both":
    case "conversation":
      return "This message and everything after it will be removed.";
    case "code":
    case "nevermind":
      return "The conversation will be unchanged.";
  }
}
//@ chunk-18hwfzwa.js:422832-423703 fingerprint = RestoreOptionDescription (0.785)
function RestoreOptionDescription(t0) {
  let $ = w(17),
    {
      selectedRestoreOption: selectedRestoreOption,
      canRestoreCode: canRestoreCode,
      diffStatsForRestore: diffStatsForRestore,
      isOneParagraph: isOneParagraph,
    } = t0,
    showCodeRestore =
      canRestoreCode && (selectedRestoreOption === "both" || selectedRestoreOption === "code"),
    Be;
  if ($[0] !== selectedRestoreOption)
    ((Be = getRestoreOptionConversationText(selectedRestoreOption)),
      ($[0] = selectedRestoreOption),
      ($[1] = Be));
  else Be = $[1];
  let He;
  if ($[2] !== Be) ((He = e(Text, { dimColor: !0, children: Be })), ($[2] = Be), ($[3] = He));
  else He = $[3];
  let We = He,
    ze;
  if ($[4] !== diffStatsForRestore || $[5] !== selectedRestoreOption || $[6] !== showCodeRestore)
    ((ze =
      !isSummarizeOption(selectedRestoreOption) &&
      (showCodeRestore
        ? e(RestoreCodeConfirmation, { diffStatsForRestore: diffStatsForRestore })
        : e(Text, { dimColor: !0, children: "The code will be unchanged." }))),
      ($[4] = diffStatsForRestore),
      ($[5] = selectedRestoreOption),
      ($[6] = showCodeRestore),
      ($[7] = ze));
  else ze = $[7];
  let Xe = ze;
  if (isOneParagraph) {
    let rt;
    if ($[8] !== Xe) ((rt = Xe && e(Text, { children: " " })), ($[8] = Xe), ($[9] = rt));
    else rt = $[9];
    let kt;
    if ($[10] !== Xe || $[11] !== We || $[12] !== rt)
      ((kt = r(Text, { children: [We, rt, Xe] })), ($[10] = Xe), ($[11] = We), ($[12] = rt), ($[13] = kt));
    else kt = $[13];
    return kt;
  }
  let rt;
  if ($[14] !== Xe || $[15] !== We)
    ((rt = r(Box, { flexDirection: "column", children: [We, Xe] })),
      ($[14] = Xe),
      ($[15] = We),
      ($[16] = rt));
  else rt = $[16];
  return rt;
}
//@ chunk-18hwfzwa.js:423703-424837 fingerprint = RestoreCodeConfirmation (0.498)
function RestoreCodeConfirmation(t0) {
  let $ = w(15),
    { diffStatsForRestore: diffStatsForRestore } = t0;
  if (diffStatsForRestore === void 0) {
    return;
  }
  if (!diffStatsForRestore.filesChanged || !diffStatsForRestore.filesChanged[0]) {
    let L;
    if ($[0] === MEMO_CACHE_SENTINEL)
      ((L = e(Text, { dimColor: !0, children: "The code has not changed (nothing will be restored)." })),
        ($[0] = L));
    else L = $[0];
    return L;
  }
  let numFilesChanged = diffStatsForRestore.filesChanged.length,
    ke;
  if (numFilesChanged === 1) {
    const L = diffStatsForRestore.filesChanged[0] || "";
    let Re;
    if ($[1] !== L) ((Re = pathModule.basename(L)), ($[1] = L), ($[2] = Re));
    else Re = $[2];
    ke = Re;
  } else if (numFilesChanged === 2) {
    const L = diffStatsForRestore.filesChanged[0] || "";
    let Re;
    if ($[3] !== L) ((Re = pathModule.basename(L)), ($[3] = L), ($[4] = Re));
    else Re = $[4];
    let Be = Re;
    const He = diffStatsForRestore.filesChanged[1] || "";
    let We;
    if ($[5] !== He) ((We = pathModule.basename(He)), ($[5] = He), ($[6] = We));
    else We = $[6];
    let ze = We;
    ke = `${Be} and ${ze}`;
  } else {
    const L = diffStatsForRestore.filesChanged[0] || "";
    let Re;
    if ($[7] !== L) ((Re = pathModule.basename(L)), ($[7] = L), ($[8] = Re));
    else Re = $[8];
    ke = `${Re} and ${diffStatsForRestore.filesChanged.length - 1} other files`;
  }
  let L;
  if ($[9] !== diffStatsForRestore.deletions || $[10] !== diffStatsForRestore.insertions)
    ((L = e(DiffStatCounts, {
      added: diffStatsForRestore.insertions,
      removed: diffStatsForRestore.deletions,
    })),
      ($[9] = diffStatsForRestore.deletions),
      ($[10] = diffStatsForRestore.insertions),
      ($[11] = L));
  else L = $[11];
  let Re;
  if ($[12] !== ke || $[13] !== L)
    ((Re = e(Fragment, {
      children: r(Text, {
        dimColor: !0,
        children: ["The code will be restored", " ", L, " ", "in ", ke, "."],
      }),
    })),
      ($[12] = ke),
      ($[13] = L),
      ($[14] = Re));
  else Re = $[14];
  return Re;
}
//@ chunk-18hwfzwa.js:424837-426117 file-local
function computeDiffStatsBetweenMessages(h) {
  let $ = w(16),
    {
      message: message,
      isCurrent: isCurrent,
      isPreClear: isPreClear,
      parentSessionId: parentSessionId,
      metadataLoaded: metadataLoaded,
      metadata: metadata,
      isRedesign: isRedesign,
    } = h,
    He = pM(),
    We = metadata?.filesChanged && metadata.filesChanged.length,
    Xe;
  if (
    $[0] !== isCurrent ||
    $[1] !== isPreClear ||
    $[2] !== isRedesign ||
    $[3] !== He ||
    $[4] !== message ||
    $[5] !== parentSessionId
  )
    ((Xe = e(Box, {
      flexShrink: 1,
      height: 1,
      overflow: "hidden",
      children: isPreClear
        ? e(Box, {
            width: "100%",
            children: r(Text, {
              color: He ? "suggestion" : void 0,
              children: ["/resume ", parentSessionId, " (previous session)"],
            }),
          })
        : e(UserMessageOption, {
            userMessage: message,
            color: He ? "suggestion" : void 0,
            isCurrent: isCurrent,
            isRedesign: isRedesign,
            paddingRight: 10,
          }),
    })),
      ($[0] = isCurrent),
      ($[1] = isPreClear),
      ($[2] = isRedesign),
      ($[3] = He),
      ($[4] = message),
      ($[5] = parentSessionId),
      ($[6] = Xe));
  else Xe = $[6];
  let rt;
  if ($[7] !== isRedesign || $[8] !== He || $[9] !== metadata || $[10] !== metadataLoaded || $[11] !== We)
    ((rt =
      metadataLoaded &&
      e(Box, {
        height: 1,
        flexDirection: "row",
        children: metadata
          ? e(Text, {
              dimColor: !He,
              color: "inactive",
              children: We
                ? r(Fragment, {
                    children: [
                      We === 1 && metadata.filesChanged[0]
                        ? `${pathModule.basename(metadata.filesChanged[0])} `
                        : `${We} files changed `,
                      e(DiffStatCounts, { added: metadata.insertions, removed: metadata.deletions }),
                    ],
                  })
                : e(Fragment, { children: "No code changes" }),
            })
          : e(Text, {
              dimColor: !0,
              color: isRedesign ? void 0 : "warning",
              children: isRedesign ? "No code restore" : `${re.warning} No code restore`,
            }),
      })),
      ($[7] = isRedesign),
      ($[8] = He),
      ($[9] = metadata),
      ($[10] = metadataLoaded),
      ($[11] = We),
      ($[12] = rt));
  else rt = $[12];
  let kt;
  if ($[13] !== Xe || $[14] !== rt)
    ((kt = r(Box, { flexDirection: "column", children: [Xe, rt] })),
      ($[13] = Xe),
      ($[14] = rt),
      ($[15] = kt));
  else kt = $[15];
  return kt;
}
//@ chunk-18hwfzwa.js:426117-429323 fingerprint = UserMessageOption (0.462)
function UserMessageOption(t0) {
  let $ = w(62),
    {
      userMessage: userMessage,
      color: color,
      dimColor: dimColor,
      isCurrent: isCurrent,
      isRedesign: isRedesign,
      paddingRight: paddingRight,
      age: age,
    } = t0,
    { columns: columns } = useTerminalSize(),
    ze;
  if ($[0] !== userMessage)
    ((ze = jwr(getUserMessageText(userMessage)?.trim() || "(no prompt)")), ($[0] = userMessage), ($[1] = ze));
  else ze = $[1];
  let Xe = ze;
  if (isCurrent) {
    const rt = isRedesign ? xje : "(current)";
    let kt;
    if ($[2] !== color || $[3] !== dimColor || $[4] !== rt)
      ((kt = e(Box, {
        width: "100%",
        children: e(Text, { italic: !0, color: color, dimColor: dimColor, children: rt }),
      })),
        ($[2] = color),
        ($[3] = dimColor),
        ($[4] = rt),
        ($[5] = kt));
    else kt = $[5];
    return kt;
  }
  if (isEmptyMessageText(Xe)) {
    let rt;
    if ($[6] !== color || $[7] !== dimColor)
      ((rt = e(Text, { italic: !0, color: color, dimColor: dimColor, children: "((empty message))" })),
        ($[6] = color),
        ($[7] = dimColor),
        ($[8] = rt));
    else rt = $[8];
    let kt;
    if ($[9] !== age) ((kt = e(MessageAgeSuffix, { age: age })), ($[9] = age), ($[10] = kt));
    else kt = $[10];
    let At;
    if ($[11] !== rt || $[12] !== kt)
      ((At = r(Box, { flexDirection: "row", width: "100%", children: [rt, kt] })),
        ($[11] = rt),
        ($[12] = kt),
        ($[13] = At));
    else At = $[13];
    return At;
  }
  let It, rt;
  if ($[14] !== userMessage.message.content)
    ((It = findLastCommandMessage(userMessage.message.content)),
      (rt = It && Xwt(It)),
      ($[14] = userMessage.message.content),
      ($[15] = It),
      ($[16] = rt));
  else ((It = $[15]), (rt = $[16]));
  if (rt) {
    let { message: message, args: args, isSkillFormat: isSkillFormat } = It;
    if (message) {
      if (isSkillFormat) {
        let kt;
        if ($[17] !== age) ((kt = e(MessageAgeSuffix, { age: age })), ($[17] = age), ($[18] = kt));
        else kt = $[18];
        let At;
        if ($[19] !== color || $[20] !== message || $[21] !== dimColor || $[22] !== kt)
          ((At = e(Box, {
            flexDirection: "row",
            width: "100%",
            children: r(Text, { color: color, dimColor: dimColor, children: ["Skill(", message, ")", kt] }),
          })),
            ($[19] = color),
            ($[20] = message),
            ($[21] = dimColor),
            ($[22] = kt),
            ($[23] = At));
        else At = $[23];
        return At;
      } else {
        const kt = userMessage.stackedOriginalInput ?? `/${message}${args ? ` ${args}` : ""}`;
        let At;
        if ($[24] !== age) ((At = e(MessageAgeSuffix, { age: age })), ($[24] = age), ($[25] = At));
        else At = $[25];
        let Lt;
        if ($[26] !== color || $[27] !== dimColor || $[28] !== kt || $[29] !== At)
          ((Lt = e(Box, {
            flexDirection: "row",
            width: "100%",
            children: r(Text, { color: color, dimColor: dimColor, children: [kt, At] }),
          })),
            ($[26] = color),
            ($[27] = dimColor),
            ($[28] = kt),
            ($[29] = At),
            ($[30] = Lt));
        else Lt = $[30];
        return Lt;
      }
    }
  }
  let kt;
  if ($[31] !== It || $[32] !== userMessage.message.content)
    ((kt = It ? null : extractBashInput(userMessage.message.content)),
      ($[31] = It),
      ($[32] = userMessage.message.content),
      ($[33] = kt));
  else kt = $[33];
  let oo = kt;
  if (oo) {
    let At;
    if ($[34] === MEMO_CACHE_SENTINEL) ((At = e(Text, { color: "bashBorder", children: "!" })), ($[34] = At));
    else At = $[34];
    let Lt;
    if ($[35] !== age) ((Lt = e(MessageAgeSuffix, { age: age })), ($[35] = age), ($[36] = Lt));
    else Lt = $[36];
    let Xt;
    if ($[37] !== oo || $[38] !== color || $[39] !== dimColor || $[40] !== Lt)
      ((Xt = r(Box, {
        flexDirection: "row",
        width: "100%",
        children: [At, r(Text, { color: color, dimColor: dimColor, children: [" ", oo, Lt] })],
      })),
        ($[37] = oo),
        ($[38] = color),
        ($[39] = dimColor),
        ($[40] = Lt),
        ($[41] = Xt));
    else Xt = $[41];
    return Xt;
  }
  let io, At;
  if (
    $[42] !== age ||
    $[43] !== color ||
    $[44] !== columns ||
    $[45] !== dimColor ||
    $[46] !== Xe ||
    $[47] !== paddingRight
  ) {
    At = EARLY_RETURN_SENTINEL;
    po: {
      io = paddingRight
        ? truncate(Xe, columns - paddingRight, !0)
        : truncateToLength(Xe, 500)
            .split(
              `
`,
            )
            .slice(0, 4).join(`
`);
      if (
        age !== void 0 &&
        io.includes(`
`)
      ) {
        const commandMessage = e(Text, { color: color, dimColor: dimColor, children: io.trimEnd() });
        let Xt;
        if ($[50] !== age) ((Xt = e(Text, { dimColor: !0, children: age })), ($[50] = age), ($[51] = Xt));
        else Xt = $[51];
        let so;
        if ($[52] !== commandMessage || $[53] !== Xt)
          ((so = r(Box, { flexDirection: "column", width: "100%", children: [commandMessage, Xt] })),
            ($[52] = commandMessage),
            ($[53] = Xt),
            ($[54] = so));
        else so = $[54];
        At = so;
        break po;
      }
    }
    (($[42] = age),
      ($[43] = color),
      ($[44] = columns),
      ($[45] = dimColor),
      ($[46] = Xe),
      ($[47] = paddingRight),
      ($[48] = io),
      ($[49] = At));
  } else ((io = $[48]), (At = $[49]));
  if (At !== EARLY_RETURN_SENTINEL) return At;
  let Lt;
  if ($[55] !== age) ((Lt = e(MessageAgeSuffix, { age: age })), ($[55] = age), ($[56] = Lt));
  else Lt = $[56];
  let Xt;
  if ($[57] !== color || $[58] !== dimColor || $[59] !== io || $[60] !== Lt)
    ((Xt = e(Box, {
      flexDirection: "row",
      width: "100%",
      children: r(Text, { color: color, dimColor: dimColor, children: [io, Lt] }),
    })),
      ($[57] = color),
      ($[58] = dimColor),
      ($[59] = io),
      ($[60] = Lt),
      ($[61] = Xt));
  else Xt = $[61];
  return Xt;
}
//@ chunk-18hwfzwa.js:429323-429467 layout
function MessageAgeSuffix(h) {
  let $ = w(2),
    { age: age } = h,
    L;
  if ($[0] !== age)
    ((L = age === void 0 ? null : r(Text, { dimColor: !0, children: [" \xB7 ", age] })),
      ($[0] = age),
      ($[1] = L));
  else L = $[1];
  return L;
}
//@ chunk-18hwfzwa.js:429467-429960 fingerprint = messagesAfterAreOnlySynthetic (0.891)
function messagesAfterAreOnlySynthetic(messages, fromIndex) {
  for (let D = fromIndex + 1; D < messages.length; D++) {
    let msg = messages[D];
    if (!msg) continue;
    if (isSyntheticMessage(msg)) continue;
    if (isToolUseResultMessage(msg)) continue;
    if (msg.type === "progress") continue;
    if (msg.type === "system") continue;
    if (msg.type === "attachment") continue;
    if (msg.type === "user" && msg.isMeta) continue;
    if (msg.type === "user" && msg.stackedExpansion) continue;
    if (msg.type === "assistant") {
      let content = msg.message.content;
      if (Array.isArray(content)) {
        if (
          content.some((block) => (block.type === "text" && block.text?.trim()) || block.type === "tool_use")
        )
          return !1;
      }
      continue;
    }
    if (msg.type === "user") return !1;
  }
  return !0;
}
/**
 * 把消息列表中以 queued_command 附件形式存在的人类 prompt 还原为普通用户消息（跳过 meta、已存在 uuid、cron 触发和非对象内容），让 Rewind 选择器能选中它们；无变化时返回原数组。
 */
//@ chunk-18hwfzwa.js:429960-430532 placement
function expandQueuedPromptAttachments(messages) {
  let x = new Set();
  for (let ee of messages) if (ee.type === "user") x.add(ee.uuid);
  let D = !1,
    mapped = messages.map((ee, ke) => {
      if (
        ee.type !== "attachment" ||
        ee.attachment.type !== "queued_command" ||
        ee.attachment.commandMode !== "prompt" ||
        !isHumanTurn(ee)
      )
        return ee;
      let Re = parseQueuedCommandAttachment(ee.attachment, ee.uuid);
      if (
        Re === void 0 ||
        Re.isMeta ||
        x.has(Re.uuid) ||
        hasCronToolUse(messages, ke) ||
        (Array.isArray(Re.content) && Re.content.some((Be) => typeof Be !== "object" || Be === null))
      )
        return ee;
      return (
        x.add(Re.uuid),
        (D = !0),
        createUserMessage({
          content: Re.content,
          uuid: Re.uuid,
          timestamp: ee.timestamp,
          imagePasteIds: ee.attachment.imagePasteIds,
          origin: Re.origin,
        })
      );
    });
  return D ? mapped : messages;
}
//@ chunk-18hwfzwa.js:430532-430773 placement
function openRewindSelector({ localJsx: localJsx, turn: turn, sessionController: sessionController }) {
  if (localJsx.size > 0) return null;
  let L = { commandName: "rewind", immediate: !1, hidesPrompt: !0, retireAtTurnBoundary: !1 },
    show = localJsx.show(
      e(RewindMessageSelector, {
        turn: turn,
        sessionController: sessionController,
        onClose: () => show.close(),
      }),
      L,
    );
  return show;
}
//@ chunk-18hwfzwa.js:430773-431571 placement
function RewindMessageSelector({ turn: turn, sessionController: sessionController, onClose: onClose }) {
  let { storageV5: storageV5 } = Me(),
    ee = Cr(),
    ke = useSetAppState(),
    Re = useSession(),
    { messages: messages } = ug(mainAgentId()),
    He = Q(() => expandQueuedPromptAttachments(messages), [messages]);
  return e(MessageSelector, {
    messages: He,
    onPreRestore: turn.cancel,
    onRestoreCode: async (We) => {
      try {
        return await fileHistoryRewind(() => ee.getState().fileHistory, We.uuid);
      } finally {
        ke((ze) => {
          let Xe = reduceFileHistoryState(ze.fileHistory, { kind: "touch" }, storageV5);
          if (Xe === ze.fileHistory) return ze;
          return { ...ze, fileHistory: Xe };
        });
      }
    },
    onSummarize:
      sessionController.runsNoModelTurn || isEnvTruthy(process.env.DISABLE_COMPACT)
        ? void 0
        : sessionController.handleSummarize,
    onRestoreMessage: (We) => sessionController.handleRestoreMessage(We, "message_selector"),
    onClose: onClose,
    parentSessionId: getParentSessionId(),
    onResumePreviousSession:
      getParentSessionId() && getParentSessionId() !== Re.id
        ? async () => {
            try {
              let We = getParentSessionId();
              if (!We || We === Re.id) return;
              let ze = await getLastSessionLog(We, void 0, storageV5);
              if (ze) await sessionController.resume(We, ze, "rewind_pre_clear");
            } catch (error) {
              logError(error);
            }
          }
        : void 0,
  });
}
//@ chunk-wyqg6m3h.js:36692-36855 fingerprint = DiffStatsText (0.64)
function diffStat(e, o, r) {
  let { Text: Text } = e.ui,
    n = o > 0 && r > 0;
  return h(
    Text,
    null,
    o > 0 ? h(Text, { color: "diffAddedWord" }, `+${o}`) : "",
    n ? " " : "",
    r > 0 ? h(Text, { color: "diffRemovedWord" }, `-${r}`) : "",
  );
}

export { openRewindSelector, messagesAfterAreOnlySynthetic, diffStat };
