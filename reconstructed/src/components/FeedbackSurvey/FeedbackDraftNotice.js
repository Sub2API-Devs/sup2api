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
import { j, y, R, zt, P } from "../../../vendor/react/cjs/react.production.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { measureText } from "../../utils/Cursor.js";
import { plural } from "../../utils/stringUtils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { pIt, hr } from "../../utils/invisibleChars.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { sequential } from "../../utils/sequential.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import { Ahe, useSessionDraftCount } from "../PromptInput/PromptInputFooterLeftSide.js";
import { Me } from "../design-system/ThemeProvider.js";
import { useHost } from "../../context/session.js";
import { useShortDraftValue } from "../../screens/repl/storeHooks.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { R5, Kan, setFeedbackDraftsSetting } from "../../services/feedbackDrafts.js";
import {
  ULs,
  dismissFeedbackNotice,
  markDraftNoticeLogged,
  LEo,
  listFeedbackDrafts,
  BLs,
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
import { dg } from "../../context/QueuedMessageContext.js";

//@ chunk-18hwfzwa.js:981168-981172 placement
j();
//@ chunk-18hwfzwa.js:981172-981176 placement
j();
//@ chunk-18hwfzwa.js:981176-981186 placement
var npo = 2;
//@ chunk-18hwfzwa.js:981186-981257 placement
function zet() {
  return (getGlobalConfig().feedbackDraftsTurnOffPromptDeclines ?? 0) < npo;
}
//@ chunk-18hwfzwa.js:981257-981374 placement
function recordDraftTurnOffDecline(h) {
  saveGlobalConfig(
    (x) => ({ ...x, feedbackDraftsTurnOffPromptDeclines: (x.feedbackDraftsTurnOffPromptDeclines ?? 0) + 1 }),
    h,
  );
}
//@ chunk-18hwfzwa.js:981374-981743 placement
function feedbackDraftPreviewLines(h, x, D = !1) {
  if (h.trim() === "") return "Details empty.";
  let parts = h.split(`
`),
    max = Math.max(1, x - 6),
    flattened = parts.flatMap((Re) => measureText(Re, max).lines.map((line) => line.text));
  return [
    D
      ? `Draft preview, ${parts.length} ${plural(parts.length, "line")}:`
      : `${parts.length} ${plural(parts.length, "line")}:`,
    ...flattened.map((Re) => `> ${Re}`),
    D ? "End of preview. Review the full draft with /feedback." : "End of details.",
  ].join(`
`);
}
//@ chunk-18hwfzwa.js:981743-982035 placement
function truncateToWrappedLines(h, x, D) {
  let L = [],
    ee = 0;
  for (let ke of h.split(`
`)) {
    let lines = measureText(ke, Math.max(1, x)).lines;
    if (ee + lines.length <= D) {
      (L.push(ke), (ee += lines.length));
      continue;
    }
    let Be = D - ee;
    if (Be > 0) {
      let He = lines[Be]?.startOffset;
      L.push(He === void 0 ? ke : ke.slice(0, He).trimEnd());
    }
    return (
      L.push("\u2026"),
      L.join(`
`)
    );
  }
  return h;
}
//@ chunk-18hwfzwa.js:982035-982718 placement
function WrappedTextBox(h) {
  let $ = w(8),
    { value: x, bold: bold, dim: dim, columns: columns, maxRows: maxRows, preview: preview } = h,
    Be = useIsScreenReaderEnabled(),
    We;
  if (
    $[0] !== bold ||
    $[1] !== columns ||
    $[2] !== dim ||
    $[3] !== Be ||
    $[4] !== maxRows ||
    $[5] !== preview ||
    $[6] !== x
  ) {
    let ze = pIt(x);
    let Xe = maxRows === void 0 ? ze : truncateToWrappedLines(ze, Math.max(1, columns - 2), maxRows);
    We = e(Box, {
      borderStyle: Be ? void 0 : "single",
      borderLeft: !0,
      borderTop: !1,
      borderBottom: !1,
      borderRight: !1,
      borderDimColor: !0,
      paddingLeft: Be ? 0 : 1,
      flexDirection: "column",
      children: Be
        ? e(Text, {
            bold: bold,
            dimColor: dim,
            wrap: "wrap",
            children: feedbackDraftPreviewLines(Xe, columns, preview),
          })
        : sequential.level === 0
          ? e(Text, { bold: bold, dimColor: dim, wrap: "wrap", children: Xe })
          : e(MarkdownText_2, { promptMode: !0, skipTokenCache: !0, children: Xe }),
    });
    (($[0] = bold),
      ($[1] = columns),
      ($[2] = dim),
      ($[3] = Be),
      ($[4] = maxRows),
      ($[5] = preview),
      ($[6] = x),
      ($[7] = We));
  } else We = $[7];
  return We;
}
//@ chunk-18hwfzwa.js:982718-982833 placement
var FEEDBACK_KIND_LABELS = {
    bug: "Bug report",
    idea: "Product feedback",
    missing_capability: "Feature request",
  },
  apo = 1500,
  lpo = 1000,
  dpo = 5000;
/**
 * FeedbackDraftNotice：提示存在未提交的反馈草稿并允许继续或丢弃。
 */
//@ chunk-18hwfzwa.js:982833-988714 placement
function FeedbackDraftNotice({
  isLoading: isLoading,
  surveyActive: surveyActive,
  setInputValue: setInputValue,
  onOpenFeedback: onOpenFeedback,
  onHoldsBandChange: onHoldsBandChange,
}) {
  let { notice: notice } = Ahe(),
    Re = useSessionDraftCount(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    We = useHost(),
    ze = useShortDraftValue(),
    { rows: rows, columns: columns } = useTerminalSize(),
    kt = useClock(),
    [At, It] = y("idle"),
    [Ot, Et] = y(null),
    [Dt, Lt] = y(!1),
    oo = R(!1),
    Xt = R(notice?.draftId ?? null),
    io = R(null),
    so = R(null),
    po = R(!1),
    ao = R(null),
    co = R5(),
    bo = Kan() === "quiet" || rows < ULs,
    Ao = co && notice !== null,
    Bo = isLoading || surveyActive,
    Ro = At === "dismissPrompt" || At === "offConfirm",
    Ho = Ro || (Ao && !bo);
  zt(() => (onHoldsBandChange?.(Ho), () => onHoldsBandChange?.(!1)), [Ho, onHoldsBandChange]);
  let [Io, Wo] = y(!Bo && !bo);
  P(() => {
    if (Bo || bo || Ro) {
      Wo(!1);
      return;
    }
    if (Io) return;
    return kt.setTimeout(() => Wo(!0), lpo);
  }, [Bo, bo, Ro, Io, kt]);
  function mn() {
    if (io.current !== null) (io.current(), (io.current = null));
  }
  function Cn() {
    if (so.current !== null) (so.current(), (so.current = null));
  }
  if (notice !== null && notice.draftId !== Xt.current) {
    if (((Xt.current = notice.draftId), mn(), At !== "idle" && At !== "dismissPrompt" && At !== "offConfirm"))
      (It("idle"), Et(null), Lt(!1), (oo.current = !1));
  }
  (P(() => {
    if (
      (isLoading || surveyActive || bo) &&
      (At === "confirmSend" || At === "dismissPrompt" || At === "offConfirm")
    )
      (Cn(), It("idle"));
  }, [isLoading, surveyActive, bo, At]),
    P(() => {
      if (At === "dismissPrompt" && ze !== "" && ze.normalize("NFKC") !== "0") {
        if (!(ao.current !== null && kt.now() - ao.current < DIGIT_HOTKEY_HOLD_MS) && !po.current)
          ((po.current = !0),
            recordDraftTurnOffDecline(storageV5),
            logEvent("tengu_feedback_turnoff_prompt_declined", {}));
        It("idle");
      }
    }, [At, ze, storageV5, kt]),
    P(() => {
      if (!Ao || notice === null) return;
      if (Bo || bo) return;
      if (Ro) return;
      if (!Io) return;
      No(notice);
    }, [Ao, bo, Bo, Io, Ro, notice]),
    P(
      () => () => {
        if (io.current !== null && Xt.current !== null) (mn(), dismissFeedbackNotice(Xt.current));
        Cn();
      },
      [],
    ));
  function No(Kn) {
    if (markDraftNoticeLogged(Kn.draftId))
      logEvent("tengu_feedback_notice_shown", { type: fromEnum(Kn.type) });
  }
  function vo() {
    if (notice === null) return;
    No(notice);
  }
  function Yo(Kn) {
    if ((mn(), Cn(), Kn !== "sent"))
      logEvent(Kn === "dismiss" ? "tengu_feedback_notice_dismissed" : "tengu_feedback_notice_opened", {
        type: fromEnum(notice?.type ?? "bug"),
        via: fromEnum(Kn),
      });
    ((oo.current = !1), It("idle"), Et(null), Lt(!1), LEo());
  }
  function kn() {
    if ((Yo("dismiss"), zet()))
      ((ao.current = kt.now()),
        (po.current = !1),
        logEvent("tengu_feedback_turnoff_prompt_shown", {}),
        It("dismissPrompt"));
  }
  function Fn() {
    return ao.current !== null && kt.now() - ao.current < DIGIT_HOTKEY_HOLD_MS;
  }
  function bn() {
    return ao.current !== null && kt.now() - ao.current < DIGIT_HOTKEY_HOLD_MS + DIGIT_HOTKEY_DELAY_MS;
  }
  function Go() {
    if (!Fn() && !po.current)
      ((po.current = !0),
        recordDraftTurnOffDecline(storageV5),
        logEvent("tengu_feedback_turnoff_prompt_declined", {}));
    It("idle");
  }
  function hn() {
    (setFeedbackDraftsSetting("off", { storageV5: storageV5, via: "card" }),
      LEo(),
      Cn(),
      It("offConfirm"),
      (so.current = kt.setTimeout(() => {
        ((so.current = null), It("idle"));
      }, dpo)));
  }
  async function Mn(Kn) {
    if (oo.current) return;
    ((oo.current = !0), It("sending"), Et(null), Lt(!1));
    let Wn;
    try {
      let { queued: queued } = await listFeedbackDrafts(void 0, storageV5),
        found = queued.find((Un) => Un.draft_id === Kn);
      if (!found) {
        if (((oo.current = !1), dismissFeedbackNotice(Kn), Xt.current === Kn)) It("idle");
        return;
      }
      Wn = await submitFeedbackDraft({
        draft: found,
        includeTranscript: !1,
        currentSessionMessages: [],
        via: "card_send_as_is",
        storageV5: storageV5,
        host: We,
        credentials: credentials,
      });
    } catch {
      Wn = { success: !1, error: "Couldn't send feedback." };
    }
    if (
      (logEvent("tengu_feedback_card_send", {
        type: fromEnum(notice?.type ?? "bug"),
        success: fromNumber(Wn.success ? 1 : 0),
      }),
      Xt.current !== Kn)
    )
      return;
    if (!Wn.success) {
      ((oo.current = !1), Et(Wn.error), Lt(Wn.orgRefusalReason !== void 0), It("error"));
      return;
    }
    (It("sent"), (io.current = kt.setTimeout(() => Yo("sent"), apo)));
  }
  useDigitHotkeys({
    inputValue: ze,
    enterConfirms: !1,
    isValidDigit: (Kn) =>
      At === "dismissPrompt" ? Kn === "0" : Kn === "0" || Kn === "1" || (Kn === "2" && At !== "error"),
    enabled:
      !bo &&
      !Bo &&
      ((Ao && (At === "idle" || At === "confirmSend" || At === "error")) || At === "dismissPrompt"),
    onDigit: (Kn) => {
      if ((setInputValue(""), At === "dismissPrompt")) {
        if (!bn()) hn();
        return;
      }
      if (notice === null) return;
      if ((vo(), Kn === "1")) (Yo("review"), onOpenFeedback());
      else if (Kn === "0")
        if (At === "confirmSend") It("idle");
        else kn();
      else if (At === "idle") It("confirmSend");
      else if (At === "confirmSend") Mn(notice.draftId);
    },
  });
  let Sn = R(Bo ? null : kt.now());
  P(() => {
    if (!Bo) Sn.current = kt.now();
  }, [Bo, kt]);
  let $n = R(Ro);
  if (
    (P(() => {
      let Kn = $n.current;
      if ((($n.current = Ro), Kn && !Ro)) Sn.current = kt.now();
    }, [Ro, kt]),
    useKeybinding(
      "chat:cancel",
      () => {
        if (Sn.current !== null && kt.now() - Sn.current < DIGIT_HOTKEY_HOLD_MS) return;
        if (At === "dismissPrompt") {
          Go();
          return;
        }
        if ((vo(), At === "confirmSend")) {
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
          ze === "" &&
          (At === "dismissPrompt" || (Ao && At !== "sending" && At !== "sent" && At !== "offConfirm")),
      },
    ),
    At === "dismissPrompt")
  )
    return e(Box, {
      marginTop: 1,
      marginBottom: 1,
      children: r(Text, {
        children: [
          "Turn off Claude-drafted feedback?",
          " ",
          e(Text, {
            dimColor: !0,
            children: r(Byline, {
              children: [
                e(KeyboardShortcutHint, { chord: "0", action: "turn off" }),
                e(KeyboardShortcutHint, { chord: "escape", action: "keep" }),
              ],
            }),
          }),
        ],
      }),
    });
  if (At === "offConfirm")
    return e(Box, {
      marginTop: 1,
      marginBottom: 1,
      children: r(Text, {
        children: [
          e(StatusIcon, { status: "success", withSpace: !0 }),
          "Claude-drafted feedback is off. Turn back on in /config",
        ],
      }),
    });
  if (!Ao || bo || notice === null) return null;
  let max = Math.max(0, Re - 1),
    _o = ze === "" || (At === "error" ? /^[01]$/ : /^[012]$/).test(ze.normalize("NFKC")),
    cn = FEEDBACK_KIND_LABELS[notice.type] ?? "Feedback",
    Dn = hr(notice.title),
    wn =
      At === "confirmSend"
        ? r(Text, {
            children: [
              "Send without reviewing",
              " ",
              e(Text, { dimColor: !0, children: "(full draft + env, no transcript)" }),
              "?",
              " ",
              e(Text, {
                dimColor: !0,
                children: r(Byline, {
                  children: [
                    _o && e(KeyboardShortcutHint, { chord: "2", action: "send" }),
                    _o && e(KeyboardShortcutHint, { chord: "escape", action: "back" }),
                    !_o && "clear text to answer it",
                  ],
                }),
              }),
            ],
          })
        : At === "sending"
          ? e(Text, { dimColor: !0, children: "Sending\u2026" })
          : At === "sent"
            ? r(Text, { children: [e(StatusIcon, { status: "success", withSpace: !0 }), "Sent"] })
            : At === "error"
              ? r(Text, {
                  children: [
                    e(StatusIcon, { status: "error", withSpace: !0 }),
                    e(Text, { color: "error", children: Ot }),
                    " ",
                    e(Text, {
                      dimColor: !0,
                      children: r(Byline, {
                        children: [
                          _o &&
                            e(KeyboardShortcutHint, {
                              chord: "1",
                              action: Dt ? "review or discard" : "review & retry",
                            }),
                          _o && e(KeyboardShortcutHint, { chord: "escape", action: "dismiss" }),
                          !_o &&
                            (Dt
                              ? "clear text to open review or to dismiss"
                              : "clear text to open review or dismiss"),
                        ],
                      }),
                    }),
                  ],
                })
              : e(Text, {
                  dimColor: !0,
                  children: r(Byline, {
                    children: [
                      _o && e(KeyboardShortcutHint, { chord: "1", action: "review" }),
                      _o && e(KeyboardShortcutHint, { chord: "2", action: "send" }),
                      _o && e(KeyboardShortcutHint, { chord: "0", action: "dismiss" }),
                      !_o && "clear text to review, send, or dismiss",
                      max > 0 && `+${max} more queued`,
                    ],
                  }),
                }),
    mr = e(Box, {
      flexShrink: 1,
      children: r(Text, {
        wrap: "truncate-end",
        children: [
          r(Text, { color: "claude", "aria-hidden": !0, children: [TEARDROP_ASTERISK, " "] }),
          cn,
          " drafted: ",
          e(Text, { bold: !0, children: Dn }),
        ],
      }),
    });
  if (Bo) return null;
  return e(Box, {
    marginTop: 1,
    marginBottom: 1,
    children: r(ShutdownRequestDisplay, {
      children: [
        mr,
        e(WrappedTextBox, {
          value: notice.detailsPreview,
          dim: !0,
          columns: Math.max(1, columns - 4),
          maxRows: BLs,
          preview: !0,
        }),
        wn,
      ],
    }),
  });
}
//@ chunk-18hwfzwa.js:988714-988718 placement
j();
//@ chunk-18hwfzwa.js:988718-988783 placement
function Kke(h) {
  let x = getEffortLevelIfSupported(getMainLoopModel(), h);
  return x ? { effort_level: fromEnum(x) } : {};
}
//@ chunk-18hwfzwa.js:988783-988815 placement
function Qke() {
  return Kke(dg());
}

export { FeedbackDraftNotice, Qke, Kke, WrappedTextBox };
