/**
 * tools/AskUserQuestionTool/UI.tsx
 *
 * 2.1.316 新增：显示用户对 AskUserQuestion 的回答（超时继续）；显示用户要求更多问题/回答的结果等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (10)
 * attribution: placement 10
 */
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { themeColorOf } from "../../utils/spellcheck.js";
import { BLACK_CIRCLE } from "../../utils/permissions/autoModeRulesPrompt.js";
import { MessageResponse } from "../../components/MessageResponse.js";

//@ chunk-ah34pb7m.js:21034-21127 placement
/**
 * 把 answers 的 [问题, 回答] 条目渲染成一行灰色文本 “· 问题 → 回答”；AskUserQuestionAnswers 用它显示已回答的问题。
 */
function renderAnswerSummaryLine(m) {
  let [N, W] = m;
  return jsxProd_default_2(
    Text,
    {
      color: "inactive",
      children: ["\xB7 ", N, " \u2192 ", W],
    },
    N,
  );
}
//@ chunk-ah34pb7m.js:21127-21157 placement
/**
 * 读取单个选项的 label；renderQuestionSummary 把各选项 label 用 “ / ” 连成一行摘要。
 */
function optionLabel(U) {
  return U.label;
}
//@ chunk-ah34pb7m.js:21157-21283 placement
function renderQuestionSummary(K) {
  return jsxProd_default_2(
    Text,
    {
      color: "inactive",
      children: ["\xB7 ", K.question, " (", K.options.map(optionLabel).join(" / "), ")"],
    },
    K.question,
  );
}
//@ chunk-ah34pb7m.js:21283-21376 placement
/**
 * 追问视图里把 [问题, 回答] 渲染成与 AP 相同的灰色箭头行，供 AskUserQuestionFollowUp 使用。
 */
function renderFollowUpAnswerLine(m) {
  let [L, N] = m;
  return jsxProd_default_2(
    Text,
    {
      color: "inactive",
      children: ["\xB7 ", L, " \u2192 ", N],
    },
    L,
  );
}
//@ chunk-ah34pb7m.js:21376-22263 placement
/**
 * 显示用户对 AskUserQuestion 的回答（超时继续）。
 */
function AskUserQuestionAnswers(props) {
  let f = w(15);
  let { questions, answers, timeoutMs } = props;
  let h;
  if (f[0] !== answers) {
    h = Object.entries(answers);
    f[0] = answers;
    f[1] = h;
  } else h = f[1];
  let M = h;
  let T = M.length > 0;
  let x;
  if (f[2] === MEMO_CACHE_SENTINEL) {
    x = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        jsxProd_default_2(Text, {
          color: themeColorOf("default"),
          children: [BLACK_CIRCLE, "\xA0"],
        }),
        jsxProd_default(Text, {
          children: "Claude asked:",
        }),
      ],
    });
    f[2] = x;
  } else x = f[2];
  let k;
  if (f[3] !== M || f[4] !== T || f[5] !== questions) {
    k = T ? M.map(renderAnswerSummaryLine) : questions.map(renderQuestionSummary);
    f[3] = M;
    f[4] = T;
    f[5] = questions;
    f[6] = k;
  } else k = f[6];
  let b;
  if (f[7] !== timeoutMs) {
    b = Math.round(timeoutMs / 1000);
    f[7] = timeoutMs;
    f[8] = b;
  } else b = f[8];
  const E = T ? "continued with the answers selected so far" : "continued without an answer";
  let B;
  if (f[9] !== b || f[10] !== E) {
    B = jsxProd_default_2(Text, {
      dimColor: true,
      children: [BLACK_CIRCLE, " No response after ", b, "s \u2014", " ", E],
    });
    f[9] = b;
    f[10] = E;
    f[11] = B;
  } else B = f[11];
  let L;
  if (f[12] !== k || f[13] !== B) {
    L = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [
        x,
        jsxProd_default(MessageResponse, {
          children: jsxProd_default_2(Box, {
            flexDirection: "column",
            children: [k, B],
          }),
        }),
      ],
    });
    f[12] = k;
    f[13] = B;
    f[14] = L;
  } else L = f[14];
  return L;
}
//@ chunk-ah34pb7m.js:22263-23123 placement
/**
 * 显示用户要求更多问题/回答的结果。
 */
