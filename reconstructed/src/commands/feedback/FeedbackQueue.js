/**
 * commands/feedback/FeedbackQueue.tsx
 *
 * 2.1.316 新增：/feedback 反馈队列界面：列出本会话与其他会话的待发反馈，打开、编辑、丢弃或新写。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-v517dzda.js (17)
 * attribution: placement 17
 */
import { j, y, R, ce, P, Q } from "../../../vendor/react/cjs/react.production.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { hr, pIt } from "../../utils/invisibleChars.js";
import {
  bon,
  Son,
  listFeedbackDrafts,
  setSessionDraftCount,
  recentEntries,
  saveFeedbackDraft,
  MAX_DETAILS_LENGTH,
} from "../../services/feedback/feedbackDrafts.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useLatestState } from "../../components/CustomSelect/option-map.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { Me } from "../../components/design-system/ThemeProvider.js";
import { useHost, useSession } from "../../context/session.js";
import { count } from "../../utils/collections.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromNumber } from "../../services/analytics/safeMetadata.js";
import { discardFeedbackDraft, submitFeedbackDraft } from "../../services/feedback/feedbackDraft.js";
import { Byline } from "../../components/design-system/Byline.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { supportsShiftEnter } from "../terminalSetup/terminalSetup.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { Text, Box } from "../../ink/components/Text.js";
import { HideRow } from "../../components/Spinner/TeammateSpinnerTree.js";
import { plural } from "../../utils/stringUtils.js";
import { ErrorText } from "../../components/ErrorText.js";
import { StatusIcon } from "../../components/design-system/StatusIcon.js";
import { stripCombiningRepeated } from "../../utils/sanitization.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { TextInput } from "../../components/TextInput.js";
import { WrappedTextBox } from "../../components/FeedbackSurvey/FeedbackDraftNotice.js";
import { useScrollViewportSize, Tl } from "../../components/ScrollViewportContext.js";
import { merged } from "../../components/CustomSelect/select.js";

//@ chunk-v517dzda.js:1297-1301 placement
j();
//@ chunk-v517dzda.js:1301-1376 placement
function Xt(U) {
  return e(OrderedListWithItem.Item, { label: hr(U.title), meta: feedbackItemMeta(U) }, U.draft_id);
}
//@ chunk-v517dzda.js:1376-1455 placement
function Jt(te) {
  return e(OrderedListWithItem.Item, { label: hr(te.title), meta: feedbackItemMeta(te) }, te.draft_id);
}
//@ chunk-v517dzda.js:1455-1603 placement
var FEEDBACK_TYPES = ["bug", "idea", "missing_capability"],
  FEEDBACK_TYPE_LABELS = { bug: "bug", idea: "idea", missing_capability: "missing capability" },
  AREA_CHOICES = [void 0, ...bon],
  FAILURE_MODE_CHOICES = [void 0, ...Son];
//@ chunk-v517dzda.js:1603-1665 placement
function st(h) {
  return h === void 0 ? "(none)" : h.replace(/_/g, " ");
}
/**
 * 反馈编辑表单的字段顺序，transcript 可用时含 transcript。
 */
//@ chunk-v517dzda.js:1665-1801 placement
function getFeedbackFormFields(h) {
  return [
    "type",
    "title",
    "area",
    "failure_mode",
    "task_category",
    "details",
    ...(h.transcriptAvailable ? ["transcript"] : []),
    "send",
  ];
}
//@ chunk-v517dzda.js:1801-1827 placement
var Pe = 500,
  at = 6,
  lt = 3,
  dt = 5;
/**
 * /feedback 的反馈队列界面（2.1.316 新增）：列出本会话与其他会话的待发反馈，可打开、编辑字段、丢弃或新写一条。
 */
