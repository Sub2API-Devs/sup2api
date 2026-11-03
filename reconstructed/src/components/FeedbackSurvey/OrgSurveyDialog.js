/**
 * components/FeedbackSurvey/OrgSurveyDialog.tsx
 *
 * 2.1.316 新增。组织调查问卷对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (17)
 * attribution: placement 17
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useInputClock } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { R, y } from "../../../vendor/react/cjs/react.production.js";
import { isWithinRecentInput, So } from "../../hooks/useRecentInputGuard.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";
import { collectQuestionAnswers } from "../../entrypoints/sdk/coreSchemas.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Divider } from "../design-system/Divider.js";
import { Box, Text } from "../../ink/components/Text.js";
import { TagTabs } from "../TagTabs.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useInputRefusalWindow, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";
import { SelectMultiAccessible } from "../CustomSelect/SelectMulti.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { rXe, clampTextEdit } from "./SurveyFollowup.js";
import { SC } from "../../services/orgSurvey/orgSurvey.js";
import { TextInput } from "../TextInput.js";
import { BulletRow } from "../design-system/BulletRow.js";
import { StatusRow } from "../Settings/Status.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";

//@ chunk-18hwfzwa.js:1057801-1057834 placement
function Kyo() {
  return Date.now();
}
//@ chunk-18hwfzwa.js:1057834-1057868 placement
function Gyo(Go) {
  return Go !== null;
}
//@ chunk-18hwfzwa.js:1057868-1057923 placement
function Qyo(hn) {
  return { label: hn.label, value: hn.value };
}
//@ chunk-18hwfzwa.js:1057923-1057978 placement
function zyo(Mn) {
  return { label: Mn.label, value: Mn.value };
}
//@ chunk-18hwfzwa.js:1057978-1057994 placement
function Yyo() {}
//@ chunk-18hwfzwa.js:1057994-1058023 placement
function Jyo(Io) {
  return Io + 1;
}
//@ chunk-18hwfzwa.js:1058023-1058051 placement
var Rnt = 400,
  xnt = 700,
  Pnt = 100;
/**
 * 组织问卷的误触保护：记录打开/最近按键时间，返回判断"是否仍在近期输入窗口内"的函数。
 */
//@ chunk-18hwfzwa.js:1058051-1058380 placement
function useRecentInputGuard(h) {
  let $ = w(4),
    x = useInputClock(),
    L;
  if ($[0] === MEMO_CACHE_SENTINEL) ((L = Date.now()), ($[0] = L));
  else L = $[0];
  let ee = R(L),
    ke = R(Number.NEGATIVE_INFINITY),
    Re;
  if ($[1] !== x || $[2] !== h)
    ((Re = () => {
      let Be = x();
      if (Be - ke.current < Pnt) ee.current = Math.max(Be, ee.current);
      return ((ke.current = Math.max(Be, ke.current)), isWithinRecentInput(x, ee.current, h));
    }),
      ($[1] = x),
      ($[2] = h),
      ($[3] = Re));
  else Re = $[3];
  return Re;
}
//@ chunk-18hwfzwa.js:1058380-1058448 placement
var Mnt = new Intl.ListFormat("en", { style: "long", type: "conjunction" });
/**
 * OrgSurveyDialog：组织调查问卷对话框。
 */
