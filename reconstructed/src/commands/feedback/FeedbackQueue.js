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
import { init_react_production, y, R, ce, P, Q } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../../components/CustomSelect/selectTable.js";
import { stripInvisibleChars, stripInvisibleCharsMultiLine } from "../../utils/invisibleChars.js";
import {
  FEEDBACK_FAILURE_MODES,
  FEEDBACK_TASK_CATEGORIES,
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
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
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
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { TextInput } from "../../components/TextInput.js";
import { WrappedTextBox } from "../../components/FeedbackSurvey/FeedbackDraftNotice.js";
import { useScrollViewportSize, useHasScrollViewport } from "../../components/ScrollViewportContext.js";
import { merged } from "../../components/CustomSelect/select.js";

//@ chunk-v517dzda.js:1297-1301 placement
init_react_production();
//@ chunk-v517dzda.js:1301-1376 placement
function renderThisSessionFeedbackItem(U) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: stripInvisibleChars(U.title),
      meta: feedbackItemMeta(U),
    },
    U.draft_id,
  );
}
//@ chunk-v517dzda.js:1376-1455 placement
function renderOtherFeedbackItem(te) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: stripInvisibleChars(te.title),
      meta: feedbackItemMeta(te),
    },
    te.draft_id,
  );
}
//@ chunk-v517dzda.js:1455-1603 placement
var FEEDBACK_TYPES = ["bug", "idea", "missing_capability"];
var FEEDBACK_TYPE_LABELS = {
  bug: "bug",
  idea: "idea",
  missing_capability: "missing capability",
};
var AREA_CHOICES = [undefined, ...FEEDBACK_FAILURE_MODES];
var FAILURE_MODE_CHOICES = [undefined, ...FEEDBACK_TASK_CATEGORIES];
//@ chunk-v517dzda.js:1603-1665 placement
function snakeToWords(h) {
  return h === undefined ? "(none)" : h.replace(/_/g, " ");
}
//@ chunk-v517dzda.js:1665-1801 placement
/**
 * 反馈编辑表单的字段顺序，transcript 可用时含 transcript。
 */
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
var DRAFT_DEBOUNCE_MS = 500;
var FEEDBACK_LIST_CHROME_ROWS = 6;
var FEEDBACK_LIST_FIXED_ROWS = 3;
var FEEDBACK_LIST_MIN_ROWS = 5;
//@ chunk-v517dzda.js:1827-12269 placement
/**
 * /feedback 的反馈队列界面（2.1.316 新增）：列出本会话与其他会话的待发反馈，可打开、编辑字段、丢弃或新写一条。
 */