//@ chunk-v517dzda.js:1827-12269 placement
function FeedbackQueue({
  messages: messages,
  onDone: onDone,
  abortSignal: abortSignal,
  onWriteNew: onWriteNew,
}) {
  let [f, C] = y(null),
    [b, B] = y(0),
    J = useIsScreenReaderEnabled(),
    [m, L] = y("list"),
    [i, A] = y(null),
    [D, K] = y(!1),
    [H, _, M] = useLatestState(0),
    [T, k, G] = useLatestState(null),
    [Y, z] = y(null),
    de = R(-1 / 0),
    [se, E] = y(null),
    [oe, ue] = y(null),
    ee = useTerminalSize().columns - 6,
    x = useClock(),
    ae = R(0),
    U = R(!1),
    te = R(0),
    fe = R(!1),
    ye = R(!1),
    { storageV5: storageV5, credentials: credentials } = Me(),
    Ve = useHost(),
    ne = useSession((t) => t.id),
    me = onWriteNew !== void 0,
    le = ce(async () => {
      let { queued: queued } = await listFeedbackDrafts(void 0, storageV5).catch(() => ({
        queued: [],
        expired: [],
      }));
      (setSessionDraftCount(count(queued, (l) => l.source_session_id === ne)), C(queued));
      let o = queued.length - (me ? 0 : 1);
      return (B((l) => Math.min(l, Math.max(0, o))), queued);
    }, [ne, me, storageV5, B]);
  P(() => {
    le().then((t) => {
      logEvent("tengu_feedback_queue_opened", {
        queued_count: fromNumber(t.length),
        this_session_count: fromNumber(count(t, (o) => o.source_session_id === ne)),
      });
    });
  }, [le, ne]);
  let filtered = (f ?? []).filter((t) => t.source_session_id === ne),
    filtered_2 = (f ?? []).filter((t) => t.source_session_id !== ne),
    ie = [...filtered, ...filtered_2],
    ze = me && b === ie.length,
    Qe = ie.length + (me ? 1 : 0),
    Dt = ie[b],
    Oe = i ? recentEntries(i.request_ids).length : 0,
    pe = ce(
      (t) => {
        if (t === void 0) onDone();
        else onDone(t, { display: "system" });
      },
      [onDone],
    ),
    I = Q(() => (i ? getFeedbackFormFields(i) : []), [i]),
    ke = ce(
      (t) => {
        ((ae.current = x.now()), _(t.length - 1));
      },
      [x, _],
    ),
    p = I[H],
    he = p === "title" || p === "area" || p === "details",
    _t = ce(
      (t) => {
        (A(t),
          K(t.transcriptAvailable),
          E(null),
          k({
            type: t.type,
            title: hr(t.title),
            area: hr(t.area ?? ""),
            failureMode: t.failure_mode,
            taskCategory: t.task_category,
            details: pIt(t.details),
          }),
          z(null),
          (de.current = -1 / 0),
          ke(getFeedbackFormFields(t)),
          (te.current = x.now()),
          (U.current = !1),
          (ye.current = !1),
          L("review"));
      },
      [x, ke, k],
    ),
    Ze = ce(
      async (t) => {
        let now = x.now(),
          l = te.current;
        if (((te.current = Math.max(now, l)), now - l < Pe || fe.current || U.current)) return;
        fe.current = !0;
        try {
          (await discardFeedbackDraft(t, "panel", storageV5).catch(() => {}), await le(), L("list"), A(null));
        } finally {
          fe.current = !1;
        }
      },
      [le, x, storageV5],
    ),
    xe = ce(
      (t) => {
        (A(t), C((g) => (g ? g.map((v) => (v.draft_id === t.draft_id ? t : v)) : g)));
        let { transcriptAvailable: transcriptAvailable, ...l } = t;
        return saveFeedbackDraft(l, new Date(), storageV5).then((g) => {
          if (!g.success)
            E(
              g.reason === "too_large"
                ? "That draft is too large to save. Trim the details."
                : "Could not save the draft to disk.",
            );
        });
      },
      [storageV5],
    ),
    ve = ce(() => {
      let t = G();
      if (!i || !t) return i;
      let o = hr(i.title),
        l = hr(i.area ?? ""),
        g = pIt(i.details),
        v = t.title === o || t.title.trim() === "" ? i.title : t.title.trim(),
        Ce = t.area === l ? (i.area ?? "") : t.area.trim(),
        rt = t.details === g ? i.details : t.details.trim() === "" ? "" : t.details;
      if (
        t.type === i.type &&
        v === i.title &&
        (Ce === "" ? void 0 : Ce) === i.area &&
        t.failureMode === i.failure_mode &&
        t.taskCategory === i.task_category &&
        rt === i.details
      )
        return i;
      return {
        ...i,
        type: t.type,
        title: v,
        area: Ce === "" ? void 0 : Ce,
        failure_mode: t.failureMode,
        task_category: t.taskCategory,
        details: rt,
      };
    }, [i, G]),
    et = ce(() => {
      let t = ve();
      if (t && t !== i) {
        if (i && t.details === "" && i.details !== "" && x.now() - de.current < Pe)
          t = { ...t, details: i.details };
        xe(t);
      }
    }, [ve, i, xe, x]),
    W = ce(
      (t) => {
        (z(null),
          E((o) => (o === DETAILS_TOO_LARGE_MESSAGE ? null : o)),
          _((o) => {
            let max = Math.max(0, Math.min(I.length - 1, o + t));
            if (max !== o && I[max] === "send") ae.current = x.now();
            return max;
          }));
      },
      [I, x, _],
    ),
    Tt = ce(
      (t, o) => {
        if (t === "type")
          k((l) => {
            if (!l) return l;
            let index = FEEDBACK_TYPES.indexOf(l.type),
              v = FEEDBACK_TYPES[(index + o + FEEDBACK_TYPES.length) % FEEDBACK_TYPES.length];
            return v ? { ...l, type: v } : l;
          });
        else if (t === "failure_mode")
          k((l) => {
            if (!l) return l;
            let index = AREA_CHOICES.indexOf(l.failureMode),
              v = AREA_CHOICES.length;
            return { ...l, failureMode: AREA_CHOICES[(index + o + v) % v] };
          });
        else if (t === "task_category")
          k((l) => {
            if (!l) return l;
            let index = FAILURE_MODE_CHOICES.indexOf(l.taskCategory),
              v = FAILURE_MODE_CHOICES.length;
            return { ...l, taskCategory: FAILURE_MODE_CHOICES[(index + o + v) % v] };
          });
        else if (t === "transcript") K((l) => !l);
      },
      [k],
    ),
    Rt = ce(async () => {
      if (!i || U.current || fe.current) return;
      let now = x.now(),
        o = ae.current;
      if (((ae.current = Math.max(now, o)), now - o < Pe)) return;
      if (G()?.title.trim() === "") {
        E("Title is blank. Type a title, or press esc on the field to restore it.");
        return;
      }
      let l = ve() ?? i;
      if (((U.current = !0), L("submitting"), E(null), l !== i)) await xe(l);
      let g;
      try {
        g = await submitFeedbackDraft({
          draft: l,
          includeTranscript: D && l.transcriptAvailable,
          currentSessionMessages: messages,
          signal: abortSignal,
          storageV5: storageV5,
          host: Ve,
          credentials: credentials,
        });
      } catch {
        g = { success: !1, error: "Couldn't send feedback. The draft is still queued. Try again later." };
      }
      if (((U.current = !1), g.success)) (await le(), ue(g.feedbackId), L("receipt"));
      else {
        if ((E(g.error), g.payloadTooLarge)) {
          let index = I.indexOf("transcript");
          if (index >= 0) _(index);
        }
        L("review");
      }
    }, [i, G, D, messages, abortSignal, le, x, ve, xe, storageV5, credentials, Ve, I, _]);
  function St(t) {
    if (t.ctrl || t.meta) return;
    if (m === "submitting") {
      t.preventDefault();
      return;
    }
    if (t.key === "escape" && !(m === "review" && he)) return;
    if (m === "receipt") {
      if ((t.preventDefault(), (f?.length ?? 0) > 0)) (L("list"), A(null));
      else pe(`Feedback sent (receipt ${oe})`);
      return;
    }
    if (m === "list") {
      if (!f) {
        t.preventDefault();
        return;
      }
      if (t.key.toLowerCase() === "w" && onWriteNew) {
        (t.preventDefault(), onWriteNew());
        return;
      }
      if (Qe === 0) {
        (t.preventDefault(), pe());
        return;
      }
      if (ie.length > 0) return;
      if (t.key === "up" || t.key === "down") t.preventDefault();
      else if (t.key === "return" && onWriteNew) (t.preventDefault(), onWriteNew());
      else if (t.key !== "escape") (t.preventDefault(), pe());
      return;
    }
    if (m === "review" && i) {
      if (ye.current) {
        t.preventDefault();
        return;
      }
      if (he) {
        if (t.key === "escape") (t.preventDefault(), tt());
        return;
      }
      let o = I[M()];
      if (t.key === "up") (t.preventDefault(), W(-1));
      else if (t.key === "down") (t.preventDefault(), W(1));
      else if (t.key === "left" || t.key === "right") (t.preventDefault(), Tt(o, t.key === "left" ? -1 : 1));
      else if (t.key === " " && o === "transcript") (t.preventDefault(), K((l) => !l));
      else if (t.key === "return")
        if ((t.preventDefault(), o === "send")) Rt();
        else W(1);
      else if (t.key.toLowerCase() === "d" && o !== "title" && o !== "area" && o !== "details")
        (t.preventDefault(), Ze(i));
    }
  }
  let ge = ce(() => {
      if (ye.current || U.current || fe.current) return;
      ((ye.current = !0), et(), (te.current = -1 / 0), L("list"), A(null));
    }, [et]),
    tt = ce(() => {
      if (m !== "review") {
        pe();
        return;
      }
      let t = I[M()];
      if (t !== "title" && t !== "area" && t !== "details") {
        ge();
        return;
      }
      (k((o) => (o && i ? { ...o, [t]: t === "details" ? pIt(i.details) : hr(i[t] ?? "") } : o)),
        z(null),
        ke(I),
        E((o) => (o === DETAILS_TOO_LARGE_MESSAGE ? null : o)));
    }, [m, i, I, M, ge, k, ke, pe]),
    it = !(J && ie.length > 0),
    Et =
      m === "list"
        ? r(Byline, {
            children: [
              Qe > 0 &&
                it &&
                e(KeyboardShortcutHint, { chord: "enter", action: ze ? "write new feedback" : "review" }),
              Dt !== void 0 && it && e(KeyboardShortcutHint, { chord: "d", action: "discard" }),
              e(KeyboardShortcutHint, { chord: "esc", action: "close" }),
            ],
          })
        : m === "review"
          ? r(Byline, {
              children: [
                e(KeyboardShortcutHint, { chord: ["up", "down"], action: "move" }),
                (p === "type" || p === "failure_mode" || p === "task_category" || p === "transcript") &&
                  e(KeyboardShortcutHint, { chord: ["left", "right"], action: "change" }),
                e(KeyboardShortcutHint, { chord: "enter", action: p === "send" ? "send" : "next" }),
                p === "details" &&
                  e(KeyboardShortcutHint, {
                    chord: supportsShiftEnter() ? "shift+enter" : "ctrl+j",
                    action: "new line",
                  }),
                !he && e(KeyboardShortcutHint, { chord: "d", action: "discard" }),
                e(KeyboardShortcutHint, { chord: "esc", action: he ? "cancel edit" : "later" }),
              ],
            })
          : null;
  return e(FocusColumn, {
    onKeyDown: St,
    children: r(Dialog, {
      title: "Feedback drafts",
      onCancel: tt,
      isCancelActive: m !== "submitting" && !he,
      hideInputGuide: m === "receipt" || m === "submitting",
      inputGuide: Et,
      children: [
        m === "list" && f === null && e(Text, { dimColor: !0, children: "Loading\u2026" }),
        m === "list" &&
          f !== null &&
          ie.length === 0 &&
          r(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              e(Text, { children: "No feedback drafts queued." }),
              e(Text, {
                dimColor: !0,
                children:
                  "Claude drafts feedback at high-signal moments; drafts appear here for your review.",
              }),
              onWriteNew
                ? r(Box, {
                    flexDirection: "column",
                    gap: 1,
                    children: [
                      e(HideRow, { isSelected: ze }),
                      e(Text, {
                        dimColor: !0,
                        children: "/bug works anytime. Any other key closes this panel.",
                      }),
                    ],
                  })
                : e(Text, { dimColor: !0, children: "Any key closes this panel." }),
            ],
          }),
        m === "list" &&
          f !== null &&
          ie.length > 0 &&
          r(Box, {
            flexDirection: "column",
            children: [
              e(FeedbackQueueList, {
                thisSession: filtered,
                others: filtered_2,
                hasWriteNew: me,
                defaultFocusIndex: b,
                onFocus: B,
                onOpen: _t,
                onWriteNew: () => onWriteNew?.(),
                onDiscard: (t) => void Ze(t),
              }),
              e(Box, {
                marginTop: 1,
                children: e(Text, {
                  dimColor: !0,
                  wrap: "wrap",
                  children:
                    "Drafts live only on this machine and are never sent without you. Unsent drafts expire after 30 days.",
                }),
              }),
            ],
          }),
        m === "review" &&
          i &&
          T &&
          r(Box, {
            flexDirection: "column",
            children: [
              r(Box, {
                children: [
                  e(FocusPointer, { isFocused: p === "type" }),
                  e(Text, { children: "Type: " }),
                  e(CycleValue, { value: FEEDBACK_TYPE_LABELS[T.type], isFocused: p === "type" }),
                ],
              }),
              e(FeedbackField, {
                label: "Title:",
                value: T.title,
                isFocused: p === "title",
                bold: !0,
                columns: ee,
                cursorOffset: Y,
                onChange: (t) => k((o) => (o ? { ...o, title: t } : o)),
                onCursorChange: z,
                onNext: () => W(1),
                onPrev: () => W(-1),
                onExit: ge,
              }),
              e(FeedbackField, {
                label: "Area:",
                value: T.area,
                isFocused: p === "area",
                dim: !0,
                columns: ee,
                cursorOffset: Y,
                onChange: (t) => k((o) => (o ? { ...o, area: t } : o)),
                onCursorChange: z,
                onNext: () => W(1),
                onPrev: () => W(-1),
                onExit: ge,
              }),
              r(Box, {
                children: [
                  e(FocusPointer, { isFocused: p === "failure_mode" }),
                  e(Text, { children: "Failure mode: " }),
                  e(CycleValue, { value: st(T.failureMode), isFocused: p === "failure_mode" }),
                ],
              }),
              r(Box, {
                children: [
                  e(FocusPointer, { isFocused: p === "task_category" }),
                  e(Text, { children: "Task: " }),
                  e(CycleValue, { value: st(T.taskCategory), isFocused: p === "task_category" }),
                ],
              }),
              e(FeedbackField, {
                label: "Details:",
                value: T.details,
                isFocused: p === "details",
                dim: !0,
                multiline: !0,
                columns: ee,
                cursorOffset: Y,
                onChange: (t) => {
                  let byteLength = Buffer.byteLength(t, "utf8");
                  if (byteLength > MAX_DETAILS_LENGTH && byteLength >= Buffer.byteLength(T.details, "utf8")) {
                    E(DETAILS_TOO_LARGE_MESSAGE);
                    return;
                  }
                  (k((l) => {
                    if (l && l.details.trim() !== "" && t.trim() === "") de.current = x.now();
                    return l ? { ...l, details: t } : l;
                  }),
                    E((l) => (l === DETAILS_TOO_LARGE_MESSAGE ? null : l)));
                },
                onCursorChange: z,
                onNext: () => W(1),
                onPrev: () => W(-1),
                onExit: ge,
              }),
              i.transcriptAvailable
                ? r(Box, {
                    flexDirection: "column",
                    children: [
                      r(Box, {
                        children: [
                          e(FocusPointer, { isFocused: p === "transcript" }),
                          e(Text, { children: "Send transcript: " }),
                          e(CycleValue, { value: D ? "yes" : "no", isFocused: p === "transcript" }),
                          r(Text, {
                            dimColor: !0,
                            children: [" \xB7 ", D ? "sends this conversation to Anthropic" : "report only"],
                          }),
                        ],
                      }),
                      i.source_session_id !== ne &&
                        e(Box, {
                          marginLeft: 4,
                          children: r(Text, {
                            dimColor: !0,
                            wrap: "wrap",
                            children: ["from ", hr(i.cwd), " \xB7 session", " ", hr(i.source_session_id)],
                          }),
                        }),
                    ],
                  })
                : r(Box, {
                    children: [
                      e(FocusPointer, { isFocused: !1 }),
                      r(Text, {
                        children: [
                          "Send transcript: ",
                          e(Text, { dimColor: !0, children: "expired (report only)" }),
                        ],
                      }),
                    ],
                  }),
              r(Box, {
                marginTop: 1,
                children: [
                  e(FocusPointer, { isFocused: !1 }),
                  r(Text, {
                    dimColor: !0,
                    wrap: "wrap",
                    children: [
                      "Environment info (",
                      hr(i.os),
                      ", v",
                      hr(i.cli_version),
                      ",",
                      " ",
                      hr(i.model),
                      i.effort !== void 0 && r(Fragment, { children: [", effort", " ", hr(i.effort)] }),
                      i.thinking_type !== void 0 &&
                        r(Fragment, {
                          children: [
                            ", thinking ",
                            i.thinking_type,
                            i.thinking_budget !== void 0 &&
                              r(Fragment, { children: [" (budget ", i.thinking_budget, ")"] }),
                          ],
                        }),
                      i.assistant_turn_count !== void 0 &&
                        r(Fragment, {
                          children: [
                            ", turn ",
                            i.assistant_turn_count,
                            i.message_count !== void 0 && r(Fragment, { children: ["/", i.message_count] }),
                            i.subagent_count !== void 0 &&
                              i.subagent_count > 0 &&
                              r(Fragment, {
                                children: [
                                  " ",
                                  "with ",
                                  i.subagent_count,
                                  " ",
                                  plural(i.subagent_count, "subagent"),
                                ],
                              }),
                          ],
                        }),
                      ", drafted ",
                      formatAgeShort(i.created_at),
                      " ago)",
                      Oe > 0 ? ` and ${Oe} API request ${plural(Oe, "id")} are` : " is",
                      " ",
                      "always attached.",
                    ],
                  }),
                ],
              }),
              se && e(Box, { marginTop: 1, children: e(ErrorText, { error: se }) }),
              r(Box, {
                marginTop: 1,
                children: [
                  e(FocusPointer, { isFocused: p === "send" }),
                  e(Text, { bold: p === "send", children: "Send feedback" }),
                ],
              }),
              e(Box, {
                marginTop: 1,
                children: e(Text, {
                  dimColor: !0,
                  wrap: "wrap",
                  children:
                    "We may use these reports to debug related issues and improve Claude Code. Turn off Claude-drafted feedback anytime in /config.",
                }),
              }),
            ],
          }),
        m === "submitting" && e(Text, { children: "Sending feedback\u2026" }),
        m === "receipt" &&
          r(Box, {
            flexDirection: "column",
            children: [
              r(Text, {
                color: "success",
                children: [
                  e(StatusIcon, { status: "success", withSpace: !0 }),
                  "Feedback sent (receipt ",
                  oe,
                  "). Thanks!",
                ],
              }),
              e(Box, {
                marginTop: 1,
                children: e(Text, { dimColor: !0, italic: !0, children: "Any key to continue" }),
              }),
            ],
          }),
      ],
    }),
  });
}
//@ chunk-v517dzda.js:12269-12373 placement
var DETAILS_TOO_LARGE_MESSAGE = `That edit would push Details past the ${Math.floor(MAX_DETAILS_LENGTH / 1024)}KB limit. Trim the details first.`;
//@ chunk-v517dzda.js:12373-12470 placement
function ct(h, u) {
  return stripCombiningRepeated(
    h.replace(
      /\r\n|\r/g,
      `
`,
    ),
  )
    .split(
      `
`,
    )
    .map((c) => replaceControlChars(c))
    .join(
      u
        ? `
`
        : " ",
    );
}
/**
 * 聚焦时显示指针，否则两个空格。
 */