//@ chunk-18hwfzwa.js:1058448-1061293 placement
function OrgSurveyDialog(h) {
  let $ = w(54),
    {
      survey: survey,
      initialDraft: initialDraft,
      onDraftChange: onDraftChange,
      onSubmit: onSubmit,
      onClose: onClose,
    } = h,
    Re = useInputClock(),
    [Be] = y(Kyo),
    [He, We] = y(initialDraft),
    [ze, Xe] = y(0),
    [rt, kt] = y(!1),
    At = R(!1),
    [It, Ot] = y(!1),
    questions = survey.questions,
    Dt = questions.length,
    Lt = ze < Dt ? questions[ze] : void 0,
    Xt;
  if ($[0] !== Re || $[1] !== Be)
    ((Xt = () => isWithinRecentInput(Re, Be, Rnt)), ($[0] = Re), ($[1] = Be), ($[2] = Xt));
  else Xt = $[2];
  let io = Xt,
    so;
  if ($[3] !== He || $[4] !== onDraftChange)
    ((so = function bo(po, ao) {
      let co = { ...He, [po]: ao };
      (We(co), onDraftChange(co));
    }),
      ($[3] = He),
      ($[4] = onDraftChange),
      ($[5] = so));
  else so = $[5];
  let bo = so,
    Ao;
  if ($[6] !== Dt)
    ((Ao = function Ho(Bo) {
      Xe((Ro) => Math.min(Math.max(Ro + Bo, 0), Dt));
    }),
      ($[6] = Dt),
      ($[7] = Ao));
  else Ao = $[7];
  let Ho = Ao,
    Io;
  if ($[8] !== Ho)
    ((Io = { "tabs:previous": () => Ho(-1), "tabs:next": () => Ho(1) }), ($[8] = Ho), ($[9] = Io));
  else Io = $[9];
  const Wo = !rt && Lt?.kind !== "text";
  let mn;
  if ($[10] !== Wo) ((mn = { context: "Tabs", isActive: Wo }), ($[10] = Wo), ($[11] = mn));
  else mn = $[11];
  MessageActionsKeybindings(Io, mn);
  let Cn;
  if ($[12] !== Ho)
    ((Cn = (No, vo) => {
      if (!vo.tab) {
        return;
      }
      return (Ho(vo.shift ? -1 : 1), !0);
    }),
      ($[12] = Ho),
      ($[13] = Cn));
  else Cn = $[13];
  const Yo = !rt && Lt?.kind === "text";
  let kn;
  if ($[14] !== Yo) ((kn = { isActive: Yo }), ($[14] = Yo), ($[15] = kn));
  else kn = $[15];
  usePreDispatchKeyHandler(Cn, kn);
  let Fn;
  if ($[16] !== io || $[17] !== onClose)
    ((Fn = (bn, Go) => {
      if (!Go.escape || io()) {
        return;
      }
      return (onClose(), !0);
    }),
      ($[16] = io),
      ($[17] = onClose),
      ($[18] = Fn));
  else Fn = $[18];
  const hn = !rt;
  let Mn;
  if ($[19] !== hn) ((Mn = { isActive: hn }), ($[19] = hn), ($[20] = Mn));
  else Mn = $[20];
  usePreDispatchKeyHandler(Fn, Mn);
  let Xo;
  if ($[21] !== He || $[22] !== questions) {
    let Sn;
    if ($[24] !== He) ((Sn = ($n) => $n.required && !oI(Cb(He, $n.id))), ($[24] = He), ($[25] = Sn));
    else Sn = $[25];
    Xo = questions.filter(Sn);
    (($[21] = He), ($[22] = questions), ($[23] = Xo));
  } else Xo = $[23];
  let on = Xo,
    Sn;
  if ($[26] !== He || $[27] !== on || $[28] !== onSubmit || $[29] !== questions)
    ((Sn = async function _o() {
      if (At.current) {
        return;
      }
      if (on.length > 0) {
        Xe(questions.indexOf(on[0]));
        return;
      }
      if (
        ((At.current = !0),
        kt(!0),
        Ot(!1),
        (await onSubmit(collectQuestionAnswers(questions, He))) === "failed")
      )
        ((At.current = !1), kt(!1), Ot(!0));
    }),
      ($[26] = He),
      ($[27] = on),
      ($[28] = onSubmit),
      ($[29] = questions),
      ($[30] = Sn));
  else Sn = $[30];
  let _o = Sn,
    cn;
  if ($[31] === MEMO_CACHE_SENTINEL) ((cn = e(Divider, { color: "inactive" })), ($[31] = cn));
  else cn = $[31];
  let Dn;
  if ($[32] !== He || $[33] !== ze || $[34] !== questions)
    ((Dn = e(OrgSurveyTabs, { questions: questions, draft: He, currentIndex: ze })),
      ($[32] = He),
      ($[33] = ze),
      ($[34] = questions),
      ($[35] = Dn));
  else Dn = $[35];
  let wn;
  if (
    $[36] !== He ||
    $[37] !== io ||
    $[38] !== ze ||
    $[39] !== on ||
    $[40] !== Ho ||
    $[41] !== onClose ||
    $[42] !== Lt ||
    $[43] !== questions ||
    $[44] !== Dt ||
    $[45] !== rt ||
    $[46] !== _o ||
    $[47] !== It ||
    $[48] !== survey.orgName ||
    $[49] !== bo
  )
    ((wn = Lt
      ? e(
          OrgSurveyQuestion,
          {
            question: Lt,
            orgName: survey.orgName,
            isLast: ze === Dt - 1,
            value: Cb(He, Lt.id),
            inOpenGrace: io,
            onChange: (mr) => bo(Lt.id, mr),
            onNext: () => Ho(1),
          },
          Lt.id,
        )
      : e(OrgSurveyReview, {
          questions: questions,
          draft: He,
          orgName: survey.orgName,
          missingRequired: on,
          sending: rt,
          submitFailed: It,
          onSubmit: () => void _o(),
          onCancel: onClose,
        })),
      ($[36] = He),
      ($[37] = io),
      ($[38] = ze),
      ($[39] = on),
      ($[40] = Ho),
      ($[41] = onClose),
      ($[42] = Lt),
      ($[43] = questions),
      ($[44] = Dt),
      ($[45] = rt),
      ($[46] = _o),
      ($[47] = It),
      ($[48] = survey.orgName),
      ($[49] = bo),
      ($[50] = wn));
  else wn = $[50];
  let Kn;
  if ($[51] !== Dn || $[52] !== wn)
    ((Kn = r(Box, { flexDirection: "column", tabIndex: 0, autoFocus: !0, children: [cn, Dn, wn] })),
      ($[51] = Dn),
      ($[52] = wn),
      ($[53] = Kn));
  else Kn = $[53];
  return Kn;
}
//@ chunk-18hwfzwa.js:1061293-1062376 placement
function OrgSurveyTabs(h) {
  let $ = w(19),
    { questions: questions, draft: draft, currentIndex: currentIndex } = h,
    ee = questions.length;
  const ke = currentIndex === 0 ? "inactive" : void 0;
  let Be;
  if ($[0] !== ke) ((Be = e(Text, { color: ke, children: "\u2190 " })), ($[0] = ke), ($[1] = Be));
  else Be = $[1];
  let He;
  if ($[2] !== currentIndex || $[3] !== draft || $[4] !== questions) {
    let We;
    if ($[6] !== currentIndex || $[7] !== draft)
      ((We = (ze, Xe) =>
        e(
          Box,
          {
            children: r(TagTabs, {
              color: Xe === currentIndex ? "permission" : void 0,
              padded: !0,
              children: [oI(Cb(draft, ze.id)) ? re.checkboxOn : re.checkboxOff, " ", Xe + 1],
            }),
          },
          ze.id,
        )),
        ($[6] = currentIndex),
        ($[7] = draft),
        ($[8] = We));
    else We = $[8];
    He = questions.map(We);
    (($[2] = currentIndex), ($[3] = draft), ($[4] = questions), ($[5] = He));
  } else He = $[5];
  const We = currentIndex === ee ? "permission" : void 0;
  let rt;
  if ($[9] === MEMO_CACHE_SENTINEL) ((rt = e(StatusIcon, { status: "success" })), ($[9] = rt));
  else rt = $[9];
  let kt;
  if ($[10] !== We)
    ((kt = r(TagTabs, { color: We, padded: !0, children: [rt, " Submit"] })), ($[10] = We), ($[11] = kt));
  else kt = $[11];
  const At = currentIndex === ee ? "inactive" : void 0;
  let It;
  if ($[12] !== At) ((It = r(Text, { color: At, children: [" ", "\u2192"] })), ($[12] = At), ($[13] = It));
  else It = $[13];
  let Ot;
  if ($[14] !== Be || $[15] !== He || $[16] !== kt || $[17] !== It)
    ((Ot = r(Box, { flexDirection: "row", marginBottom: 1, children: [Be, He, kt, It] })),
      ($[14] = Be),
      ($[15] = He),
      ($[16] = kt),
      ($[17] = It),
      ($[18] = Ot));
  else Ot = $[18];
  return Ot;
}
/**
 * 组织调查中的单个问题。
 */
