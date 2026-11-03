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
import { init_react_production, y, R, Se, zt, ce, yt } from "../../vendor/react/cjs/react.production.js";
import { useSessionOrUndefined } from "../context/session.js";
import { usePreDispatchKeyHandler } from "../keybindings/useActionHandlers.js";
import { useInputClock } from "../ink/components/Input.js";
import { kp } from "../../vendor/convert-to-spaces/dist/index.js";
import { isWithinRecentInput, RECENT_INPUT_GUARD_MS } from "../hooks/useRecentInputGuard.js";
import { useRefusalTracker } from "./CustomSelect/selectTypeahead.js";
import { setPromptStash, promptInputValue, promptInputStoreFor } from "../state/promptInputStore.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
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
  if (i === undefined) {
    i = {
      needsArrow: t.trim() !== "",
      pastes: 0,
      pastesAtArrow: 0,
    };
    weakMap.set(o, i);
  }
  return i;
}
//@ chunk-975mts6d.js:914-960 placement
function markNeedsArrow(o, t) {
  getPasteHintState(o).needsArrow = t.trim() !== "";
}
//@ chunk-975mts6d.js:960-1026 placement
function clearNeedsArrow(o) {
  let pasteHintState = getPasteHintState(o);
  pasteHintState.needsArrow = false;
  pasteHintState.pastesAtArrow = pasteHintState.pastes;
}
//@ chunk-975mts6d.js:1026-1055 placement
function bumpPasteCount(o) {
  getPasteHintState(o).pastes += 1;
}
//@ chunk-975mts6d.js:1055-1132 placement
function needsArrowHint(o, t) {
  let pasteHintState = getPasteHintState(o, t);
  return pasteHintState.needsArrow || pasteHintState.pastes > pasteHintState.pastesAtArrow;
}
//@ chunk-975mts6d.js:1132-1136 placement
init_react_production();
//@ chunk-975mts6d.js:1136-1154 placement
var weakMap_2 = new WeakMap();
//@ chunk-975mts6d.js:1154-1181 placement
function setBaseline(o, t) {
  weakMap_2.set(o, t);
}
//@ chunk-975mts6d.js:1181-1211 placement
function getBaseline(o) {
  return weakMap_2.get(o);
}
//@ chunk-975mts6d.js:1211-1226 placement
function noopHandler() {}
//@ chunk-975mts6d.js:1226-1252 placement
function increment(A) {
  return A + 1;
}
//@ chunk-975mts6d.js:1252-1273 placement
/**
 * 导出值：DECAY_TICK_MS（1000）。
 */
var STALE_TICK_MS = 60000;
var DECAY_TICK_MS = 1000;
//@ chunk-975mts6d.js:1273-3260 placement
/**
 * 恢复长时间未活动的对话时询问继续、压缩或新建，显示上下文大小与 5 小时额度占比。
 */