function AskUserQuestionFollowUp(props) {
  let f = w(13);
  let { answers, response, followUp } = props;
  let h;
  if (f[0] !== answers) {
    h = Object.entries(answers);
    f[0] = answers;
    f[1] = h;
  } else h = f[1];
  let M = h;
  let T = Boolean(response) || M.length > 0;
  if (!followUp && !T) {
    return null;
  }
  let children = followUp
    ? T
      ? "User asked Claude for more questions (so far):"
      : "User asked Claude for more questions"
    : "User answered Claude's questions:";
  let k;
  if (f[2] === MEMO_CACHE_SENTINEL) {
    k = jsxProd_default_2(Text, {
      color: themeColorOf("default"),
      children: [BLACK_CIRCLE, "\xA0"],
    });
    f[2] = k;
  } else k = f[2];
  let b;
  if (f[3] !== children) {
    b = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [
        k,
        jsxProd_default(Text, {
          children,
        }),
      ],
    });
    f[3] = children;
    f[4] = b;
  } else b = f[4];
  let E;
  if (f[5] !== M || f[6] !== followUp || f[7] !== T || f[8] !== response) {
    E =
      T &&
      jsxProd_default(MessageResponse, {
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            (followUp || !response) && M.map(renderFollowUpAnswerLine),
            response &&
              jsxProd_default_2(Text, {
                color: "inactive",
                children: ["\xB7 ", response],
              }),
          ],
        }),
      });
    f[5] = M;
    f[6] = followUp;
    f[7] = T;
    f[8] = response;
    f[9] = E;
  } else E = f[9];
  let B;
  if (f[10] !== b || f[11] !== E) {
    B = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [b, E],
    });
    f[10] = b;
    f[11] = E;
    f[12] = B;
  } else B = f[12];
  return B;
}
//@ chunk-ah34pb7m.js:23123-23149 placement
/**
 * 该工具不提供执行中进度界面，返回 null；由 SkillProposalMessage 指派为 renderToolUseProgressMessage。
 */
function renderNoToolUseProgress() {
  return null;
}
//@ chunk-ah34pb7m.js:23149-23175 placement
/**
 * 该工具不提供工具使用错误界面，返回 null；指派为 renderToolUseErrorMessage。
 */
function renderNoToolUseError() {
  return null;
}
//@ chunk-ah34pb7m.js:23175-23350 placement
function AskUserQuestionResult({ questions, answers, response, afkTimeoutMs, followUp }) {
  if (afkTimeoutMs)
    return jsxProd_default(AskUserQuestionAnswers, {
      questions,
      answers,
      timeoutMs: afkTimeoutMs,
    });
  return jsxProd_default(AskUserQuestionFollowUp, {
    answers,
    response,
    followUp,
  });
}
//@ chunk-ah34pb7m.js:23350-23757 placement
/**
 * 用户拒绝回答问题。
 */
function AskUserQuestionDeclined({ questions }) {
  return jsxProd_default_2(Box, {
    flexDirection: "column",
    marginTop: 1,
    children: [
      jsxProd_default_2(Box, {
        flexDirection: "row",
        children: [
          jsxProd_default_2(Text, {
            color: themeColorOf("default"),
            children: [BLACK_CIRCLE, "\xA0"],
          }),
          jsxProd_default(Text, {
            children: "User declined to answer questions",
          }),
        ],
      }),
      jsxProd_default(MessageResponse, {
        children: jsxProd_default(Box, {
          flexDirection: "column",
          children: questions.map((question) =>
            jsxProd_default_2(
              Text,
              {
                color: "inactive",
                children: [
                  "\xB7 ",
                  question.question,
                  " (",
                  question.options.map((option) => option.label).join(" / "),
                  ")",
                ],
              },
              question.question,
            ),
          ),
        }),
      }),
    ],
  });
}
export { AskUserQuestionResult, AskUserQuestionDeclined, renderNoToolUseProgress, renderNoToolUseError };
