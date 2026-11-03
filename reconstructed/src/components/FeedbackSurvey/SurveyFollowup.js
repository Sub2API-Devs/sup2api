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
import { j, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { Yn } from "../../utils/stripAnsi.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { useSession } from "../../context/session.js";
import { dHr } from "../../state/promptInputStore.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";
import { truncateCodePoints } from "../../utils/stringUtils.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { TextInput } from "../TextInput.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { uiSignals } from "../../state/uiSignals.js";

//@ chunk-18hwfzwa.js:990745-990749 placement
j();
/**
 * 按字符上限约束一次文本编辑：比较新旧文本的公共前后缀，只截断插入部分；返回新文本和光标处理（pass/keep/新位置）。
 */
//@ chunk-18hwfzwa.js:990749-991285 placement
function clampTextEdit(h, x, D) {
  let list = Array.from(x);
  if (list.length <= D) return { text: x, caret: "pass" };
  let list_2 = Array.from(h),
    ke = 0;
  while (ke < list_2.length && ke < list.length && list_2[ke] === list[ke]) ke++;
  let Re = 0;
  while (
    Re < list_2.length - ke &&
    Re < list.length - ke &&
    list_2[list_2.length - 1 - Re] === list[list.length - 1 - Re]
  )
    Re++;
  let Be = ke + Re,
    max = Math.max(0, D - Be),
    sliced = list.slice(ke, list.length - Re);
  if (sliced.length > max && Be < list_2.length) return { text: h, caret: "keep" };
  let sliced_2 = sliced.slice(0, max),
    joined = [...list.slice(0, ke), ...sliced_2].join(""),
    rt = joined + list.slice(list.length - Re).join("");
  return sliced_2.length === 0 ? { text: rt, caret: "keep" } : { text: rt, caret: joined.length };
}
//@ chunk-18hwfzwa.js:991285-991306 placement
var Jke = 600,
  vpo = 1500;
//@ chunk-18hwfzwa.js:991306-991383 placement
function rXe(h) {
  return Yn(h)
    .replace(/\r\n|\r|\n/g, " ")
    .replaceAll("\t", " ");
}
//@ chunk-18hwfzwa.js:991383-993610 placement
function SurveyFollowup({
  onResolve: onResolve,
  question: question,
  maxChars: maxChars,
  autoDismissAfterMs: autoDismissAfterMs,
  turnInProgress: turnInProgress = !1,
}) {
  let ke = useClock(),
    Re = useInputClock(),
    [Be, He] = y(""),
    [We, ze] = y(0),
    { columns: columns } = useTerminalSize(),
    rt = R(!1),
    kt = R(Date.now());
  useRegisterOverlay("survey-followup");
  let At = (Ro) => {
      if (rt.current) return;
      ((rt.current = !0), onResolve(Ro));
    },
    It = () => isWithinRecentInput(Re, kt.current, Jke),
    [Ot, Et] = y(!1),
    [Dt, Lt] = y(null);
  (useTimeout(() => At({ text: null, method: "timeout" }), Ot ? null : autoDismissAfterMs, [
    autoDismissAfterMs,
  ]),
    P(() => {
      if (turnInProgress && io.current.trim() === "") At({ text: null, method: "turn_yield" });
    }));
  let oo = R(null),
    Xt = useSession();
  P(
    () => () => {
      (oo.current?.(), dHr(Xt, !1));
    },
    [Xt],
  );
  let io = R(""),
    so = R(0),
    po = R(null),
    [, ao] = y(0),
    co = (Ro) => {
      let Ho = rXe(Ro),
        Io = clampTextEdit(io.current, Ho, maxChars);
      if (
        ((po.current = Io.caret === "pass" ? null : Io.caret === "keep" ? so.current : Io.caret),
        Io.caret !== "pass" || Ho !== Ro)
      )
        ao((mn) => mn + 1);
      let text = Io.text;
      if (((io.current = text), He(text), Ro.trim().length > 0 && !It())) Et(!0);
      (dHr(Xt, !0),
        oo.current?.(),
        (oo.current = ke.setTimeout(() => {
          ((oo.current = null), dHr(Xt, !1));
        }, vpo)));
    };
  usePreDispatchKeyHandler((Ro, Ho) => {
    if (!Ho.escape) return;
    if (!It()) {
      if (io.current.trim() !== "")
        return (
          He(""),
          (io.current = ""),
          ze(0),
          (so.current = 0),
          (po.current = null),
          ao((Io) => Io + 1),
          !0
        );
      At({ text: null, method: "escape" });
    }
    return !0;
  });
  let bo = (Ro) => {
      if (It()) {
        ao((Io) => Io + 1);
        return;
      }
      let trimmed = io.current.trim();
      if (trimmed === "") At({ text: null, method: "enter_empty" });
      else At({ text: truncateCodePoints(trimmed, maxChars), method: "enter" });
    },
    Ao = Array.from(Be).length,
    Bo = Ao >= maxChars;
  return r(Box, {
    flexDirection: "column",
    marginTop: 1,
    children: [
      r(Box, {
        children: [
          r(Text, { color: "ansi:cyan", children: [BLACK_CIRCLE, " "] }),
          r(Text, { bold: !0, children: [question, " "] }),
          e(Text, { dimColor: !0, children: "(optional)" }),
        ],
      }),
      e(Box, {
        marginLeft: 2,
        children: e(TextInput, {
          value: Be,
          onChange: co,
          onSubmit: bo,
          columns: Math.min(Math.max(columns - 4, 20), 120),
          cursorOffset: We,
          onChangeCursorOffset: (Ro) => {
            let Ho = po.current ?? Ro;
            ((po.current = null), (so.current = Ho), ze(Ho));
          },
          focus: !0,
          showCursor: !0,
          multiline: !1,
          inputFilter: rXe,
          onExit: () => {
            if (!It()) At({ text: null, method: "escape" });
          },
          onExitMessage: (Ro, Ho) => Lt(Ro ? (Ho ?? "Ctrl-C") : null),
        }),
      }),
      e(Box, {
        marginLeft: 2,
        children: r(Text, {
          dimColor: !0,
          children: [
            e(KeyboardShortcutHint, { chord: "enter", action: Be.trim() ? "send" : "skip" }),
            " \xB7 ",
            e(KeyboardShortcutHint, { chord: "escape", action: Be.trim() ? "clear" : "skip" }),
            Dt &&
              r(Fragment, {
                children: [
                  "  ",
                  e(Text, {
                    color: "warning",
                    children: e(KeyboardShortcutHint, {
                      chord: Dt === "Ctrl-D" ? "ctrl+d" : "ctrl+c",
                      action: "again to skip",
                    }),
                  }),
                ],
              }),
            Be.length > 0 &&
              r(Fragment, {
                children: ["  ", r(Text, { color: Bo ? "warning" : void 0, children: [Ao, "/", maxChars] })],
              }),
          ],
        }),
      }),
    ],
  });
}
//@ chunk-18hwfzwa.js:993610-993624 placement
var gtt = 30000;
//@ chunk-18hwfzwa.js:993624-993673 placement
function Xke(h) {
  uiSignals.pendingSurveyFeedbackSource = h;
}
//@ chunk-18hwfzwa.js:993673-993766 placement
function nAs() {
  let pendingSurveyFeedbackSource = uiSignals.pendingSurveyFeedbackSource;
  return pendingSurveyFeedbackSource !== null && Date.now() - pendingSurveyFeedbackSource.setAt <= gtt;
}
/**
 * 取出并清空待处理的调查反馈来源；超过 30 秒视为过期返回 null。
 */
//@ chunk-18hwfzwa.js:993766-993905 placement
function takePendingSurveyFeedbackSource() {
  let pendingSurveyFeedbackSource = uiSignals.pendingSurveyFeedbackSource;
  if (
    ((uiSignals.pendingSurveyFeedbackSource = null),
    !pendingSurveyFeedbackSource || Date.now() - pendingSurveyFeedbackSource.setAt > gtt)
  )
    return null;
  return pendingSurveyFeedbackSource;
}

export { Jke, SurveyFollowup, Xke, rXe, clampTextEdit, takePendingSurveyFeedbackSource, nAs };
