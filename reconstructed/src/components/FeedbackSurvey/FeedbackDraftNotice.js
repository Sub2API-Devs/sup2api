/**
 * components/FeedbackSurvey/FeedbackDraftNotice.tsx
 *
 * 2.1.316 新增。未提交反馈草稿的提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (13)
 * attribution: placement 13
 */
import { init_react_production, y, R, zt, P } from "../../../vendor/react/cjs/react.production.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { measureText } from "../../utils/Cursor.js";
import { plural } from "../../utils/stringUtils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import {
  stripInvisibleCharsMultiLine,
  stripInvisibleChars as stripInvisibleChars_3,
} from "../../utils/invisibleChars.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { sequential } from "../../utils/sequential.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import { feedbackNoticeSignal, useSessionDraftCount } from "../PromptInput/PromptInputFooterLeftSide.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useHost } from "../../context/session.js";
import { useShortDraftValue } from "../../screens/repl/storeHooks.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useClock } from "../../ink/components/ClockContext.js";
import {
  isFeedbackDraftsEnabled,
  getFeedbackDraftsSetting,
  setFeedbackDraftsSetting,
} from "../../services/feedbackDrafts.js";
import {
  MAX_TITLE_PREVIEW_CHARS,
  dismissFeedbackNotice_2,
  markDraftNoticeLogged,
  dismissFeedbackNotice,
  listFeedbackDrafts,
  MAX_NOTICE_MODEL_CHARS,
} from "../../services/feedback/feedbackDrafts.js";
import { DIGIT_HOTKEY_HOLD_MS, DIGIT_HOTKEY_DELAY_MS, useDigitHotkeys } from "../pluginUi/digitHotkeys.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromNumber } from "../../services/analytics/safeMetadata.js";
import { submitFeedbackDraft } from "../../services/feedback/feedbackDraft.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { TEARDROP_ASTERISK } from "../../utils/permissions/autoModeRulesPrompt.js";
import { ShutdownRequestDisplay } from "../messages/ShutdownMessage.js";
import { getEffortLevelIfSupported } from "../../utils/effort.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { useQueuedMessageText } from "../../context/QueuedMessageContext.js";

