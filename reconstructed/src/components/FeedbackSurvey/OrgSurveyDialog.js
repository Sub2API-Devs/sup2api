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
import {
  isWithinRecentInput,
  RECENT_INPUT_GUARD_MS as RECENT_INPUT_GUARD_MS_3,
} from "../../hooks/useRecentInputGuard.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";
import { collectQuestionAnswers } from "../../entrypoints/sdk/coreSchemas.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Divider } from "../design-system/Divider.js";
import { Box, Text } from "../../ink/components/Text.js";
import { TagTabs } from "../TagTabs.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useInputRefusalWindow, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";
import { SelectMultiAccessible } from "../CustomSelect/SelectMulti.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { collapseToSingleLine, clampTextEdit } from "./SurveyFollowup.js";
import { DEFAULT_HEADLINE_DELAY_MS } from "../../services/orgSurvey/orgSurvey.js";
import { TextInput } from "../TextInput.js";
import { BulletRow } from "../design-system/BulletRow.js";
import { StatusRow } from "../Settings/Status.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";

//@ chunk-18hwfzwa.js:1057801-1057834 placement
function getSurveyOpenedAtMs() {
  return Date.now();
}
//@ chunk-18hwfzwa.js:1057834-1057868 placement
function isNotNull(Go) {
  return Go !== null;
}
//@ chunk-18hwfzwa.js:1057868-1057923 placement
function toSingleSelectOption(hn) {
  return {
    label: hn.label,
    value: hn.value,
  };
}
//@ chunk-18hwfzwa.js:1057923-1057978 placement
function toMultiSelectOption(Mn) {
  return {
    label: Mn.label,
    value: Mn.value,
  };
}
//@ chunk-18hwfzwa.js:1057978-1057994 placement
function noopCancel() {}
//@ chunk-18hwfzwa.js:1057994-1058023 placement
function incrementByOne(Io) {
  return Io + 1;
}
//@ chunk-18hwfzwa.js:1058023-1058051 placement
var RECENT_INPUT_GUARD_MS = 400;
var SURVEY_INPUT_GUARD_MS = 700;
var CARET_GUARD_MS = 100;
//@ chunk-18hwfzwa.js:1058051-1058380 placement
/**
 * 组织问卷的误触保护：记录打开/最近按键时间，返回判断"是否仍在近期输入窗口内"的函数。
 */
function useRecentInputGuard(h) {
  let $ = w(4);
  let inputClock = useInputClock();
  let L;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    L = Date.now();
    $[0] = L;
  } else L = $[0];
  let ee = R(L);
  let ke = R(Number.NEGATIVE_INFINITY);
  let Re;
  if ($[1] !== inputClock || $[2] !== h) {
    Re = () => {
      let Be = inputClock();
      if (Be - ke.current < CARET_GUARD_MS) ee.current = Math.max(Be, ee.current);
      ke.current = Math.max(Be, ke.current);
      return isWithinRecentInput(inputClock, ee.current, h);
    };
    $[1] = inputClock;
    $[2] = h;
    $[3] = Re;
  } else Re = $[3];
  return Re;
}
//@ chunk-18hwfzwa.js:1058380-1058448 placement
var LIST_FORMATTER = new Intl.ListFormat("en", {
  style: "long",
  type: "conjunction",
});
//@ chunk-18hwfzwa.js:1058448-1061293 placement
/**
 * OrgSurveyDialog：组织调查问卷对话框。
 */
