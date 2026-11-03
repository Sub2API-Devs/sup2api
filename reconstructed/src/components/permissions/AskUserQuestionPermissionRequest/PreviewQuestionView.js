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
import { wM } from "../../../utils/editor.js";
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
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Divider } from "../../design-system/Divider.js";
import { QuestionNavigationBar } from "./QuestionNavigationBar.js";
import { PermissionRequestTitle } from "../PermissionRequestTitle.js";
import { Blockquote } from "../../Blockquote.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { re } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Markdown } from "../../Markdown.js";
import { TextInput } from "../../TextInput.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { Byline } from "../../design-system/Byline.js";

//@ chunk-18hwfzwa.js:1278846-1287012 fingerprint = PreviewQuestionView (0.787)
function PreviewQuestionView(h) {
  let $ = w(122),
    {
      wouldTakeAnswer: wouldTakeAnswer,
      question: question,
      questions: questions,
      currentQuestionIndex: currentQuestionIndex,
      answers: answers,
      questionStates: questionStates,
      hideSubmitTab: hideSubmitTab,
      minContentWidth: minContentWidth,
      onUpdateQuestionState: onUpdateQuestionState,
      onAnswer: onAnswer,
      onTextInputFocus: onTextInputFocus,
      onCancel: onCancel,
      onTabPrev: onTabPrev,
      onTabNext: onTabNext,
      onRespondToClaude: onRespondToClaude,
    } = h,
    Ot = hideSubmitTab === void 0 ? !1 : hideSubmitTab,
    [Et, Dt] = y(!1),
    [Lt, oo] = y(!1),
    [Xt, io] = y(0),
    po,
    ao;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((po = wM()), (ao = po ? toIDEDisplayName(po) : null), ($[0] = po), ($[1] = ao));
  else ((po = $[0]), (ao = $[1]));
  let co = ao,
    key = question.key,
    Ao = questionStates[key],
    allOptions = question.options,
    [Ro, Ho] = y(0),
    [Io, Wo] = y(!1),
    [mn, Cn] = y(key);
  if (mn !== key) {
    Cn(key);
    let selected = Ao?.selectedValue;
    let Yo = selected ? allOptions.findIndex((opt) => opt.value === selected) : -1;
    (Ho(Yo >= 0 ? Yo : 0), Wo(!1));
  }
  let kn = allOptions[Ro],
    selectedValue = Ao?.selectedValue,
    bn = Ao?.textInputValue || "",
    Go;
  if (
    $[2] !== allOptions ||
    $[3] !== onAnswer ||
    $[4] !== onUpdateQuestionState ||
    $[5] !== key ||
    $[6] !== wouldTakeAnswer
  )
    ((Go = (index) => {
      let Mn = allOptions[index];
      if (!Mn) {
        return;
      }
      if ((Ho(index), !wouldTakeAnswer())) {
        return;
      }
      (onUpdateQuestionState(key, { selectedValue: Mn.value }, !1), onAnswer(key, Mn.value));
    }),
      ($[2] = allOptions),
      ($[3] = onAnswer),
      ($[4] = onUpdateQuestionState),
      ($[5] = key),
      ($[6] = wouldTakeAnswer),
      ($[7] = Go));
  else Go = $[7];
  let Xo = Go,
    Sn;
  if ($[8] !== allOptions.length || $[9] !== Ro || $[10] !== Lt || $[11] !== wouldTakeAnswer)
    ((Sn = (direction) => {
      if (Lt) {
        return;
      }
      let on;
      if (typeof direction === "number") on = direction;
      else if (direction === "up") on = Ro > 0 ? Ro - 1 : Ro;
      else on = Ro < allOptions.length - 1 ? Ro + 1 : Ro;
      if (on >= 0 && on < allOptions.length) {
        if (!wouldTakeAnswer()) {
          return;
        }
        if ((Ho(on), on !== Ro)) Wo(!0);
      }
    }),
      ($[8] = allOptions.length),
      ($[9] = Ro),
      ($[10] = Lt),
      ($[11] = wouldTakeAnswer),
      ($[12] = Sn));
  else Sn = $[12];
  let _o = Sn,
    cn;
  if (
    $[13] !== onUpdateQuestionState ||
    $[14] !== Ao?.textInputValue ||
    $[15] !== key ||
    $[16] !== wouldTakeAnswer
  )
    ((cn = async () => {
      if (!wouldTakeAnswer()) {
        return;
      }
      let Dn = Ao?.textInputValue || "";
      let result = await editPromptInEditor(Dn);
      if ((updateLastInteractionTime(!0), result.content !== null && result.content !== Dn)) {
        if (!wouldTakeAnswer()) {
          return;
        }
        onUpdateQuestionState(key, { textInputValue: result.content }, !1);
      }
    }),
      ($[13] = onUpdateQuestionState),
      ($[14] = Ao?.textInputValue),
      ($[15] = key),
      ($[16] = wouldTakeAnswer),
      ($[17] = cn));
  else cn = $[17];
  const mr = Lt && !!po;
  let Kn;
  if ($[18] !== mr) ((Kn = { context: "Chat", isActive: mr }), ($[18] = mr), ($[19] = Kn));
  else Kn = $[19];
  useKeybinding("chat:externalEditor", cn, Kn);
  let Wn;
  if ($[20] !== onTabNext || $[21] !== onTabPrev)
    ((Wn = { "tabs:previous": onTabPrev, "tabs:next": onTabNext }),
      ($[20] = onTabNext),
      ($[21] = onTabPrev),
      ($[22] = Wn));
  else Wn = $[22];
  const Fr = !Lt && !Et;
  let Zn;
  if ($[23] !== Fr) ((Zn = { context: "Tabs", isActive: Fr }), ($[23] = Fr), ($[24] = Zn));
  else Zn = $[24];
  MessageActionsKeybindings(Wn, Zn);
  let Un;
  if ($[25] !== onTextInputFocus)
    ((Un = () => {
      (oo(!1), onTextInputFocus(!1));
    }),
      ($[25] = onTextInputFocus),
      ($[26] = Un));
  else Un = $[26];
  let dr = Un,
    or;
  if (
    $[27] !== Ro ||
    $[28] !== dr ||
    $[29] !== Xo ||
    $[30] !== Io ||
    $[31] !== bn ||
    $[32] !== onAnswer ||
    $[33] !== key ||
    $[34] !== selectedValue ||
    $[35] !== wouldTakeAnswer
  )
    ((or = () => {
      if ((dr(), !wouldTakeAnswer())) {
        return;
      }
      if (bn.trim() && Io) Xo(Ro);
      else if (selectedValue) onAnswer(key, selectedValue);
      else if (bn.trim()) onAnswer(key, NOTES_ONLY_ANSWER);
    }),
      ($[27] = Ro),
      ($[28] = dr),
      ($[29] = Xo),
      ($[30] = Io),
      ($[31] = bn),
      ($[32] = onAnswer),
      ($[33] = key),
      ($[34] = selectedValue),
      ($[35] = wouldTakeAnswer),
      ($[36] = or));
  else or = $[36];
  let pr = or,
    Qn;
  if ($[37] === MEMO_CACHE_SENTINEL)
    ((Qn = () => {
      Dt(!0);
    }),
      ($[37] = Qn));
  else Qn = $[37];
  let ur = Qn,
    Ir;
  if ($[38] === MEMO_CACHE_SENTINEL)
    ((Ir = () => {
      Dt(!1);
    }),
      ($[38] = Ir));
  else Ir = $[38];
  let Pr = Ir,
    ts;
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
  )
    ((ts = (Gn) => {
      if (Et) {
        if (Gn.key === "up" || (Gn.ctrl && Gn.key === "p")) {
          (Gn.preventDefault(), Pr());
          return;
        }
        if (Gn.key === "return") {
          (Gn.preventDefault(), onRespondToClaude());
          return;
        }
        if (Gn.key === "escape") (Gn.preventDefault(), onCancel());
        return;
      }
      if (Lt) {
        if (Gn.key === "escape") (Gn.preventDefault(), dr());
        return;
      }
      if (Gn.key === "up" || (Gn.ctrl && Gn.key === "p")) {
        if ((Gn.preventDefault(), Ro > 0)) _o("up");
      } else if (Gn.key === "down" || (Gn.ctrl && Gn.key === "n")) {
        if ((Gn.preventDefault(), Ro === allOptions.length - 1)) ur();
        else _o("down");
      } else if (Gn.key === "return") (Gn.preventDefault(), Xo(Ro));
      else if (Gn.key === "n" && !Gn.ctrl && !Gn.meta) (Gn.preventDefault(), oo(!0), onTextInputFocus(!0));
      else if (Gn.key === "escape") (Gn.preventDefault(), onCancel());
      else if (Gn.key.length === 1 && Gn.key >= "1" && Gn.key <= "9") {
        Gn.preventDefault();
        let Ur = parseInt(Gn.key, 10) - 1;
        if (Ur < allOptions.length) _o(Ur);
      }
    }),
      ($[39] = allOptions.length),
      ($[40] = Ro),
      ($[41] = _o),
      ($[42] = dr),
      ($[43] = Xo),
      ($[44] = Et),
      ($[45] = Lt),
      ($[46] = onCancel),
      ($[47] = onRespondToClaude),
      ($[48] = onTextInputFocus),
      ($[49] = ts));
  else ts = $[49];
  let Zr = ts,
    wr =
      kn?.preview === void 0
        ? null
        : kn.preview.kind === "full"
          ? kn.preview.markdown
          : PREVIEW_WITHHELD_TEXT,
    { columns: columns, rows: rows } = useTerminalSize(),
    fr = columns - 30 - 4,
    max = Math.max(1, fr - bunStringWidth("Notes:") - 1),
    Yr = useUnattendedNotice(),
    max_2 = Math.max(1, rows - 26 - Yr),
    Vr;
  if ($[50] === MEMO_CACHE_SENTINEL) ((Vr = e(Divider, { color: "inactive" })), ($[50] = Vr));
  else Vr = $[50];
  let ms;
  if ($[51] !== answers || $[52] !== currentQuestionIndex || $[53] !== Ot || $[54] !== questions)
    ((ms = e(QuestionNavigationBar, {
      questions: questions,
      currentQuestionIndex: currentQuestionIndex,
      answers: answers,
      hideSubmitTab: Ot,
    })),
      ($[51] = answers),
      ($[52] = currentQuestionIndex),
      ($[53] = Ot),
      ($[54] = questions),
      ($[55] = ms));
  else ms = $[55];
  let Xs;
  if ($[56] !== question.displayQuestion.text)
    ((Xs = e(PermissionRequestTitle, { title: question.displayQuestion.text, color: "text" })),
      ($[56] = question.displayQuestion.text),
      ($[57] = Xs));
  else Xs = $[57];
  let Ls;
  if ($[58] !== question.displayQuestion.needsGutter || $[59] !== Xs)
    ((Ls = e(Blockquote, { multiline: question.displayQuestion.needsGutter, children: Xs })),
      ($[58] = question.displayQuestion.needsGutter),
      ($[59] = Xs),
      ($[60] = Ls));
  else Ls = $[60];
  let is;
  if ($[61] !== allOptions || $[62] !== Ro || $[63] !== selectedValue) {
    let ws;
    if ($[65] !== Ro || $[66] !== selectedValue)
      ((ws = (option_0, index_0) => {
        let Oi = Ro === index_0;
        let Hi = selectedValue === option_0.value;
        return r(
          Box,
          {
            flexDirection: "row",
            children: [
              Oi ? e(Text, { color: "suggestion", children: re.pointer }) : e(Text, { children: " " }),
              r(Text, { dimColor: !0, children: [" ", index_0 + 1, "."] }),
              r(Text, {
                color: Hi ? "success" : Oi ? "suggestion" : void 0,
                bold: Oi,
                children: [" ", option_0.displayLabel],
              }),
              Hi && r(Text, { color: "success", children: [" ", re.tick] }),
            ],
          },
          option_0.value,
        );
      }),
        ($[65] = Ro),
        ($[66] = selectedValue),
        ($[67] = ws));
    else ws = $[67];
    is = allOptions.map(ws);
    (($[61] = allOptions), ($[62] = Ro), ($[63] = selectedValue), ($[64] = is));
  } else is = $[64];
  let ws;
  if ($[68] !== is)
    ((ws = e(Box, { flexDirection: "column", width: 30, children: is })), ($[68] = is), ($[69] = ws));
  else ws = $[69];
  const Zi = wr || "No preview available";
  let da;
  if ($[70] !== minContentWidth || $[71] !== max_2 || $[72] !== fr || $[73] !== Zi)
    ((da = e(Markdown, { content: Zi, maxLines: max_2, minWidth: minContentWidth, maxWidth: fr })),
      ($[70] = minContentWidth),
      ($[71] = max_2),
      ($[72] = fr),
      ($[73] = Zi),
      ($[74] = da));
  else da = $[74];
  let qn;
  if ($[75] === MEMO_CACHE_SENTINEL)
    ((qn = e(Box, { flexShrink: 0, children: e(Text, { color: "suggestion", children: "Notes:" }) })),
      ($[75] = qn));
  else qn = $[75];
  let ps;
  if (
    $[76] !== Xt ||
    $[77] !== dr ||
    $[78] !== pr ||
    $[79] !== Lt ||
    $[80] !== max ||
    $[81] !== bn ||
    $[82] !== onUpdateQuestionState ||
    $[83] !== key ||
    $[84] !== wouldTakeAnswer
  )
    ((ps = r(Box, {
      marginTop: 1,
      flexDirection: "row",
      gap: 1,
      children: [
        qn,
        Lt
          ? e(TextInput, {
              value: bn,
              placeholder: "Add notes on this design\u2026",
              onChange: (value) => {
                if (!wouldTakeAnswer()) {
                  return;
                }
                onUpdateQuestionState(key, { textInputValue: value }, !1);
              },
              onSubmit: pr,
              onExit: dr,
              focus: !0,
              showCursor: !0,
              columns: max,
              maxVisibleLines: 5,
              cursorOffset: Xt,
              onChangeCursorOffset: io,
              disableEscapeDoublePress: !0,
            })
          : e(Text, { dimColor: !0, italic: !0, children: bn || "press n to add notes" }),
      ],
    })),
      ($[76] = Xt),
      ($[77] = dr),
      ($[78] = pr),
      ($[79] = Lt),
      ($[80] = max),
      ($[81] = bn),
      ($[82] = onUpdateQuestionState),
      ($[83] = key),
      ($[84] = wouldTakeAnswer),
      ($[85] = ps));
  else ps = $[85];
  let kr;
  if ($[86] !== da || $[87] !== ps)
    ((kr = r(Box, { flexDirection: "column", flexGrow: 1, children: [da, ps] })),
      ($[86] = da),
      ($[87] = ps),
      ($[88] = kr));
  else kr = $[88];
  let ls;
  if ($[89] !== ws || $[90] !== kr)
    ((ls = r(Box, { marginTop: 1, flexDirection: "row", gap: 4, children: [ws, kr] })),
      ($[89] = ws),
      ($[90] = kr),
      ($[91] = ls));
  else ls = $[91];
  let Ms;
  if ($[92] === MEMO_CACHE_SENTINEL) ((Ms = e(Divider, { color: "inactive" })), ($[92] = Ms));
  else Ms = $[92];
  let qs;
  if ($[93] !== Et)
    ((qs = Et ? e(Text, { color: "suggestion", children: re.pointer }) : e(Text, { children: " " })),
      ($[93] = Et),
      ($[94] = qs));
  else qs = $[94];
  const gs = Et ? "suggestion" : void 0;
  let es;
  if ($[95] !== gs) ((es = e(Text, { color: gs, children: "Chat about this" })), ($[95] = gs), ($[96] = es));
  else es = $[96];
  let ds;
  if ($[97] !== qs || $[98] !== es)
    ((ds = r(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [Ms, r(Box, { flexDirection: "row", gap: 1, children: [qs, es] })],
    })),
      ($[97] = qs),
      ($[98] = es),
      ($[99] = ds));
  else ds = $[99];
  let Hs;
  if ($[100] === MEMO_CACHE_SENTINEL)
    ((Hs = e(KeyboardShortcutHint, { chord: "enter", action: "select" })), ($[100] = Hs));
  else Hs = $[100];
  let _s, fs;
  if ($[101] === MEMO_CACHE_SENTINEL)
    ((_s = e(KeyboardShortcutHint, { chord: ["up", "down"], action: "navigate" })),
      (fs = e(KeyboardShortcutHint, { chord: "n", action: "add notes" })),
      ($[101] = _s),
      ($[102] = fs));
  else ((_s = $[101]), (fs = $[102]));
  let ii;
  if ($[103] !== questions.length)
    ((ii = questions.length > 1 && e(KeyboardShortcutHint, { chord: "tab", action: "switch questions" })),
      ($[103] = questions.length),
      ($[104] = ii));
  else ii = $[104];
  let ua;
  if ($[105] !== Lt)
    ((ua = Lt && co && e(KeyboardShortcutHint, { chord: "ctrl+g", action: `edit in ${co}` })),
      ($[105] = Lt),
      ($[106] = ua));
  else ua = $[106];
  let La;
  if ($[107] === MEMO_CACHE_SENTINEL)
    ((La = e(KeyboardShortcutHint, { chord: "escape", action: "cancel" })), ($[107] = La));
  else La = $[107];
  let Xa;
  if ($[108] !== ii || $[109] !== ua)
    ((Xa = e(Box, {
      marginTop: 1,
      children: e(Text, {
        color: "inactive",
        dimColor: !0,
        children: r(Byline, { children: [Hs, _s, fs, ii, ua, La] }),
      }),
    })),
      ($[108] = ii),
      ($[109] = ua),
      ($[110] = Xa));
  else Xa = $[110];
  let dl;
  if ($[111] !== ls || $[112] !== ds || $[113] !== Xa)
    ((dl = r(Box, { flexDirection: "column", children: [ls, ds, Xa] })),
      ($[111] = ls),
      ($[112] = ds),
      ($[113] = Xa),
      ($[114] = dl));
  else dl = $[114];
  let Vl;
  if ($[115] !== ms || $[116] !== Ls || $[117] !== dl)
    ((Vl = r(Box, { flexDirection: "column", paddingTop: 0, children: [ms, Ls, dl] })),
      ($[115] = ms),
      ($[116] = Ls),
      ($[117] = dl),
      ($[118] = Vl));
  else Vl = $[118];
  let Hd;
  if ($[119] !== Zr || $[120] !== Vl)
    ((Hd = r(Box, {
      flexDirection: "column",
      marginTop: 1,
      tabIndex: 0,
      autoFocus: !0,
      onKeyDown: Zr,
      children: [Vr, Vl],
    })),
      ($[119] = Zr),
      ($[120] = Vl),
      ($[121] = Hd));
  else Hd = $[121];
  return Hd;
}

export { PreviewQuestionView };