//@ chunk-18hwfzwa.js:981168-981172 placement
init_react_production();
//@ chunk-18hwfzwa.js:981172-981176 placement
init_react_production();
//@ chunk-18hwfzwa.js:981176-981186 placement
var MAX_DRAFT_TURN_OFF_DECLINES = 2;
//@ chunk-18hwfzwa.js:981186-981257 placement
function shouldShowTurnOffPrompt() {
  return (getGlobalConfig().feedbackDraftsTurnOffPromptDeclines ?? 0) < MAX_DRAFT_TURN_OFF_DECLINES;
}
//@ chunk-18hwfzwa.js:981257-981374 placement
function recordDraftTurnOffDecline(storageV5) {
  saveGlobalConfig(
    (x) => ({
      ...x,
      feedbackDraftsTurnOffPromptDeclines: (x.feedbackDraftsTurnOffPromptDeclines ?? 0) + 1,
    }),
    storageV5,
  );
}
//@ chunk-18hwfzwa.js:981374-981743 placement
function feedbackDraftPreviewLines(h, columns, preview = false) {
  if (h.trim() === "") return "Details empty.";
  let lines = h.split(`
`);
  let max = Math.max(1, columns - 6);
  let flattened = lines.flatMap((line) => measureText(line, max).lines.map((line) => line.text));
  return [
    preview
      ? `Draft preview, ${lines.length} ${plural(lines.length, "line")}:`
      : `${lines.length} ${plural(lines.length, "line")}:`,
    ...flattened.map((Re) => `> ${Re}`),
    preview ? "End of preview. Review the full draft with /feedback." : "End of details.",
  ].join(`
`);
}
//@ chunk-18hwfzwa.js:981743-982035 placement
function truncateToWrappedLines(h, x, maxRows) {
  let L = [];
  let ee = 0;
  for (let line of h.split(`
`)) {
    let lines = measureText(line, Math.max(1, x)).lines;
    if (ee + lines.length <= maxRows) {
      L.push(line);
      ee += lines.length;
      continue;
    }
    let Be = maxRows - ee;
    if (Be > 0) {
      let startOffset = lines[Be]?.startOffset;
      L.push(startOffset === undefined ? line : line.slice(0, startOffset).trimEnd());
    }
    L.push("\u2026");
    return L.join(`
`);
  }
  return h;
}
//@ chunk-18hwfzwa.js:982035-982718 placement
function WrappedTextBox(props) {
  let $ = w(8);
  let { value: x, bold, dim, columns, maxRows, preview } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let We;
  if (
    $[0] !== bold ||
    $[1] !== columns ||
    $[2] !== dim ||
    $[3] !== isScreenReaderEnabled ||
    $[4] !== maxRows ||
    $[5] !== preview ||
    $[6] !== x
  ) {
    let ze = stripInvisibleCharsMultiLine(x);
    let Xe = maxRows === undefined ? ze : truncateToWrappedLines(ze, Math.max(1, columns - 2), maxRows);
    We = jsxProd_default(Box, {
      borderStyle: isScreenReaderEnabled ? undefined : "single",
      borderLeft: true,
      borderTop: false,
      borderBottom: false,
      borderRight: false,
      borderDimColor: true,
      paddingLeft: isScreenReaderEnabled ? 0 : 1,
      flexDirection: "column",
      children: isScreenReaderEnabled
        ? jsxProd_default(Text, {
            bold,
            dimColor: dim,
            wrap: "wrap",
            children: feedbackDraftPreviewLines(Xe, columns, preview),
          })
        : sequential.level === 0
          ? jsxProd_default(Text, {
              bold,
              dimColor: dim,
              wrap: "wrap",
              children: Xe,
            })
          : jsxProd_default(MarkdownText_2, {
              promptMode: true,
              skipTokenCache: true,
              children: Xe,
            }),
    });
    $[0] = bold;
    $[1] = columns;
    $[2] = dim;
    $[3] = isScreenReaderEnabled;
    $[4] = maxRows;
    $[5] = preview;
    $[6] = x;
    $[7] = We;
  } else We = $[7];
  return We;
}
//@ chunk-18hwfzwa.js:982718-982833 placement
var FEEDBACK_KIND_LABELS = {
  bug: "Bug report",
  idea: "Product feedback",
  missing_capability: "Feature request",
};
var SENT_STATUS_RESET_MS = 1500;
var NOTICE_SHOW_DELAY_MS = 1000;
var OFF_CONFIRM_RESET_MS = 5000;
//@ chunk-18hwfzwa.js:982833-988714 placement
/**
 * FeedbackDraftNotice：提示存在未提交的反馈草稿并允许继续或丢弃。
 */
