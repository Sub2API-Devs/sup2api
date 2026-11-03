/**
 * components/permissions/AskUserQuestionPermissionRequest/PreviewQuestionView.tsx
 *
 * 带预览的单问题视图：左右分栏显示选项与预览，支持外部编辑器与 Tab 切换。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/AskUserQuestionPermissionRequest/PreviewQuestionView.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { y } from "../../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { resolveEditorCommand } from "../../../utils/editor.js";
import { toIDEDisplayName } from "../../../utils/ide.js";
import { editPromptInEditor } from "../../../utils/promptEditor.js";
import { updateLastInteractionTime } from "../../../bootstrap/state.js";
import { useKeybinding } from "../../../keybindings/useKeybinding.js";
import { MessageActionsKeybindings } from "../../messageActions.js";
import { NOTES_ONLY_ANSWER } from "../../../tools/AskUserQuestionTool/AskUserQuestionTool.js";
import { PREVIEW_WITHHELD_TEXT } from "./PreviewBox.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { useUnattendedNotice } from "../UnattendedAutoBlockNotice.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Divider } from "../../design-system/Divider.js";
import { QuestionNavigationBar } from "./QuestionNavigationBar.js";
import { PermissionRequestTitle } from "../PermissionRequestTitle.js";
import { Blockquote } from "../../Blockquote.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { figures_default } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Markdown } from "../../Markdown.js";
import { TextInput } from "../../TextInput.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { Byline } from "../../design-system/Byline.js";

//@ chunk-18hwfzwa.js:1278846-1287012 fingerprint = PreviewQuestionView (0.787)
function PreviewQuestionView(props) {
  let $ = w(122);
  let {
    wouldTakeAnswer,
    question,
    questions,
    currentQuestionIndex,
    answers,
    questionStates,
    hideSubmitTab,
    minContentWidth,
    onUpdateQuestionState,
    onAnswer,
    onTextInputFocus,
    onCancel,
    onTabPrev,
    onTabNext,
    onRespondToClaude,
  } = props;
  let hideSubmitTab_2 = hideSubmitTab === undefined ? false : hideSubmitTab;
  let [Et, Dt] = y(false);
  let [Lt, oo] = y(false);
  let [Xt, io] = y(0);
  let po;
  let ao;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    po = resolveEditorCommand();
    ao = po ? toIDEDisplayName(po) : null;
    $[0] = po;
    $[1] = ao;
  } else {
    po = $[0];
    ao = $[1];
  }
  let co = ao;
  let key = question.key;
  let Ao = questionStates[key];
  let allOptions = question.options;
  let [Ro, Ho] = y(0);
  let [Io, Wo] = y(false);
  let [mn, Cn] = y(key);
  if (mn !== key) {
    Cn(key);
    let selected = Ao?.selectedValue;
    let idx = selected ? allOptions.findIndex((opt) => opt.value === selected) : -1;
    Ho(idx >= 0 ? idx : 0);
    Wo(false);
  }
  let kn = allOptions[Ro];
  let selectedValue = Ao?.selectedValue;
  let textInputValue = Ao?.textInputValue || "";
  let Go;
  if (
    $[2] !== allOptions ||
    $[3] !== onAnswer ||
    $[4] !== onUpdateQuestionState ||
    $[5] !== key ||
    $[6] !== wouldTakeAnswer
  ) {
    Go = (index) => {
      let option = allOptions[index];
      if (!option) {
        return;
      }
      Ho(index);
      if (!wouldTakeAnswer()) {
        return;
      }
      onUpdateQuestionState(
        key,
        {
          selectedValue: option.value,
        },
        false,
      );
      onAnswer(key, option.value);
    };
    $[2] = allOptions;
    $[3] = onAnswer;
    $[4] = onUpdateQuestionState;
    $[5] = key;
    $[6] = wouldTakeAnswer;
    $[7] = Go;
  } else Go = $[7];
  let Xo = Go;
  let Sn;
  if ($[8] !== allOptions.length || $[9] !== Ro || $[10] !== Lt || $[11] !== wouldTakeAnswer) {
    Sn = (direction) => {
      if (Lt) {
        return;
      }
      let newIndex;
      if (typeof direction === "number") newIndex = direction;
      else if (direction === "up") newIndex = Ro > 0 ? Ro - 1 : Ro;
      else newIndex = Ro < allOptions.length - 1 ? Ro + 1 : Ro;
      if (newIndex >= 0 && newIndex < allOptions.length) {
        if (!wouldTakeAnswer()) {
          return;
        }
        Ho(newIndex);
        if (newIndex !== Ro) Wo(true);
      }
    };
    $[8] = allOptions.length;
    $[9] = Ro;
    $[10] = Lt;
    $[11] = wouldTakeAnswer;
    $[12] = Sn;
  } else Sn = $[12];
  let _o = Sn;
  let cn;
  if (
    $[13] !== onUpdateQuestionState ||
    $[14] !== Ao?.textInputValue ||
    $[15] !== key ||
    $[16] !== wouldTakeAnswer
  ) {
    cn = async () => {
      if (!wouldTakeAnswer()) {
        return;
      }
      let currentValue = Ao?.textInputValue || "";
      let result = await editPromptInEditor(currentValue);
      updateLastInteractionTime(true);
      if (result.content !== null && result.content !== currentValue) {
        if (!wouldTakeAnswer()) {
          return;
        }
        onUpdateQuestionState(
          key,
          {
            textInputValue: result.content,
          },
          false,
        );
      }
    };
    $[13] = onUpdateQuestionState;
    $[14] = Ao?.textInputValue;
    $[15] = key;
    $[16] = wouldTakeAnswer;
    $[17] = cn;
  } else cn = $[17];
  const isActive = Lt && !!po;
  let Kn;
  if ($[18] !== isActive) {
    Kn = {
      context: "Chat",
      isActive,
    };
    $[18] = isActive;
    $[19] = Kn;
  } else Kn = $[19];
  useKeybinding("chat:externalEditor", cn, Kn);
  let Wn;
  if ($[20] !== onTabNext || $[21] !== onTabPrev) {
    Wn = {
      "tabs:previous": onTabPrev,
      "tabs:next": onTabNext,
    };
    $[20] = onTabNext;
    $[21] = onTabPrev;
    $[22] = Wn;
  } else Wn = $[22];
  const isActive_2 = !Lt && !Et;
  let Zn;
  if ($[23] !== isActive_2) {
    Zn = {
      context: "Tabs",
      isActive: isActive_2,
    };
    $[23] = isActive_2;
    $[24] = Zn;
  } else Zn = $[24];
  MessageActionsKeybindings(Wn, Zn);
  let Un;
  if ($[25] !== onTextInputFocus) {
    Un = () => {
      oo(false);
      onTextInputFocus(false);
    };
    $[25] = onTextInputFocus;
    $[26] = Un;
  } else Un = $[26];
  let dr = Un;
  let or;
  if (
    $[27] !== Ro ||
    $[28] !== dr ||
    $[29] !== Xo ||
    $[30] !== Io ||
    $[31] !== textInputValue ||
    $[32] !== onAnswer ||
    $[33] !== key ||
    $[34] !== selectedValue ||
    $[35] !== wouldTakeAnswer
  ) {
    or = () => {
      dr();
      if (!wouldTakeAnswer()) {
        return;
      }
      if (textInputValue.trim() && Io) Xo(Ro);
      else if (selectedValue) onAnswer(key, selectedValue);
      else if (textInputValue.trim()) onAnswer(key, NOTES_ONLY_ANSWER);
    };
    $[27] = Ro;
    $[28] = dr;
    $[29] = Xo;
    $[30] = Io;
    $[31] = textInputValue;
    $[32] = onAnswer;
    $[33] = key;
    $[34] = selectedValue;
    $[35] = wouldTakeAnswer;
    $[36] = or;
  } else or = $[36];
  let onSubmit = or;
  let Qn;
  if ($[37] === MEMO_CACHE_SENTINEL) {
    Qn = () => {
      Dt(true);
    };
    $[37] = Qn;
  } else Qn = $[37];
  let ur = Qn;
  let Ir;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    Ir = () => {
      Dt(false);
    };
    $[38] = Ir;
  } else Ir = $[38];
  let Pr = Ir;
  let ts;
  if (
    $[39] !== allOptions.length ||
    $[40] !== Ro ||
    $[41] !== _o ||
    $[42] !== dr ||
    $[43] !== Xo ||
    $[44] !== Et ||
    $[45] !== Lt ||
    $[46] !== onCancel ||
    $[47] !== onRespondToClaude ||
    $[48] !== onTextInputFocus
  ) {
    ts = (e) => {
      if (Et) {
        if (e.key === "up" || (e.ctrl && e.key === "p")) {
          e.preventDefault();
          Pr();
          return;
        }
        if (e.key === "return") {
          e.preventDefault();
          onRespondToClaude();
          return;
        }
        if (e.key === "escape") {
          e.preventDefault();
          onCancel();
        }
        return;
      }
      if (Lt) {
        if (e.key === "escape") {
          e.preventDefault();
          dr();
        }
        return;
      }
      if (e.key === "up" || (e.ctrl && e.key === "p")) {
        e.preventDefault();
        if (Ro > 0) _o("up");
      } else if (e.key === "down" || (e.ctrl && e.key === "n")) {
        e.preventDefault();
        if (Ro === allOptions.length - 1) ur();
        else _o("down");
      } else if (e.key === "return") {
        e.preventDefault();
        Xo(Ro);
      } else if (e.key === "n" && !e.ctrl && !e.meta) {
        e.preventDefault();
        oo(true);
        onTextInputFocus(true);
      } else if (e.key === "escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key.length === 1 && e.key >= "1" && e.key <= "9") {
        e.preventDefault();
        let idx = parseInt(e.key, 10) - 1;
        if (idx < allOptions.length) _o(idx);
      }
    };
    $[39] = allOptions.length;
    $[40] = Ro;
    $[41] = _o;
    $[42] = dr;
    $[43] = Xo;
    $[44] = Et;
    $[45] = Lt;
    $[46] = onCancel;
    $[47] = onRespondToClaude;
    $[48] = onTextInputFocus;
    $[49] = ts;
  } else ts = $[49];
  let onKeyDown = ts;
  let wr =
    kn?.preview === undefined
      ? null
      : kn.preview.kind === "full"
        ? kn.preview.markdown
        : PREVIEW_WITHHELD_TEXT;
  let { columns, rows } = useTerminalSize();
  let fr = columns - 30 - 4;
  let columns_2 = Math.max(1, fr - bunStringWidth("Notes:") - 1);
  let unattendedNotice = useUnattendedNotice();
  let maxLines = Math.max(1, rows - 26 - unattendedNotice);
  let Vr;
  if ($[50] === MEMO_CACHE_SENTINEL) {
    Vr = jsxProd_default(Divider, {
      color: "inactive",
    });
    $[50] = Vr;
  } else Vr = $[50];
  let ms;
  if (
    $[51] !== answers ||
    $[52] !== currentQuestionIndex ||
    $[53] !== hideSubmitTab_2 ||
    $[54] !== questions
  ) {
    ms = jsxProd_default(QuestionNavigationBar, {
      questions,
      currentQuestionIndex,
      answers,
      hideSubmitTab: hideSubmitTab_2,
    });
    $[51] = answers;
    $[52] = currentQuestionIndex;
    $[53] = hideSubmitTab_2;
    $[54] = questions;
    $[55] = ms;
  } else ms = $[55];
  let children;
  if ($[56] !== question.displayQuestion.text) {
    children = jsxProd_default(PermissionRequestTitle, {
      title: question.displayQuestion.text,
      color: "text",
    });
    $[56] = question.displayQuestion.text;
    $[57] = children;
  } else children = $[57];
  let Ls;
  if ($[58] !== question.displayQuestion.needsGutter || $[59] !== children) {
    Ls = jsxProd_default(Blockquote, {
      multiline: question.displayQuestion.needsGutter,
      children,
    });
    $[58] = question.displayQuestion.needsGutter;
    $[59] = children;
    $[60] = Ls;
  } else Ls = $[60];
  let children_2;
  if ($[61] !== allOptions || $[62] !== Ro || $[63] !== selectedValue) {
    let ws;
    if ($[65] !== Ro || $[66] !== selectedValue) {
      ws = (option, index) => {
        let isFocused = Ro === index;
        let isSelected = selectedValue === option.value;
        return jsxProd_default_2(
          Box,
          {
            flexDirection: "row",
            children: [
              isFocused
                ? jsxProd_default(Text, {
                    color: "suggestion",
                    children: figures_default.pointer,
                  })
                : jsxProd_default(Text, {
                    children: " ",
                  }),
              jsxProd_default_2(Text, {
                dimColor: true,
                children: [" ", index + 1, "."],
              }),
              jsxProd_default_2(Text, {
                color: isSelected ? "success" : isFocused ? "suggestion" : undefined,
                bold: isFocused,
                children: [" ", option.displayLabel],
              }),
              isSelected &&
                jsxProd_default_2(Text, {
                  color: "success",
                  children: [" ", figures_default.tick],
                }),
            ],
          },
          option.value,
        );
      };
      $[65] = Ro;
      $[66] = selectedValue;
      $[67] = ws;
    } else ws = $[67];
    children_2 = allOptions.map(ws);
    $[61] = allOptions;
    $[62] = Ro;
    $[63] = selectedValue;
    $[64] = children_2;
  } else children_2 = $[64];
  let ws;
  if ($[68] !== children_2) {
    ws = jsxProd_default(Box, {
      flexDirection: "column",
      width: 30,
      children: children_2,
    });
    $[68] = children_2;
    $[69] = ws;
  } else ws = $[69];
  const content = wr || "No preview available";
  let da;
  if ($[70] !== minContentWidth || $[71] !== maxLines || $[72] !== fr || $[73] !== content) {
    da = jsxProd_default(Markdown, {
      content,
      maxLines,
      minWidth: minContentWidth,
      maxWidth: fr,
    });
    $[70] = minContentWidth;
    $[71] = maxLines;
    $[72] = fr;
    $[73] = content;
    $[74] = da;
  } else da = $[74];
  let qn;
  if ($[75] === MEMO_CACHE_SENTINEL) {
    qn = jsxProd_default(Box, {
      flexShrink: 0,
      children: jsxProd_default(Text, {
        color: "suggestion",
        children: "Notes:",
      }),
    });
    $[75] = qn;
  } else qn = $[75];
  let ps;
  if (
    $[76] !== Xt ||
    $[77] !== dr ||
    $[78] !== onSubmit ||
    $[79] !== Lt ||
    $[80] !== columns_2 ||
    $[81] !== textInputValue ||
    $[82] !== onUpdateQuestionState ||
    $[83] !== key ||
    $[84] !== wouldTakeAnswer
  ) {
    ps = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "row",
      gap: 1,
      children: [
        qn,
        Lt
          ? jsxProd_default(TextInput, {
              value: textInputValue,
              placeholder: "Add notes on this design\u2026",
              onChange: (value) => {
                if (!wouldTakeAnswer()) {
                  return;
                }
                onUpdateQuestionState(
                  key,
                  {
                    textInputValue: value,
                  },
                  false,
                );
              },
              onSubmit,
              onExit: dr,
              focus: true,
              showCursor: true,
              columns: columns_2,
              maxVisibleLines: 5,
              cursorOffset: Xt,
              onChangeCursorOffset: io,
              disableEscapeDoublePress: true,
            })
          : jsxProd_default(Text, {
              dimColor: true,
              italic: true,
              children: textInputValue || "press n to add notes",
            }),
      ],
    });
    $[76] = Xt;
    $[77] = dr;
    $[78] = onSubmit;
    $[79] = Lt;
    $[80] = columns_2;
    $[81] = textInputValue;
    $[82] = onUpdateQuestionState;
    $[83] = key;
    $[84] = wouldTakeAnswer;
    $[85] = ps;
  } else ps = $[85];
  let kr;
  if ($[86] !== da || $[87] !== ps) {
    kr = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexGrow: 1,
      children: [da, ps],
    });
    $[86] = da;
    $[87] = ps;
    $[88] = kr;
  } else kr = $[88];
  let ls;
  if ($[89] !== ws || $[90] !== kr) {
    ls = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "row",
      gap: 4,
      children: [ws, kr],
    });
    $[89] = ws;
    $[90] = kr;
    $[91] = ls;
  } else ls = $[91];
  let Ms;
  if ($[92] === MEMO_CACHE_SENTINEL) {
    Ms = jsxProd_default(Divider, {
      color: "inactive",
    });
    $[92] = Ms;
  } else Ms = $[92];
  let qs;
  if ($[93] !== Et) {
    qs = Et
      ? jsxProd_default(Text, {
          color: "suggestion",
          children: figures_default.pointer,
        })
      : jsxProd_default(Text, {
          children: " ",
        });
    $[93] = Et;
    $[94] = qs;
  } else qs = $[94];
  const color = Et ? "suggestion" : undefined;
  let es;
  if ($[95] !== color) {
    es = jsxProd_default(Text, {
      color,
      children: "Chat about this",
    });
    $[95] = color;
    $[96] = es;
  } else es = $[96];
  let ds;
  if ($[97] !== qs || $[98] !== es) {
    ds = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        Ms,
        jsxProd_default_2(Box, {
          flexDirection: "row",
          gap: 1,
          children: [qs, es],
        }),
      ],
    });
    $[97] = qs;
    $[98] = es;
    $[99] = ds;
  } else ds = $[99];
  let Hs;
  if ($[100] === MEMO_CACHE_SENTINEL) {
    Hs = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action: "select",
    });
    $[100] = Hs;
  } else Hs = $[100];
  let _s;
  let fs;
  if ($[101] === MEMO_CACHE_SENTINEL) {
    _s = jsxProd_default(KeyboardShortcutHint, {
      chord: ["up", "down"],
      action: "navigate",
    });
    fs = jsxProd_default(KeyboardShortcutHint, {
      chord: "n",
      action: "add notes",
    });
    $[101] = _s;
    $[102] = fs;
  } else {
    _s = $[101];
    fs = $[102];
  }
  let ii;
  if ($[103] !== questions.length) {
    ii =
      questions.length > 1 &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "tab",
        action: "switch questions",
      });
    $[103] = questions.length;
    $[104] = ii;
  } else ii = $[104];
  let ua;
  if ($[105] !== Lt) {
    ua =
      Lt &&
      co &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "ctrl+g",
        action: `edit in ${co}`,
      });
    $[105] = Lt;
    $[106] = ua;
  } else ua = $[106];
  let La;
  if ($[107] === MEMO_CACHE_SENTINEL) {
    La = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "cancel",
    });
    $[107] = La;
  } else La = $[107];
  let Xa;
  if ($[108] !== ii || $[109] !== ua) {
    Xa = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        color: "inactive",
        dimColor: true,
        children: jsxProd_default_2(Byline, {
          children: [Hs, _s, fs, ii, ua, La],
        }),
      }),
    });
    $[108] = ii;
    $[109] = ua;
    $[110] = Xa;
  } else Xa = $[110];
  let dl;
  if ($[111] !== ls || $[112] !== ds || $[113] !== Xa) {
    dl = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [ls, ds, Xa],
    });
    $[111] = ls;
    $[112] = ds;
    $[113] = Xa;
    $[114] = dl;
  } else dl = $[114];
  let Vl;
  if ($[115] !== ms || $[116] !== Ls || $[117] !== dl) {
    Vl = jsxProd_default_2(Box, {
      flexDirection: "column",
      paddingTop: 0,
      children: [ms, Ls, dl],
    });
    $[115] = ms;
    $[116] = Ls;
    $[117] = dl;
    $[118] = Vl;
  } else Vl = $[118];
  let Hd;
  if ($[119] !== onKeyDown || $[120] !== Vl) {
    Hd = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      tabIndex: 0,
      autoFocus: true,
      onKeyDown,
      children: [Vr, Vl],
    });
    $[119] = onKeyDown;
    $[120] = Vl;
    $[121] = Hd;
  } else Hd = $[121];
  return Hd;
}
export { PreviewQuestionView };
