/**
 * components/permissions/AskUserQuestionPermissionRequest/QuestionView.tsx
 *
 * 单问题视图：选项列表 + "Other / Type something" 自由输入。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/AskUserQuestionPermissionRequest/QuestionView.tsx
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: callgraph-fingerprint 1, sole-consumer 1, fingerprint 2
 */
import { replaceLineBreaks } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../../state/AppState.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { y, R } from "../../../../vendor/react/cjs/react.production.js";
import { Cg } from "../../../utils/subagentStatusLine.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { wM } from "../../../utils/editor.js";
import { toIDEDisplayName } from "../../../utils/ide.js";
import { useDeferredPasteForwarding, isForwardablePaste } from "../../CustomSelect/use-select-input.js";
import { normalizeFullWidthDigits_2 } from "../../../utils/stringUtils.js";
import { editPromptInEditor } from "../../../utils/promptEditor.js";
import { updateLastInteractionTime } from "../../../bootstrap/state.js";
import { eEo } from "./AskUserQuestionPermissionRequest.js";
import {
  e,
  r,
  Fragment,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { PreviewQuestionView } from "./PreviewQuestionView.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { Divider } from "../../design-system/Divider.js";
import { FilePathLink } from "../../FilePathLink.js";
import { QuestionNavigationBar } from "./QuestionNavigationBar.js";
import { PermissionRequestTitle } from "../PermissionRequestTitle.js";
import { PreviewBox } from "./PreviewBox.js";
import { Blockquote } from "../../Blockquote.js";
import { re } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { Byline } from "../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../design-system/KeyboardShortcutHint.js";
import { SelectMultiAccessible } from "../../CustomSelect/SelectMulti.js";
import { ModelSelector } from "../../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../CustomSelect/select.js";

//@ chunk-18hwfzwa.js:1287012-1287066 callgraph-fingerprint = _temp (1)
function selectToolPermissionContextMode(s) {
  return s.toolPermissionContext.mode;
}
//@ chunk-18hwfzwa.js:1287066-1287178 sole-consumer
function toSelectOption(Hi) {
  return {
    type: "text",
    value: Hi.value,
    label: Hi.displayLabel,
    description: replaceLineBreaks(Hi.displayDescription),
  };
}
//@ chunk-18hwfzwa.js:1287222-1287263 fingerprint = _temp4 (1)
function oEo(v) {
  return v !== "__other__";
}
//@ chunk-18hwfzwa.js:1287263-1293852 fingerprint = QuestionView (0.754)
function QuestionView(t0) {
  let $ = w(76),
    {
      wouldTakeAnswer: wouldTakeAnswer,
      question: question,
      questions: questions,
      currentQuestionIndex: currentQuestionIndex,
      answers: answers,
      questionStates: questionStates,
      hideSubmitTab: t1,
      planFilePath: planFilePath,
      minContentWidth: minContentWidth,
      onUpdateQuestionState: onUpdateQuestionState,
      onAnswer: onAnswer,
      onTextInputFocus: onTextInputFocus,
      onCancel: onCancel,
      onSubmit: onSubmit,
      onTabPrev: onTabPrev,
      onTabNext: onTabNext,
      onRespondToClaude: onRespondToClaude,
      canPasteImage: canPasteImage,
      onImagePaste: onImagePaste,
      pastedContents: pastedContents,
      onRemoveImage: onRemoveImage,
    } = t0,
    io = t1 === void 0 ? !1 : t1,
    so = useAppState(selectToolPermissionContextMode) === "plan",
    po = useIsScreenReaderEnabled(),
    [ao, co] = y(!1),
    [bo, Ao] = y(!1),
    Bo = Cg(),
    [Ro, Ho] = y(null),
    Io = Ro?.takesEscape ?? !1,
    mn;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    let editor = wM();
    mn = editor ? toIDEDisplayName(editor) : null;
    $[0] = mn;
  } else mn = $[0];
  let No = mn,
    vo;
  if ($[1] !== onTextInputFocus)
    ((vo = (value) => {
      let kn = value === "__other__";
      (Ao(kn), onTextInputFocus(kn));
    }),
      ($[1] = onTextInputFocus),
      ($[2] = vo));
  else vo = $[2];
  let Fn = vo,
    bn;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((bn = () => {
      co(!0);
    }),
      ($[3] = bn));
  else bn = $[3];
  let Go = bn,
    hn;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((hn = () => {
      co(!1);
    }),
      ($[4] = hn));
  else hn = $[4];
  let Mn = hn,
    Xo = useDeferredPasteForwarding(!ao),
    Sn;
  if ($[5] !== canPasteImage || $[6] !== Xo || $[7] !== ao)
    ((Sn = ($n) => {
      if (!ao || !isForwardablePaste($n, canPasteImage)) {
        return;
      }
      ($n.preventDefault(), Xo($n), co(!1));
    }),
      ($[5] = canPasteImage),
      ($[6] = Xo),
      ($[7] = ao),
      ($[8] = Sn));
  else Sn = $[8];
  let on = Sn,
    cn = question.options.length + 1 + 1,
    Dn;
  if (
    $[9] !== cn ||
    $[10] !== ao ||
    $[11] !== bo ||
    $[12] !== po ||
    $[13] !== onCancel ||
    $[14] !== onRespondToClaude
  )
    ((Dn = (wn) => {
      if (!ao) {
        if (!po && !bo && normalizeFullWidthDigits_2(wn.key) === String(cn))
          (wn.preventDefault(), onRespondToClaude());
        return;
      }
      if (wn.key === "up" || (wn.ctrl && wn.key === "p")) {
        (wn.preventDefault(), Mn());
        return;
      }
      if (wn.key === "return" || normalizeFullWidthDigits_2(wn.key) === String(cn)) {
        (wn.preventDefault(), onRespondToClaude());
        return;
      }
      if (wn.key === "escape") (wn.preventDefault(), onCancel());
    }),
      ($[9] = cn),
      ($[10] = ao),
      ($[11] = bo),
      ($[12] = po),
      ($[13] = onCancel),
      ($[14] = onRespondToClaude),
      ($[15] = Dn));
  else Dn = $[15];
  let mr = Dn,
    textOptions = question.options.map(toSelectOption),
    key = question.key,
    questionState = questionStates[key],
    Zn = R(null),
    Un;
  if (
    $[16] !== onUpdateQuestionState ||
    $[17] !== question.multiSelect ||
    $[18] !== key ||
    $[19] !== wouldTakeAnswer
  )
    ((Un = async (currentValue, setValue) => {
      if (!wouldTakeAnswer()) {
        return;
      }
      let result = await editPromptInEditor(currentValue);
      if ((updateLastInteractionTime(!0), result.content !== null && result.content !== currentValue)) {
        if (!wouldTakeAnswer()) {
          return;
        }
        (setValue(result.content),
          onUpdateQuestionState(key, { textInputValue: result.content }, question.multiSelect ?? !1));
      }
    }),
      ($[16] = onUpdateQuestionState),
      ($[17] = question.multiSelect),
      ($[18] = key),
      ($[19] = wouldTakeAnswer),
      ($[20] = Un));
  else Un = $[20];
  let Qn = Un;
  const ur = question.multiSelect ? "Type something" : "Type something.",
    Ir = questionState?.textInputValue ?? "";
  let Pr;
  if ($[21] !== Bo || $[22] !== Io)
    ((Pr = Bo ? { takesEscape: Io, onStateChange: Ho } : void 0), ($[21] = Bo), ($[22] = Io), ($[23] = Pr));
  else Pr = $[23];
  let ts;
  if (
    $[24] !== onUpdateQuestionState ||
    $[25] !== question.multiSelect ||
    $[26] !== key ||
    $[27] !== wouldTakeAnswer
  )
    ((ts = (value_0) => {
      if (!wouldTakeAnswer()) {
        return !1;
      }
      ((Zn.current = { question: key, value: value_0 }),
        onUpdateQuestionState(key, { textInputValue: value_0 }, question.multiSelect ?? !1));
    }),
      ($[24] = onUpdateQuestionState),
      ($[25] = question.multiSelect),
      ($[26] = key),
      ($[27] = wouldTakeAnswer),
      ($[28] = ts));
  else ts = $[28];
  let Ur;
  if ($[29] !== Ir || $[30] !== Pr || $[31] !== ts || $[32] !== ur)
    ((Ur = {
      type: "input",
      value: "__other__",
      label: "Other",
      placeholder: ur,
      initialValue: Ir,
      takesPasteFromOtherRows: !0,
      vimEditing: Pr,
      onChange: ts,
    }),
      ($[29] = Ir),
      ($[30] = Pr),
      ($[31] = ts),
      ($[32] = ur),
      ($[33] = Ur));
  else Ur = $[33];
  let Zr = Ur,
    wr;
  if ($[34] !== po || $[35] !== question.multiSelect)
    ((wr =
      po && !question.multiSelect ? [{ type: "text", value: "__chat__", label: "Chat about this" }] : []),
      ($[34] = po),
      ($[35] = question.multiSelect),
      ($[36] = wr));
  else wr = $[36];
  let zr = wr,
    _r = [...textOptions, Zr, ...zr];
  if (!question.multiSelect && question.options.some(eEo) && !po) {
    let $r;
    if (
      $[37] !== answers ||
      $[38] !== currentQuestionIndex ||
      $[39] !== io ||
      $[40] !== minContentWidth ||
      $[41] !== onAnswer ||
      $[42] !== onCancel ||
      $[43] !== onRespondToClaude ||
      $[44] !== onTabNext ||
      $[45] !== onTabPrev ||
      $[46] !== onTextInputFocus ||
      $[47] !== onUpdateQuestionState ||
      $[48] !== question ||
      $[49] !== questionStates ||
      $[50] !== questions ||
      $[51] !== wouldTakeAnswer
    )
      (($r = e(PreviewQuestionView, {
        wouldTakeAnswer: wouldTakeAnswer,
        question: question,
        questions: questions,
        currentQuestionIndex: currentQuestionIndex,
        answers: answers,
        questionStates: questionStates,
        hideSubmitTab: io,
        minContentWidth: minContentWidth,
        onUpdateQuestionState: onUpdateQuestionState,
        onAnswer: onAnswer,
        onTextInputFocus: onTextInputFocus,
        onCancel: onCancel,
        onTabPrev: onTabPrev,
        onTabNext: onTabNext,
        onRespondToClaude: onRespondToClaude,
      })),
        ($[37] = answers),
        ($[38] = currentQuestionIndex),
        ($[39] = io),
        ($[40] = minContentWidth),
        ($[41] = onAnswer),
        ($[42] = onCancel),
        ($[43] = onRespondToClaude),
        ($[44] = onTabNext),
        ($[45] = onTabPrev),
        ($[46] = onTextInputFocus),
        ($[47] = onUpdateQuestionState),
        ($[48] = question),
        ($[49] = questionStates),
        ($[50] = questions),
        ($[51] = wouldTakeAnswer),
        ($[52] = $r));
    else $r = $[52];
    return $r;
  }
  let $r;
  if ($[53] !== so || $[54] !== planFilePath)
    (($r =
      so &&
      planFilePath &&
      r(Box, {
        flexDirection: "column",
        gap: 0,
        children: [
          e(Divider, { color: "inactive" }),
          r(Text, {
            color: "inactive",
            children: ["Planning: ", e(FilePathLink, { filePath: planFilePath })],
          }),
        ],
      })),
      ($[53] = so),
      ($[54] = planFilePath),
      ($[55] = $r));
  else $r = $[55];
  let Yr;
  if ($[56] === MEMO_CACHE_SENTINEL) ((Yr = e(Divider, { color: "inactive" })), ($[56] = Yr));
  else Yr = $[56];
  let Er;
  if ($[57] !== answers || $[58] !== currentQuestionIndex || $[59] !== io || $[60] !== questions)
    ((Er = e(QuestionNavigationBar, {
      questions: questions,
      currentQuestionIndex: currentQuestionIndex,
      answers: answers,
      hideSubmitTab: io,
    })),
      ($[57] = answers),
      ($[58] = currentQuestionIndex),
      ($[59] = io),
      ($[60] = questions),
      ($[61] = Er));
  else Er = $[61];
  let Vr;
  if ($[62] !== question.displayBody || $[63] !== question.displayQuestion.text)
    ((Vr =
      question.displayBody.length === 0
        ? e(PermissionRequestTitle, { title: question.displayQuestion.text, color: "text" })
        : r(Box, {
            flexDirection: "column",
            children: [
              e(PermissionRequestTitle, { title: question.displayQuestion.text, color: "text" }),
              e(PreviewBox, { runs: question.displayBody }),
            ],
          })),
      ($[62] = question.displayBody),
      ($[63] = question.displayQuestion.text),
      ($[64] = Vr));
  else Vr = $[64];
  let ms;
  if ($[65] !== question.displayQuestion.needsGutter || $[66] !== Vr)
    ((ms = e(Blockquote, { multiline: question.displayQuestion.needsGutter, children: Vr })),
      ($[65] = question.displayQuestion.needsGutter),
      ($[66] = Vr),
      ($[67] = ms));
  else ms = $[67];
  let oi;
  if (
    $[68] !== cn ||
    $[69] !== ao ||
    $[70] !== bo ||
    $[71] !== po ||
    $[72] !== Ro ||
    $[73] !== Io ||
    $[74] !== questions
  )
    ((oi =
      !po &&
      r(Fragment, {
        children: [
          r(Box, {
            flexDirection: "column",
            children: [
              e(Divider, { color: "inactive" }),
              r(Box, {
                flexDirection: "row",
                gap: 1,
                children: [
                  ao ? e(Text, { color: "suggestion", children: re.pointer }) : e(Text, { children: " " }),
                  r(Text, { color: ao ? "suggestion" : void 0, children: [cn, ". Chat about this"] }),
                ],
              }),
            ],
          }),
          e(Box, {
            marginTop: 1,
            children: e(Text, {
              color: "inactive",
              dimColor: !0,
              children: r(Byline, {
                children: [
                  Ro && Ro.mode !== "NORMAL" && r(Text, { children: ["-- ", Ro.mode, " --"] }),
                  e(KeyboardShortcutHint, { chord: "enter", action: "select" }),
                  questions.length === 1
                    ? e(KeyboardShortcutHint, { chord: ["up", "down"], action: "navigate" })
                    : e(Text, { children: "Tab/Arrow keys to navigate" }),
                  bo && No && e(KeyboardShortcutHint, { chord: "ctrl+g", action: `edit in ${No}` }),
                  !Io && e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
                ],
              }),
            }),
          }),
        ],
      })),
      ($[68] = cn),
      ($[69] = ao),
      ($[70] = bo),
      ($[71] = po),
      ($[72] = Ro),
      ($[73] = Io),
      ($[74] = questions),
      ($[75] = oi));
  else oi = $[75];
  return r(Box, {
    flexDirection: "column",
    marginTop: 0,
    tabIndex: 0,
    autoFocus: !0,
    onKeyDown: mr,
    onPaste: on,
    children: [
      $r,
      Yr,
      r(Box, {
        flexDirection: "column",
        paddingTop: 0,
        children: [
          Er,
          ms,
          r(Box, {
            flexDirection: "column",
            children: [
              e(Box, {
                marginTop: 1,
                children: question.multiSelect
                  ? e(
                      SelectMultiAccessible,
                      {
                        options: _r,
                        defaultValue: questionStates[question.key]?.selectedValue,
                        onChange: (values) => {
                          if (!wouldTakeAnswer()) {
                            return !1;
                          }
                          onUpdateQuestionState(key, { selectedValue: values }, !0);
                          let Ls = values.includes("__other__")
                            ? Zn.current?.question === key
                              ? Zn.current.value
                              : questionStates[key]?.textInputValue
                            : void 0;
                          let finalValues = values.filter(oEo).concat(Ls ? [Ls] : []);
                          onAnswer(key, finalValues, void 0, !1);
                        },
                        onFocus: Fn,
                        onCancel: onCancel,
                        submitButtonText: currentQuestionIndex === questions.length - 1 ? "Submit" : "Next",
                        onSubmit: () => {
                          if (!wouldTakeAnswer()) {
                            return;
                          }
                          onSubmit();
                        },
                        onDownFromLastItem: Go,
                        isDisabled: ao,
                        onOpenEditor: Qn,
                        canPasteImage: canPasteImage,
                        onImagePaste: onImagePaste,
                        pastedContents: pastedContents,
                        onRemoveImage: onRemoveImage,
                      },
                      question.key,
                    )
                  : e(
                      ModelSelector,
                      {
                        options: _r,
                        selectedValue: questionStates[question.key]?.selectedValue ?? NO_COMMITTED_ROW,
                        onChange: (value_1) => {
                          if (!wouldTakeAnswer()) {
                            return !1;
                          }
                          if (value_1 === "__chat__") {
                            onRespondToClaude();
                            return;
                          }
                          onUpdateQuestionState(key, { selectedValue: value_1 }, !1);
                          let Ci = value_1 === "__other__" ? questionStates[key]?.textInputValue : void 0;
                          onAnswer(key, value_1, Ci);
                        },
                        onFocus: Fn,
                        onCancel: onCancel,
                        onDownFromLastItem: Go,
                        isDisabled: ao,
                        layout: "compact-vertical",
                        onOpenEditor: Qn,
                        canPasteImage: canPasteImage,
                        onImagePaste: onImagePaste,
                        pastedContents: pastedContents,
                        onRemoveImage: onRemoveImage,
                      },
                      question.key,
                    ),
              }),
              oi,
            ],
          }),
        ],
      }),
    ],
  });
}

export { QuestionView };