function ResumeStaleConversationDialog({
  inactiveSince,
  contextTokens,
  percentOfFiveHourLimit,
  trigger,
  focusedAction,
  offersLookUp,
  ask,
  onDone,
}) {
  let relativeTimeText = useRelativeTimeText(inactiveSince, trigger === "idle");
  let sessionOrUndefined = useSessionOrUndefined();
  let m = trigger === "idle";
  let [, v] = y(0);
  let A = TokenCountText(sessionOrUndefined, m ? ask : null, v);
  y(() => {
    if (m) markNeedsArrow(ask, A);
  });
  usePreDispatchKeyHandler(
    (input, key) => {
      if (key.upArrow || key.downArrow) {
        clearNeedsArrow(ask);
        v((oe) => oe + 1);
      }
    },
    {
      isActive: m,
    },
  );
  let K = m && A.trim() !== "";
  let U = m && needsArrowHint(ask, A);
  let inputClock = useInputClock();
  let F = R(Date.now());
  let { subscribeFrames } = Se(kp);
  zt(() => {
    let l = subscribeFrames(() => {
      F.current = Date.now();
      l();
    });
    return l;
  }, [subscribeFrames]);
  let z = () => isWithinRecentInput(inputClock, F.current, DECAY_TICK_MS);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let onChange = (l) => {
    if (
      focusedAction === "new_conversation" &&
      l === "new_conversation" &&
      (z() || refusedWithin(RECENT_INPUT_GUARD_MS))
    ) {
      noteRefused();
      return false;
    }
    return onDone(l);
  };
  let E =
    trigger === "idle" && sessionOrUndefined !== undefined
      ? (l) => {
          bumpPasteCount(ask);
          v((g) => g + 1);
          setPromptStash(
            sessionOrUndefined,
            promptInputValue(sessionOrUndefined) +
              l.text.replace(
                /\r\n?/g,
                `
`,
              ),
          );
        }
      : undefined;
  let I = jsxProd_default_2(Dialog, {
    title: "Resume this conversation?",
    color: "warning",
    onCancel: () => onDone("dismiss"),
    inputGuide: jsxProd_default_2(Byline, {
      children: [
        U
          ? jsxProd_default(KeyboardShortcutHint, {
              chord: ["up", "down"],
              action: "pick a row first",
            })
          : null,
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "confirm",
        }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: m ? "dismiss" : "resume",
        }),
      ],
    }),
    children: [
      jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default_2(Text, {
            children: [
              "This conversation has been inactive for ",
              relativeTimeText,
              " and is",
              " ",
              formatTokens(contextTokens),
              " tokens long.",
              " ",
              percentOfFiveHourLimit >= 100
                ? jsxProd_default_2(Fragment, {
                    children: [
                      "Resuming it will use ",
                      jsxProd_default(Text, {
                        bold: true,
                        children: "all",
                      }),
                      " of your 5-hour usage limit.",
                    ],
                  })
                : jsxProd_default_2(Fragment, {
                    children: [
                      "Resuming it will use about",
                      " ",
                      jsxProd_default_2(Text, {
                        bold: true,
                        children: [percentOfFiveHourLimit, "%"],
                      }),
                      " of your 5-hour usage limit.",
                    ],
                  }),
            ],
          }),
          K &&
            jsxProd_default(Text, {
              dimColor: true,
              children: "Your unsent message will still be there after you answer.",
            }),
        ],
      }),
      jsxProd_default(ModelSelector, {
        options: [
          {
            value: "resume",
            label: "Resume",
          },
          {
            value: "new_conversation",
            label: "Start a new conversation",
            ...(offersLookUp && {
              description: "Claude can look this one up if you refer to it later",
            }),
          },
        ],
        hideIndexes: trigger === "idle",
        onUpFromFirstItem: trigger === "idle" ? noopCallback : undefined,
        ...(focusedAction === "new_conversation" && {
          defaultFocusValue: getBaseline(ask) ?? "new_conversation",
          onDownFromLastItem: trigger === "idle" ? noopCallback : undefined,
          selectedValue: NO_COMMITTED_ROW,
          onFocus: (l) => {
            if (l !== "dismiss") setBaseline(ask, l);
          },
        }),
        onChange,
      }),
    ],
  });
  return E === undefined
    ? I
    : jsxProd_default(Box, {
        flexDirection: "column",
        onPaste: E,
        children: I,
      });
}
//@ chunk-975mts6d.js:3260-3529 placement
function useRelativeTimeText(inactiveSince, t) {
  let clock = useClock();
  let [a] = y(() => ({
    since: inactiveSince,
    text: friendlyElapsed(inactiveSince),
  }));
  if (a.since !== inactiveSince) {
    a.since = inactiveSince;
    a.text = friendlyElapsed(inactiveSince);
  }
  let p = ce(
    (u) => {
      if (!t) return () => {};
      let c = clock.setTimeout(function b() {
        a.text = friendlyElapsed(a.since);
        u();
        c = clock.setTimeout(b, STALE_TICK_MS);
      }, STALE_TICK_MS);
      return () => c();
    },
    [clock, a, t],
  );
  return yt(
    p,
    () => a.text,
    () => a.text,
  );
}
//@ chunk-975mts6d.js:3529-3579 placement
function friendlyElapsed(o) {
  return formatDurationCoarse(Math.max(0, Date.now() - o));
}
//@ chunk-975mts6d.js:3579-3999 placement
function TokenCountText(sessionOrUndefined, t, i) {
  let a = w(8);
  let p;
  if (a[0] !== sessionOrUndefined) {
    p = sessionOrUndefined === undefined ? null : promptInputStoreFor(sessionOrUndefined);
    a[0] = sessionOrUndefined;
    a[1] = p;
  } else p = a[1];
  let u = p;
  let c;
  if (a[2] !== t || a[3] !== i || a[4] !== u) {
    c = (b) =>
      u === null
        ? noopHandler
        : (() => {
            let h = u.getState().value;
            return u.subscribe(() => {
              let d = u.getState().value;
              if (t !== null && d !== h) {
                markNeedsArrow(t, d);
                i(increment);
              }
              h = d;
              b();
            });
          })();
    a[2] = t;
    a[3] = i;
    a[4] = u;
    a[5] = c;
  } else c = a[5];
  let m = c;
  let v;
  if (a[6] !== u) {
    v = () => (u === null ? "" : u.getState().value);
    a[6] = u;
    a[7] = v;
  } else v = a[7];
  return yt(m, v);
}
//@ chunk-975mts6d.js:3999-4013 placement
function noopCallback() {}
export { needsArrowHint, ResumeStaleConversationDialog, DECAY_TICK_MS };
