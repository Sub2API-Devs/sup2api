/**
 * components/FeedbackSurvey/SurveyFollowup.tsx
 *
 * 2.1.316 新增。调查后续追问。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { useSession } from "../../context/session.js";
import { setPromptVimMode } from "../../state/promptInputStore.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";
import { truncateCodePoints } from "../../utils/stringUtils.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { BLACK_CIRCLE } from "../../constants/figures.js";
import { TextInput } from "../TextInput.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { uiSignals } from "../../state/uiSignals.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:956438-956442 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:956438", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1024781-1025317 placement
/**
 * 按字符上限约束一次文本编辑：比较新旧文本的公共前后缀，只截断插入部分；返回新文本和光标处理（pass/keep/新位置）。
 */
function clampTextEdit(previous, next, maxLength) {
  let list = Array.from(next);
  if (list.length <= maxLength)
    return {
      text: next,
      caret: "pass",
    };
  let list_2 = Array.from(previous);
  let prefixLength = 0;
  while (
    prefixLength < list_2.length &&
    prefixLength < list.length &&
    list_2[prefixLength] === list[prefixLength]
  )
    prefixLength++;
  let suffixLength = 0;
  while (
    suffixLength < list_2.length - prefixLength &&
    suffixLength < list.length - prefixLength &&
    list_2[list_2.length - 1 - suffixLength] === list[list.length - 1 - suffixLength]
  )
    suffixLength++;
  let cut = prefixLength + suffixLength;
  let max = Math.max(0, maxLength - cut);
  let sliced = list.slice(prefixLength, list.length - suffixLength);
  if (sliced.length > max && cut < list_2.length)
    return {
      text: previous,
      caret: "keep",
    };
  let sliced_2 = sliced.slice(0, max);
  let joined = [...list.slice(0, prefixLength), ...sliced_2].join("");
  let text = joined + list.slice(list.length - suffixLength).join("");
  return sliced_2.length === 0
    ? {
        text,
        caret: "keep",
      }
    : {
        text,
        caret: joined.length,
      };
}
//@ chunk-czq1j3j2.js:1025317-1025338 placement
var FOLLOWUP_RECENT_INPUT_MS = 600;
var FOLLOWUP_AUTO_DISMISS_MS = 1500;
//@ chunk-czq1j3j2.js:1025338-1025415 placement
/**
 * 函数 collapseToSingleLine（换行与制表符替换为空格）。
 */
