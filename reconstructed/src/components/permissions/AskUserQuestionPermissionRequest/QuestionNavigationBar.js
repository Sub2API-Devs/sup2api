/**
 * components/permissions/AskUserQuestionPermissionRequest/QuestionNavigationBar.tsx
 *
 * 问题导航条：各问题标签（已答标记）与 Submit 标签。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/AskUserQuestionPermissionRequest/QuestionNavigationBar.tsx
 * pieces: chunk-18hwfzwa.js (5), chunk-bwbq4xvm.js (1)
 * attribution: placement 3, layout 1, fingerprint 2
 */
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../../hooks/useTerminalSize.js";
import { useIsScreenReaderEnabled } from "../../../ink/components/ErrorBoundary.js";
import { re } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { truncateToWidth } from "../../../utils/format.js";
import { jsonStringify } from "../../../utils/slowOperations.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { TagTabs } from "../../TagTabs.js";

//@ chunk-18hwfzwa.js:1275630-1275697 placement
function fp(h, x) {
  return x !== void 0 && Object.hasOwn(h, x) ? h[x] : void 0;
}
//@ chunk-18hwfzwa.js:1275697-1275754 placement
function $Mo(_o, cn) {
  return _o?.displayHeader || `Q${cn + 1}`;
}
//@ chunk-18hwfzwa.js:1275754-1275787 placement
function VMo(Dn) {
  return 4 + bunStringWidth(Dn);
}
//@ chunk-18hwfzwa.js:1275787-1275820 layout
function KMo(wn, mr) {
  return wn + mr;
}
//@ chunk-18hwfzwa.js:1275820-1278846 fingerprint = QuestionNavigationBar (0.703)
function QuestionNavigationBar(t0) {
  let $ = w(55),
    {
      questions: questions,
      currentQuestionIndex: currentQuestionIndex,
      answers: answers,
      hideSubmitTab: t1,
    } = t0,
    ke = t1 === void 0 ? !1 : t1,
    { columns: columns } = useTerminalSize(),
    Be = useIsScreenReaderEnabled(),
    He;
  if ($[0] !== columns || $[1] !== currentQuestionIndex || $[2] !== ke || $[3] !== questions) {
    Dt: {
      let ze = ke ? "" : ` ${re.tick} Submit `;
      let Xe = bunStringWidth("\u2190 ") + bunStringWidth(" \u2192") + bunStringWidth(ze);
      let rt = columns - Xe;
      if (rt <= 0) {
        let kt;
        if ($[5] !== currentQuestionIndex || $[6] !== questions) {
          let At;
          if ($[8] !== currentQuestionIndex)
            ((At = (It, index) => {
              let Et = It?.displayHeader || `Q${index + 1}`;
              return index === currentQuestionIndex ? truncateToWidth(Et, 3) : "";
            }),
              ($[8] = currentQuestionIndex),
              ($[9] = At));
          else At = $[9];
          kt = questions.map(At);
          (($[5] = currentQuestionIndex), ($[6] = questions), ($[7] = kt));
        } else kt = $[7];
        He = kt;
        break Dt;
      }
      let tabHeaders = questions.map($Mo);
      if (tabHeaders.map(VMo).reduce(KMo, 0) <= rt) {
        He = tabHeaders;
        break Dt;
      }
      let oo = tabHeaders[currentQuestionIndex] || "";
      let Xt = 4 + bunStringWidth(oo);
      let currentTabWidth = Math.min(Xt, rt / 2);
      let so = rt - currentTabWidth;
      let po = questions.length - 1;
      let widthPerOtherTab = Math.max(6, Math.floor(so / Math.max(po, 1)));
      let kt;
      if ($[10] !== currentQuestionIndex || $[11] !== currentTabWidth || $[12] !== widthPerOtherTab)
        ((kt = (header_1, index_1) => {
          if (index_1 === currentQuestionIndex) {
            let Ao = currentTabWidth - 2 - 2;
            return truncateToWidth(header_1, Ao);
          } else {
            let Bo = widthPerOtherTab - 2 - 2;
            return truncateToWidth(header_1, Bo);
          }
        }),
          ($[10] = currentQuestionIndex),
          ($[11] = currentTabWidth),
          ($[12] = widthPerOtherTab),
          ($[13] = kt));
      else kt = $[13];
      He = tabHeaders.map(kt);
    }
    (($[0] = columns), ($[1] = currentQuestionIndex), ($[2] = ke), ($[3] = questions), ($[4] = He));
  } else He = $[4];
  let tabDisplayTexts = He;
  if (Be) {
    let Ho, Io, kt, At, Wo;
    if ($[14] !== answers || $[15] !== questions) {
      let mn;
      if ($[21] !== answers)
        ((mn = (Cn, No) => {
          let vo = Cn?.displayHeader || `Q${No + 1}`;
          let Yo = vo.includes(",") || /answered/i.test(vo) ? jsonStringify(vo) : vo;
          return fp(answers, Cn?.key) ? `${Yo} (answered)` : Yo;
        }),
          ($[21] = answers),
          ($[22] = mn));
      else mn = $[22];
      let mapped = questions.map(mn);
      let Fn = questions.length === 1 ? "Question" : "Questions";
      Io = Box;
      Wo = 1;
      Ho = Text;
      kt = Fn;
      At = mapped.join(", ");
      (($[14] = answers),
        ($[15] = questions),
        ($[16] = Ho),
        ($[17] = Io),
        ($[18] = kt),
        ($[19] = At),
        ($[20] = Wo));
    } else ((Ho = $[16]), (Io = $[17]), (kt = $[18]), (At = $[19]), (Wo = $[20]));
    const mn = `${kt}: ${At}`;
    let bn;
    if ($[23] !== Ho || $[24] !== mn)
      ((bn = e(Ho, { children: mn })), ($[23] = Ho), ($[24] = mn), ($[25] = bn));
    else bn = $[25];
    let Go;
    if ($[26] !== Io || $[27] !== Wo || $[28] !== bn)
      ((Go = e(Io, { marginBottom: Wo, children: bn })),
        ($[26] = Io),
        ($[27] = Wo),
        ($[28] = bn),
        ($[29] = Go));
    else Go = $[29];
    return Go;
  }
  let hn = questions.length === 1 && ke,
    kt;
  if ($[30] !== currentQuestionIndex || $[31] !== hn)
    ((kt =
      !hn && r(Text, { color: currentQuestionIndex === 0 ? "inactive" : void 0, children: ["\u2190", " "] })),
      ($[30] = currentQuestionIndex),
      ($[31] = hn),
      ($[32] = kt));
  else kt = $[32];
  let At;
  if (
    $[33] !== answers ||
    $[34] !== currentQuestionIndex ||
    $[35] !== questions ||
    $[36] !== tabDisplayTexts
  ) {
    let Wo;
    if ($[38] !== answers || $[39] !== currentQuestionIndex || $[40] !== tabDisplayTexts)
      ((Wo = (q_1, index_2) => {
        let Sn = index_2 === currentQuestionIndex;
        let $n = fp(answers, q_1?.key) ? re.checkboxOn : re.checkboxOff;
        let on = tabDisplayTexts[index_2] || q_1?.displayHeader || `Q${index_2 + 1}`;
        return e(
          Box,
          {
            children: r(TagTabs, { color: Sn ? "permission" : void 0, padded: !0, children: [$n, " ", on] }),
          },
          q_1?.key || `question-${index_2}`,
        );
      }),
        ($[38] = answers),
        ($[39] = currentQuestionIndex),
        ($[40] = tabDisplayTexts),
        ($[41] = Wo));
    else Wo = $[41];
    At = questions.map(Wo);
    (($[33] = answers),
      ($[34] = currentQuestionIndex),
      ($[35] = questions),
      ($[36] = tabDisplayTexts),
      ($[37] = At));
  } else At = $[37];
  let Wo;
  if ($[42] !== currentQuestionIndex || $[43] !== ke || $[44] !== questions.length)
    ((Wo =
      !ke &&
      e(
        Box,
        {
          children: r(TagTabs, {
            color: currentQuestionIndex === questions.length ? "permission" : void 0,
            padded: !0,
            children: [re.tick, " Submit"],
          }),
        },
        "submit",
      )),
      ($[42] = currentQuestionIndex),
      ($[43] = ke),
      ($[44] = questions.length),
      ($[45] = Wo));
  else Wo = $[45];
  let mn;
  if ($[46] !== currentQuestionIndex || $[47] !== hn || $[48] !== questions.length)
    ((mn =
      !hn &&
      r(Text, {
        color: currentQuestionIndex === questions.length ? "inactive" : void 0,
        children: [" ", "\u2192"],
      })),
      ($[46] = currentQuestionIndex),
      ($[47] = hn),
      ($[48] = questions.length),
      ($[49] = mn));
  else mn = $[49];
  let bn;
  if ($[50] !== kt || $[51] !== At || $[52] !== Wo || $[53] !== mn)
    ((bn = r(Box, { flexDirection: "row", marginBottom: 1, children: [kt, At, Wo, mn] })),
      ($[50] = kt),
      ($[51] = At),
      ($[52] = Wo),
      ($[53] = mn),
      ($[54] = bn));
  else bn = $[54];
  return bn;
}
//@ chunk-bwbq4xvm.js:152526-152582 fingerprint = _temp (0.699)
function k(q_0, index_0) {
  return Object.freeze({ name: q_0, header: index_0 });
}

export { QuestionNavigationBar, fp, k };
