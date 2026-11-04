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
import { useMemoCache } from "../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Divider } from "../../design-system/Divider.js";
import { QuestionNavigationBar, ownLookup } from "./QuestionNavigationBar.js";
import { PermissionRequestTitle } from "../PermissionRequestTitle.js";
import { Box, Text } from "../../../ink/components/Text.js";
import { StatusRow } from "../../Settings/Status.js";
import { Blockquote } from "../../Blockquote.js";
import { BulletRow } from "../../design-system/BulletRow.js";
import { figures_default } from "../../../../vendor/@inquirer/figures/dist/esm/index.js";
import { PermissionRuleExplanation } from "../PermissionRuleExplanation.js";
import { ConfirmSelect } from "../../design-system/ConfirmSelect.js";

//@ chunk-18hwfzwa.js:1293852-1295825 fingerprint (2.1.88 match: SubmitQuestionsView, 0.78)
function SubmitQuestionsView(props) {
  let $ = useMemoCache(24);
  let { questions, currentQuestionIndex, answers, allQuestionsAnswered, permissionResult, onFinalResponse } =
    props;
  let t1;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default(Divider, {
      color: "inactive",
    });
    $[0] = t1;
  } else t1 = $[0];
  let navigationBar;
  if ($[1] !== answers || $[2] !== currentQuestionIndex || $[3] !== questions) {
    navigationBar = jsxProd_default(QuestionNavigationBar, {
      questions,
      currentQuestionIndex,
      answers,
    });
    $[1] = answers;
    $[2] = currentQuestionIndex;
    $[3] = questions;
    $[4] = navigationBar;
  } else navigationBar = $[4];
  let t3;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    t3 = jsxProd_default(PermissionRequestTitle, {
      title: "Review your answers",
      color: "text",
    });
    $[5] = t3;
  } else t3 = $[5];
  let unansweredNotice;
  if ($[6] !== allQuestionsAnswered) {
    unansweredNotice =
      !allQuestionsAnswered &&
      jsxProd_default(Box, {
        marginBottom: 1,
        children: jsxProd_default(StatusRow, {
          status: "warning",
          children: "You have not answered all questions",
        }),
      });
    $[6] = allQuestionsAnswered;
    $[7] = unansweredNotice;
  } else unansweredNotice = $[7];
  let answersSummary;
  if ($[8] !== answers || $[9] !== questions) {
    answersSummary =
      Object.keys(answers).length > 0 &&
      jsxProd_default(Box, {
        flexDirection: "column",
        marginBottom: 1,
        children: questions
          .filter((question) => ownLookup(answers, question?.key))
          .map((q_0) => {
            let answer = ownLookup(answers, q_0?.key);
            return jsxProd_default_2(
              Box,
              {
                flexDirection: "column",
                marginLeft: 1,
                children: [
                  jsxProd_default(Blockquote, {
                    multiline: q_0?.displayQuestion.needsGutter ?? false,
                    children: jsxProd_default(BulletRow, {
                      children: q_0?.displayQuestion.text || "Question",
                    }),
                  }),
                  jsxProd_default(Box, {
                    marginLeft: 2,
                    children: jsxProd_default_2(Text, {
                      color: "success",
                      children: [figures_default.arrowRight, " ", answer],
                    }),
                  }),
                ],
              },
              q_0?.key || "answer",
            );
          }),
      });
    $[8] = answers;
    $[9] = questions;
    $[10] = answersSummary;
  } else answersSummary = $[10];
  let ruleExplanation;
  if ($[11] !== permissionResult) {
    ruleExplanation = jsxProd_default(PermissionRuleExplanation, {
      permissionResult,
      toolType: "tool",
    });
    $[11] = permissionResult;
    $[12] = ruleExplanation;
  } else ruleExplanation = $[12];
  let t7;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    t7 = jsxProd_default(Text, {
      color: "inactive",
      children: "Ready to submit your answers?",
    });
    $[13] = t7;
  } else t7 = $[13];
  let submitActions;
  if ($[14] !== onFinalResponse) {
    submitActions = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(ConfirmSelect, {
        confirmLabel: "Submit answers",
        cancelLabel: "Cancel",
        onConfirm: () => onFinalResponse("submit"),
        onCancel: () => onFinalResponse("cancel"),
      }),
    });
    $[14] = onFinalResponse;
    $[15] = submitActions;
  } else submitActions = $[15];
  let t11;
  if (
    $[16] !== unansweredNotice ||
    $[17] !== answersSummary ||
    $[18] !== ruleExplanation ||
    $[19] !== submitActions
  ) {
    t11 = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [unansweredNotice, answersSummary, ruleExplanation, t7, submitActions],
    });
    $[16] = unansweredNotice;
    $[17] = answersSummary;
    $[18] = ruleExplanation;
    $[19] = submitActions;
    $[20] = t11;
  } else t11 = $[20];
  let t12;
  if ($[21] !== navigationBar || $[22] !== t11) {
    t12 = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        t1,
        jsxProd_default_2(Box, {
          flexDirection: "column",
          borderTop: true,
          borderColor: "inactive",
          paddingTop: 0,
          children: [navigationBar, t3, t11],
        }),
      ],
    });
    $[21] = navigationBar;
    $[22] = t11;
    $[23] = t12;
  } else t12 = $[23];
  return t12;
}
export { SubmitQuestionsView };