function collapseToSingleLine(text) {
  return stripAnsi(text)
    .replace(/\r\n|\r|\n/g, " ")
    .replaceAll("\t", " ");
}
//@ chunk-czq1j3j2.js:1025415-1027644 placement
function SurveyFollowup({ onResolve, question, maxChars, autoDismissAfterMs, turnInProgress = false }) {
  let clock = useClock();
  let inputClock = useInputClock();
  let [text, setText] = useState("");
  let [cursorOffset, setCursorOffset] = useState(0);
  let { columns } = useTerminalSize();
  let resolvedRef = useRef(false);
  let mountedAtRef = useRef(Date.now());
  useRegisterOverlay("survey-followup");
  let resolve = (value) => {
    if (resolvedRef.current) return;
    resolvedRef.current = true;
    onResolve(value);
  };
  let isWithinRecentInputGuard = () =>
    isWithinRecentInput(inputClock, mountedAtRef.current, FOLLOWUP_RECENT_INPUT_MS);
  let [isTurnActive, setIsTurnActive] = useState(false);
  let [exitKeyHint, setExitKeyHint] = useState(null);
  useTimeout(
    () =>
      resolve({
        text: null,
        method: "timeout",
      }),
    isTurnActive ? null : autoDismissAfterMs,
    [autoDismissAfterMs],
  );
  useEffect(() => {
    if (turnInProgress && textRef.current.trim() === "")
      resolve({
        text: null,
        method: "turn_yield",
      });
  });
  let vimTimerRef = useRef(null);
  let session = useSession();
  useEffect(
    () => () => {
      vimTimerRef.current?.();
      setPromptVimMode(session, false);
    },
    [session],
  );
  let textRef = useRef("");
  let cursorOffsetRef = useRef(0);
  let pendingCaretRef = useRef(null);
  let [, setTextVersion] = useState(0);
  let onChange = (nextText) => {
    let singleLine = collapseToSingleLine(nextText);
    let edit = clampTextEdit(textRef.current, singleLine, maxChars);
    pendingCaretRef.current =
      edit.caret === "pass" ? null : edit.caret === "keep" ? cursorOffsetRef.current : edit.caret;
    if (edit.caret !== "pass" || singleLine !== nextText) setTextVersion((version) => version + 1);
    let text = edit.text;
    textRef.current = text;
    setText(text);
    if (nextText.trim().length > 0 && !isWithinRecentInputGuard()) setIsTurnActive(true);
    setPromptVimMode(session, true);
    vimTimerRef.current?.();
    vimTimerRef.current = clock.setTimeout(() => {
      vimTimerRef.current = null;
      setPromptVimMode(session, false);
    }, FOLLOWUP_AUTO_DISMISS_MS);
  };
  usePreDispatchKeyHandler((input, key) => {
    if (!key.escape) return;
    if (!isWithinRecentInputGuard()) {
      if (textRef.current.trim() !== "") {
        setText("");
        textRef.current = "";
        setCursorOffset(0);
        cursorOffsetRef.current = 0;
        pendingCaretRef.current = null;
        setTextVersion((version) => version + 1);
        return true;
      }
      resolve({
        text: null,
        method: "escape",
      });
    }
    return true;
  });
  let onSubmit = (submittedText) => {
    if (isWithinRecentInputGuard()) {
      setTextVersion((version) => version + 1);
      return;
    }
    let trimmed = textRef.current.trim();
    if (trimmed === "")
      resolve({
        text: null,
        method: "enter_empty",
      });
    else
      resolve({
        text: truncateCodePoints(trimmed, maxChars),
        method: "enter",
      });
  };
  let charCount = Array.from(text).length;
  let isAtLimit = charCount >= maxChars;
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    marginTop: 1,
    children: [
      jsxProd_default_2(Box, {
        children: [
          jsxProd_default_2(Text, {
            color: "ansi:cyan",
            children: [BLACK_CIRCLE, " "],
          }),
          jsxProd_default_2(Text, {
            bold: true,
            children: [question, " "],
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: "(optional)",
          }),
        ],
      }),
      jsxProd_default(Box, {
        marginLeft: 2,
        children: jsxProd_default(TextInput, {
          value: text,
          onChange,
          onSubmit,
          columns: Math.min(Math.max(columns - 4, 20), 120),
          cursorOffset,
          onChangeCursorOffset: (nextOffset) => {
            let caretOffset = pendingCaretRef.current ?? nextOffset;
            pendingCaretRef.current = null;
            cursorOffsetRef.current = caretOffset;
            setCursorOffset(caretOffset);
          },
          focus: true,
          showCursor: true,
          multiline: false,
          inputFilter: collapseToSingleLine,
          onExit: () => {
            if (!isWithinRecentInputGuard())
              resolve({
                text: null,
                method: "escape",
              });
          },
          onExitMessage: (exitState, keyName) => setExitKeyHint(exitState ? (keyName ?? "Ctrl-C") : null),
        }),
      }),
      jsxProd_default(Box, {
        marginLeft: 2,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            jsxProd_default(KeyboardShortcutHint, {
              chord: "enter",
              action: text.trim() ? "send" : "skip",
            }),
            " \xB7 ",
            jsxProd_default(KeyboardShortcutHint, {
              chord: "escape",
              action: text.trim() ? "clear" : "skip",
            }),
            exitKeyHint &&
              jsxProd_default_2(Fragment, {
                children: [
                  "  ",
                  jsxProd_default(Text, {
                    color: "warning",
                    children: jsxProd_default(KeyboardShortcutHint, {
                      chord: exitKeyHint === "Ctrl-D" ? "ctrl+d" : "ctrl+c",
                      action: "again to skip",
                    }),
                  }),
                ],
              }),
            text.length > 0 &&
              jsxProd_default_2(Fragment, {
                children: [
                  "  ",
                  jsxProd_default_2(Text, {
                    color: isAtLimit ? "warning" : undefined,
                    children: [charCount, "/", maxChars],
                  }),
                ],
              }),
          ],
        }),
      }),
    ],
  });
}
//@ chunk-czq1j3j2.js:1027644-1027658 placement
var PENDING_SOURCE_TTL_MS = 30000;
//@ chunk-czq1j3j2.js:1027658-1027707 placement
function setPendingSurveyFeedbackSource(pendingSurveyFeedbackSource) {
  uiSignals.pendingSurveyFeedbackSource = pendingSurveyFeedbackSource;
}
//@ chunk-czq1j3j2.js:1027707-1027800 placement
/**
 * 函数 hasPendingSurveyFeedbackSource（待处理来源存在且未过期）。
 */
function hasPendingSurveyFeedbackSource() {
  let pendingSurveyFeedbackSource = uiSignals.pendingSurveyFeedbackSource;
  return (
    pendingSurveyFeedbackSource !== null &&
    Date.now() - pendingSurveyFeedbackSource.setAt <= PENDING_SOURCE_TTL_MS
  );
}
//@ chunk-czq1j3j2.js:1027800-1027939 placement
/**
 * 取出并清空待处理的调查反馈来源；超过 30 秒视为过期返回 null。
 */
function takePendingSurveyFeedbackSource() {
  let pendingSurveyFeedbackSource = uiSignals.pendingSurveyFeedbackSource;
  uiSignals.pendingSurveyFeedbackSource = null;
  if (!pendingSurveyFeedbackSource || Date.now() - pendingSurveyFeedbackSource.setAt > PENDING_SOURCE_TTL_MS)
    return null;
  return pendingSurveyFeedbackSource;
}
export {
  SurveyFollowup,
  setPendingSurveyFeedbackSource,
  FOLLOWUP_RECENT_INPUT_MS,
  collapseToSingleLine,
  clampTextEdit,
  takePendingSurveyFeedbackSource,
  hasPendingSurveyFeedbackSource,
};