//@ chunk-18hwfzwa.js:1062376-1065714 placement
function OrgSurveyQuestion(h) {
  let $ = w(62),
    {
      question: question,
      orgName: orgName,
      isLast: isLast,
      value: ee,
      inOpenGrace: inOpenGrace,
      onChange: onChange,
      onNext: onNext,
    } = h,
    He = useRecentInputGuard(So),
    ze;
  if ($[0] !== inOpenGrace || $[1] !== He)
    ((ze = () => {
      let Xe = inOpenGrace();
      let rt = He();
      return Xe || rt;
    }),
      ($[0] = inOpenGrace),
      ($[1] = He),
      ($[2] = ze));
  else ze = $[2];
  let kt = ze,
    It = useIsScreenReaderEnabled() ? !0 : !1,
    Ot = useInputRefusalWindow(So),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    Lt;
  if ($[3] !== inOpenGrace || $[4] !== Ot || $[5] !== noteRefused || $[6] !== refusedWithin)
    ((Lt = () => {
      if (inOpenGrace() || Ot() || refusedWithin(So)) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[3] = inOpenGrace),
      ($[4] = Ot),
      ($[5] = noteRefused),
      ($[6] = refusedWithin),
      ($[7] = Lt));
  else Lt = $[7];
  let oo = Lt;
  const Xt = question.kind === "multi_select" ? "(Select all that apply)" : null,
    io = question.required ? null : "(optional)";
  let so;
  if ($[8] !== Xt || $[9] !== io) ((so = [Xt, io].filter(Gyo)), ($[8] = Xt), ($[9] = io), ($[10] = so));
  else so = $[10];
  let joined = so.join(" "),
    ao;
  if ($[11] !== orgName)
    ((ao = r(Text, { dimColor: !0, children: ["Survey from ", orgName] })), ($[11] = orgName), ($[12] = ao));
  else ao = $[12];
  let co;
  if ($[13] !== joined)
    ((co = joined ? e(Text, { bold: !1, dimColor: !0, children: ` ${joined}` }) : null),
      ($[13] = joined),
      ($[14] = co));
  else co = $[14];
  let bo;
  if ($[15] !== question.text || $[16] !== co)
    ((bo = r(Text, { bold: !0, wrap: "wrap", children: [question.text, co] })),
      ($[15] = question.text),
      ($[16] = co),
      ($[17] = bo));
  else bo = $[17];
  let Ao;
  if ($[18] !== question.helperText)
    ((Ao =
      question.helperText !== null && e(Text, { dimColor: !0, wrap: "wrap", children: question.helperText })),
      ($[18] = question.helperText),
      ($[19] = Ao));
  else Ao = $[19];
  let Bo;
  if (
    $[20] !== kt ||
    $[21] !== onChange ||
    $[22] !== onNext ||
    $[23] !== question.kind ||
    $[24] !== question.options ||
    $[25] !== oo ||
    $[26] !== ee
  )
    ((Bo =
      question.kind === "single_select" &&
      e(ModelSelector, {
        options: question.options.map(Qyo),
        selectedValue: typeof ee === "string" ? ee : NO_COMMITTED_ROW,
        visibleOptionCount: 8,
        layout: "compact-vertical",
        refuseInput: oo,
        onChange: (Ro) => {
          if (kt()) {
            return !1;
          }
          (onChange(Ro), onNext());
        },
      })),
      ($[20] = kt),
      ($[21] = onChange),
      ($[22] = onNext),
      ($[23] = question.kind),
      ($[24] = question.options),
      ($[25] = oo),
      ($[26] = ee),
      ($[27] = Bo));
  else Bo = $[27];
  let Ho;
  if (
    $[28] !== It ||
    $[29] !== kt ||
    $[30] !== isLast ||
    $[31] !== onChange ||
    $[32] !== onNext ||
    $[33] !== question.kind ||
    $[34] !== question.options ||
    $[35] !== oo ||
    $[36] !== ee
  )
    ((Ho =
      question.kind === "multi_select" &&
      e(SelectMultiAccessible, {
        options: question.options.map(zyo),
        defaultValue: Array.isArray(ee) ? [...ee] : [],
        visibleOptionCount: 8,
        submitButtonText: isLast ? "Review" : "Next",
        refuseInput: oo,
        onChange: (Io) => {
          if (kt()) {
            return !1;
          }
          onChange(Io);
        },
        onSubmit: () => {
          if (It || !kt()) onNext();
        },
        onCancel: Yyo,
      })),
      ($[28] = It),
      ($[29] = kt),
      ($[30] = isLast),
      ($[31] = onChange),
      ($[32] = onNext),
      ($[33] = question.kind),
      ($[34] = question.options),
      ($[35] = oo),
      ($[36] = ee),
      ($[37] = Ho));
  else Ho = $[37];
  let Wo;
  if ($[38] !== kt || $[39] !== onChange || $[40] !== onNext || $[41] !== question.kind || $[42] !== ee)
    ((Wo =
      question.kind === "text" &&
      e(OrgSurveyTextInput, {
        value: typeof ee === "string" ? ee : "",
        inGrace: kt,
        onChange: onChange,
        onSubmit: onNext,
      })),
      ($[38] = kt),
      ($[39] = onChange),
      ($[40] = onNext),
      ($[41] = question.kind),
      ($[42] = ee),
      ($[43] = Wo));
  else Wo = $[43];
  let mn;
  if ($[44] !== Bo || $[45] !== Ho || $[46] !== Wo)
    ((mn = r(Box, { marginTop: 1, flexDirection: "column", children: [Bo, Ho, Wo] })),
      ($[44] = Bo),
      ($[45] = Ho),
      ($[46] = Wo),
      ($[47] = mn));
  else mn = $[47];
  const Cn = question.kind === "text" ? "continue" : "select";
  let No;
  if ($[48] !== Cn)
    ((No = e(KeyboardShortcutHint, { chord: "enter", action: Cn })), ($[48] = Cn), ($[49] = No));
  else No = $[49];
  const vo = question.kind === "text" ? "Tab" : "Tab/Arrow keys";
  let Yo;
  if ($[50] !== vo) ((Yo = r(Text, { children: [vo, " to navigate"] })), ($[50] = vo), ($[51] = Yo));
  else Yo = $[51];
  let kn;
  if ($[52] === MEMO_CACHE_SENTINEL)
    ((kn = e(KeyboardShortcutHint, { chord: "escape", action: "close" })), ($[52] = kn));
  else kn = $[52];
  let Fn;
  if ($[53] !== No || $[54] !== Yo)
    ((Fn = e(Box, {
      marginTop: 1,
      children: e(Text, { dimColor: !0, children: r(Byline, { children: [No, Yo, kn] }) }),
    })),
      ($[53] = No),
      ($[54] = Yo),
      ($[55] = Fn));
  else Fn = $[55];
  let bn;
  if ($[56] !== mn || $[57] !== Fn || $[58] !== ao || $[59] !== bo || $[60] !== Ao)
    ((bn = r(Box, { flexDirection: "column", children: [ao, bo, Ao, mn, Fn] })),
      ($[56] = mn),
      ($[57] = Fn),
      ($[58] = ao),
      ($[59] = bo),
      ($[60] = Ao),
      ($[61] = bn));
  else bn = $[61];
  return bn;
}
//@ chunk-18hwfzwa.js:1065714-1067346 placement
function OrgSurveyTextInput(h) {
  let $ = w(26),
    { value: x, inGrace: inGrace, onChange: onChange, onSubmit: onSubmit } = h,
    { columns: columns } = useTerminalSize(),
    [Re, Be] = y(x.length),
    He = R(Re),
    We = R(null),
    [, ze] = y(0),
    rt;
  if ($[0] !== onChange || $[1] !== x)
    ((rt = function Ot(kt) {
      let At = rXe(kt);
      let It = clampTextEdit(x, At, SC);
      if (
        ((We.current = It.caret === "pass" ? null : It.caret === "keep" ? He.current : It.caret),
        It.caret !== "pass" || At !== kt)
      )
        ze(Jyo);
      onChange(It.text);
    }),
      ($[0] = onChange),
      ($[1] = x),
      ($[2] = rt));
  else rt = $[2];
  let Ot = rt,
    Et;
  if ($[3] !== x) ((Et = Array.from(x)), ($[3] = x), ($[4] = Et));
  else Et = $[4];
  let Dt = Et.length,
    Lt;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((Lt = r(Text, { color: "suggestion", children: [re.pointer, " "] })), ($[5] = Lt));
  else Lt = $[5];
  let oo;
  if ($[6] !== inGrace || $[7] !== onSubmit)
    ((oo = () => {
      if (!inGrace()) onSubmit();
    }),
      ($[6] = inGrace),
      ($[7] = onSubmit),
      ($[8] = oo));
  else oo = $[8];
  const min = Math.min(Math.max(columns - 4, 20), 120);
  let io;
  if ($[9] === MEMO_CACHE_SENTINEL)
    ((io = (so) => {
      let po = We.current ?? so;
      ((We.current = null), (He.current = po), Be(po));
    }),
      ($[9] = io));
  else io = $[9];
  let ao;
  if ($[10] !== Re || $[11] !== Ot || $[12] !== oo || $[13] !== min || $[14] !== x)
    ((ao = r(Box, {
      children: [
        Lt,
        e(TextInput, {
          value: x,
          onChange: Ot,
          onSubmit: oo,
          columns: min,
          cursorOffset: Re,
          onChangeCursorOffset: io,
          focus: !0,
          showCursor: !0,
          multiline: !1,
          inputFilter: rXe,
        }),
      ],
    })),
      ($[10] = Re),
      ($[11] = Ot),
      ($[12] = oo),
      ($[13] = min),
      ($[14] = x),
      ($[15] = ao));
  else ao = $[15];
  const co = Dt < SC,
    bo = Dt >= SC ? "warning" : void 0;
  let Ao;
  if ($[16] !== Dt) ((Ao = Dt.toLocaleString("en-US")), ($[16] = Dt), ($[17] = Ao));
  else Ao = $[17];
  let Bo;
  if ($[18] === MEMO_CACHE_SENTINEL) ((Bo = SC.toLocaleString("en-US")), ($[18] = Bo));
  else Bo = $[18];
  let Ro;
  if ($[19] !== Ao || $[20] !== co || $[21] !== bo)
    ((Ro = r(Text, { dimColor: co, color: bo, children: [Ao, "/", Bo] })),
      ($[19] = Ao),
      ($[20] = co),
      ($[21] = bo),
      ($[22] = Ro));
  else Ro = $[22];
  let Ho;
  if ($[23] !== Ro || $[24] !== ao)
    ((Ho = r(Box, { flexDirection: "column", children: [ao, Ro] })),
      ($[23] = Ro),
      ($[24] = ao),
      ($[25] = Ho));
  else Ho = $[25];
  return Ho;
}
//@ chunk-18hwfzwa.js:1067346-1069363 placement
function OrgSurveyReview(h) {
  let $ = w(28),
    {
      questions: questions,
      draft: draft,
      orgName: orgName,
      missingRequired: missingRequired,
      sending: sending,
      submitFailed: submitFailed,
      onSubmit: onSubmit,
      onCancel: onCancel,
    } = h,
    We = useRecentInputGuard(xnt),
    Xe;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((Xe = e(Text, { bold: !0, children: "Review your answers" })), ($[0] = Xe));
  else Xe = $[0];
  let rt;
  if ($[1] !== draft || $[2] !== questions) {
    let kt;
    if ($[4] !== draft) ((kt = (At) => oI(Cb(draft, At.id))), ($[4] = draft), ($[5] = kt));
    else kt = $[5];
    const filtered = questions.filter(kt);
    let Ot;
    if ($[6] !== draft)
      ((Ot = (Et) =>
        r(
          Box,
          {
            flexDirection: "column",
            children: [
              e(BulletRow, { children: Et.text }),
              e(Box, {
                marginLeft: 2,
                children: r(Text, {
                  color: "success",
                  wrap: "wrap",
                  children: [re.arrowRight, " ", formatSurveyAnswer(Et, Cb(draft, Et.id))],
                }),
              }),
            ],
          },
          Et.id,
        )),
        ($[6] = draft),
        ($[7] = Ot));
    else Ot = $[7];
    rt = filtered.map(Ot);
    (($[1] = draft), ($[2] = questions), ($[3] = rt));
  } else rt = $[3];
  let kt;
  if ($[8] !== rt)
    ((kt = e(Box, { flexDirection: "column", marginTop: 1, marginLeft: 1, children: rt })),
      ($[8] = rt),
      ($[9] = kt));
  else kt = $[9];
  let It;
  if ($[10] !== missingRequired || $[11] !== questions)
    ((It =
      missingRequired.length > 0 &&
      e(Box, {
        marginTop: 1,
        children: r(StatusRow, {
          status: "warning",
          children: [
            "Answer ",
            missingRequired.length === 1 ? "question" : "questions",
            " ",
            Mnt.format(missingRequired.map((Dt) => String(questions.indexOf(Dt) + 1))),
            " ",
            "to submit.",
          ],
        }),
      })),
      ($[10] = missingRequired),
      ($[11] = questions),
      ($[12] = It));
  else It = $[12];
  let Ot;
  if ($[13] !== orgName)
    ((Ot = e(Box, {
      marginTop: 1,
      children: r(Text, {
        dimColor: !0,
        wrap: "wrap",
        children: [
          "This survey is from ",
          orgName,
          ". Answers won",
          "\u2019",
          "t be used to improve Anthropic",
          "\u2019",
          "s services.",
        ],
      }),
    })),
      ($[13] = orgName),
      ($[14] = Ot));
  else Ot = $[14];
  let Lt;
  if ($[15] !== submitFailed)
    ((Lt =
      submitFailed &&
      e(Box, {
        marginTop: 1,
        children: r(StatusRow, {
          status: "error",
          children: ["Couldn", "\u2019", "t submit your answers. Try again."],
        }),
      })),
      ($[15] = submitFailed),
      ($[16] = Lt));
  else Lt = $[16];
  let oo;
  if ($[17] !== We || $[18] !== onCancel || $[19] !== onSubmit || $[20] !== sending)
    ((oo = e(Box, {
      marginTop: 1,
      children: sending
        ? r(Text, { dimColor: !0, children: ["Sending your answers", "\u2026"] })
        : e(ConfirmSelect, {
            confirmLabel: "Submit answers",
            cancelLabel: "Cancel",
            onConfirm: () => {
              if (!We()) onSubmit();
            },
            onCancel: onCancel,
          }),
    })),
      ($[17] = We),
      ($[18] = onCancel),
      ($[19] = onSubmit),
      ($[20] = sending),
      ($[21] = oo));
  else oo = $[21];
  let Xt;
  if ($[22] !== kt || $[23] !== It || $[24] !== Ot || $[25] !== Lt || $[26] !== oo)
    ((Xt = r(Box, { flexDirection: "column", children: [Xe, kt, It, Ot, Lt, oo] })),
      ($[22] = kt),
      ($[23] = It),
      ($[24] = Ot),
      ($[25] = Lt),
      ($[26] = oo),
      ($[27] = Xt));
  else Xt = $[27];
  return Xt;
}
//@ chunk-18hwfzwa.js:1069363-1069418 placement
function Cb(h, x) {
  return Object.hasOwn(h, x) ? h[x] : void 0;
}
//@ chunk-18hwfzwa.js:1069418-1069508 placement
function oI(h) {
  if (h === void 0) return !1;
  return typeof h === "string" ? h.trim() !== "" : h.length > 0;
}
//@ chunk-18hwfzwa.js:1069508-1069699 placement
function formatSurveyAnswer(h, x) {
  if (h.kind === "text") return typeof x === "string" ? x.trim() : "";
  let D = typeof x === "string" ? [x] : (x ?? []);
  return h.options
    .filter((option) => D.includes(option.value))
    .map((L) => L.label)
    .join(", ");
}

export { Cb, oI, OrgSurveyDialog };
