/**
 * components/FeedbackSurvey/SurveyFollowup.tsx
 *
 * 2.1.316 新增。调查后续追问。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (9)
 * attribution: placement 9
 */
import { init_react_production, y, R, P } from "../../../vendor/react/cjs/react.production.js";
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
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { TextInput } from "../TextInput.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { uiSignals } from "../../state/uiSignals.js";

//@ chunk-18hwfzwa.js:990745-990749 placement
init_react_production();
//@ chunk-18hwfzwa.js:990749-991285 placement
/**
 * 按字符上限约束一次文本编辑：比较新旧文本的公共前后缀，只截断插入部分；返回新文本和光标处理（pass/keep/新位置）。
 */
function clampTextEdit(h, x, D) {
  let list = Array.from(x);
  if (list.length <= D)
    return {
      text: x,
      caret: "pass",
    };
  let list_2 = Array.from(h);
  let ke = 0;
  while (ke < list_2.length && ke < list.length && list_2[ke] === list[ke]) ke++;
  let Re = 0;
  while (
    Re < list_2.length - ke &&
    Re < list.length - ke &&
    list_2[list_2.length - 1 - Re] === list[list.length - 1 - Re]
  )
    Re++;
  let Be = ke + Re;
  let max = Math.max(0, D - Be);
  let sliced = list.slice(ke, list.length - Re);
  if (sliced.length > max && Be < list_2.length)
    return {
      text: h,
      caret: "keep",
    };
  let sliced_2 = sliced.slice(0, max);
  let joined = [...list.slice(0, ke), ...sliced_2].join("");
  let text = joined + list.slice(list.length - Re).join("");
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
//@ chunk-18hwfzwa.js:991285-991306 placement
var FOLLOWUP_RECENT_INPUT_MS = 600;
var FOLLOWUP_AUTO_DISMISS_MS = 1500;
//@ chunk-18hwfzwa.js:991306-991383 placement
/**
 * 函数 collapseToSingleLine（换行与制表符替换为空格）。
 */
function collapseToSingleLine(h) {
  return stripAnsi(h)
    .replace(/\r\n|\r|\n/g, " ")
    .replaceAll("\t", " ");
}
//@ chunk-18hwfzwa.js:991383-993610 placement
function SurveyFollowup({ onResolve, question, maxChars, autoDismissAfterMs, turnInProgress = false }) {
  let clock = useClock();
  let inputClock = useInputClock();
  let [Be, He] = y("");
  let [We, ze] = y(0);
  let { columns } = useTerminalSize();
  let rt = R(false);
  let kt = R(Date.now());
  useRegisterOverlay("survey-followup");
  let At = (Ro) => {
    if (rt.current) return;
    rt.current = true;
    onResolve(Ro);
  };
  let It = () => isWithinRecentInput(inputClock, kt.current, FOLLOWUP_RECENT_INPUT_MS);
  let [Ot, Et] = y(false);
  let [Dt, Lt] = y(null);
  useTimeout(
    () =>
      At({
        text: null,
        method: "timeout",
      }),
    Ot ? null : autoDismissAfterMs,
    [autoDismissAfterMs],
  );
  P(() => {
    if (turnInProgress && textRef.current.trim() === "")
      At({
        text: null,
        method: "turn_yield",
      });
  });
  let oo = R(null);
  let session = useSession();
  P(
    () => () => {
      oo.current?.();
      setPromptVimMode(session, false);
    },
    [session],
  );
  let textRef = R("");
  let so = R(0);
  let po = R(null);
  let [, ao] = y(0);
  let onChange = (Ro) => {
    let Ho = collapseToSingleLine(Ro);
    let Io = clampTextEdit(textRef.current, Ho, maxChars);
    po.current = Io.caret === "pass" ? null : Io.caret === "keep" ? so.current : Io.caret;
    if (Io.caret !== "pass" || Ho !== Ro) ao((mn) => mn + 1);
    let text = Io.text;
    textRef.current = text;
    He(text);
    if (Ro.trim().length > 0 && !It()) Et(true);
    setPromptVimMode(session, true);
    oo.current?.();
    oo.current = clock.setTimeout(() => {
      oo.current = null;
      setPromptVimMode(session, false);
    }, FOLLOWUP_AUTO_DISMISS_MS);
  };
  usePreDispatchKeyHandler((input, key) => {
    if (!key.escape) return;
    if (!It()) {
      if (textRef.current.trim() !== "") {
        He("");
        textRef.current = "";
        ze(0);
        so.current = 0;
        po.current = null;
        ao((Io) => Io + 1);
        return true;
      }
      At({
        text: null,
        method: "escape",
      });
    }
    return true;
  });
  let onSubmit = (Ro) => {
    if (It()) {
      ao((Io) => Io + 1);
      return;
    }
    let trimmed = textRef.current.trim();
    if (trimmed === "")
      At({
        text: null,
        method: "enter_empty",
      });
    else
      At({
        text: truncateCodePoints(trimmed, maxChars),
        method: "enter",
      });
  };
  let Ao = Array.from(Be).length;
  let Bo = Ao >= maxChars;
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
          value: Be,
          onChange,
          onSubmit,
          columns: Math.min(Math.max(columns - 4, 20), 120),
          cursorOffset: We,
          onChangeCursorOffset: (Ro) => {
            let Ho = po.current ?? Ro;
            po.current = null;
            so.current = Ho;
            ze(Ho);
          },
          focus: true,
          showCursor: true,
          multiline: false,
          inputFilter: collapseToSingleLine,
          onExit: () => {
            if (!It())
              At({
                text: null,
                method: "escape",
              });
          },
          onExitMessage: (Ro, Ho) => Lt(Ro ? (Ho ?? "Ctrl-C") : null),
        }),
      }),
      jsxProd_default(Box, {
        marginLeft: 2,
        children: jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            jsxProd_default(KeyboardShortcutHint, {
              chord: "enter",
              action: Be.trim() ? "send" : "skip",
            }),
            " \xB7 ",
            jsxProd_default(KeyboardShortcutHint, {
              chord: "escape",
              action: Be.trim() ? "clear" : "skip",
            }),
            Dt &&
              jsxProd_default_2(Fragment, {
                children: [
                  "  ",
                  jsxProd_default(Text, {
                    color: "warning",
                    children: jsxProd_default(KeyboardShortcutHint, {
                      chord: Dt === "Ctrl-D" ? "ctrl+d" : "ctrl+c",
                      action: "again to skip",
                    }),
                  }),
                ],
              }),
            Be.length > 0 &&
              jsxProd_default_2(Fragment, {
                children: [
                  "  ",
                  jsxProd_default_2(Text, {
                    color: Bo ? "warning" : undefined,
                    children: [Ao, "/", maxChars],
                  }),
                ],
              }),
          ],
        }),
      }),
    ],
  });
}
//@ chunk-18hwfzwa.js:993610-993624 placement
var PENDING_SOURCE_TTL_MS = 30000;
//@ chunk-18hwfzwa.js:993624-993673 placement
function setPendingSurveyFeedbackSource(pendingSurveyFeedbackSource) {
  uiSignals.pendingSurveyFeedbackSource = pendingSurveyFeedbackSource;
}
//@ chunk-18hwfzwa.js:993673-993766 placement
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
//@ chunk-18hwfzwa.js:993766-993905 placement
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
  FOLLOWUP_RECENT_INPUT_MS,
  SurveyFollowup,
  setPendingSurveyFeedbackSource,
  collapseToSingleLine,
  clampTextEdit,
  takePendingSurveyFeedbackSource,
  hasPendingSurveyFeedbackSource,
};