function OrgSurveyDialog(props) {
  let $ = w(54);
  let { survey, initialDraft, onDraftChange, onSubmit, onClose } = props;
  let inputClock = useInputClock();
  let [Be] = y(getSurveyOpenedAtMs);
  let [He, We] = y(initialDraft);
  let [ze, Xe] = y(0);
  let [rt, kt] = y(false);
  let At = R(false);
  let [It, Ot] = y(false);
  let questions = survey.questions;
  let Dt = questions.length;
  let Lt = ze < Dt ? questions[ze] : undefined;
  let Xt;
  if ($[0] !== inputClock || $[1] !== Be) {
    Xt = () => isWithinRecentInput(inputClock, Be, RECENT_INPUT_GUARD_MS);
    $[0] = inputClock;
    $[1] = Be;
    $[2] = Xt;
  } else Xt = $[2];
  let io = Xt;
  let so;
  if ($[3] !== He || $[4] !== onDraftChange) {
    so = function bo(po, ao) {
      let co = {
        ...He,
        [po]: ao,
      };
      We(co);
      onDraftChange(co);
    };
    $[3] = He;
    $[4] = onDraftChange;
    $[5] = so;
  } else so = $[5];
  let bo = so;
  let Ao;
  if ($[6] !== Dt) {
    Ao = function Ho(Bo) {
      Xe((Ro) => Math.min(Math.max(Ro + Bo, 0), Dt));
    };
    $[6] = Dt;
    $[7] = Ao;
  } else Ao = $[7];
  let Ho = Ao;
  let Io;
  if ($[8] !== Ho) {
    Io = {
      "tabs:previous": () => Ho(-1),
      "tabs:next": () => Ho(1),
    };
    $[8] = Ho;
    $[9] = Io;
  } else Io = $[9];
  const isActive = !rt && Lt?.kind !== "text";
  let mn;
  if ($[10] !== isActive) {
    mn = {
      context: "Tabs",
      isActive,
    };
    $[10] = isActive;
    $[11] = mn;
  } else mn = $[11];
  MessageActionsKeybindings(Io, mn);
  let Cn;
  if ($[12] !== Ho) {
    Cn = (No, vo) => {
      if (!vo.tab) {
        return;
      }
      Ho(vo.shift ? -1 : 1);
      return true;
    };
    $[12] = Ho;
    $[13] = Cn;
  } else Cn = $[13];
  const isActive_2 = !rt && Lt?.kind === "text";
  let kn;
  if ($[14] !== isActive_2) {
    kn = {
      isActive: isActive_2,
    };
    $[14] = isActive_2;
    $[15] = kn;
  } else kn = $[15];
  usePreDispatchKeyHandler(Cn, kn);
  let Fn;
  if ($[16] !== io || $[17] !== onClose) {
    Fn = (input, key) => {
      if (!key.escape || io()) {
        return;
      }
      onClose();
      return true;
    };
    $[16] = io;
    $[17] = onClose;
    $[18] = Fn;
  } else Fn = $[18];
  const isActive_3 = !rt;
  let Mn;
  if ($[19] !== isActive_3) {
    Mn = {
      isActive: isActive_3,
    };
    $[19] = isActive_3;
    $[20] = Mn;
  } else Mn = $[20];
  usePreDispatchKeyHandler(Fn, Mn);
  let Xo;
  if ($[21] !== He || $[22] !== questions) {
    let Sn;
    if ($[24] !== He) {
      Sn = ($n) => $n.required && !hasAnswer(ownValue(He, $n.id));
      $[24] = He;
      $[25] = Sn;
    } else Sn = $[25];
    Xo = questions.filter(Sn);
    $[21] = He;
    $[22] = questions;
    $[23] = Xo;
  } else Xo = $[23];
  let on = Xo;
  let Sn;
  if ($[26] !== He || $[27] !== on || $[28] !== onSubmit || $[29] !== questions) {
    Sn = async function _o() {
      if (At.current) {
        return;
      }
      if (on.length > 0) {
        Xe(questions.indexOf(on[0]));
        return;
      }
      At.current = true;
      kt(true);
      Ot(false);
      if ((await onSubmit(collectQuestionAnswers(questions, He))) === "failed") {
        At.current = false;
        kt(false);
        Ot(true);
      }
    };
    $[26] = He;
    $[27] = on;
    $[28] = onSubmit;
    $[29] = questions;
    $[30] = Sn;
  } else Sn = $[30];
  let _o = Sn;
  let cn;
  if ($[31] === MEMO_CACHE_SENTINEL) {
    cn = jsxProd_default(Divider, {
      color: "inactive",
    });
    $[31] = cn;
  } else cn = $[31];
  let Dn;
  if ($[32] !== He || $[33] !== ze || $[34] !== questions) {
    Dn = jsxProd_default(OrgSurveyTabs, {
      questions,
      draft: He,
      currentIndex: ze,
    });
    $[32] = He;
    $[33] = ze;
    $[34] = questions;
    $[35] = Dn;
  } else Dn = $[35];
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
  ) {
    wn = Lt
      ? jsxProd_default(
          OrgSurveyQuestion,
          {
            question: Lt,
            orgName: survey.orgName,
            isLast: ze === Dt - 1,
            value: ownValue(He, Lt.id),
            inOpenGrace: io,
            onChange: (mr) => bo(Lt.id, mr),
            onNext: () => Ho(1),
          },
          Lt.id,
        )
      : jsxProd_default(OrgSurveyReview, {
          questions,
          draft: He,
          orgName: survey.orgName,
          missingRequired: on,
          sending: rt,
          submitFailed: It,
          onSubmit: () => void _o(),
          onCancel: onClose,
        });
    $[36] = He;
    $[37] = io;
    $[38] = ze;
    $[39] = on;
    $[40] = Ho;
    $[41] = onClose;
    $[42] = Lt;
    $[43] = questions;
    $[44] = Dt;
    $[45] = rt;
    $[46] = _o;
    $[47] = It;
    $[48] = survey.orgName;
    $[49] = bo;
    $[50] = wn;
  } else wn = $[50];
  let Kn;
  if ($[51] !== Dn || $[52] !== wn) {
    Kn = jsxProd_default_2(Box, {
      flexDirection: "column",
      tabIndex: 0,
      autoFocus: true,
      children: [cn, Dn, wn],
    });
    $[51] = Dn;
    $[52] = wn;
    $[53] = Kn;
  } else Kn = $[53];
  return Kn;
}
//@ chunk-18hwfzwa.js:1061293-1062376 placement
function OrgSurveyTabs(props) {
  let $ = w(19);
  let { questions, draft, currentIndex } = props;
  let ee = questions.length;
  const color = currentIndex === 0 ? "inactive" : undefined;
  let Be;
  if ($[0] !== color) {
    Be = jsxProd_default(Text, {
      color,
      children: "\u2190 ",
    });
    $[0] = color;
    $[1] = Be;
  } else Be = $[1];
  let He;
  if ($[2] !== currentIndex || $[3] !== draft || $[4] !== questions) {
    let We;
    if ($[6] !== currentIndex || $[7] !== draft) {
      We = (ze, Xe) =>
        jsxProd_default(
          Box,
          {
            children: jsxProd_default_2(TagTabs, {
              color: Xe === currentIndex ? "permission" : undefined,
              padded: true,
              children: [
                hasAnswer(ownValue(draft, ze.id)) ? figures_default.checkboxOn : figures_default.checkboxOff,
                " ",
                Xe + 1,
              ],
            }),
          },
          ze.id,
        );
      $[6] = currentIndex;
      $[7] = draft;
      $[8] = We;
    } else We = $[8];
    He = questions.map(We);
    $[2] = currentIndex;
    $[3] = draft;
    $[4] = questions;
    $[5] = He;
  } else He = $[5];
  const color_2 = currentIndex === ee ? "permission" : undefined;
  let rt;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    rt = jsxProd_default(StatusIcon, {
      status: "success",
    });
    $[9] = rt;
  } else rt = $[9];
  let kt;
  if ($[10] !== color_2) {
    kt = jsxProd_default_2(TagTabs, {
      color: color_2,
      padded: true,
      children: [rt, " Submit"],
    });
    $[10] = color_2;
    $[11] = kt;
  } else kt = $[11];
  const color_3 = currentIndex === ee ? "inactive" : undefined;
  let It;
  if ($[12] !== color_3) {
    It = jsxProd_default_2(Text, {
      color: color_3,
      children: [" ", "\u2192"],
    });
    $[12] = color_3;
    $[13] = It;
  } else It = $[13];
  let Ot;
  if ($[14] !== Be || $[15] !== He || $[16] !== kt || $[17] !== It) {
    Ot = jsxProd_default_2(Box, {
      flexDirection: "row",
      marginBottom: 1,
      children: [Be, He, kt, It],
    });
    $[14] = Be;
    $[15] = He;
    $[16] = kt;
    $[17] = It;
    $[18] = Ot;
  } else Ot = $[18];
  return Ot;
}
//@ chunk-18hwfzwa.js:1062376-1065714 placement
/**
 * 组织调查中的单个问题。
 */