//@ chunk-v517dzda.js:12470-12665 placement
function FocusPointer(h) {
  let f = w(3),
    { isFocused: isFocused } = h;
  const c = isFocused ? "suggestion" : void 0,
    d = isFocused ? `${re.pointer} ` : "  ";
  let C;
  if (f[0] !== c || f[1] !== d)
    ((C = e(Text, { color: c, children: d })), (f[0] = c), (f[1] = d), (f[2] = C));
  else C = f[2];
  return C;
}
/**
 * 可左右切换的值：聚焦时两侧显示 ◀ ▶。
 */
//@ chunk-v517dzda.js:12665-13065 placement
function CycleValue(h) {
  let d = w(6),
    { value: u, isFocused: isFocused } = h;
  if (!isFocused) {
    let f;
    if (d[0] !== u) ((f = e(Text, { dimColor: !0, children: u })), (d[0] = u), (d[1] = f));
    else f = d[1];
    return f;
  }
  let f;
  if (d[2] === MEMO_CACHE_SENTINEL)
    ((f = r(Text, { dimColor: !0, children: [re.triangleLeft, " "] })), (d[2] = f));
  else f = d[2];
  let C;
  if (d[3] === MEMO_CACHE_SENTINEL)
    ((C = r(Text, { dimColor: !0, children: [" ", re.triangleRight] })), (d[3] = C));
  else C = d[3];
  let b;
  if (d[4] !== u) ((b = r(Text, { children: [f, u, C] })), (d[4] = u), (d[5] = b));
  else b = d[5];
  return b;
}
//@ chunk-v517dzda.js:13065-14448 placement
function FeedbackField(h) {
  let H = w(24),
    {
      label: label,
      value: c,
      isFocused: isFocused,
      bold: bold,
      dim: dim,
      multiline: multiline,
      columns: columns,
      cursorOffset: cursorOffset,
      onChange: onChange,
      onCursorChange: onCursorChange,
      onNext: onNext,
      onPrev: onPrev,
      onExit: onExit,
    } = h,
    K = useIsScreenReaderEnabled(),
    _;
  if (H[0] !== isFocused) ((_ = e(FocusPointer, { isFocused: isFocused })), (H[0] = isFocused), (H[1] = _));
  else _ = H[1];
  let M;
  if (H[2] !== label) ((M = e(Text, { children: label })), (H[2] = label), (H[3] = M));
  else M = H[3];
  let T;
  if (H[4] !== _ || H[5] !== M) ((T = r(Box, { children: [_, M] })), (H[4] = _), (H[5] = M), (H[6] = T));
  else T = H[6];
  let k;
  if (
    H[7] !== bold ||
    H[8] !== columns ||
    H[9] !== cursorOffset ||
    H[10] !== dim ||
    H[11] !== isFocused ||
    H[12] !== K ||
    H[13] !== multiline ||
    H[14] !== onChange ||
    H[15] !== onCursorChange ||
    H[16] !== onExit ||
    H[17] !== onNext ||
    H[18] !== onPrev ||
    H[19] !== c
  )
    ((k = e(Box, {
      marginLeft: 4,
      children: isFocused
        ? e(Box, {
            borderStyle: multiline && !K ? "single" : void 0,
            borderLeft: !0,
            borderTop: !1,
            borderBottom: !1,
            borderRight: !1,
            borderDimColor: !0,
            paddingLeft: multiline && !K ? 1 : 0,
            children: e(TextInput, {
              value: c,
              onChange: onChange,
              columns: multiline && !K ? columns - 2 : columns,
              onSubmit: onNext,
              onExit: onExit,
              onHistoryUp: onPrev,
              onHistoryDown: onNext,
              cursorOffset: cursorOffset ?? c.length,
              onChangeCursorOffset: onCursorChange,
              multiline: multiline,
              inputFilter: (G) => ct(G, multiline),
              clearOnSubmit: !1,
              disableCtrlCClear: !0,
              disableBackslashReturn: multiline,
              disableCursorMovementForUpDownKeys: !multiline,
              disableEscapeDoublePress: !0,
              showCursor: !0,
              focus: !0,
            }),
          })
        : multiline
          ? e(WrappedTextBox, { value: c, bold: bold, dim: dim, columns: columns })
          : e(Text, { bold: bold, dimColor: dim, wrap: "wrap", children: hr(c) }),
    })),
      (H[7] = bold),
      (H[8] = columns),
      (H[9] = cursorOffset),
      (H[10] = dim),
      (H[11] = isFocused),
      (H[12] = K),
      (H[13] = multiline),
      (H[14] = onChange),
      (H[15] = onCursorChange),
      (H[16] = onExit),
      (H[17] = onNext),
      (H[18] = onPrev),
      (H[19] = c),
      (H[20] = k));
  else k = H[20];
  let Y;
  if (H[21] !== T || H[22] !== k)
    ((Y = r(Box, { flexDirection: "column", children: [T, k] })), (H[21] = T), (H[22] = k), (H[23] = Y));
  else Y = H[23];
  return Y;
}
//@ chunk-v517dzda.js:14448-14478 placement
var WRITE_NEW_FEEDBACK_LABEL = "+ Write new feedback";
//@ chunk-v517dzda.js:14680-16295 placement
function FeedbackQueueList(h) {
  let i = w(34),
    {
      thisSession: thisSession,
      others: others,
      hasWriteNew: hasWriteNew,
      defaultFocusIndex: defaultFocusIndex,
      onFocus: onFocus,
      onOpen: onOpen,
      onWriteNew: onWriteNew,
      onDiscard: onDiscard,
    } = h,
    { rows: rows } = useScrollViewportSize(useTerminalSize()),
    L = Tl(),
    A;
  if (i[0] !== others || i[1] !== thisSession)
    ((A = [...thisSession, ...others]), (i[0] = others), (i[1] = thisSession), (i[2] = A));
  else A = i[2];
  let D = A,
    K = (thisSession.length > 0 ? 1 : 0) + (others.length > 0 ? 1 : 0) + D.length + (hasWriteNew ? 2 : 0),
    max = Math.max(dt, rows - lt - (L ? 0 : at));
  const _ = K > max ? max - 2 : max;
  let M;
  if (i[3] !== onOpen || i[4] !== onWriteNew || i[5] !== D)
    ((M = (T) => {
      let k = D[T];
      if (k) onOpen(k);
      else onWriteNew();
    }),
      (i[3] = onOpen),
      (i[4] = onWriteNew),
      (i[5] = D),
      (i[6] = M));
  else M = i[6];
  let G;
  if (i[7] !== onDiscard || i[8] !== D)
    ((G = (Y, z) => {
      let de = D[z];
      if (Y.key.toLowerCase() === "d" && de && !Y.ctrl && !Y.meta) (Y.preventDefault(), onDiscard(de));
    }),
      (i[7] = onDiscard),
      (i[8] = D),
      (i[9] = G));
  else G = i[9];
  let se;
  if (i[10] !== thisSession.length)
    ((se =
      thisSession.length > 0 &&
      e(merged.Heading, { children: e(Text, { bold: !0, children: "This session" }) }, "this-session")),
      (i[10] = thisSession.length),
      (i[11] = se));
  else se = i[11];
  let E;
  if (i[12] !== thisSession) ((E = thisSession.map(Xt)), (i[12] = thisSession), (i[13] = E));
  else E = i[13];
  let oe;
  if (i[14] !== others.length)
    ((oe =
      others.length > 0 &&
      e(merged.Heading, { children: e(Text, { bold: !0, children: "Other sessions" }) }, "other-sessions")),
      (i[14] = others.length),
      (i[15] = oe));
  else oe = i[15];
  let ue;
  if (i[16] !== others) ((ue = others.map(Jt)), (i[16] = others), (i[17] = ue));
  else ue = i[17];
  let ee;
  if (i[18] !== hasWriteNew)
    ((ee = hasWriteNew && e(merged.Heading, {}, "gap")), (i[18] = hasWriteNew), (i[19] = ee));
  else ee = i[19];
  let x;
  if (i[20] !== hasWriteNew)
    ((x = hasWriteNew && e(OrderedListWithItem.Item, { label: WRITE_NEW_FEEDBACK_LABEL }, "write-new")),
      (i[20] = hasWriteNew),
      (i[21] = x));
  else x = i[21];
  let ae;
  if (
    i[22] !== defaultFocusIndex ||
    i[23] !== onFocus ||
    i[24] !== x ||
    i[25] !== _ ||
    i[26] !== M ||
    i[27] !== G ||
    i[28] !== se ||
    i[29] !== E ||
    i[30] !== oe ||
    i[31] !== ue ||
    i[32] !== ee
  )
    ((ae = r(OrderedListWithItem, {
      visibleCount: _,
      defaultFocusIndex: defaultFocusIndex,
      overflowHint: "count",
      onFocus: onFocus,
      onSelect: M,
      onRowKeyDown: G,
      children: [se, E, oe, ue, ee, x],
    })),
      (i[22] = defaultFocusIndex),
      (i[23] = onFocus),
      (i[24] = x),
      (i[25] = _),
      (i[26] = M),
      (i[27] = G),
      (i[28] = se),
      (i[29] = E),
      (i[30] = oe),
      (i[31] = ue),
      (i[32] = ee),
      (i[33] = ae));
  else ae = i[33];
  return ae;
}
/**
 * 反馈条目的元信息：类型、多久前、目录、transcript 是否可用。
 */
//@ chunk-v517dzda.js:16295-16436 placement
function feedbackItemMeta(h) {
  return [
    FEEDBACK_TYPE_LABELS[h.type],
    formatAgeShort(h.created_at),
    hr(h.cwd),
    h.transcriptAvailable ? "transcript available" : "transcript expired (report only)",
  ];
}
//@ chunk-v517dzda.js:16436-16660 placement
function formatAgeShort(h, u = Date.now()) {
  let c = u - Date.parse(h);
  if (!Number.isFinite(c) || c < 0) return "now";
  let floored = Math.floor(c / 60000);
  if (floored < 60) return `${Math.max(1, floored)}m`;
  let floored_2 = Math.floor(floored / 60);
  if (floored_2 < 24) return `${floored_2}h`;
  return `${Math.floor(floored_2 / 24)}d`;
}

export { WRITE_NEW_FEEDBACK_LABEL, FeedbackQueue };