function FeedbackDraftNotice({ isLoading, surveyActive, setInputValue, onOpenFeedback, onHoldsBandChange }) {
  let { notice } = feedbackNoticeSignal();
  let sessionDraftCount = useSessionDraftCount();
  let { storageV5, credentials } = useTheme_2();
  let host = useHost();
  let shortDraftValue = useShortDraftValue();
  let { rows, columns } = useTerminalSize();
  let clock = useClock();
  let [At, It] = y("idle");
  let [Ot, Et] = y(null);
  let [Dt, Lt] = y(false);
  let oo = R(false);
  let draftIdRef = R(notice?.draftId ?? null);
  let io = R(null);
  let so = R(null);
  let po = R(false);
  let ao = R(null);
  let co = isFeedbackDraftsEnabled();
  let bo = getFeedbackDraftsSetting() === "quiet" || rows < MAX_TITLE_PREVIEW_CHARS;
  let Ao = co && notice !== null;
  let Bo = isLoading || surveyActive;
  let Ro = At === "dismissPrompt" || At === "offConfirm";
  let Ho = Ro || (Ao && !bo);
  zt(() => {
    onHoldsBandChange?.(Ho);
    return () => onHoldsBandChange?.(false);
  }, [Ho, onHoldsBandChange]);
  let [Io, Wo] = y(!Bo && !bo);
  P(() => {
    if (Bo || bo || Ro) {
      Wo(false);
      return;
    }
    if (Io) return;
    return clock.setTimeout(() => Wo(true), NOTICE_SHOW_DELAY_MS);
  }, [Bo, bo, Ro, Io, clock]);
  function mn() {
    if (io.current !== null) {
      io.current();
      io.current = null;
    }
  }
  function Cn() {
    if (so.current !== null) {
      so.current();
      so.current = null;
    }
  }
  if (notice !== null && notice.draftId !== draftIdRef.current) {
    draftIdRef.current = notice.draftId;
    mn();
    if (At !== "idle" && At !== "dismissPrompt" && At !== "offConfirm") {
      It("idle");
      Et(null);
      Lt(false);
      oo.current = false;
    }
  }
  P(() => {
    if (
      (isLoading || surveyActive || bo) &&
      (At === "confirmSend" || At === "dismissPrompt" || At === "offConfirm")
    ) {
      Cn();
      It("idle");
    }
  }, [isLoading, surveyActive, bo, At]);
  P(() => {
    if (At === "dismissPrompt" && shortDraftValue !== "" && shortDraftValue.normalize("NFKC") !== "0") {
      if (!(ao.current !== null && clock.now() - ao.current < DIGIT_HOTKEY_HOLD_MS) && !po.current) {
        po.current = true;
        recordDraftTurnOffDecline(storageV5);
        logEvent("tengu_feedback_turnoff_prompt_declined", {});
      }
      It("idle");
    }
  }, [At, shortDraftValue, storageV5, clock]);
  P(() => {
    if (!Ao || notice === null) return;
    if (Bo || bo) return;
    if (Ro) return;
    if (!Io) return;
    No(notice);
  }, [Ao, bo, Bo, Io, Ro, notice]);
  P(
    () => () => {
      if (io.current !== null && draftIdRef.current !== null) {
        mn();
        dismissFeedbackNotice_2(draftIdRef.current);
      }
      Cn();
    },
    [],
  );
  function No(notice) {
    if (markDraftNoticeLogged(notice.draftId))
      logEvent("tengu_feedback_notice_shown", {
        type: fromEnum(notice.type),
      });
  }
  function vo() {
    if (notice === null) return;
    No(notice);
  }
  function Yo(Kn) {
    mn();
    Cn();
    if (Kn !== "sent")
      logEvent(Kn === "dismiss" ? "tengu_feedback_notice_dismissed" : "tengu_feedback_notice_opened", {
        type: fromEnum(notice?.type ?? "bug"),
        via: fromEnum(Kn),
      });
    oo.current = false;
    It("idle");
    Et(null);
    Lt(false);
    dismissFeedbackNotice();
  }
  function kn() {
    Yo("dismiss");
    if (shouldShowTurnOffPrompt()) {
      ao.current = clock.now();
      po.current = false;
      logEvent("tengu_feedback_turnoff_prompt_shown", {});
      It("dismissPrompt");
    }
  }
  function Fn() {
    return ao.current !== null && clock.now() - ao.current < DIGIT_HOTKEY_HOLD_MS;
  }
  function bn() {
    return ao.current !== null && clock.now() - ao.current < DIGIT_HOTKEY_HOLD_MS + DIGIT_HOTKEY_DELAY_MS;
  }
  function Go() {
    if (!Fn() && !po.current) {
      po.current = true;
      recordDraftTurnOffDecline(storageV5);
      logEvent("tengu_feedback_turnoff_prompt_declined", {});
    }
    It("idle");
  }
  function hn() {
    setFeedbackDraftsSetting("off", {
      storageV5,
      via: "card",
    });
    dismissFeedbackNotice();
    Cn();
    It("offConfirm");
    so.current = clock.setTimeout(() => {
      so.current = null;
      It("idle");
    }, OFF_CONFIRM_RESET_MS);
  }
  async function Mn(draftId) {
    if (oo.current) return;
    oo.current = true;
    It("sending");
    Et(null);
    Lt(false);
    let Wn;
    try {
      let { queued } = await listFeedbackDrafts(undefined, storageV5);
      let found = queued.find((Un) => Un.draft_id === draftId);
      if (!found) {
        oo.current = false;
        dismissFeedbackNotice_2(draftId);
        if (draftIdRef.current === draftId) It("idle");
        return;
      }
      Wn = await submitFeedbackDraft({
        draft: found,
        includeTranscript: false,
        currentSessionMessages: [],
        via: "card_send_as_is",
        storageV5,
        host,
        credentials,
      });
    } catch {
      Wn = {
        success: false,
        error: "Couldn't send feedback.",
      };
    }
    logEvent("tengu_feedback_card_send", {
      type: fromEnum(notice?.type ?? "bug"),
      success: fromNumber(Wn.success ? 1 : 0),
    });
    if (draftIdRef.current !== draftId) return;
    if (!Wn.success) {
      oo.current = false;
      Et(Wn.error);
      Lt(Wn.orgRefusalReason !== undefined);
      It("error");
      return;
    }
    It("sent");
    io.current = clock.setTimeout(() => Yo("sent"), SENT_STATUS_RESET_MS);
  }
  useDigitHotkeys({
    inputValue: shortDraftValue,
    enterConfirms: false,
    isValidDigit: (Kn) =>
      At === "dismissPrompt" ? Kn === "0" : Kn === "0" || Kn === "1" || (Kn === "2" && At !== "error"),
    enabled:
      !bo &&
      !Bo &&
      ((Ao && (At === "idle" || At === "confirmSend" || At === "error")) || At === "dismissPrompt"),
    onDigit: (Kn) => {
      setInputValue("");
      if (At === "dismissPrompt") {
        if (!bn()) hn();
        return;
      }
      if (notice === null) return;
      vo();
      if (Kn === "1") {
        Yo("review");
        onOpenFeedback();
      } else if (Kn === "0") {
        if (At === "confirmSend") It("idle");
        else kn();
      } else if (At === "idle") It("confirmSend");
      else if (At === "confirmSend") Mn(notice.draftId);
    },
  });
  let Sn = R(Bo ? null : clock.now());
  P(() => {
    if (!Bo) Sn.current = clock.now();
  }, [Bo, clock]);
  let $n = R(Ro);
  P(() => {
    let Kn = $n.current;
    $n.current = Ro;
    if (Kn && !Ro) Sn.current = clock.now();
  }, [Ro, clock]);
  useKeybinding(
    "chat:cancel",
    () => {
      if (Sn.current !== null && clock.now() - Sn.current < DIGIT_HOTKEY_HOLD_MS) return;
      if (At === "dismissPrompt") {
        Go();
        return;
      }
      vo();
      if (At === "confirmSend") {
        It("idle");
        return;
      }
      kn();
    },
    {
      context: "Chat",
      isActive:
        !bo &&
        !Bo &&
        shortDraftValue === "" &&
        (At === "dismissPrompt" || (Ao && At !== "sending" && At !== "sent" && At !== "offConfirm")),
    },
  );
  if (At === "dismissPrompt")
    return jsxProd_default(Box, {
      marginTop: 1,
      marginBottom: 1,
      children: jsxProd_default_2(Text, {
        children: [
          "Turn off Claude-drafted feedback?",
          " ",
          jsxProd_default(Text, {
            dimColor: true,
            children: jsxProd_default_2(Byline, {
              children: [
                jsxProd_default(KeyboardShortcutHint, {
                  chord: "0",
                  action: "turn off",
                }),
                jsxProd_default(KeyboardShortcutHint, {
                  chord: "escape",
                  action: "keep",
                }),
              ],
            }),
          }),
        ],
      }),
    });
  if (At === "offConfirm")
    return jsxProd_default(Box, {
      marginTop: 1,
      marginBottom: 1,
      children: jsxProd_default_2(Text, {
        children: [
          jsxProd_default(StatusIcon, {
            status: "success",
            withSpace: true,
          }),
          "Claude-drafted feedback is off. Turn back on in /config",
        ],
      }),
    });
  if (!Ao || bo || notice === null) return null;
  let max = Math.max(0, sessionDraftCount - 1);
  let _o =
    shortDraftValue === "" || (At === "error" ? /^[01]$/ : /^[012]$/).test(shortDraftValue.normalize("NFKC"));
  let cn = FEEDBACK_KIND_LABELS[notice.type] ?? "Feedback";
  let children = stripInvisibleChars_3(notice.title);
  let wn =
    At === "confirmSend"
      ? jsxProd_default_2(Text, {
          children: [
            "Send without reviewing",
            " ",
            jsxProd_default(Text, {
              dimColor: true,
              children: "(full draft + env, no transcript)",
            }),
            "?",
            " ",
            jsxProd_default(Text, {
              dimColor: true,
              children: jsxProd_default_2(Byline, {
                children: [
                  _o &&
                    jsxProd_default(KeyboardShortcutHint, {
                      chord: "2",
                      action: "send",
                    }),
                  _o &&
                    jsxProd_default(KeyboardShortcutHint, {
                      chord: "escape",
                      action: "back",
                    }),
                  !_o && "clear text to answer it",
                ],
              }),
            }),
          ],
        })
      : At === "sending"
        ? jsxProd_default(Text, {
            dimColor: true,
            children: "Sending\u2026",
          })
        : At === "sent"
          ? jsxProd_default_2(Text, {
              children: [
                jsxProd_default(StatusIcon, {
                  status: "success",
                  withSpace: true,
                }),
                "Sent",
              ],
            })
          : At === "error"
            ? jsxProd_default_2(Text, {
                children: [
                  jsxProd_default(StatusIcon, {
                    status: "error",
                    withSpace: true,
                  }),
                  jsxProd_default(Text, {
                    color: "error",
                    children: Ot,
                  }),
                  " ",
                  jsxProd_default(Text, {
                    dimColor: true,
                    children: jsxProd_default_2(Byline, {
                      children: [
                        _o &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "1",
                            action: Dt ? "review or discard" : "review & retry",
                          }),
                        _o &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord: "escape",
                            action: "dismiss",
                          }),
                        !_o &&
                          (Dt
                            ? "clear text to open review or to dismiss"
                            : "clear text to open review or dismiss"),
                      ],
                    }),
                  }),
                ],
              })
            : jsxProd_default(Text, {
                dimColor: true,
                children: jsxProd_default_2(Byline, {
                  children: [
                    _o &&
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "1",
                        action: "review",
                      }),
                    _o &&
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "2",
                        action: "send",
                      }),
                    _o &&
                      jsxProd_default(KeyboardShortcutHint, {
                        chord: "0",
                        action: "dismiss",
                      }),
                    !_o && "clear text to review, send, or dismiss",
                    max > 0 && `+${max} more queued`,
                  ],
                }),
              });
  let mr = jsxProd_default(Box, {
    flexShrink: 1,
    children: jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [
        jsxProd_default_2(Text, {
          color: "claude",
          "aria-hidden": true,
          children: [TEARDROP_ASTERISK, " "],
        }),
        cn,
        " drafted: ",
        jsxProd_default(Text, {
          bold: true,
          children,
        }),
      ],
    }),
  });
  if (Bo) return null;
  return jsxProd_default(Box, {
    marginTop: 1,
    marginBottom: 1,
    children: jsxProd_default_2(ShutdownRequestDisplay, {
      children: [
        mr,
        jsxProd_default(WrappedTextBox, {
          value: notice.detailsPreview,
          dim: true,
          columns: Math.max(1, columns - 4),
          maxRows: MAX_NOTICE_MODEL_CHARS,
          preview: true,
        }),
        wn,
      ],
    }),
  });
}
//@ chunk-18hwfzwa.js:988714-988718 placement
init_react_production();
//@ chunk-18hwfzwa.js:988718-988783 placement
function buildEffortLevelTelemetry(h) {
  let effortLevelIfSupported = getEffortLevelIfSupported(getMainLoopModel(), h);
  return effortLevelIfSupported
    ? {
        effort_level: fromEnum(effortLevelIfSupported),
      }
    : {};
}
//@ chunk-18hwfzwa.js:988783-988815 placement
function getCurrentEffortLevelTelemetry() {
  return buildEffortLevelTelemetry(useQueuedMessageText());
}
export { FeedbackDraftNotice, getCurrentEffortLevelTelemetry, buildEffortLevelTelemetry, WrappedTextBox };
