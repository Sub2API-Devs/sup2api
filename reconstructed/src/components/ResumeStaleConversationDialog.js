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
import {
  init_react_production,
  useState,
  useRef,
  useContext,
  useLayoutEffect,
  useCallback,
  useSyncExternalStore,
} from "../../vendor/react/cjs/react.production.js";
import { useSessionOrUndefined } from "../context/session.js";
import { usePreDispatchKeyHandler } from "../keybindings/useActionHandlers.js";
import { useInputClock } from "../ink/components/Input.js";
import { APP_CONTEXT } from "../../vendor/convert-to-spaces/dist/index.js";
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
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-975mts6d.js:774-792 placement
var weakMap; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-975mts6d.js:774", () => {
  weakMap = new WeakMap();
});
//@ chunk-975mts6d.js:792-914 placement
function getPasteHintState(key, text = "") {
  let state = weakMap.get(key);
  if (state === undefined) {
    state = {
      needsArrow: text.trim() !== "",
      pastes: 0,
      pastesAtArrow: 0,
    };
    weakMap.set(key, state);
  }
  return state;
}
//@ chunk-975mts6d.js:914-960 placement
function markNeedsArrow(key, text) {
  getPasteHintState(key).needsArrow = text.trim() !== "";
}
//@ chunk-975mts6d.js:960-1026 placement
function clearNeedsArrow(key) {
  let pasteHintState = getPasteHintState(key);
  pasteHintState.needsArrow = false;
  pasteHintState.pastesAtArrow = pasteHintState.pastes;
}
//@ chunk-975mts6d.js:1026-1055 placement
function bumpPasteCount(key) {
  getPasteHintState(key).pastes += 1;
}
//@ chunk-975mts6d.js:1055-1132 placement
function needsArrowHint(key, text) {
  let pasteHintState = getPasteHintState(key, text);
  return pasteHintState.needsArrow || pasteHintState.pastes > pasteHintState.pastesAtArrow;
}
//@ chunk-975mts6d.js:1132-1136 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-975mts6d.js:1132", () => {
  init_react_production();
});
//@ chunk-975mts6d.js:1136-1154 placement
var weakMap_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-975mts6d.js:1136", () => {
  weakMap_2 = new WeakMap();
});
//@ chunk-975mts6d.js:1154-1181 placement
function setBaseline(key, baseline) {
  weakMap_2.set(key, baseline);
}
//@ chunk-975mts6d.js:1181-1211 placement
function getBaseline(key) {
  return weakMap_2.get(key);
}
//@ chunk-975mts6d.js:1211-1226 placement
function noopHandler() {}
//@ chunk-975mts6d.js:1226-1252 placement
function increment(count) {
  return count + 1;
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
  let isIdleTrigger = trigger === "idle";
  let [, setArrowTick] = useState(0);
  let tokenCountText = TokenCountText(sessionOrUndefined, isIdleTrigger ? ask : null, setArrowTick);
  useState(() => {
    if (isIdleTrigger) markNeedsArrow(ask, tokenCountText);
  });
  usePreDispatchKeyHandler(
    (input, key) => {
      if (key.upArrow || key.downArrow) {
        clearNeedsArrow(ask);
        setArrowTick((nextTick) => nextTick + 1);
      }
    },
    {
      isActive: isIdleTrigger,
    },
  );
  let hasTokenCount = isIdleTrigger && tokenCountText.trim() !== "";
  let shouldShowArrowHint = isIdleTrigger && needsArrowHint(ask, tokenCountText);
  let inputClock = useInputClock();
  let lastInputAtRef = useRef(Date.now());
  let { subscribeFrames } = useContext(APP_CONTEXT);
  useLayoutEffect(() => {
    let unsubscribeFrames = subscribeFrames(() => {
      lastInputAtRef.current = Date.now();
      unsubscribeFrames();
    });
    return unsubscribeFrames;
  }, [subscribeFrames]);
  let isRecentInput = () => isWithinRecentInput(inputClock, lastInputAtRef.current, DECAY_TICK_MS);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let onChange = (nextAction) => {
    if (
      focusedAction === "new_conversation" &&
      nextAction === "new_conversation" &&
      (isRecentInput() || refusedWithin(RECENT_INPUT_GUARD_MS))
    ) {
      noteRefused();
      return false;
    }
    return onDone(nextAction);
  };
  let onPasteHandler =
    trigger === "idle" && sessionOrUndefined !== undefined
      ? (pasteEvent) => {
          bumpPasteCount(ask);
          setArrowTick((arrowTick) => arrowTick + 1);
          setPromptStash(
            sessionOrUndefined,
            promptInputValue(sessionOrUndefined) +
              pasteEvent.text.replace(
                /\r\n?/g,
                `
`,
              ),
          );
        }
      : undefined;
  let dialogElement = jsxProd_default_2(Dialog, {
    title: "Resume this conversation?",
    color: "warning",
    onCancel: () => onDone("dismiss"),
    inputGuide: jsxProd_default_2(Byline, {
      children: [
        shouldShowArrowHint
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
          description: isIdleTrigger ? "dismiss" : "resume",
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
          hasTokenCount &&
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
          onFocus: (focusedActionValue) => {
            if (focusedActionValue !== "dismiss") setBaseline(ask, focusedActionValue);
          },
        }),
        onChange,
      }),
    ],
  });
  return onPasteHandler === undefined
    ? dialogElement
    : jsxProd_default(Box, {
        flexDirection: "column",
        onPaste: onPasteHandler,
        children: dialogElement,
      });
}
//@ chunk-975mts6d.js:3260-3529 placement
function useRelativeTimeText(timestamp, options) {
  let clock = useClock();
  let [marker] = useState(() => ({
    since: timestamp,
    text: friendlyElapsed(timestamp),
  }));
  if (marker.since !== timestamp) {
    marker.since = timestamp;
    marker.text = friendlyElapsed(timestamp);
  }
  let scheduleTick = useCallback(
    (callback) => {
      if (!options) return () => {};
      let tick = clock.setTimeout(function timer() {
        marker.text = friendlyElapsed(marker.since);
        callback();
        tick = clock.setTimeout(timer, STALE_TICK_MS);
      }, STALE_TICK_MS);
      return () => tick();
    },
    [clock, marker, options],
  );
  return useSyncExternalStore(
    scheduleTick,
    () => marker.text,
    () => marker.text,
  );
}
//@ chunk-975mts6d.js:3529-3579 placement
function friendlyElapsed(timestamp) {
  return formatDurationCoarse(Math.max(0, Date.now() - timestamp));
}
//@ chunk-975mts6d.js:3579-3999 placement
function TokenCountText(sessionOrUndefined, session, columns) {
  let $ = useMemoCache(8);
  let promptStore;
  if ($[0] !== sessionOrUndefined) {
    promptStore = sessionOrUndefined === undefined ? null : promptInputStoreFor(sessionOrUndefined);
    $[0] = sessionOrUndefined;
    $[1] = promptStore;
  } else promptStore = $[1];
  let promptStoreState = promptStore;
  let subscribePromptStore;
  if ($[2] !== session || $[3] !== columns || $[4] !== promptStoreState) {
    subscribePromptStore = (forceUpdate) =>
      promptStoreState === null
        ? noopHandler
        : (() => {
            let lastValue = promptStoreState.getState().value;
            return promptStoreState.subscribe(() => {
              let currentValue = promptStoreState.getState().value;
              if (session !== null && currentValue !== lastValue) {
                markNeedsArrow(session, currentValue);
                columns(increment);
              }
              lastValue = currentValue;
              forceUpdate();
            });
          })();
    $[2] = session;
    $[3] = columns;
    $[4] = promptStoreState;
    $[5] = subscribePromptStore;
  } else subscribePromptStore = $[5];
  let subscribeEffect = subscribePromptStore;
  let selectPromptValue;
  if ($[6] !== promptStoreState) {
    selectPromptValue = () => (promptStoreState === null ? "" : promptStoreState.getState().value);
    $[6] = promptStoreState;
    $[7] = selectPromptValue;
  } else selectPromptValue = $[7];
  return useSyncExternalStore(subscribeEffect, selectPromptValue);
}
//@ chunk-975mts6d.js:3999-4013 placement
function noopCallback() {}
export { needsArrowHint, ResumeStaleConversationDialog, DECAY_TICK_MS };
