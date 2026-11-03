/**
 * components/permissions/AskUserQuestionPermissionRequest/SubmitQuestionsView.tsx
 *
 * 提交页："Review your answers"，未答完时警告。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/AskUserQuestionPermissionRequest/SubmitQuestionsView.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import { e, r } from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Divider } from "../../design-system/Divider.js";
import { QuestionNavigationBar, fp } from "./QuestionNavigationBar.js";
import { PermissionRequestTitle } from "../PermissionRequestTitle.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { StatusRow } from "../../Settings/Status.js";
import { Blockquote } from "../../Blockquote.js";
import { BulletRow } from "../../design-system/BulletRow.js";
import { re } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { PermissionRuleExplanation } from "../PermissionRuleExplanation.js";
import { ConfirmSelect } from "../../design-system/ConfirmSelect.js";

//@ chunk-18hwfzwa.js:1293852-1295825 fingerprint = SubmitQuestionsView (0.78)
function SubmitQuestionsView(t0) {
  let $ = w(24),
    {
      questions: questions,
      currentQuestionIndex: currentQuestionIndex,
      answers: answers,
      allQuestionsAnswered: allQuestionsAnswered,
      permissionResult: permissionResult,
      onFinalResponse: onFinalResponse,
    } = t0,
    He;
  if ($[0] === MEMO_CACHE_SENTINEL) ((He = e(Divider, { color: "inactive" })), ($[0] = He));
  else He = $[0];
  let We;
  if ($[1] !== answers || $[2] !== currentQuestionIndex || $[3] !== questions)
    ((We = e(QuestionNavigationBar, {
      questions: questions,
      currentQuestionIndex: currentQuestionIndex,
      answers: answers,
    })),
      ($[1] = answers),
      ($[2] = currentQuestionIndex),
      ($[3] = questions),
      ($[4] = We));
  else We = $[4];
  let ze;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((ze = e(PermissionRequestTitle, { title: "Review your answers", color: "text" })), ($[5] = ze));
  else ze = $[5];
  let Xe;
  if ($[6] !== allQuestionsAnswered)
    ((Xe =
      !allQuestionsAnswered &&
      e(Box, {
        marginBottom: 1,
        children: e(StatusRow, { status: "warning", children: "You have not answered all questions" }),
      })),
      ($[6] = allQuestionsAnswered),
      ($[7] = Xe));
  else Xe = $[7];
  let rt;
  if ($[8] !== answers || $[9] !== questions)
    ((rt =
      Object.keys(answers).length > 0 &&
      e(Box, {
        flexDirection: "column",
        marginBottom: 1,
        children: questions
          .filter((kt) => fp(answers, kt?.key))
          .map((q_0) => {
            let It = fp(answers, q_0?.key);
            return r(
              Box,
              {
                flexDirection: "column",
                marginLeft: 1,
                children: [
                  e(Blockquote, {
                    multiline: q_0?.displayQuestion.needsGutter ?? !1,
                    children: e(BulletRow, { children: q_0?.displayQuestion.text || "Question" }),
                  }),
                  e(Box, {
                    marginLeft: 2,
                    children: r(Text, { color: "success", children: [re.arrowRight, " ", It] }),
                  }),
                ],
              },
              q_0?.key || "answer",
            );
          }),
      })),
      ($[8] = answers),
      ($[9] = questions),
      ($[10] = rt));
  else rt = $[10];
  let Ot;
  if ($[11] !== permissionResult)
    ((Ot = e(PermissionRuleExplanation, { permissionResult: permissionResult, toolType: "tool" })),
      ($[11] = permissionResult),
      ($[12] = Ot));
  else Ot = $[12];
  let Et;
  if ($[13] === MEMO_CACHE_SENTINEL)
    ((Et = e(Text, { color: "inactive", children: "Ready to submit your answers?" })), ($[13] = Et));
  else Et = $[13];
  let Dt;
  if ($[14] !== onFinalResponse)
    ((Dt = e(Box, {
      marginTop: 1,
      children: e(ConfirmSelect, {
        confirmLabel: "Submit answers",
        cancelLabel: "Cancel",
        onConfirm: () => onFinalResponse("submit"),
        onCancel: () => onFinalResponse("cancel"),
      }),
    })),
      ($[14] = onFinalResponse),
      ($[15] = Dt));
  else Dt = $[15];
  let Lt;
  if ($[16] !== Xe || $[17] !== rt || $[18] !== Ot || $[19] !== Dt)
    ((Lt = r(Box, { flexDirection: "column", marginTop: 1, children: [Xe, rt, Ot, Et, Dt] })),
      ($[16] = Xe),
      ($[17] = rt),
      ($[18] = Ot),
      ($[19] = Dt),
      ($[20] = Lt));
  else Lt = $[20];
  let oo;
  if ($[21] !== We || $[22] !== Lt)
    ((oo = r(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        He,
        r(Box, {
          flexDirection: "column",
          borderTop: !0,
          borderColor: "inactive",
          paddingTop: 0,
          children: [We, ze, Lt],
        }),
      ],
    })),
      ($[21] = We),
      ($[22] = Lt),
      ($[23] = oo));
  else oo = $[23];
  return oo;
}

export { SubmitQuestionsView };