function FeedbackQueue({ messages, onDone, abortSignal, onWriteNew }) {
  let [f, C] = y(null);
  let [b, B] = y(0);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [m, L] = y("list");
  let [i, A] = y(null);
  let [D, K] = y(false);
  let [H, _, M] = useLatestState(0);
  let [T, k, G] = useLatestState(null);
  let [Y, z] = y(null);
  let de = R(-1 / 0);
  let [se, E] = y(null);
  let [oe, ue] = y(null);
  let columns = useTerminalSize().columns - 6;
  let clock = useClock();
  let ae = R(0);
  let U = R(false);
  let te = R(0);
  let fe = R(false);
  let ye = R(false);
  let { storageV5, credentials } = useTheme_2();
  let host = useHost();
  let ne = useSession((t) => t.id);
  let me = onWriteNew !== undefined;
  let le = ce(async () => {
    let { queued } = await listFeedbackDrafts(undefined, storageV5).catch(() => ({
      queued: [],
      expired: [],
    }));
    setSessionDraftCount(count(queued, (l) => l.source_session_id === ne));
    C(queued);
    let o = queued.length - (me ? 0 : 1);
    B((l) => Math.min(l, Math.max(0, o)));
    return queued;
  }, [ne, me, storageV5, B]);
  P(() => {
    le().then((t) => {
      logEvent("tengu_feedback_queue_opened", {
        queued_count: fromNumber(t.length),
        this_session_count: fromNumber(count(t, (o) => o.source_session_id === ne)),
      });
    });
  }, [le, ne]);
  let filtered = (f ?? []).filter((t) => t.source_session_id === ne);
  let filtered_2 = (f ?? []).filter((t) => t.source_session_id !== ne);
  let ie = [...filtered, ...filtered_2];
  let ze = me && b === ie.length;
  let Qe = ie.length + (me ? 1 : 0);
  let Dt = ie[b];
  let Oe = i ? recentEntries(i.request_ids).length : 0;
  let pe = ce(
    (t) => {
      if (t === undefined) onDone();
      else
        onDone(t, {
          display: "system",
        });
    },
    [onDone],
  );
  let I = Q(() => (i ? getFeedbackFormFields(i) : []), [i]);
  let ke = ce(
    (t) => {
      ae.current = clock.now();
      _(t.length - 1);
    },
    [clock, _],
  );
  let p = I[H];
  let he = p === "title" || p === "area" || p === "details";
  let onOpen = ce(
    (t) => {
      A(t);
      K(t.transcriptAvailable);
      E(null);
      k({
        type: t.type,
        title: stripInvisibleChars(t.title),
        area: stripInvisibleChars(t.area ?? ""),
        failureMode: t.failure_mode,
        taskCategory: t.task_category,
        details: stripInvisibleCharsMultiLine(t.details),
      });
      z(null);
      de.current = -1 / 0;
      ke(getFeedbackFormFields(t));
      te.current = clock.now();
      U.current = false;
      ye.current = false;
      L("review");
    },
    [clock, ke, k],
  );
  let Ze = ce(
    async (t) => {
      let o = clock.now();
      let l = te.current;
      te.current = Math.max(o, l);
      if (o - l < DRAFT_DEBOUNCE_MS || fe.current || U.current) return;
      fe.current = true;
      try {
        await discardFeedbackDraft(t, "panel", storageV5).catch(() => {});
        await le();
        L("list");
        A(null);
      } finally {
        fe.current = false;
      }
    },
    [le, clock, storageV5],
  );
  let xe = ce(
    (t) => {
      A(t);
      C((g) => (g ? g.map((v) => (v.draft_id === t.draft_id ? t : v)) : g));
      let { transcriptAvailable, ...l } = t;
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
  );
  let ve = ce(() => {
    let t = G();
    if (!i || !t) return i;
    let o = stripInvisibleChars(i.title);
    let l = stripInvisibleChars(i.area ?? "");
    let g = stripInvisibleCharsMultiLine(i.details);
    let v = t.title === o || t.title.trim() === "" ? i.title : t.title.trim();
    let Ce = t.area === l ? (i.area ?? "") : t.area.trim();
    let rt = t.details === g ? i.details : t.details.trim() === "" ? "" : t.details;
    if (
      t.type === i.type &&
      v === i.title &&
      (Ce === "" ? undefined : Ce) === i.area &&
      t.failureMode === i.failure_mode &&
      t.taskCategory === i.task_category &&
      rt === i.details
    )
      return i;
    return {
      ...i,
      type: t.type,
      title: v,
      area: Ce === "" ? undefined : Ce,
      failure_mode: t.failureMode,
      task_category: t.taskCategory,
      details: rt,
    };
  }, [i, G]);
  let et = ce(() => {
    let t = ve();
    if (t && t !== i) {
      if (i && t.details === "" && i.details !== "" && clock.now() - de.current < DRAFT_DEBOUNCE_MS)
        t = {
          ...t,
          details: i.details,
        };
      xe(t);
    }
  }, [ve, i, xe, clock]);
  let W = ce(
    (t) => {
      z(null);
      E((o) => (o === DETAILS_TOO_LARGE_MESSAGE ? null : o));
      _((o) => {
        let max = Math.max(0, Math.min(I.length - 1, o + t));
        if (max !== o && I[max] === "send") ae.current = clock.now();
        return max;
      });
    },
    [I, clock, _],
  );
  let Tt = ce(
    (t, o) => {
      if (t === "type")
        k((l) => {
          if (!l) return l;
          let index = FEEDBACK_TYPES.indexOf(l.type);
          let v = FEEDBACK_TYPES[(index + o + FEEDBACK_TYPES.length) % FEEDBACK_TYPES.length];
          return v
            ? {
                ...l,
                type: v,
              }
            : l;
        });
      else if (t === "failure_mode")
        k((l) => {
          if (!l) return l;
          let index = AREA_CHOICES.indexOf(l.failureMode);
          let v = AREA_CHOICES.length;
          return {
            ...l,
            failureMode: AREA_CHOICES[(index + o + v) % v],
          };
        });
      else if (t === "task_category")
        k((l) => {
          if (!l) return l;
          let index = FAILURE_MODE_CHOICES.indexOf(l.taskCategory);
          let v = FAILURE_MODE_CHOICES.length;
          return {
            ...l,
            taskCategory: FAILURE_MODE_CHOICES[(index + o + v) % v],
          };
        });
      else if (t === "transcript") K((l) => !l);
    },
    [k],
  );
  let Rt = ce(async () => {
    if (!i || U.current || fe.current) return;
    let t = clock.now();
    let o = ae.current;
    ae.current = Math.max(t, o);
    if (t - o < DRAFT_DEBOUNCE_MS) return;
    if (G()?.title.trim() === "") {
      E("Title is blank. Type a title, or press esc on the field to restore it.");
      return;
    }
    let l = ve() ?? i;
    U.current = true;
    L("submitting");
    E(null);
    if (l !== i) await xe(l);
    let g;
    try {
      g = await submitFeedbackDraft({
        draft: l,
        includeTranscript: D && l.transcriptAvailable,
        currentSessionMessages: messages,
        signal: abortSignal,
        storageV5,
        host,
        credentials,
      });
    } catch {
      g = {
        success: false,
        error: "Couldn't send feedback. The draft is still queued. Try again later.",
      };
    }
    U.current = false;
    if (g.success) {
      await le();
      ue(g.feedbackId);
      L("receipt");
    } else {
      E(g.error);
      if (g.payloadTooLarge) {
        let index = I.indexOf("transcript");
        if (index >= 0) _(index);
      }
      L("review");
    }
  }, [i, G, D, messages, abortSignal, le, clock, ve, xe, storageV5, credentials, host, I, _]);
  function St(event) {
    if (event.ctrl || event.meta) return;
    if (m === "submitting") {
      event.preventDefault();
      return;
    }
    if (event.key === "escape" && !(m === "review" && he)) return;
    if (m === "receipt") {
      event.preventDefault();
      if ((f?.length ?? 0) > 0) {
        L("list");
        A(null);
      } else pe(`Feedback sent (receipt ${oe})`);
      return;
    }
    if (m === "list") {
      if (!f) {
        event.preventDefault();
        return;
      }
      if (event.key.toLowerCase() === "w" && onWriteNew) {
        event.preventDefault();
        onWriteNew();
        return;
      }
      if (Qe === 0) {
        event.preventDefault();
        pe();
        return;
      }
      if (ie.length > 0) return;
      if (event.key === "up" || event.key === "down") event.preventDefault();
      else if (event.key === "return" && onWriteNew) {
        event.preventDefault();
        onWriteNew();
      } else if (event.key !== "escape") {
        event.preventDefault();
        pe();
      }
      return;
    }
    if (m === "review" && i) {
      if (ye.current) {
        event.preventDefault();
        return;
      }
      if (he) {
        if (event.key === "escape") {
          event.preventDefault();
          tt();
        }
        return;
      }
      let o = I[M()];
      if (event.key === "up") {
        event.preventDefault();
        W(-1);
      } else if (event.key === "down") {
        event.preventDefault();
        W(1);
      } else if (event.key === "left" || event.key === "right") {
        event.preventDefault();
        Tt(o, event.key === "left" ? -1 : 1);
      } else if (event.key === " " && o === "transcript") {
        event.preventDefault();
        K((l) => !l);
      } else if (event.key === "return") {
        event.preventDefault();
        if (o === "send") Rt();
        else W(1);
      } else if (event.key.toLowerCase() === "d" && o !== "title" && o !== "area" && o !== "details") {
        event.preventDefault();
        Ze(i);
      }
    }
  }
  let ge = ce(() => {
    if (ye.current || U.current || fe.current) return;
    ye.current = true;
    et();
    te.current = -1 / 0;
    L("list");
    A(null);
  }, [et]);
  let tt = ce(() => {
    if (m !== "review") {
      pe();
      return;
    }
    let t = I[M()];
    if (t !== "title" && t !== "area" && t !== "details") {
      ge();
      return;
    }
    k((o) =>
      o && i
        ? {
            ...o,
            [t]: t === "details" ? stripInvisibleCharsMultiLine(i.details) : stripInvisibleChars(i[t] ?? ""),
          }
        : o,
    );
    z(null);
    ke(I);
    E((o) => (o === DETAILS_TOO_LARGE_MESSAGE ? null : o));
  }, [m, i, I, M, ge, k, ke, pe]);
  let it = !(isScreenReaderEnabled && ie.length > 0);
  let inputGuide =
    m === "list"
      ? jsxProd_default_2(Byline, {
          children: [
            Qe > 0 &&
              it &&
              jsxProd_default(KeyboardShortcutHint, {
                chord: "enter",
                action: ze ? "write new feedback" : "review",
              }),
            Dt !== undefined &&
              it &&
              jsxProd_default(KeyboardShortcutHint, {
                chord: "d",
                action: "discard",
              }),
            jsxProd_default(KeyboardShortcutHint, {
              chord: "esc",
              action: "close",
            }),
          ],
        })
      : m === "review"
        ? jsxProd_default_2(Byline, {
            children: [
              jsxProd_default(KeyboardShortcutHint, {
                chord: ["up", "down"],
                action: "move",
              }),
              (p === "type" || p === "failure_mode" || p === "task_category" || p === "transcript") &&
                jsxProd_default(KeyboardShortcutHint, {
                  chord: ["left", "right"],
                  action: "change",
                }),
              jsxProd_default(KeyboardShortcutHint, {
                chord: "enter",
                action: p === "send" ? "send" : "next",
              }),
              p === "details" &&
                jsxProd_default(KeyboardShortcutHint, {
                  chord: supportsShiftEnter() ? "shift+enter" : "ctrl+j",
                  action: "new line",
                }),
              !he &&
                jsxProd_default(KeyboardShortcutHint, {
                  chord: "d",
                  action: "discard",
                }),
              jsxProd_default(KeyboardShortcutHint, {
                chord: "esc",
                action: he ? "cancel edit" : "later",
              }),
            ],
          })
        : null;
  return jsxProd_default(FocusColumn, {
    onKeyDown: St,
    children: jsxProd_default_2(Dialog, {
      title: "Feedback drafts",
      onCancel: tt,
      isCancelActive: m !== "submitting" && !he,
      hideInputGuide: m === "receipt" || m === "submitting",
      inputGuide,
      children: [
        m === "list" &&
          f === null &&
          jsxProd_default(Text, {
            dimColor: true,
            children: "Loading\u2026",
          }),
        m === "list" &&
          f !== null &&
          ie.length === 0 &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            gap: 1,
            children: [
              jsxProd_default(Text, {
                children: "No feedback drafts queued.",
              }),
              jsxProd_default(Text, {
                dimColor: true,
                children:
                  "Claude drafts feedback at high-signal moments; drafts appear here for your review.",
              }),
              onWriteNew
                ? jsxProd_default_2(Box, {
                    flexDirection: "column",
                    gap: 1,
                    children: [
                      jsxProd_default(HideRow, {
                        isSelected: ze,
                      }),
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: "/bug works anytime. Any other key closes this panel.",
                      }),
                    ],
                  })
                : jsxProd_default(Text, {
                    dimColor: true,
                    children: "Any key closes this panel.",
                  }),
            ],
          }),
        m === "list" &&
          f !== null &&
          ie.length > 0 &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default(FeedbackQueueList, {
                thisSession: filtered,
                others: filtered_2,
                hasWriteNew: me,
                defaultFocusIndex: b,
                onFocus: B,
                onOpen,
                onWriteNew: () => onWriteNew?.(),
                onDiscard: (t) => void Ze(t),
              }),
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default(Text, {
                  dimColor: true,
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
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default(FocusPointer, {
                    isFocused: p === "type",
                  }),
                  jsxProd_default(Text, {
                    children: "Type: ",
                  }),
                  jsxProd_default(CycleValue, {
                    value: FEEDBACK_TYPE_LABELS[T.type],
                    isFocused: p === "type",
                  }),
                ],
              }),
              jsxProd_default(FeedbackField, {
                label: "Title:",
                value: T.title,
                isFocused: p === "title",
                bold: true,
                columns,
                cursorOffset: Y,
                onChange: (title) =>
                  k((o) =>
                    o
                      ? {
                          ...o,
                          title,
                        }
                      : o,
                  ),
                onCursorChange: z,
                onNext: () => W(1),
                onPrev: () => W(-1),
                onExit: ge,
              }),
              jsxProd_default(FeedbackField, {
                label: "Area:",
                value: T.area,
                isFocused: p === "area",
                dim: true,
                columns,
                cursorOffset: Y,
                onChange: (area) =>
                  k((o) =>
                    o
                      ? {
                          ...o,
                          area,
                        }
                      : o,
                  ),
                onCursorChange: z,
                onNext: () => W(1),
                onPrev: () => W(-1),
                onExit: ge,
              }),
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default(FocusPointer, {
                    isFocused: p === "failure_mode",
                  }),
                  jsxProd_default(Text, {
                    children: "Failure mode: ",
                  }),
                  jsxProd_default(CycleValue, {
                    value: snakeToWords(T.failureMode),
                    isFocused: p === "failure_mode",
                  }),
                ],
              }),
              jsxProd_default_2(Box, {
                children: [
                  jsxProd_default(FocusPointer, {
                    isFocused: p === "task_category",
                  }),
                  jsxProd_default(Text, {
                    children: "Task: ",
                  }),
                  jsxProd_default(CycleValue, {
                    value: snakeToWords(T.taskCategory),
                    isFocused: p === "task_category",
                  }),
                ],
              }),
              jsxProd_default(FeedbackField, {
                label: "Details:",
                value: T.details,
                isFocused: p === "details",
                dim: true,
                multiline: true,
                columns,
                cursorOffset: Y,
                onChange: (t) => {
                  let o = Buffer.byteLength(t, "utf8");
                  if (o > MAX_DETAILS_LENGTH && o >= Buffer.byteLength(T.details, "utf8")) {
                    E(DETAILS_TOO_LARGE_MESSAGE);
                    return;
                  }
                  k((l) => {
                    if (l && l.details.trim() !== "" && t.trim() === "") de.current = clock.now();
                    return l
                      ? {
                          ...l,
                          details: t,
                        }
                      : l;
                  });
                  E((l) => (l === DETAILS_TOO_LARGE_MESSAGE ? null : l));
                },
                onCursorChange: z,
                onNext: () => W(1),
                onPrev: () => W(-1),
                onExit: ge,
              }),
              i.transcriptAvailable
                ? jsxProd_default_2(Box, {
                    flexDirection: "column",
                    children: [
                      jsxProd_default_2(Box, {
                        children: [
                          jsxProd_default(FocusPointer, {
                            isFocused: p === "transcript",
                          }),
                          jsxProd_default(Text, {
                            children: "Send transcript: ",
                          }),
                          jsxProd_default(CycleValue, {
                            value: D ? "yes" : "no",
                            isFocused: p === "transcript",
                          }),
                          jsxProd_default_2(Text, {
                            dimColor: true,
                            children: [" \xB7 ", D ? "sends this conversation to Anthropic" : "report only"],
                          }),
                        ],
                      }),
                      i.source_session_id !== ne &&
                        jsxProd_default(Box, {
                          marginLeft: 4,
                          children: jsxProd_default_2(Text, {
                            dimColor: true,
                            wrap: "wrap",
                            children: [
                              "from ",
                              stripInvisibleChars(i.cwd),
                              " \xB7 session",
                              " ",
                              stripInvisibleChars(i.source_session_id),
                            ],
                          }),
                        }),
                    ],
                  })
                : jsxProd_default_2(Box, {
                    children: [
                      jsxProd_default(FocusPointer, {
                        isFocused: false,
                      }),
                      jsxProd_default_2(Text, {
                        children: [
                          "Send transcript: ",
                          jsxProd_default(Text, {
                            dimColor: true,
                            children: "expired (report only)",
                          }),
                        ],
                      }),
                    ],
                  }),
              jsxProd_default_2(Box, {
                marginTop: 1,
                children: [
                  jsxProd_default(FocusPointer, {
                    isFocused: false,
                  }),
                  jsxProd_default_2(Text, {
                    dimColor: true,
                    wrap: "wrap",
                    children: [
                      "Environment info (",
                      stripInvisibleChars(i.os),
                      ", v",
                      stripInvisibleChars(i.cli_version),
                      ",",
                      " ",
                      stripInvisibleChars(i.model),
                      i.effort !== undefined &&
                        jsxProd_default_2(Fragment, {
                          children: [", effort", " ", stripInvisibleChars(i.effort)],
                        }),
                      i.thinking_type !== undefined &&
                        jsxProd_default_2(Fragment, {
                          children: [
                            ", thinking ",
                            i.thinking_type,
                            i.thinking_budget !== undefined &&
                              jsxProd_default_2(Fragment, {
                                children: [" (budget ", i.thinking_budget, ")"],
                              }),
                          ],
                        }),
                      i.assistant_turn_count !== undefined &&
                        jsxProd_default_2(Fragment, {
                          children: [
                            ", turn ",
                            i.assistant_turn_count,
                            i.message_count !== undefined &&
                              jsxProd_default_2(Fragment, {
                                children: ["/", i.message_count],
                              }),
                            i.subagent_count !== undefined &&
                              i.subagent_count > 0 &&
                              jsxProd_default_2(Fragment, {
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
              se &&
                jsxProd_default(Box, {
                  marginTop: 1,
                  children: jsxProd_default(ErrorText, {
                    error: se,
                  }),
                }),
              jsxProd_default_2(Box, {
                marginTop: 1,
                children: [
                  jsxProd_default(FocusPointer, {
                    isFocused: p === "send",
                  }),
                  jsxProd_default(Text, {
                    bold: p === "send",
                    children: "Send feedback",
                  }),
                ],
              }),
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  wrap: "wrap",
                  children:
                    "We may use these reports to debug related issues and improve Claude Code. Turn off Claude-drafted feedback anytime in /config.",
                }),
              }),
            ],
          }),
        m === "submitting" &&
          jsxProd_default(Text, {
            children: "Sending feedback\u2026",
          }),
        m === "receipt" &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [
              jsxProd_default_2(Text, {
                color: "success",
                children: [
                  jsxProd_default(StatusIcon, {
                    status: "success",
                    withSpace: true,
                  }),
                  "Feedback sent (receipt ",
                  oe,
                  "). Thanks!",
                ],
              }),
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default(Text, {
                  dimColor: true,
                  italic: true,
                  children: "Any key to continue",
                }),
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
function normalizeFeedbackInput(h, multiline) {
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
    .map((line) => replaceControlChars(line))
    .join(
      multiline
        ? `
`
        : " ",
    );
}
//@ chunk-v517dzda.js:12470-12665 placement
/**
 * 聚焦时显示指针，否则两个空格。
 */
function FocusPointer(props) {
  let f = w(3);
  let { isFocused } = props;
  const color = isFocused ? "suggestion" : undefined;
  const children = isFocused ? `${figures_default.pointer} ` : "  ";
  let C;
  if (f[0] !== color || f[1] !== children) {
    C = jsxProd_default(Text, {
      color,
      children,
    });
    f[0] = color;
    f[1] = children;
    f[2] = C;
  } else C = f[2];
  return C;
}
//@ chunk-v517dzda.js:12665-13065 placement
/**
 * 可左右切换的值：聚焦时两侧显示 ◀ ▶。
 */
function CycleValue(props) {
  let d = w(6);
  let { value: u, isFocused } = props;
  if (!isFocused) {
    let f;
    if (d[0] !== u) {
      f = jsxProd_default(Text, {
        dimColor: true,
        children: u,
      });
      d[0] = u;
      d[1] = f;
    } else f = d[1];
    return f;
  }
  let f;
  if (d[2] === MEMO_CACHE_SENTINEL) {
    f = jsxProd_default_2(Text, {
      dimColor: true,
      children: [figures_default.triangleLeft, " "],
    });
    d[2] = f;
  } else f = d[2];
  let C;
  if (d[3] === MEMO_CACHE_SENTINEL) {
    C = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" ", figures_default.triangleRight],
    });
    d[3] = C;
  } else C = d[3];
  let b;
  if (d[4] !== u) {
    b = jsxProd_default_2(Text, {
      children: [f, u, C],
    });
    d[4] = u;
    d[5] = b;
  } else b = d[5];
  return b;
}
//@ chunk-v517dzda.js:13065-14448 placement
function FeedbackField(props) {
  let H = w(24);
  let {
    label,
    value: c,
    isFocused,
    bold,
    dim,
    multiline,
    columns,
    cursorOffset,
    onChange,
    onCursorChange,
    onNext,
    onPrev,
    onExit,
  } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let _;
  if (H[0] !== isFocused) {
    _ = jsxProd_default(FocusPointer, {
      isFocused,
    });
    H[0] = isFocused;
    H[1] = _;
  } else _ = H[1];
  let M;
  if (H[2] !== label) {
    M = jsxProd_default(Text, {
      children: label,
    });
    H[2] = label;
    H[3] = M;
  } else M = H[3];
  let T;
  if (H[4] !== _ || H[5] !== M) {
    T = jsxProd_default_2(Box, {
      children: [_, M],
    });
    H[4] = _;
    H[5] = M;
    H[6] = T;
  } else T = H[6];
  let k;
  if (
    H[7] !== bold ||
    H[8] !== columns ||
    H[9] !== cursorOffset ||
    H[10] !== dim ||
    H[11] !== isFocused ||
    H[12] !== isScreenReaderEnabled ||
    H[13] !== multiline ||
    H[14] !== onChange ||
    H[15] !== onCursorChange ||
    H[16] !== onExit ||
    H[17] !== onNext ||
    H[18] !== onPrev ||
    H[19] !== c
  ) {
    k = jsxProd_default(Box, {
      marginLeft: 4,
      children: isFocused
        ? jsxProd_default(Box, {
            borderStyle: multiline && !isScreenReaderEnabled ? "single" : undefined,
            borderLeft: true,
            borderTop: false,
            borderBottom: false,
            borderRight: false,
            borderDimColor: true,
            paddingLeft: multiline && !isScreenReaderEnabled ? 1 : 0,
            children: jsxProd_default(TextInput, {
              value: c,
              onChange,
              columns: multiline && !isScreenReaderEnabled ? columns - 2 : columns,
              onSubmit: onNext,
              onExit,
              onHistoryUp: onPrev,
              onHistoryDown: onNext,
              cursorOffset: cursorOffset ?? c.length,
              onChangeCursorOffset: onCursorChange,
              multiline,
              inputFilter: (G) => normalizeFeedbackInput(G, multiline),
              clearOnSubmit: false,
              disableCtrlCClear: true,
              disableBackslashReturn: multiline,
              disableCursorMovementForUpDownKeys: !multiline,
              disableEscapeDoublePress: true,
              showCursor: true,
              focus: true,
            }),
          })
        : multiline
          ? jsxProd_default(WrappedTextBox, {
              value: c,
              bold,
              dim,
              columns,
            })
          : jsxProd_default(Text, {
              bold,
              dimColor: dim,
              wrap: "wrap",
              children: stripInvisibleChars(c),
            }),
    });
    H[7] = bold;
    H[8] = columns;
    H[9] = cursorOffset;
    H[10] = dim;
    H[11] = isFocused;
    H[12] = isScreenReaderEnabled;
    H[13] = multiline;
    H[14] = onChange;
    H[15] = onCursorChange;
    H[16] = onExit;
    H[17] = onNext;
    H[18] = onPrev;
    H[19] = c;
    H[20] = k;
  } else k = H[20];
  let Y;
  if (H[21] !== T || H[22] !== k) {
    Y = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [T, k],
    });
    H[21] = T;
    H[22] = k;
    H[23] = Y;
  } else Y = H[23];
  return Y;
}
//@ chunk-v517dzda.js:14448-14478 placement
var WRITE_NEW_FEEDBACK_LABEL = "+ Write new feedback";
//@ chunk-v517dzda.js:14680-16295 placement
function FeedbackQueueList(props) {
  let i = w(34);
  let { thisSession, others, hasWriteNew, defaultFocusIndex, onFocus, onOpen, onWriteNew, onDiscard } = props;
  let { rows } = useScrollViewportSize(useTerminalSize());
  let hasScrollViewport = useHasScrollViewport();
  let A;
  if (i[0] !== others || i[1] !== thisSession) {
    A = [...thisSession, ...others];
    i[0] = others;
    i[1] = thisSession;
    i[2] = A;
  } else A = i[2];
  let D = A;
  let K = (thisSession.length > 0 ? 1 : 0) + (others.length > 0 ? 1 : 0) + D.length + (hasWriteNew ? 2 : 0);
  let max = Math.max(
    FEEDBACK_LIST_MIN_ROWS,
    rows - FEEDBACK_LIST_FIXED_ROWS - (hasScrollViewport ? 0 : FEEDBACK_LIST_CHROME_ROWS),
  );
  const visibleCount = K > max ? max - 2 : max;
  let onSelect;
  if (i[3] !== onOpen || i[4] !== onWriteNew || i[5] !== D) {
    onSelect = (T) => {
      let k = D[T];
      if (k) onOpen(k);
      else onWriteNew();
    };
    i[3] = onOpen;
    i[4] = onWriteNew;
    i[5] = D;
    i[6] = onSelect;
  } else onSelect = i[6];
  let onRowKeyDown;
  if (i[7] !== onDiscard || i[8] !== D) {
    onRowKeyDown = (event, z) => {
      let de = D[z];
      if (event.key.toLowerCase() === "d" && de && !event.ctrl && !event.meta) {
        event.preventDefault();
        onDiscard(de);
      }
    };
    i[7] = onDiscard;
    i[8] = D;
    i[9] = onRowKeyDown;
  } else onRowKeyDown = i[9];
  let se;
  if (i[10] !== thisSession.length) {
    se =
      thisSession.length > 0 &&
      jsxProd_default(
        merged.Heading,
        {
          children: jsxProd_default(Text, {
            bold: true,
            children: "This session",
          }),
        },
        "this-session",
      );
    i[10] = thisSession.length;
    i[11] = se;
  } else se = i[11];
  let E;
  if (i[12] !== thisSession) {
    E = thisSession.map(renderThisSessionFeedbackItem);
    i[12] = thisSession;
    i[13] = E;
  } else E = i[13];
  let oe;
  if (i[14] !== others.length) {
    oe =
      others.length > 0 &&
      jsxProd_default(
        merged.Heading,
        {
          children: jsxProd_default(Text, {
            bold: true,
            children: "Other sessions",
          }),
        },
        "other-sessions",
      );
    i[14] = others.length;
    i[15] = oe;
  } else oe = i[15];
  let ue;
  if (i[16] !== others) {
    ue = others.map(renderOtherFeedbackItem);
    i[16] = others;
    i[17] = ue;
  } else ue = i[17];
  let ee;
  if (i[18] !== hasWriteNew) {
    ee = hasWriteNew && jsxProd_default(merged.Heading, {}, "gap");
    i[18] = hasWriteNew;
    i[19] = ee;
  } else ee = i[19];
  let x;
  if (i[20] !== hasWriteNew) {
    x =
      hasWriteNew &&
      jsxProd_default(
        OrderedListWithItem.Item,
        {
          label: WRITE_NEW_FEEDBACK_LABEL,
        },
        "write-new",
      );
    i[20] = hasWriteNew;
    i[21] = x;
  } else x = i[21];
  let ae;
  if (
    i[22] !== defaultFocusIndex ||
    i[23] !== onFocus ||
    i[24] !== x ||
    i[25] !== visibleCount ||
    i[26] !== onSelect ||
    i[27] !== onRowKeyDown ||
    i[28] !== se ||
    i[29] !== E ||
    i[30] !== oe ||
    i[31] !== ue ||
    i[32] !== ee
  ) {
    ae = jsxProd_default_2(OrderedListWithItem, {
      visibleCount,
      defaultFocusIndex,
      overflowHint: "count",
      onFocus,
      onSelect,
      onRowKeyDown,
      children: [se, E, oe, ue, ee, x],
    });
    i[22] = defaultFocusIndex;
    i[23] = onFocus;
    i[24] = x;
    i[25] = visibleCount;
    i[26] = onSelect;
    i[27] = onRowKeyDown;
    i[28] = se;
    i[29] = E;
    i[30] = oe;
    i[31] = ue;
    i[32] = ee;
    i[33] = ae;
  } else ae = i[33];
  return ae;
}
//@ chunk-v517dzda.js:16295-16436 placement
/**
 * 反馈条目的元信息：类型、多久前、目录、transcript 是否可用。
 */
function feedbackItemMeta(h) {
  return [
    FEEDBACK_TYPE_LABELS[h.type],
    formatAgeShort(h.created_at),
    stripInvisibleChars(h.cwd),
    h.transcriptAvailable ? "transcript available" : "transcript expired (report only)",
  ];
}
//@ chunk-v517dzda.js:16436-16660 placement
function formatAgeShort(createdAt, u = Date.now()) {
  let c = u - Date.parse(createdAt);
  if (!Number.isFinite(c) || c < 0) return "now";
  let floored = Math.floor(c / 60000);
  if (floored < 60) return `${Math.max(1, floored)}m`;
  let floored_2 = Math.floor(floored / 60);
  if (floored_2 < 24) return `${floored_2}h`;
  return `${Math.floor(floored_2 / 24)}d`;
}
export { WRITE_NEW_FEEDBACK_LABEL, FeedbackQueue };