function OrgSurveyQuestion(props) {
  let $ = w(62);
  let { question, orgName, isLast, value: ee, inOpenGrace, onChange, onNext } = props;
  let recentInputGuard = useRecentInputGuard(RECENT_INPUT_GUARD_MS_3);
  let ze;
  if ($[0] !== inOpenGrace || $[1] !== recentInputGuard) {
    ze = () => {
      let Xe = inOpenGrace();
      let rt = recentInputGuard();
      return Xe || rt;
    };
    $[0] = inOpenGrace;
    $[1] = recentInputGuard;
    $[2] = ze;
  } else ze = $[2];
  let kt = ze;
  let It = useIsScreenReaderEnabled() ? true : false;
  let inputRefusalWindow = useInputRefusalWindow(RECENT_INPUT_GUARD_MS_3);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let Lt;
  if ($[3] !== inOpenGrace || $[4] !== inputRefusalWindow || $[5] !== noteRefused || $[6] !== refusedWithin) {
    Lt = () => {
      if (inOpenGrace() || inputRefusalWindow() || refusedWithin(RECENT_INPUT_GUARD_MS_3)) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[3] = inOpenGrace;
    $[4] = inputRefusalWindow;
    $[5] = noteRefused;
    $[6] = refusedWithin;
    $[7] = Lt;
  } else Lt = $[7];
  let refuseInput = Lt;
  const Xt = question.kind === "multi_select" ? "(Select all that apply)" : null;
  const io = question.required ? null : "(optional)";
  let so;
  if ($[8] !== Xt || $[9] !== io) {
    so = [Xt, io].filter(isNotNull);
    $[8] = Xt;
    $[9] = io;
    $[10] = so;
  } else so = $[10];
  let joined = so.join(" ");
  let ao;
  if ($[11] !== orgName) {
    ao = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Survey from ", orgName],
    });
    $[11] = orgName;
    $[12] = ao;
  } else ao = $[12];
  let co;
  if ($[13] !== joined) {
    co = joined
      ? jsxProd_default(Text, {
          bold: false,
          dimColor: true,
          children: ` ${joined}`,
        })
      : null;
    $[13] = joined;
    $[14] = co;
  } else co = $[14];
  let bo;
  if ($[15] !== question.text || $[16] !== co) {
    bo = jsxProd_default_2(Text, {
      bold: true,
      wrap: "wrap",
      children: [question.text, co],
    });
    $[15] = question.text;
    $[16] = co;
    $[17] = bo;
  } else bo = $[17];
  let Ao;
  if ($[18] !== question.helperText) {
    Ao =
      question.helperText !== null &&
      jsxProd_default(Text, {
        dimColor: true,
        wrap: "wrap",
        children: question.helperText,
      });
    $[18] = question.helperText;
    $[19] = Ao;
  } else Ao = $[19];
  let Bo;
  if (
    $[20] !== kt ||
    $[21] !== onChange ||
    $[22] !== onNext ||
    $[23] !== question.kind ||
    $[24] !== question.options ||
    $[25] !== refuseInput ||
    $[26] !== ee
  ) {
    Bo =
      question.kind === "single_select" &&
      jsxProd_default(ModelSelector, {
        options: question.options.map(toSingleSelectOption),
        selectedValue: typeof ee === "string" ? ee : NO_COMMITTED_ROW,
        visibleOptionCount: 8,
        layout: "compact-vertical",
        refuseInput,
        onChange: (Ro) => {
          if (kt()) {
            return false;
          }
          onChange(Ro);
          onNext();
        },
      });
    $[20] = kt;
    $[21] = onChange;
    $[22] = onNext;
    $[23] = question.kind;
    $[24] = question.options;
    $[25] = refuseInput;
    $[26] = ee;
    $[27] = Bo;
  } else Bo = $[27];
  let Ho;
  if (
    $[28] !== It ||
    $[29] !== kt ||
    $[30] !== isLast ||
    $[31] !== onChange ||
    $[32] !== onNext ||
    $[33] !== question.kind ||
    $[34] !== question.options ||
    $[35] !== refuseInput ||
    $[36] !== ee
  ) {
    Ho =
      question.kind === "multi_select" &&
      jsxProd_default(SelectMultiAccessible, {
        options: question.options.map(toMultiSelectOption),
        defaultValue: Array.isArray(ee) ? [...ee] : [],
        visibleOptionCount: 8,
        submitButtonText: isLast ? "Review" : "Next",
        refuseInput,
        onChange: (Io) => {
          if (kt()) {
            return false;
          }
          onChange(Io);
        },
        onSubmit: () => {
          if (It || !kt()) onNext();
        },
        onCancel: noopCancel,
      });
    $[28] = It;
    $[29] = kt;
    $[30] = isLast;
    $[31] = onChange;
    $[32] = onNext;
    $[33] = question.kind;
    $[34] = question.options;
    $[35] = refuseInput;
    $[36] = ee;
    $[37] = Ho;
  } else Ho = $[37];
  let Wo;
  if ($[38] !== kt || $[39] !== onChange || $[40] !== onNext || $[41] !== question.kind || $[42] !== ee) {
    Wo =
      question.kind === "text" &&
      jsxProd_default(OrgSurveyTextInput, {
        value: typeof ee === "string" ? ee : "",
        inGrace: kt,
        onChange,
        onSubmit: onNext,
      });
    $[38] = kt;
    $[39] = onChange;
    $[40] = onNext;
    $[41] = question.kind;
    $[42] = ee;
    $[43] = Wo;
  } else Wo = $[43];
  let mn;
  if ($[44] !== Bo || $[45] !== Ho || $[46] !== Wo) {
    mn = jsxProd_default_2(Box, {
      marginTop: 1,
      flexDirection: "column",
      children: [Bo, Ho, Wo],
    });
    $[44] = Bo;
    $[45] = Ho;
    $[46] = Wo;
    $[47] = mn;
  } else mn = $[47];
  const action = question.kind === "text" ? "continue" : "select";
  let No;
  if ($[48] !== action) {
    No = jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action,
    });
    $[48] = action;
    $[49] = No;
  } else No = $[49];
  const vo = question.kind === "text" ? "Tab" : "Tab/Arrow keys";
  let Yo;
  if ($[50] !== vo) {
    Yo = jsxProd_default_2(Text, {
      children: [vo, " to navigate"],
    });
    $[50] = vo;
    $[51] = Yo;
  } else Yo = $[51];
  let kn;
  if ($[52] === MEMO_CACHE_SENTINEL) {
    kn = jsxProd_default(KeyboardShortcutHint, {
      chord: "escape",
      action: "close",
    });
    $[52] = kn;
  } else kn = $[52];
  let Fn;
  if ($[53] !== No || $[54] !== Yo) {
    Fn = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: jsxProd_default_2(Byline, {
          children: [No, Yo, kn],
        }),
      }),
    });
    $[53] = No;
    $[54] = Yo;
    $[55] = Fn;
  } else Fn = $[55];
  let bn;
  if ($[56] !== mn || $[57] !== Fn || $[58] !== ao || $[59] !== bo || $[60] !== Ao) {
    bn = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [ao, bo, Ao, mn, Fn],
    });
    $[56] = mn;
    $[57] = Fn;
    $[58] = ao;
    $[59] = bo;
    $[60] = Ao;
    $[61] = bn;
  } else bn = $[61];
  return bn;
}
//@ chunk-18hwfzwa.js:1065714-1067346 placement
function OrgSurveyTextInput(props) {
  let $ = w(26);
  let { value: x, inGrace, onChange, onSubmit } = props;
  let { columns } = useTerminalSize();
  let [Re, Be] = y(x.length);
  let He = R(Re);
  let We = R(null);
  let [, ze] = y(0);
  let rt;
  if ($[0] !== onChange || $[1] !== x) {
    rt = function Ot(kt) {
      let At = collapseToSingleLine(kt);
      let It = clampTextEdit(x, At, DEFAULT_HEADLINE_DELAY_MS);
      We.current = It.caret === "pass" ? null : It.caret === "keep" ? He.current : It.caret;
      if (It.caret !== "pass" || At !== kt) ze(incrementByOne);
      onChange(It.text);
    };
    $[0] = onChange;
    $[1] = x;
    $[2] = rt;
  } else rt = $[2];
  let onChange_2 = rt;
  let Et;
  if ($[3] !== x) {
    Et = Array.from(x);
    $[3] = x;
    $[4] = Et;
  } else Et = $[4];
  let Dt = Et.length;
  let Lt;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    Lt = jsxProd_default_2(Text, {
      color: "suggestion",
      children: [figures_default.pointer, " "],
    });
    $[5] = Lt;
  } else Lt = $[5];
  let onSubmit_2;
  if ($[6] !== inGrace || $[7] !== onSubmit) {
    onSubmit_2 = () => {
      if (!inGrace()) onSubmit();
    };
    $[6] = inGrace;
    $[7] = onSubmit;
    $[8] = onSubmit_2;
  } else onSubmit_2 = $[8];
  const columns_2 = Math.min(Math.max(columns - 4, 20), 120);
  let onChangeCursorOffset;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    onChangeCursorOffset = (so) => {
      let po = We.current ?? so;
      We.current = null;
      He.current = po;
      Be(po);
    };
    $[9] = onChangeCursorOffset;
  } else onChangeCursorOffset = $[9];
  let ao;
  if ($[10] !== Re || $[11] !== onChange_2 || $[12] !== onSubmit_2 || $[13] !== columns_2 || $[14] !== x) {
    ao = jsxProd_default_2(Box, {
      children: [
        Lt,
        jsxProd_default(TextInput, {
          value: x,
          onChange: onChange_2,
          onSubmit: onSubmit_2,
          columns: columns_2,
          cursorOffset: Re,
          onChangeCursorOffset,
          focus: true,
          showCursor: true,
          multiline: false,
          inputFilter: collapseToSingleLine,
        }),
      ],
    });
    $[10] = Re;
    $[11] = onChange_2;
    $[12] = onSubmit_2;
    $[13] = columns_2;
    $[14] = x;
    $[15] = ao;
  } else ao = $[15];
  const dimColor = Dt < DEFAULT_HEADLINE_DELAY_MS;
  const color = Dt >= DEFAULT_HEADLINE_DELAY_MS ? "warning" : undefined;
  let Ao;
  if ($[16] !== Dt) {
    Ao = Dt.toLocaleString("en-US");
    $[16] = Dt;
    $[17] = Ao;
  } else Ao = $[17];
  let Bo;
  if ($[18] === MEMO_CACHE_SENTINEL) {
    Bo = DEFAULT_HEADLINE_DELAY_MS.toLocaleString("en-US");
    $[18] = Bo;
  } else Bo = $[18];
  let Ro;
  if ($[19] !== Ao || $[20] !== dimColor || $[21] !== color) {
    Ro = jsxProd_default_2(Text, {
      dimColor,
      color,
      children: [Ao, "/", Bo],
    });
    $[19] = Ao;
    $[20] = dimColor;
    $[21] = color;
    $[22] = Ro;
  } else Ro = $[22];
  let Ho;
  if ($[23] !== Ro || $[24] !== ao) {
    Ho = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [ao, Ro],
    });
    $[23] = Ro;
    $[24] = ao;
    $[25] = Ho;
  } else Ho = $[25];
  return Ho;
}
//@ chunk-18hwfzwa.js:1067346-1069363 placement
function OrgSurveyReview(props) {
  let $ = w(28);
  let { questions, draft, orgName, missingRequired, sending, submitFailed, onSubmit, onCancel } = props;
  let recentInputGuard = useRecentInputGuard(SURVEY_INPUT_GUARD_MS);
  let Xe;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    Xe = jsxProd_default(Text, {
      bold: true,
      children: "Review your answers",
    });
    $[0] = Xe;
  } else Xe = $[0];
  let children;
  if ($[1] !== draft || $[2] !== questions) {
    let kt;
    if ($[4] !== draft) {
      kt = (At) => hasAnswer(ownValue(draft, At.id));
      $[4] = draft;
      $[5] = kt;
    } else kt = $[5];
    const filtered = questions.filter(kt);
    let Ot;
    if ($[6] !== draft) {
      Ot = (Et) =>
        jsxProd_default_2(
          Box,
          {
            flexDirection: "column",
            children: [
              jsxProd_default(BulletRow, {
                children: Et.text,
              }),
              jsxProd_default(Box, {
                marginLeft: 2,
                children: jsxProd_default_2(Text, {
                  color: "success",
                  wrap: "wrap",
                  children: [figures_default.arrowRight, " ", formatSurveyAnswer(Et, ownValue(draft, Et.id))],
                }),
              }),
            ],
          },
          Et.id,
        );
      $[6] = draft;
      $[7] = Ot;
    } else Ot = $[7];
    children = filtered.map(Ot);
    $[1] = draft;
    $[2] = questions;
    $[3] = children;
  } else children = $[3];
  let kt;
  if ($[8] !== children) {
    kt = jsxProd_default(Box, {
      flexDirection: "column",
      marginTop: 1,
      marginLeft: 1,
      children,
    });
    $[8] = children;
    $[9] = kt;
  } else kt = $[9];
  let It;
  if ($[10] !== missingRequired || $[11] !== questions) {
    It =
      missingRequired.length > 0 &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(StatusRow, {
          status: "warning",
          children: [
            "Answer ",
            missingRequired.length === 1 ? "question" : "questions",
            " ",
            LIST_FORMATTER.format(missingRequired.map((Dt) => String(questions.indexOf(Dt) + 1))),
            " ",
            "to submit.",
          ],
        }),
      });
    $[10] = missingRequired;
    $[11] = questions;
    $[12] = It;
  } else It = $[12];
  let Ot;
  if ($[13] !== orgName) {
    Ot = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default_2(Text, {
        dimColor: true,
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
    });
    $[13] = orgName;
    $[14] = Ot;
  } else Ot = $[14];
  let Lt;
  if ($[15] !== submitFailed) {
    Lt =
      submitFailed &&
      jsxProd_default(Box, {
        marginTop: 1,
        children: jsxProd_default_2(StatusRow, {
          status: "error",
          children: ["Couldn", "\u2019", "t submit your answers. Try again."],
        }),
      });
    $[15] = submitFailed;
    $[16] = Lt;
  } else Lt = $[16];
  let oo;
  if ($[17] !== recentInputGuard || $[18] !== onCancel || $[19] !== onSubmit || $[20] !== sending) {
    oo = jsxProd_default(Box, {
      marginTop: 1,
      children: sending
        ? jsxProd_default_2(Text, {
            dimColor: true,
            children: ["Sending your answers", "\u2026"],
          })
        : jsxProd_default(ConfirmSelect, {
            confirmLabel: "Submit answers",
            cancelLabel: "Cancel",
            onConfirm: () => {
              if (!recentInputGuard()) onSubmit();
            },
            onCancel,
          }),
    });
    $[17] = recentInputGuard;
    $[18] = onCancel;
    $[19] = onSubmit;
    $[20] = sending;
    $[21] = oo;
  } else oo = $[21];
  let Xt;
  if ($[22] !== kt || $[23] !== It || $[24] !== Ot || $[25] !== Lt || $[26] !== oo) {
    Xt = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [Xe, kt, It, Ot, Lt, oo],
    });
    $[22] = kt;
    $[23] = It;
    $[24] = Ot;
    $[25] = Lt;
    $[26] = oo;
    $[27] = Xt;
  } else Xt = $[27];
  return Xt;
}
//@ chunk-18hwfzwa.js:1069363-1069418 placement
function ownValue(draft, id) {
  return Object.hasOwn(draft, id) ? draft[id] : undefined;
}
//@ chunk-18hwfzwa.js:1069418-1069508 placement
function hasAnswer(h) {
  if (h === undefined) return false;
  return typeof h === "string" ? h.trim() !== "" : h.length > 0;
}
//@ chunk-18hwfzwa.js:1069508-1069699 placement
function formatSurveyAnswer(h, x) {
  if (h.kind === "text") return typeof x === "string" ? x.trim() : "";
  let D = typeof x === "string" ? [x] : (x ?? []);
  return h.options
    .filter((option) => D.includes(option.value))
    .map((option) => option.label)
    .join(", ");
}
export { ownValue, hasAnswer, OrgSurveyDialog };
