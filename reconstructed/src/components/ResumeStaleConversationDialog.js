/**
 * components/ResumeStaleConversationDialog.tsx
 *
 * 2.1.316 新增：恢复长时间未活动对话时的选择对话框
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-975mts6d.js (18)
 * attribution: placement 18
 */
import { j, y, R, Se, zt, ce, yt } from "../../vendor/react/cjs/react.production.js";
import { iP } from "../context/session.js";
import { usePreDispatchKeyHandler } from "../keybindings/useActionHandlers.js";
import { useInputClock } from "../ink/components/Input.js";
import { kp } from "../../vendor/convert-to-spaces/dist/index.js";
import { isWithinRecentInput, So } from "../hooks/useRecentInputGuard.js";
import { useRefusalTracker } from "./CustomSelect/selectTypeahead.js";
import { M1s, f7e, bM } from "../state/promptInputStore.js";
import { r, e, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "./design-system/Dialog.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { Box, Text } from "../ink/components/Text.js";
import { formatTokens, formatDurationCoarse } from "../utils/format.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "./CustomSelect/select.js";
import { useClock } from "../ink/components/ClockContext.js";
import { w } from "../../vendor/react/compiler-runtime.js";

//@ chunk-975mts6d.js:774-792 placement
var weakMap = new WeakMap();
//@ chunk-975mts6d.js:792-914 placement
function getPasteHintState(o, t = "") {
  let i = weakMap.get(o);
  if (i === void 0) ((i = { needsArrow: t.trim() !== "", pastes: 0, pastesAtArrow: 0 }), weakMap.set(o, i));
  return i;
}
//@ chunk-975mts6d.js:914-960 placement
function x(o, t) {
  getPasteHintState(o).needsArrow = t.trim() !== "";
}
//@ chunk-975mts6d.js:960-1026 placement
function k(o) {
  let t = getPasteHintState(o);
  ((t.needsArrow = !1), (t.pastesAtArrow = t.pastes));
}
//@ chunk-975mts6d.js:1026-1055 placement
function P(o) {
  getPasteHintState(o).pastes += 1;
}
//@ chunk-975mts6d.js:1055-1132 placement
function needsArrowHint(o, t) {
  let i = getPasteHintState(o, t);
  return i.needsArrow || i.pastes > i.pastesAtArrow;
}
//@ chunk-975mts6d.js:1132-1136 placement
j();
//@ chunk-975mts6d.js:1136-1154 placement
var weakMap_2 = new WeakMap();
//@ chunk-975mts6d.js:1154-1181 placement
function G(o, t) {
  weakMap_2.set(o, t);
}
//@ chunk-975mts6d.js:1181-1211 placement
function O(o) {
  return weakMap_2.get(o);
}
//@ chunk-975mts6d.js:1211-1226 placement
function ie() {}
//@ chunk-975mts6d.js:1226-1252 placement
function ae(A) {
  return A + 1;
}
//@ chunk-975mts6d.js:1252-1273 placement
var STALE_TICK_MS = 60000,
  aWe = 1000;
/**
 * 恢复长时间未活动的对话时询问继续、压缩或新建，显示上下文大小与 5 小时额度占比。
 */
//@ chunk-975mts6d.js:1273-3260 placement
function ResumeStaleConversationDialog({
  inactiveSince: inactiveSince,
  contextTokens: contextTokens,
  percentOfFiveHourLimit: percentOfFiveHourLimit,
  trigger: trigger,
  focusedAction: focusedAction,
  offersLookUp: offersLookUp,
  ask: ask,
  onDone: onDone,
}) {
  let h = useRelativeTimeText(inactiveSince, trigger === "idle"),
    d = iP(),
    m = trigger === "idle",
    [, v] = y(0),
    A = TokenCountText(d, m ? ask : null, v);
  (y(() => {
    if (m) x(ask, A);
  }),
    usePreDispatchKeyHandler(
      (l, g) => {
        if (g.upArrow || g.downArrow) (k(ask), v((oe) => oe + 1));
      },
      { isActive: m },
    ));
  let K = m && A.trim() !== "",
    U = m && needsArrowHint(ask, A),
    Y = useInputClock(),
    F = R(Date.now()),
    { subscribeFrames: subscribeFrames } = Se(kp);
  zt(() => {
    let l = subscribeFrames(() => {
      ((F.current = Date.now()), l());
    });
    return l;
  }, [subscribeFrames]);
  let z = () => isWithinRecentInput(Y, F.current, aWe),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    ee = (l) => {
      if (focusedAction === "new_conversation" && l === "new_conversation" && (z() || refusedWithin(So)))
        return (noteRefused(), !1);
      return onDone(l);
    },
    E =
      trigger === "idle" && d !== void 0
        ? (l) => {
            (P(ask),
              v((g) => g + 1),
              M1s(
                d,
                f7e(d) +
                  l.text.replace(
                    /\r\n?/g,
                    `
`,
                  ),
              ));
          }
        : void 0,
    I = r(Dialog, {
      title: "Resume this conversation?",
      color: "warning",
      onCancel: () => onDone("dismiss"),
      inputGuide: r(Byline, {
        children: [
          U ? e(KeyboardShortcutHint, { chord: ["up", "down"], action: "pick a row first" }) : null,
          e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
          e(ConfigurableShortcutHint, {
            action: "confirm:no",
            context: "Confirmation",
            fallback: "Esc",
            description: m ? "dismiss" : "resume",
          }),
        ],
      }),
      children: [
        r(Box, {
          flexDirection: "column",
          children: [
            r(Text, {
              children: [
                "This conversation has been inactive for ",
                h,
                " and is",
                " ",
                formatTokens(contextTokens),
                " tokens long.",
                " ",
                percentOfFiveHourLimit >= 100
                  ? r(Fragment, {
                      children: [
                        "Resuming it will use ",
                        e(Text, { bold: !0, children: "all" }),
                        " of your 5-hour usage limit.",
                      ],
                    })
                  : r(Fragment, {
                      children: [
                        "Resuming it will use about",
                        " ",
                        r(Text, { bold: !0, children: [percentOfFiveHourLimit, "%"] }),
                        " of your 5-hour usage limit.",
                      ],
                    }),
              ],
            }),
            K &&
              e(Text, {
                dimColor: !0,
                children: "Your unsent message will still be there after you answer.",
              }),
          ],
        }),
        e(ModelSelector, {
          options: [
            { value: "resume", label: "Resume" },
            {
              value: "new_conversation",
              label: "Start a new conversation",
              ...(offersLookUp && { description: "Claude can look this one up if you refer to it later" }),
            },
          ],
          hideIndexes: trigger === "idle",
          onUpFromFirstItem: trigger === "idle" ? L : void 0,
          ...(focusedAction === "new_conversation" && {
            defaultFocusValue: O(ask) ?? "new_conversation",
            onDownFromLastItem: trigger === "idle" ? L : void 0,
            selectedValue: NO_COMMITTED_ROW,
            onFocus: (l) => {
              if (l !== "dismiss") G(ask, l);
            },
          }),
          onChange: ee,
        }),
      ],
    });
  return E === void 0 ? I : e(Box, { flexDirection: "column", onPaste: E, children: I });
}
//@ chunk-975mts6d.js:3260-3529 placement
function useRelativeTimeText(o, t) {
  let i = useClock(),
    [a] = y(() => ({ since: o, text: Q(o) }));
  if (a.since !== o) ((a.since = o), (a.text = Q(o)));
  let p = ce(
    (u) => {
      if (!t) return () => {};
      let c = i.setTimeout(function b() {
        ((a.text = Q(a.since)), u(), (c = i.setTimeout(b, STALE_TICK_MS)));
      }, STALE_TICK_MS);
      return () => c();
    },
    [i, a, t],
  );
  return yt(
    p,
    () => a.text,
    () => a.text,
  );
}
//@ chunk-975mts6d.js:3529-3579 placement
function Q(o) {
  return formatDurationCoarse(Math.max(0, Date.now() - o));
}
//@ chunk-975mts6d.js:3579-3999 placement
function TokenCountText(o, t, i) {
  let a = w(8),
    p;
  if (a[0] !== o) ((p = o === void 0 ? null : bM(o)), (a[0] = o), (a[1] = p));
  else p = a[1];
  let u = p,
    c;
  if (a[2] !== t || a[3] !== i || a[4] !== u)
    ((c = (b) =>
      u === null
        ? ie
        : (() => {
            let h = u.getState().value;
            return u.subscribe(() => {
              let d = u.getState().value;
              if (t !== null && d !== h) (x(t, d), i(ae));
              ((h = d), b());
            });
          })()),
      (a[2] = t),
      (a[3] = i),
      (a[4] = u),
      (a[5] = c));
  else c = a[5];
  let m = c,
    v;
  if (a[6] !== u) ((v = () => (u === null ? "" : u.getState().value)), (a[6] = u), (a[7] = v));
  else v = a[7];
  return yt(m, v);
}
//@ chunk-975mts6d.js:3999-4013 placement
function L() {}

export { needsArrowHint, ResumeStaleConversationDialog, aWe };
